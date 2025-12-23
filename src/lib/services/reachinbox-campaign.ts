// ReachInbox Campaign Service
// Handles creating and managing email campaigns for users

import { SupabaseClient } from "@supabase/supabase-js";
import {
  ReachInboxClient,
  createReachInboxClient,
  createDefaultSequence,
} from "@/lib/api/reachinbox";

interface CampaignSetupResult {
  success: boolean;
  campaignId?: number;
  error?: string;
}

/**
 * Get the ReachInbox provider configuration
 */
export async function getReachInboxProvider(
  supabase: SupabaseClient
): Promise<{ apiKey: string; apiUrl: string } | null> {
  const { data: provider } = await supabase
    .from("api_providers")
    .select("api_key_encrypted, api_url, is_active")
    .eq("provider_type", "reachinbox")
    .eq("is_active", true)
    .single();

  if (!provider || !provider.api_key_encrypted) {
    return null;
  }

  return {
    apiKey: provider.api_key_encrypted,
    apiUrl: provider.api_url || "https://api.reachinbox.ai",
  };
}

/**
 * Check if user already has a ReachInbox campaign
 */
export async function getUserCampaign(
  supabase: SupabaseClient,
  userId: string
): Promise<{ campaign_id: number; status: string } | null> {
  const { data } = await supabase
    .from("reachinbox_campaigns")
    .select("campaign_id, status")
    .eq("user_id", userId)
    .single();

  return data;
}

/**
 * Create a ReachInbox campaign for a user
 * This is called when a user's subscription becomes active
 */
export async function createUserCampaign(
  supabase: SupabaseClient,
  userId: string,
  userName?: string
): Promise<CampaignSetupResult> {
  console.log(`[ReachInbox] Creating campaign for user: ${userId}`);

  // Get ReachInbox provider config
  const providerConfig = await getReachInboxProvider(supabase);
  if (!providerConfig) {
    console.log("[ReachInbox] Provider not active or not configured");
    return { success: false, error: "ReachInbox provider not configured" };
  }

  // Check if user already has a campaign
  const existingCampaign = await getUserCampaign(supabase, userId);
  if (existingCampaign && existingCampaign.status !== "deleted") {
    console.log(`[ReachInbox] User already has campaign: ${existingCampaign.campaign_id}`);
    return { success: true, campaignId: existingCampaign.campaign_id };
  }

  const client = createReachInboxClient(providerConfig.apiKey, providerConfig.apiUrl);

  try {
    // Step 1: Get available email accounts
    const accountsResponse = await client.getAllAccounts({ status: "active", limit: 10 });
    if (!accountsResponse.success || !accountsResponse.data) {
      return { success: false, error: "Failed to fetch email accounts" };
    }

    const accounts = accountsResponse.data;
    if (accounts.length === 0) {
      return { success: false, error: "No active email accounts available" };
    }

    // Select up to 5 accounts (round-robin ready)
    const selectedAccounts = accounts.slice(0, 5);
    const accountIds = selectedAccounts.map((a) => a.id);

    // Step 2: Create the campaign
    const campaignName = userName
      ? `${userName}'s Cold Outreach`
      : `Campaign ${Date.now()}`;
    
    const createResponse = await client.createCampaign(campaignName);
    if (!createResponse.success || !createResponse.data?.id) {
      return { success: false, error: "Failed to create campaign" };
    }

    const campaignId = createResponse.data.id;
    console.log(`[ReachInbox] Created campaign: ${campaignId}`);

    // Step 3: Add the 3-step sequence with template variables
    const sequences = createDefaultSequence();
    const sequenceResponse = await client.addSequences(campaignId, sequences);
    if (!sequenceResponse.success) {
      console.error("[ReachInbox] Failed to add sequences:", sequenceResponse.error);
      // Continue anyway - sequences can be added later
    }

    // Step 4: Assign email accounts to the campaign
    const accountsSetResponse = await client.setAccounts(campaignId, accountIds);
    if (!accountsSetResponse.success) {
      console.error("[ReachInbox] Failed to set accounts:", accountsSetResponse.error);
      // Continue anyway - accounts can be assigned later
    }

    // Step 5: Set default schedule (weekdays, 9am-5pm)
    await client.setSchedule(campaignId, {
      timezone: "America/New_York",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startHour: 9,
      endHour: 17,
    });

    // Step 6: Store campaign in database
    const { error: insertError } = await supabase.from("reachinbox_campaigns").upsert(
      {
        user_id: userId,
        campaign_id: campaignId,
        campaign_name: campaignName,
        status: "draft",
        email_accounts: selectedAccounts.map((a) => ({
          id: a.id,
          email: a.email,
        })),
      },
      { onConflict: "user_id" }
    );

    if (insertError) {
      console.error("[ReachInbox] Failed to store campaign:", insertError);
      return { success: false, error: "Failed to store campaign in database" };
    }

    console.log(`[ReachInbox] Campaign setup complete: ${campaignId}`);
    return { success: true, campaignId };
  } catch (error) {
    console.error("[ReachInbox] Campaign creation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Start a user's campaign
 */
export async function startUserCampaign(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const providerConfig = await getReachInboxProvider(supabase);
  if (!providerConfig) {
    return { success: false, error: "ReachInbox provider not configured" };
  }

  const campaign = await getUserCampaign(supabase, userId);
  if (!campaign) {
    return { success: false, error: "No campaign found for user" };
  }

  const client = createReachInboxClient(providerConfig.apiKey, providerConfig.apiUrl);
  const result = await client.startCampaign(campaign.campaign_id);

  if (result.success) {
    await supabase
      .from("reachinbox_campaigns")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  return { success: result.success, error: result.error };
}

/**
 * Pause a user's campaign
 */
export async function pauseUserCampaign(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const providerConfig = await getReachInboxProvider(supabase);
  if (!providerConfig) {
    return { success: false, error: "ReachInbox provider not configured" };
  }

  const campaign = await getUserCampaign(supabase, userId);
  if (!campaign) {
    return { success: false, error: "No campaign found for user" };
  }

  const client = createReachInboxClient(providerConfig.apiKey, providerConfig.apiUrl);
  const result = await client.pauseCampaign(campaign.campaign_id);

  if (result.success) {
    await supabase
      .from("reachinbox_campaigns")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  return { success: result.success, error: result.error };
}

/**
 * Delete a user's campaign (called when subscription expires)
 */
export async function deleteUserCampaign(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const providerConfig = await getReachInboxProvider(supabase);
  if (!providerConfig) {
    return { success: false, error: "ReachInbox provider not configured" };
  }

  const campaign = await getUserCampaign(supabase, userId);
  if (!campaign) {
    return { success: true }; // No campaign to delete
  }

  const client = createReachInboxClient(providerConfig.apiKey, providerConfig.apiUrl);

  // First pause the campaign
  await client.pauseCampaign(campaign.campaign_id);

  // Mark as deleted in our database
  await supabase
    .from("reachinbox_campaigns")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  console.log(`[ReachInbox] Deleted campaign for user: ${userId}`);
  return { success: true };
}

/**
 * Send a reply to an email thread
 */
export async function sendEmailReply(
  supabase: SupabaseClient,
  userId: string,
  params: {
    threadId: string;
    to: string;
    from: string;
    subject: string;
    body: string;
    inReplyTo?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const providerConfig = await getReachInboxProvider(supabase);
  if (!providerConfig) {
    return { success: false, error: "ReachInbox provider not configured" };
  }

  const client = createReachInboxClient(providerConfig.apiKey, providerConfig.apiUrl);
  const result = await client.sendOneboxEmail(params);

  return { success: result.success, error: result.error };
}

/**
 * Get email thread details
 */
export async function getEmailThread(
  supabase: SupabaseClient,
  threadId: string
) {
  const providerConfig = await getReachInboxProvider(supabase);
  if (!providerConfig) {
    return { success: false, error: "ReachInbox provider not configured" };
  }

  const client = createReachInboxClient(providerConfig.apiKey, providerConfig.apiUrl);
  return client.getOneboxThread(threadId);
}

