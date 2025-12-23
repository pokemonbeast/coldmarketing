import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ReachInboxWebhookPayload } from '@/lib/api/reachinbox';

// Lazy initialization for Supabase admin client
let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);
  }
  return supabaseAdminClient;
}

/**
 * ReachInbox Webhook Handler
 * Receives events for email campaigns (replies, opens, clicks, etc.)
 * 
 * POST /api/webhooks/reachinbox
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as ReachInboxWebhookPayload;
    
    console.log(`[ReachInbox Webhook] Received event: ${payload.event}`, {
      campaign_id: payload.campaign_id,
      lead_email: payload.lead_email,
      email_id: payload.email_id,
    });

    // Only process reply events
    if (payload.event !== 'REPLY_RECEIVED' && payload.event !== 'EMAIL_REPLIED') {
      console.log(`[ReachInbox Webhook] Ignoring event type: ${payload.event}`);
      return NextResponse.json({ received: true, processed: false });
    }

    const supabase = getSupabaseAdmin();

    // Find the user by campaign_id
    const { data: campaign } = await supabase
      .from('reachinbox_campaigns')
      .select('user_id')
      .eq('campaign_id', payload.campaign_id)
      .single();

    if (!campaign) {
      console.error(`[ReachInbox Webhook] No campaign found for ID: ${payload.campaign_id}`);
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const userId = campaign.user_id;

    // Check for duplicate based on message_id
    if (payload.message_id) {
      const { data: existing } = await supabase
        .from('email_replies')
        .select('id')
        .eq('message_id', payload.message_id)
        .single();

      if (existing) {
        console.log(`[ReachInbox Webhook] Duplicate message, skipping: ${payload.message_id}`);
        return NextResponse.json({ received: true, processed: false, reason: 'duplicate' });
      }
    }

    // Insert the email reply
    const { error: insertError } = await supabase.from('email_replies').insert({
      user_id: userId,
      campaign_id: payload.campaign_id,
      lead_email: payload.lead_email,
      lead_first_name: payload.lead_first_name || null,
      lead_last_name: payload.lead_last_name || null,
      email_account: payload.email_account,
      subject: null, // ReachInbox doesn't send subject in webhook
      body: payload.email_replied_body || '',
      message_id: payload.message_id || null,
      thread_id: payload.email_id?.toString() || null,
      step_number: payload.step_number || null,
      is_read: false,
      received_at: payload.timestamp || new Date().toISOString(),
    });

    if (insertError) {
      console.error('[ReachInbox Webhook] Failed to insert reply:', insertError);
      return NextResponse.json({ error: 'Failed to store reply' }, { status: 500 });
    }

    // Increment unread count for the user
    try {
      // Try RPC function first (if it exists)
      const { error: rpcError } = await supabase.rpc('increment_unread_emails', { 
        user_id_param: userId 
      });
      
      if (rpcError) {
        // Fallback: direct update if RPC doesn't exist
        const { data: profile } = await supabase
          .from('profiles')
          .select('unread_emails_count')
          .eq('id', userId)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ unread_emails_count: (profile.unread_emails_count || 0) + 1 })
            .eq('id', userId);
        }
      }
    } catch (error) {
      // Fallback: direct update if RPC call fails
      const { data: profile } = await supabase
        .from('profiles')
        .select('unread_emails_count')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ unread_emails_count: (profile.unread_emails_count || 0) + 1 })
          .eq('id', userId);
      }
    }

    console.log(`[ReachInbox Webhook] Stored reply for user ${userId} from ${payload.lead_email}`);
    return NextResponse.json({ received: true, processed: true });

  } catch (error) {
    console.error('[ReachInbox Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Allow GET for webhook verification if needed
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'reachinbox-webhook' });
}

