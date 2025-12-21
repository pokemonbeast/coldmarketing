import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTwitterApiClient, TWITTERAPI_DEFAULT_URL } from "@/lib/api/twitterapi";

interface TwitterAccount {
  id: string;
  username: string;
  email: string;
  password: string;
  proxy: string;
  totp_secret: string | null;
  login_cookie: string | null;
  login_cookie_updated_at: string | null;
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
    let apiUrl = TWITTERAPI_DEFAULT_URL;
    let apiKey = "";
    
    if (providerId) {
      const { data: provider } = await supabase
        .from("api_providers")
        .select("api_url, api_key_encrypted")
        .eq("id", providerId)
        .eq("provider_type", "twitterapi")
        .single();

      if (provider) {
        if (provider.api_url) apiUrl = provider.api_url;
        if (provider.api_key_encrypted) apiKey = provider.api_key_encrypted;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured for TwitterAPI provider" },
        { status: 400 }
      );
    }

    const client = createTwitterApiClient(apiKey, apiUrl);

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
          .from("twitter_accounts")
          .select("*")
          .eq("id", accountId)
          .single();

        if (accountError || !account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 }
          );
        }

        const typedAccount = account as TwitterAccount;

        console.log(`[Test TwitterAPI] Testing login for account: ${typedAccount.username}`);

        const loginResult = await client.login({
          user_name: typedAccount.username,
          email: typedAccount.email,
          password: typedAccount.password,
          proxy: typedAccount.proxy,
          totp_secret: typedAccount.totp_secret || undefined,
        });

        if (loginResult.success) {
          if (loginResult.login_cookie && loginResult.login_cookie.trim().length > 0) {
            // Cache the login_cookie and reset failure count
            await supabase
              .from("twitter_accounts")
              .update({ 
                login_cookie: loginResult.login_cookie,
                login_cookie_updated_at: new Date().toISOString(),
                failure_count: 0,
                last_used_at: new Date().toISOString(),
              })
              .eq("id", accountId);

          return NextResponse.json({
            success: true,
            action: "login",
            result: {
              username: typedAccount.username,
              login_cookie: loginResult.login_cookie, // Full cookie for subsequent requests
              login_cookie_preview: loginResult.login_cookie.substring(0, 30) + "...", // Truncated for display
              message: "Login successful - cookie cached",
            },
            timestamp: new Date().toISOString(),
          });
          } else {
            // Success status but no cookie - might be account issue or API quirk
            return NextResponse.json({
              success: true,
              action: "login",
              result: {
                username: typedAccount.username,
                message: loginResult.message || "Login status is success but no cookie returned",
                warning: "No login_cookie in response - account may need verification or 2FA",
              },
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Increment failure count on failed login
        const newFailureCount = (typedAccount.failure_count || 0) + 1;
        await supabase
          .from("twitter_accounts")
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

      case "tweet": {
        // Test tweeting - requires login_cookie from prior login or cached
        const { tweet_text, reply_to_tweet_id, login_cookie, proxy } = params || {};

        if (!tweet_text) {
          return NextResponse.json(
            { error: "tweet_text is required" },
            { status: 400 }
          );
        }

        // Use provided login_cookie or require it
        if (!login_cookie || !proxy) {
          return NextResponse.json(
            { 
              error: "login_cookie and proxy are required",
              hint: "Run a login test first to get the login_cookie"
            },
            { status: 400 }
          );
        }

        console.log(`[Test TwitterAPI] Testing tweet`);

        const tweetResult = await client.createTweet({
          login_cookies: login_cookie,
          tweet_text,
          proxy,
          reply_to_tweet_id,
        });

        return NextResponse.json({
          success: tweetResult.success,
          action: "tweet",
          result: tweetResult.success ? { tweet_id: tweetResult.tweet_id } : undefined,
          error: tweetResult.error,
          timestamp: new Date().toISOString(),
        });
      }

      case "dm": {
        // Test sending DM
        const { user_id, text, login_cookie, proxy } = params || {};

        if (!user_id || !text) {
          return NextResponse.json(
            { error: "user_id and text are required" },
            { status: 400 }
          );
        }

        if (!login_cookie || !proxy) {
          return NextResponse.json(
            { 
              error: "login_cookie and proxy are required",
              hint: "Run a login test first to get the login_cookie"
            },
            { status: 400 }
          );
        }

        console.log(`[Test TwitterAPI] Testing DM to user: ${user_id}`);

        const dmResult = await client.sendDM({
          login_cookies: login_cookie,
          user_id,
          text,
          proxy,
        });

        return NextResponse.json({
          success: dmResult.success,
          action: "dm",
          result: dmResult.success ? { message_id: dmResult.message_id } : undefined,
          error: dmResult.error,
          timestamp: new Date().toISOString(),
        });
      }

      case "tweet_flow": {
        // Full flow: login + tweet
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required for tweet flow" },
            { status: 400 }
          );
        }

        const { tweet_text, reply_to_tweet_id } = params || {};
        if (!tweet_text) {
          return NextResponse.json(
            { error: "tweet_text is required" },
            { status: 400 }
          );
        }

        const { data: account, error: accountError } = await supabase
          .from("twitter_accounts")
          .select("*")
          .eq("id", accountId)
          .single();

        if (accountError || !account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 }
          );
        }

        const typedAccount = account as TwitterAccount;
        const steps: Array<{ step: string; success: boolean; data?: unknown; error?: string }> = [];

        // Step 1: Login (or use cached cookie)
        let loginCookie = typedAccount.login_cookie;
        
        // Check if we have a fresh cached cookie (less than 24 hours old)
        const cookieAge = typedAccount.login_cookie_updated_at 
          ? Date.now() - new Date(typedAccount.login_cookie_updated_at).getTime()
          : Infinity;
        const cookieStale = cookieAge > 24 * 60 * 60 * 1000; // 24 hours

        if (!loginCookie || cookieStale) {
          console.log(`[Test TwitterAPI] Tweet flow - Step 1: Login for ${typedAccount.username}`);
          const loginResult = await client.login({
            user_name: typedAccount.username,
            email: typedAccount.email,
            password: typedAccount.password,
            proxy: typedAccount.proxy,
            totp_secret: typedAccount.totp_secret || undefined,
          });

          steps.push({
            step: "login",
            success: loginResult.success,
            data: loginResult.success ? { username: typedAccount.username } : undefined,
            error: loginResult.error,
          });

          if (!loginResult.success || !loginResult.login_cookie) {
            const newFailureCount = (typedAccount.failure_count || 0) + 1;
            await supabase
              .from("twitter_accounts")
              .update({
                failure_count: newFailureCount,
                is_active: newFailureCount < 3,
              })
              .eq("id", accountId);

            return NextResponse.json({
              success: false,
              action: "tweet_flow",
              steps,
              error: "Login step failed",
              timestamp: new Date().toISOString(),
            });
          }

          loginCookie = loginResult.login_cookie;
          
          // Cache the cookie
          await supabase
            .from("twitter_accounts")
            .update({
              login_cookie: loginCookie,
              login_cookie_updated_at: new Date().toISOString(),
              failure_count: 0,
            })
            .eq("id", accountId);
        } else {
          steps.push({
            step: "login",
            success: true,
            data: { username: typedAccount.username, usedCachedCookie: true },
          });
        }

        // Step 2: Tweet
        console.log(`[Test TwitterAPI] Tweet flow - Step 2: Create tweet`);
        const tweetResult = await client.createTweet({
          login_cookies: loginCookie,
          tweet_text,
          proxy: typedAccount.proxy,
          reply_to_tweet_id,
        });

        steps.push({
          step: "tweet",
          success: tweetResult.success,
          data: tweetResult.success ? { tweet_id: tweetResult.tweet_id } : undefined,
          error: tweetResult.error,
        });

        // Update last_used_at
        await supabase
          .from("twitter_accounts")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", accountId);

        return NextResponse.json({
          success: tweetResult.success,
          action: "tweet_flow",
          steps,
          result: tweetResult.success ? { tweet_id: tweetResult.tweet_id } : undefined,
          error: tweetResult.success ? undefined : "Tweet step failed",
          timestamp: new Date().toISOString(),
        });
      }

      case "dm_flow": {
        // Full flow: login + DM
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required for DM flow" },
            { status: 400 }
          );
        }

        const { user_id, text } = params || {};
        if (!user_id || !text) {
          return NextResponse.json(
            { error: "user_id and text are required" },
            { status: 400 }
          );
        }

        const { data: account, error: accountError } = await supabase
          .from("twitter_accounts")
          .select("*")
          .eq("id", accountId)
          .single();

        if (accountError || !account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 }
          );
        }

        const typedAccount = account as TwitterAccount;
        const steps: Array<{ step: string; success: boolean; data?: unknown; error?: string }> = [];

        // Step 1: Login (or use cached cookie)
        let loginCookie = typedAccount.login_cookie;
        const cookieAge = typedAccount.login_cookie_updated_at 
          ? Date.now() - new Date(typedAccount.login_cookie_updated_at).getTime()
          : Infinity;
        const cookieStale = cookieAge > 24 * 60 * 60 * 1000;

        if (!loginCookie || cookieStale) {
          console.log(`[Test TwitterAPI] DM flow - Step 1: Login for ${typedAccount.username}`);
          const loginResult = await client.login({
            user_name: typedAccount.username,
            email: typedAccount.email,
            password: typedAccount.password,
            proxy: typedAccount.proxy,
            totp_secret: typedAccount.totp_secret || undefined,
          });

          steps.push({
            step: "login",
            success: loginResult.success,
            data: loginResult.success ? { username: typedAccount.username } : undefined,
            error: loginResult.error,
          });

          if (!loginResult.success || !loginResult.login_cookie) {
            const newFailureCount = (typedAccount.failure_count || 0) + 1;
            await supabase
              .from("twitter_accounts")
              .update({
                failure_count: newFailureCount,
                is_active: newFailureCount < 3,
              })
              .eq("id", accountId);

            return NextResponse.json({
              success: false,
              action: "dm_flow",
              steps,
              error: "Login step failed",
              timestamp: new Date().toISOString(),
            });
          }

          loginCookie = loginResult.login_cookie;
          
          await supabase
            .from("twitter_accounts")
            .update({
              login_cookie: loginCookie,
              login_cookie_updated_at: new Date().toISOString(),
              failure_count: 0,
            })
            .eq("id", accountId);
        } else {
          steps.push({
            step: "login",
            success: true,
            data: { username: typedAccount.username, usedCachedCookie: true },
          });
        }

        // Step 2: Send DM
        console.log(`[Test TwitterAPI] DM flow - Step 2: Send DM to ${user_id}`);
        const dmResult = await client.sendDM({
          login_cookies: loginCookie,
          user_id,
          text,
          proxy: typedAccount.proxy,
        });

        steps.push({
          step: "dm",
          success: dmResult.success,
          data: dmResult.success ? { message_id: dmResult.message_id } : undefined,
          error: dmResult.error,
        });

        await supabase
          .from("twitter_accounts")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", accountId);

        return NextResponse.json({
          success: dmResult.success,
          action: "dm_flow",
          steps,
          result: dmResult.success ? { message_id: dmResult.message_id } : undefined,
          error: dmResult.success ? undefined : "DM step failed",
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
    console.error("[Test TwitterAPI] Unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        success: false,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch twitter accounts for testing
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

    // Fetch all twitter accounts
    const { data: accounts, error } = await supabase
      .from("twitter_accounts")
      .select("id, username, email, is_active, failure_count, last_used_at, proxy, login_cookie, login_cookie_updated_at")
      .order("last_used_at", { ascending: true, nullsFirst: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mask proxy passwords and login cookies for display
    const maskedAccounts = (accounts || []).map((account) => ({
      ...account,
      proxy_masked: maskProxy(account.proxy),
      has_cached_cookie: !!account.login_cookie,
      login_cookie: undefined, // Don't expose the actual cookie
    }));

    return NextResponse.json({
      success: true,
      accounts: maskedAccounts,
    });
  } catch (error) {
    console.error("[Test TwitterAPI] Error fetching accounts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// Helper to mask proxy password for display
function maskProxy(proxy: string): string {
  // Format: http://username:password@ip:port
  try {
    const url = new URL(proxy);
    if (url.password) {
      url.password = "****";
    }
    return url.toString();
  } catch {
    // If not a valid URL format, try simple masking
    const match = proxy.match(/^(https?:\/\/[^:]+:)[^@]+(@.+)$/);
    if (match) {
      return `${match[1]}****${match[2]}`;
    }
    return proxy;
  }
}

