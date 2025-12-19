import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Approve multiple actions at once
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionIds } = await request.json();

    if (!actionIds || !Array.isArray(actionIds) || actionIds.length === 0) {
      return NextResponse.json({ error: 'Action IDs required' }, { status: 400 });
    }

    // Get user's businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id);

    const businessIds = businesses?.map(b => b.id) || [];

    // Verify all actions belong to user's businesses
    const { data: actions } = await supabase
      .from('planned_actions')
      .select('id, business_id, status')
      .in('id', actionIds);

    const validActions = actions?.filter(
      a => businessIds.includes(a.business_id) && 
           ['pending_review'].includes(a.status || 'pending_review')
    ) || [];

    if (validActions.length === 0) {
      return NextResponse.json({ error: 'No valid actions to approve' }, { status: 400 });
    }

    // Check action usage limits
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
      .from('action_usage')
      .select('actions_used, actions_limit')
      .eq('user_id', user.id)
      .lte('period_start', today)
      .gte('period_end', today)
      .single();

    if (usage) {
      const remaining = usage.actions_limit - (usage.actions_used || 0);
      if (validActions.length > remaining) {
        return NextResponse.json(
          { error: `Only ${remaining} actions remaining this month` },
          { status: 429 }
        );
      }
    }

    // Approve actions
    const { error } = await supabase
      .from('planned_actions')
      .update({ 
        status: 'approved',
        auto_approved: false,
      })
      .in('id', validActions.map(a => a.id));

    if (error) throw error;

    return NextResponse.json({
      success: true,
      approved: validActions.length,
    });
  } catch (error) {
    console.error('Error batch approving:', error);
    return NextResponse.json({ error: 'Failed to approve actions' }, { status: 500 });
  }
}



