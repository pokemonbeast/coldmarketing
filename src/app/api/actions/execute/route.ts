import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Execute approved actions by calling the panel API (Just Another Panel)
 * This would be called by a cron job or scheduler
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // This could be called by a service account or cron
    // For now, require user auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionId, force } = await request.json();

    if (!actionId) {
      return NextResponse.json({ error: 'Action ID required' }, { status: 400 });
    }

    // Get action
    const { data: actionData, error: actionError } = await supabase
      .from('planned_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (actionError || !actionData) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Get business for ownership check
    const { data: businessData } = await supabase
      .from('businesses')
      .select('user_id')
      .eq('id', actionData.business_id)
      .single();

    // Verify ownership
    if (businessData?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Cast to include all fields from planned_actions table
    const action = actionData as typeof actionData & { 
      business?: typeof businessData;
      retry_count: number | null;
      content_embedding_id: string | null;
    };

    // Check status - must be approved or scheduled (or force)
    if (!force && !['approved', 'scheduled'].includes(action.status || '')) {
      return NextResponse.json(
        { error: `Cannot execute action with status: ${action.status}` },
        { status: 400 }
      );
    }

    // Check action limits
    const today = new Date().toISOString().split('T')[0];
    const { data: usage, error: usageError } = await supabase
      .from('action_usage')
      .select('*')
      .eq('user_id', user.id)
      .lte('period_start', today)
      .gte('period_end', today)
      .single();

    if (usage) {
      if ((usage.actions_used || 0) >= usage.actions_limit) {
        return NextResponse.json(
          { error: 'Monthly action limit reached' },
          { status: 429 }
        );
      }
    }

    // Update status to executing
    await supabase
      .from('planned_actions')
      .update({ status: 'executing' })
      .eq('id', actionId);

    try {
      // Get provider config for the platform
      // For MVP, we'll use Just Another Panel
      const { data: provider } = await supabase
        .from('api_providers')
        .select('*')
        .eq('provider_type', 'smm_panel')
        .eq('is_active', true)
        .single();

      if (!provider) {
        throw new Error('No active SMM panel provider configured');
      }

      // Get the service for this platform's comment feature
      const { data: serviceMapping } = await supabase
        .from('service_mappings')
        .select('*, service:services(*)')
        .eq('platform', action.platform)
        .eq('action_type', 'comment')
        .eq('provider_id', provider.id)
        .eq('is_active', true)
        .single();

      if (!serviceMapping || !serviceMapping.service) {
        throw new Error(`No service mapping found for ${action.platform} comments`);
      }

      const service = serviceMapping.service as any;
      const comment = action.edited_comment || action.generated_comment;

      // Make API call to Just Another Panel
      // In production, use the JAPClient from lib/services/jap.ts
      const response = await fetch(`${provider.api_url}/api/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          key: provider.api_key_encrypted || '', // Should decrypt this
          action: 'add',
          service: service.provider_service_id,
          link: action.target_url,
          comments: comment,
          quantity: '1',
        }),
      });

      if (!response.ok) {
        throw new Error(`Panel API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Update action as completed
      await supabase
        .from('planned_actions')
        .update({
          status: 'completed',
          executed_at: new Date().toISOString(),
          panel_order_id: result.order?.toString(),
        })
        .eq('id', actionId);

      // Increment action usage
      if (usage) {
        await supabase
          .from('action_usage')
          .update({ actions_used: (usage.actions_used || 0) + 1 })
          .eq('id', usage.id);
      }

      return NextResponse.json({
        success: true,
        orderId: result.order,
      });
    } catch (execError) {
      // Update action as failed
      await supabase
        .from('planned_actions')
        .update({
          status: 'failed',
          error_message: execError instanceof Error ? execError.message : 'Unknown error',
          retry_count: (action.retry_count || 0) + 1,
        })
        .eq('id', actionId);

      // If retries available, pick alternative content
      if ((action.retry_count || 0) < 3) {
        // Find alternative content from the same pool
        const { data: alternative } = await supabase
          .from('content_embeddings')
          .select('*')
          .eq('business_id', action.business_id)
          .eq('platform', action.platform)
          .eq('is_used', false)
          .neq('id', action.embedding_id || '')
          .order('relevance_score', { ascending: false })
          .limit(1)
          .single();

        if (alternative) {
          // Create new action from alternative
          // This would be handled by the weekly scheduling job
          console.log('Alternative content available:', alternative.id);
        }
      }

      throw execError;
    }
  } catch (error) {
    console.error('Execute action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute action' },
      { status: 500 }
    );
  }
}

