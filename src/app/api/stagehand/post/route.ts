import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createStagehandRedditClient } from "@/lib/api/stagehand-reddit";

// Timeout safety: 55 seconds for Vercel Pro (60s limit)
const TIMEOUT_MS = 55000;

interface PostRequest {
  subreddit: string;
  title: string;
  body: string;
  account_id?: string; // Optional: specific Reddit account to use
  provider_id?: string; // Optional: specific Stagehand provider to use
}

interface RedditAccount {
  id: string;
  username: string;
  password: string;
  proxy: string;
  cookies: string | null;
  token_v2: string | null;
  is_active: boolean;
  failure_count: number;
  last_used_at: string | null;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if user is admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    const body: PostRequest = await request.json();
    const { subreddit, title, body: postBody, account_id, provider_id } = body;

    if (!subreddit || !title || !postBody) {
      return NextResponse.json(
        { error: "Missing required parameters: subreddit, title, and body" },
        { status: 400 }
      );
    }

    console.log(`[Stagehand Post] Creating post in r/${subreddit}...`);

    // Get Stagehand provider configuration
    const providerQuery = provider_id
      ? supabase
          .from("api_providers")
          .select("*")
          .eq("id", provider_id)
          .eq("provider_type", "stagehand_reddit")
          .single()
      : supabase
          .from("api_providers")
          .select("*")
          .eq("provider_type", "stagehand_reddit")
          .eq("is_active", true)
          .limit(1)
          .single();

    const { data: provider, error: providerError } = await providerQuery;

    if (providerError || !provider) {
      console.error("[Stagehand Post] No Stagehand provider found");
      return NextResponse.json(
        { error: "No active Stagehand Reddit provider configured" },
        { status: 500 }
      );
    }

    const config = provider.config as Record<string, unknown> | null;
    const apiKey = provider.api_key_encrypted;
    const projectId = config?.project_id as string;

    if (!apiKey || !projectId) {
      return NextResponse.json(
        { error: "Stagehand provider missing API key or Project ID" },
        { status: 500 }
      );
    }

    // Get Reddit account to use
    const accountQuery = account_id
      ? supabase
          .from("reddit_accounts")
          .select("*")
          .eq("id", account_id)
          .eq("is_active", true)
          .single()
      : supabase
          .from("reddit_accounts")
          .select("*")
          .eq("is_active", true)
          .order("last_used_at", { ascending: true, nullsFirst: true })
          .limit(1)
          .single();

    const { data: account, error: accountError } = await accountQuery;

    if (accountError || !account) {
      console.log("[Stagehand Post] No active Reddit account available");
      return NextResponse.json(
        { error: "No active Reddit accounts available" },
        { status: 503 }
      );
    }

    const redditAccount = account as unknown as RedditAccount;
    console.log(`[Stagehand Post] Using account: ${redditAccount.username}`);

    // Get LLM API key from environment (supports Google Gemini)
    const modelApiKey = process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!modelApiKey) {
      return NextResponse.json(
        { error: "No LLM API key configured (GOOGLE_AI_API_KEY or OPENAI_API_KEY)" },
        { status: 500 }
      );
    }

    // Initialize Stagehand client
    const client = createStagehandRedditClient({
      apiKey,
      projectId,
      modelApiKey,
      modelName: "gemini-2.5-flash-preview-04-17", // Latest Gemini model
      proxies: (config?.proxies as boolean) ?? true,
      stealth: (config?.stealth as boolean) ?? true,
      timing: (config?.timing as { min_delay: number; max_delay: number }) ?? {
        min_delay: 2000,
        max_delay: 5000,
      },
    });

    try {
      await client.init();
      
      // Get session info for live viewing
      const sessionInfo = client.getSessionInfo();
      console.log(`[Stagehand Post] Live view: ${sessionInfo.liveViewUrl}`);

      // Check timeout
      if (Date.now() - startTime >= TIMEOUT_MS) {
        await client.close();
        return NextResponse.json(
          { error: "Timeout during initialization", session: sessionInfo },
          { status: 504 }
        );
      }

      // Try to restore session first if we have cookies
      let loggedIn = false;
      if (redditAccount.cookies) {
        console.log("[Stagehand Post] Attempting session restore...");
        loggedIn = await client.restoreSession(redditAccount.cookies);
      }

      // Login if session restore failed
      if (!loggedIn) {
        console.log("[Stagehand Post] Logging in...");
        const loginResult = await client.login(
          redditAccount.username,
          redditAccount.password
        );

        if (!loginResult.success) {
          // Update failure count
          const newFailureCount = (redditAccount.failure_count || 0) + 1;
          await supabase
            .from("reddit_accounts")
            .update({
              failure_count: newFailureCount,
              is_active: newFailureCount < 3,
            })
            .eq("id", redditAccount.id);

          await client.close();
          return NextResponse.json(
            {
              error: "Login failed",
              details: loginResult.error,
              account: redditAccount.username,
              session: sessionInfo,
            },
            { status: 401 }
          );
        }

        // Save new cookies if available
        if (loginResult.cookies) {
          await supabase
            .from("reddit_accounts")
            .update({
              cookies: loginResult.cookies,
              cookies_updated_at: new Date().toISOString(),
            })
            .eq("id", redditAccount.id);
        }
      }

      // Check timeout before posting
      if (Date.now() - startTime >= TIMEOUT_MS) {
        await client.close();
        return NextResponse.json(
          { error: "Timeout after login", session: sessionInfo },
          { status: 504 }
        );
      }

      // Create the post
      console.log("[Stagehand Post] Creating post...");
      const postResult = await client.createPost(subreddit, title, postBody);

      // Close the browser session
      await client.close();

      // Update account last used
      await supabase
        .from("reddit_accounts")
        .update({
          last_used_at: new Date().toISOString(),
          failure_count: postResult.success ? 0 : redditAccount.failure_count,
        })
        .eq("id", redditAccount.id);

      if (!postResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: postResult.error,
            account_used: redditAccount.username,
            elapsed_ms: Date.now() - startTime,
            session: sessionInfo,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        post_url: postResult.postUrl,
        account_used: redditAccount.username,
        elapsed_ms: Date.now() - startTime,
        session: sessionInfo,
      });
    } catch (error) {
      // Ensure browser is closed on error
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
      throw error;
    }
  } catch (error) {
    console.error("[Stagehand Post] Unexpected error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unexpected error occurred",
        success: false,
      },
      { status: 500 }
    );
  }
}

