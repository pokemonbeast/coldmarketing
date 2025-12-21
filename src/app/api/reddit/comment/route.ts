import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createReddapiClient, REDDAPI_DEFAULT_URL } from "@/lib/api/reddapi";

// Timeout safety: 8 seconds to stay well under Vercel's 10s limit
const TIMEOUT_MS = 8000;

interface RedditAccount {
  id: string;
  username: string;
  password: string;
  proxy: string;
  is_active: boolean;
  failure_count: number;
  last_used_at: string | null;
}

interface CommentRequest {
  text: string;
  post_url: string;
  provider_id?: string; // Optional: specific provider to use
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if user is admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body: CommentRequest = await request.json();
    const { text, post_url, provider_id } = body;

    if (!text || !post_url) {
      return NextResponse.json(
        { error: "Missing required parameters: text and post_url" },
        { status: 400 }
      );
    }

    console.log(`[Reddit Comment] Starting comment flow for: ${post_url}`);

    // Get reddapi provider for API URL and key
    let apiUrl = REDDAPI_DEFAULT_URL;
    let apiKey = "";
    
    // First try the specified provider, then fall back to any active reddapi provider
    const providerQuery = provider_id 
      ? supabase.from("api_providers").select("api_url, api_key_encrypted").eq("id", provider_id).eq("provider_type", "reddapi").single()
      : supabase.from("api_providers").select("api_url, api_key_encrypted").eq("provider_type", "reddapi").eq("is_active", true).limit(1).single();
    
    const { data: provider } = await providerQuery;
    
    if (provider) {
      if (provider.api_url) apiUrl = provider.api_url;
      if (provider.api_key_encrypted) apiKey = provider.api_key_encrypted;
    }
    
    if (!apiKey) {
      console.error("[Reddit Comment] No API key configured for Reddapi");
      return NextResponse.json(
        { error: "No API key configured for Reddapi provider" },
        { status: 500 }
      );
    }

    // Fetch all active Reddit accounts, ordered by least recently used
    const { data: accounts, error: accountsError } = await supabase
      .from("reddit_accounts")
      .select("*")
      .eq("is_active", true)
      .order("last_used_at", { ascending: true, nullsFirst: true });

    if (accountsError) {
      console.error("[Reddit Comment] Error fetching accounts:", accountsError);
      return NextResponse.json(
        { error: "Failed to fetch Reddit accounts" },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      console.log("[Reddit Comment] No active accounts available");
      return NextResponse.json(
        { error: "No active Reddit accounts available" },
        { status: 503 }
      );
    }

    console.log(`[Reddit Comment] Found ${accounts.length} active accounts`);

    const client = createReddapiClient(apiKey, apiUrl);
    
    // Iterate through accounts with failover logic
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i] as RedditAccount;
      
      // Check timeout safety
      const elapsed = Date.now() - startTime;
      if (elapsed >= TIMEOUT_MS) {
        console.log(`[Reddit Comment] Timeout safety triggered after ${elapsed}ms`);
        return NextResponse.json(
          { 
            error: "Timeout", 
            message: "Operation exceeded safe time limit",
            accounts_tried: i,
          },
          { status: 504 }
        );
      }

      console.log(`[Reddit Comment] Trying account ${i + 1}/${accounts.length}: ${account.username}`);

      // Step 1: Login
      const loginResult = await client.login({
        username: account.username,
        password: account.password,
        proxy: account.proxy,
      });

      if (!loginResult.success || !loginResult.bearer) {
        console.log(`[Reddit Comment] Login failed for ${account.username}: ${loginResult.error}`);
        
        // Update failure count
        const newFailureCount = (account.failure_count || 0) + 1;
        const shouldDisable = newFailureCount >= 3;
        
        await supabase
          .from("reddit_accounts")
          .update({
            failure_count: newFailureCount,
            is_active: !shouldDisable,
          })
          .eq("id", account.id);

        if (shouldDisable) {
          console.log(`[Reddit Comment] Account ${account.username} disabled after ${newFailureCount} failures`);
        }

        // Continue to next account
        continue;
      }

      console.log(`[Reddit Comment] Login successful for ${account.username}`);

      // Step 2: Post comment with the same proxy
      const commentResult = await client.comment({
        text,
        post_url,
        bearer: loginResult.bearer,
        proxy: account.proxy,
      });

      if (!commentResult.success) {
        console.log(`[Reddit Comment] Comment failed for ${account.username}: ${commentResult.error}`);
        
        // This is a comment failure, not a login failure
        // We still update last_used_at but don't increment failure_count
        await supabase
          .from("reddit_accounts")
          .update({
            last_used_at: new Date().toISOString(),
          })
          .eq("id", account.id);

        return NextResponse.json(
          {
            success: false,
            error: commentResult.error,
            message: commentResult.message,
            account_used: account.username,
          },
          { status: 422 }
        );
      }

      // Success! Update last_used_at and reset failure count
      console.log(`[Reddit Comment] Comment posted successfully by ${account.username}`);
      
      await supabase
        .from("reddit_accounts")
        .update({
          last_used_at: new Date().toISOString(),
          failure_count: 0, // Reset on successful use
        })
        .eq("id", account.id);

      return NextResponse.json({
        success: true,
        data: commentResult.data,
        account_used: account.username,
        elapsed_ms: Date.now() - startTime,
      });
    }

    // All accounts failed
    console.log("[Reddit Comment] All accounts exhausted without success");
    return NextResponse.json(
      {
        error: "All accounts failed",
        message: "Could not log in with any available account",
        accounts_tried: accounts.length,
      },
      { status: 503 }
    );

  } catch (error) {
    console.error("[Reddit Comment] Unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        success: false,
      },
      { status: 500 }
    );
  }
}

