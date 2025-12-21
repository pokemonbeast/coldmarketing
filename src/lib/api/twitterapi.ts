// TwitterAPI.io API Types and Client
// API Documentation: https://docs.twitterapi.io

const DEFAULT_API_URL = "https://api.twitterapi.io";

// ============ Response Types ============

export interface TwitterApiLoginResponse {
  login_cookie?: string;
  status: string;  // "success" or "error"
  msg?: string;
}

export interface TwitterApiTweetResponse {
  tweet_id?: string;
  status: string;
  msg?: string;
}

export interface TwitterApiDMResponse {
  message_id?: string;
  status: string;
  msg?: string;
}

// ============ Request Parameter Types ============

export interface TwitterApiLoginParams {
  user_name: string;
  email: string;
  password: string;
  proxy: string;  // Format: http://username:password@ip:port
  totp_secret?: string;  // Optional: for 2FA accounts
}

export interface TwitterApiTweetParams {
  login_cookies: string;
  tweet_text: string;
  proxy: string;
  reply_to_tweet_id?: string;  // Optional: for replies
  attachment_url?: string;     // Optional: quote tweet URL
  community_id?: string;       // Optional: post to community
  is_note_tweet?: boolean;     // Optional: for long tweets (Premium)
  media_ids?: string[];        // Optional: media attachments
}

export interface TwitterApiDMParams {
  login_cookies: string;
  user_id: string;
  text: string;
  proxy: string;
  media_ids?: string[];
  reply_to_message_id?: string;
}

// ============ Wrapper Response Types ============

export interface TwitterLoginResult {
  success: boolean;
  login_cookie?: string;
  error?: string;
  message?: string;
}

export interface TwitterTweetResult {
  success: boolean;
  tweet_id?: string;
  error?: string;
  message?: string;
}

export interface TwitterDMResult {
  success: boolean;
  message_id?: string;
  error?: string;
  message?: string;
}

/**
 * TwitterAPI.io Client
 * Handles Twitter account login, tweeting, and DMs via twitterapi.io
 */
export class TwitterApiClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiKey: string, apiUrl: string = DEFAULT_API_URL) {
    this.apiUrl = apiUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Login to Twitter account via twitterapi.io
   * POST /twitter/user_login_v2
   * 
   * @param params - Login parameters
   * @returns Login response with login_cookie on success
   */
  async login(params: TwitterApiLoginParams): Promise<TwitterLoginResult> {
    const { user_name, email, password, proxy, totp_secret } = params;

    console.log(`[TwitterAPI] Attempting login for user: ${user_name}`);

    try {
      const body: Record<string, string> = {
        user_name,
        email,
        password,
        proxy,
      };

      if (totp_secret) {
        body.totp_secret = totp_secret;
      }

      const response = await fetch(`${this.apiUrl}/twitter/user_login_v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TwitterAPI] Login HTTP error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log(`[TwitterAPI] Raw login response:`, JSON.stringify(data, null, 2));

      // API response format: { login_cookie, status, msg }
      const loginCookie = data.login_cookie;
      const status = data.status;
      const msg = data.msg || "";

      // Check if status indicates success
      const isStatusSuccess = status === "success" || status === "Success" || 
                              msg.toLowerCase().includes("success");

      // Check if we have a valid login_cookie (not null, not empty string)
      if (loginCookie && typeof loginCookie === 'string' && loginCookie.trim().length > 0) {
        console.log(`[TwitterAPI] Login successful for user: ${user_name}, cookie length: ${loginCookie.length}`);
        return {
          success: true,
          login_cookie: loginCookie,
        };
      }

      // If status is success but no cookie, return success with warning
      if (isStatusSuccess) {
        console.warn(`[TwitterAPI] Status is success but no login_cookie found for user: ${user_name}`, data);
        return {
          success: true,
          login_cookie: "", // Empty cookie - might need to retry or check account status
          message: msg || status || "Login status is success but no cookie returned",
        };
      }

      // Login failed - provide detailed error
      console.error(`[TwitterAPI] Login failed for user: ${user_name}`, { status, msg, hasLoginCookie: !!loginCookie });
      return {
        success: false,
        error: msg || status || "Login failed - no valid login_cookie returned",
      };
    } catch (error) {
      console.error(`[TwitterAPI] Login exception for user: ${user_name}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error during login",
      };
    }
  }

  /**
   * Create a tweet
   * POST /twitter/create_tweet_v2
   * 
   * @param params - Tweet parameters
   * @returns Tweet response with tweet_id on success
   */
  async createTweet(params: TwitterApiTweetParams): Promise<TwitterTweetResult> {
    const { 
      login_cookies, 
      tweet_text, 
      proxy, 
      reply_to_tweet_id, 
      attachment_url, 
      community_id,
      is_note_tweet,
      media_ids 
    } = params;

    console.log(`[TwitterAPI] Creating tweet: "${tweet_text.substring(0, 50)}..."`);

    try {
      const body: Record<string, unknown> = {
        login_cookies,
        tweet_text,
        proxy,
      };

      if (reply_to_tweet_id) body.reply_to_tweet_id = reply_to_tweet_id;
      if (attachment_url) body.attachment_url = attachment_url;
      if (community_id) body.community_id = community_id;
      if (is_note_tweet !== undefined) body.is_note_tweet = is_note_tweet;
      if (media_ids && media_ids.length > 0) body.media_ids = media_ids;

      const response = await fetch(`${this.apiUrl}/twitter/create_tweet_v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TwitterAPI] Tweet HTTP error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data: TwitterApiTweetResponse = await response.json();

      if (data.status === "success" && data.tweet_id) {
        console.log(`[TwitterAPI] Tweet created successfully: ${data.tweet_id}`);
        return {
          success: true,
          tweet_id: data.tweet_id,
        };
      }

      console.error(`[TwitterAPI] Tweet failed:`, data);
      return {
        success: false,
        error: data.msg || "Tweet failed",
      };
    } catch (error) {
      console.error(`[TwitterAPI] Tweet exception:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error during tweet",
      };
    }
  }

  /**
   * Send a direct message
   * POST /twitter/send_dm_to_user
   * 
   * @param params - DM parameters
   * @returns DM response with message_id on success
   */
  async sendDM(params: TwitterApiDMParams): Promise<TwitterDMResult> {
    const { login_cookies, user_id, text, proxy, media_ids, reply_to_message_id } = params;

    console.log(`[TwitterAPI] Sending DM to user: ${user_id}`);

    try {
      const body: Record<string, unknown> = {
        login_cookies,
        user_id,
        text,
        proxy,
      };

      if (media_ids && media_ids.length > 0) body.media_ids = media_ids;
      if (reply_to_message_id) body.reply_to_message_id = reply_to_message_id;

      const response = await fetch(`${this.apiUrl}/twitter/send_dm_to_user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TwitterAPI] DM HTTP error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data: TwitterApiDMResponse = await response.json();

      if (data.status === "success") {
        console.log(`[TwitterAPI] DM sent successfully to: ${user_id}`);
        return {
          success: true,
          message_id: data.message_id,
        };
      }

      console.error(`[TwitterAPI] DM failed:`, data);
      return {
        success: false,
        error: data.msg || "DM failed",
      };
    } catch (error) {
      console.error(`[TwitterAPI] DM exception:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error during DM",
      };
    }
  }
}

/**
 * Create a TwitterAPI client instance
 */
export function createTwitterApiClient(apiKey: string, apiUrl: string = DEFAULT_API_URL): TwitterApiClient {
  return new TwitterApiClient(apiKey, apiUrl);
}

/**
 * Default API URL
 */
export const TWITTERAPI_DEFAULT_URL = DEFAULT_API_URL;

