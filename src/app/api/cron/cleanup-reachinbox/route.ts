import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { deleteUserCampaign } from '@/lib/services/reachinbox-campaign';

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
 * Cleanup cron job for ReachInbox campaigns
 * Runs daily to delete campaigns for users who have missed subscription renewal by 7+ days
 * 
 * GET /api/cron/cleanup-reachinbox
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('[ReachInbox Cleanup] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ReachInbox Cleanup] Starting cleanup job...');
    const supabase = getSupabaseAdmin();

    // Calculate the cutoff date (7 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffDateStr = cutoffDate.toISOString();

    // Find users with expired subscriptions (more than 7 days) who have ReachInbox campaigns
    const { data: expiredCampaigns, error: queryError } = await supabase
      .from('reachinbox_campaigns')
      .select(`
        id,
        user_id,
        campaign_id,
        campaign_name,
        status,
        profiles!inner (
          id,
          subscription_status,
          subscription_current_period_end
        )
      `)
      .neq('status', 'deleted')
      .or('subscription_status.neq.active,subscription_status.is.null', { 
        referencedTable: 'profiles' 
      });

    if (queryError) {
      console.error('[ReachInbox Cleanup] Query error:', queryError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // Filter to only those who have been inactive for 7+ days
    const campaignsToDelete = (expiredCampaigns || []).filter((campaign) => {
      // Cast through unknown to handle Supabase's type inference
      const profile = (campaign.profiles as unknown) as {
        id: string;
        subscription_status: string | null;
        subscription_current_period_end: string | null;
      } | Array<{
        id: string;
        subscription_status: string | null;
        subscription_current_period_end: string | null;
      }>;

      // Handle both array and single object cases
      const profileData = Array.isArray(profile) ? profile[0] : profile;
      
      if (!profileData) {
        return false;
      }

      // Skip if subscription is active
      if (profileData.subscription_status === 'active') {
        return false;
      }

      // If no end date, consider it expired
      if (!profileData.subscription_current_period_end) {
        return true;
      }

      // Check if subscription ended more than 7 days ago
      const endDate = new Date(profileData.subscription_current_period_end);
      return endDate < cutoffDate;
    });

    console.log(`[ReachInbox Cleanup] Found ${campaignsToDelete.length} campaigns to clean up`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const campaign of campaignsToDelete) {
      try {
        const result = await deleteUserCampaign(supabase, campaign.user_id);
        if (result.success) {
          deletedCount++;
          console.log(`[ReachInbox Cleanup] Deleted campaign for user ${campaign.user_id}`);
        } else {
          errorCount++;
          console.error(`[ReachInbox Cleanup] Failed to delete campaign for user ${campaign.user_id}: ${result.error}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`[ReachInbox Cleanup] Error deleting campaign for user ${campaign.user_id}:`, error);
      }
    }

    // Optionally clean up old email replies for deleted campaigns
    // (keeping them for now as they might be useful for history)

    console.log(`[ReachInbox Cleanup] Completed. Deleted: ${deletedCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      processed: campaignsToDelete.length,
      deleted: deletedCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error('[ReachInbox Cleanup] Cron job failed:', error);
    return NextResponse.json(
      { error: 'Cleanup job failed' },
      { status: 500 }
    );
  }
}

