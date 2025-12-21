import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createReddapiClient, REDDAPI_DEFAULT_URL } from "@/lib/api/reddapi";

interface RedditAccount {
  id: string;
  username: string;
  password: string;
  proxy: string;
  cookies: string | null;
  token_v2: string | null;
  cookies_updated_at: string | null;
  is_active: boolean;
  failure_count: number;
  last_used_at: string | null;
}

export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json();
    const { action, accountId, providerId, params } = body;

    // Get the API URL and API key from provider
    let apiUrl = REDDAPI_DEFAULT_URL;
    let apiKey = "";
    
    if (providerId) {
      const { data: provider } = await supabase
        .from("api_providers")
        .select("api_url, api_key_encrypted")
        .eq("id", providerId)
        .eq("provider_type", "reddapi")
        .single();

      if (provider) {
        if (provider.api_url) apiUrl = provider.api_url;
        if (provider.api_key_encrypted) apiKey = provider.api_key_encrypted;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured for Reddapi provider. Get your key from RapidAPI." },
        { status: 400 }
      );
    }

    const client = createReddapiClient(apiKey, apiUrl);

    switch (action) {
      case "login": {
        // Test login with a specific account
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required for login test" },
            { status: 400 }
          );
        }

        const { data: account, error: accountError } = await supabase
          .from("reddit_accounts")
          .select("*")
          .eq("id", accountId)
          .single();

        if (accountError || !account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 }
          );
        }

        const typedAccount = account as RedditAccount;

        console.log(`[Test Reddapi] Testing login for account: ${typedAccount.username}`);

        const loginResult = await client.login({
          username: typedAccount.username,
          password: typedAccount.password,
          proxy: typedAccount.proxy,
        });

        if (loginResult.success && (loginResult.cookies || loginResult.token_v2)) {
          // Save cookies and token_v2 to database, reset failure count
          await supabase
            .from("reddit_accounts")
            .update({ 
              failure_count: 0,
              cookies: loginResult.cookies || null,
              token_v2: loginResult.token_v2 || null,
              cookies_updated_at: new Date().toISOString(),
            })
            .eq("id", accountId);

          return NextResponse.json({
            success: true,
            action: "login",
            result: {
              username: typedAccount.username,
              cookies: loginResult.cookies,
              token_v2: loginResult.token_v2,
              message: "Login successful - credentials cached",
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Increment failure count on failed login
        const newFailureCount = (typedAccount.failure_count || 0) + 1;
        await supabase
          .from("reddit_accounts")
          .update({
            failure_count: newFailureCount,
            is_active: newFailureCount < 3,
          })
          .eq("id", accountId);

        return NextResponse.json({
          success: false,
          action: "login",
          error: loginResult.error || "Login failed",
          result: {
            username: typedAccount.username,
            newFailureCount,
            accountDisabled: newFailureCount >= 3,
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "comment": {
        // Test commenting - requires bearer (token_v2) from prior login
        const { text, post_url, bearer, proxy } = params || {};

        if (!text || !post_url || !bearer || !proxy) {
          return NextResponse.json(
            { 
              error: "Missing required parameters: text, post_url, bearer (token_v2), and proxy",
              hint: "First run a login test to get the token_v2, then use it as bearer with the same proxy"
            },
            { status: 400 }
          );
        }

        console.log(`[Test Reddapi] Testing comment on: ${post_url}`);

        const commentResult = await client.comment({
          text,
          post_url,
          bearer,
          proxy,
        });

        return NextResponse.json({
          success: commentResult.success,
          action: "comment",
          result: commentResult.success ? commentResult.data : undefined,
          error: commentResult.error,
          message: commentResult.message,
          timestamp: new Date().toISOString(),
        });
      }

      case "full_flow": {
        // Full flow: login with account, then comment
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required for full flow test" },
            { status: 400 }
          );
        }

        const { text, post_url } = params || {};
        if (!text || !post_url) {
          return NextResponse.json(
            { error: "text and post_url are required for full flow test" },
            { status: 400 }
          );
        }

        const { data: account, error: accountError } = await supabase
          .from("reddit_accounts")
          .select("*")
          .eq("id", accountId)
          .single();

        if (accountError || !account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 }
          );
        }

        const typedAccount = account as RedditAccount;
        const steps: Array<{ step: string; success: boolean; data?: unknown; error?: string }> = [];

        // Step 1: Login
        console.log(`[Test Reddapi] Full flow - Step 1: Login for ${typedAccount.username}`);
        const loginResult = await client.login({
          username: typedAccount.username,
          password: typedAccount.password,
          proxy: typedAccount.proxy,
        });

        steps.push({
          step: "login",
          success: loginResult.success,
          data: loginResult.success ? { username: typedAccount.username } : undefined,
          error: loginResult.error,
        });

        if (!loginResult.success || !loginResult.token_v2) {
          // Update failure count
          const newFailureCount = (typedAccount.failure_count || 0) + 1;
          await supabase
            .from("reddit_accounts")
            .update({
              failure_count: newFailureCount,
              is_active: newFailureCount < 3,
            })
            .eq("id", accountId);

          return NextResponse.json({
            success: false,
            action: "full_flow",
            steps,
            error: "Login step failed - no token_v2 returned",
            timestamp: new Date().toISOString(),
          });
        }

        // Save cookies and token_v2 to database
        await supabase
          .from("reddit_accounts")
          .update({
            cookies: loginResult.cookies || null,
            token_v2: loginResult.token_v2,
            cookies_updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);

        // Step 2: Comment
        console.log(`[Test Reddapi] Full flow - Step 2: Comment on ${post_url}`);
        const commentResult = await client.comment({
          text,
          post_url,
          bearer: loginResult.token_v2,  // Use token_v2 as bearer
          proxy: typedAccount.proxy,
        });

        steps.push({
          step: "comment",
          success: commentResult.success,
          data: commentResult.success ? commentResult.data : undefined,
          error: commentResult.error,
        });

        // Update account timestamps
        await supabase
          .from("reddit_accounts")
          .update({
            last_used_at: new Date().toISOString(),
            failure_count: 0,
          })
          .eq("id", accountId);

        return NextResponse.json({
          success: commentResult.success,
          action: "full_flow",
          steps,
          result: commentResult.success ? commentResult.data : undefined,
          error: commentResult.success ? undefined : "Comment step failed",
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Test Reddapi] Unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        success: false,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch reddit accounts for testing
export async function GET() {
  try {
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

    // Fetch all reddit accounts
    const { data: accounts, error } = await supabase
      .from("reddit_accounts")
      .select("id, username, is_active, failure_count, last_used_at, proxy")
      .order("last_used_at", { ascending: true, nullsFirst: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mask proxy passwords for display
    const maskedAccounts = (accounts || []).map((account) => ({
      ...account,
      proxy_masked: maskProxy(account.proxy),
    }));

    return NextResponse.json({
      success: true,
      accounts: maskedAccounts,
    });
  } catch (error) {
    console.error("[Test Reddapi] Error fetching accounts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// Helper to mask proxy password for display
function maskProxy(proxy: string): string {
  // Format: hostname:port:user:pass
  const parts = proxy.split(":");
  if (parts.length >= 4) {
    return `${parts[0]}:${parts[1]}:${parts[2]}:****`;
  }
  return proxy;
}

