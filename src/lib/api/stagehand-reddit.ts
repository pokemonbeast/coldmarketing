// Stagehand Reddit Automation Client
// Uses Browserbase's AI-powered Stagehand framework for natural language browser automation

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

export interface CustomProxyConfig {
  server: string; // Full proxy URL: http://user:pass@host:port
  username?: string;
  password?: string;
}

export interface StagehandRedditConfig {
  apiKey: string; // Browserbase API key
  projectId: string; // Browserbase project ID
  modelApiKey?: string; // LLM API key (Google, OpenAI, Anthropic)
  modelName?: string; // LLM model name
  proxyMode?: "browserbase" | "custom" | "none"; // Which proxy to use
  customProxy?: CustomProxyConfig; // Custom proxy configuration
  contextId?: string; // Browserbase Context ID for persistent browser profile
  proxies?: boolean; // Legacy: use Browserbase proxies
  stealth?: boolean;
  timing?: {
    min_delay: number;
    max_delay: number;
  };
}

export interface RedditLoginResult {
  success: boolean;
  error?: string;
  cookies?: string;
}

export interface RedditCommentResult {
  success: boolean;
  error?: string;
  commentId?: string;
}

export interface RedditPostResult {
  success: boolean;
  error?: string;
  postUrl?: string;
}

/**
 * Stagehand Reddit Automation Client
 * Uses natural language commands for robust browser automation
 */
export class StagehandRedditClient {
  private stagehand: Stagehand | null = null;
  private config: StagehandRedditConfig;
  private isInitialized = false;

  constructor(config: StagehandRedditConfig) {
    this.config = {
      proxyMode: "browserbase", // Default to Browserbase proxies
      proxies: true,
      stealth: true,
      // Slower timing to appear more human-like (3-7 seconds between actions)
      timing: { min_delay: 3000, max_delay: 7000 },
      ...config,
    };
  }

  /**
   * Build the proxy configuration based on proxyMode
   * Browserbase expects: { type: "external", server: "http://host:port", username: "...", password: "..." }
   */
  private buildProxyConfig(): boolean | Array<{ type: string; server?: string; username?: string; password?: string }> {
    const { proxyMode, customProxy } = this.config;

    if (proxyMode === "none") {
      console.log("[Stagehand] Proxy mode: none (direct connection)");
      return false;
    }

    if (proxyMode === "custom" && customProxy) {
      // Parse proxy URL if username/password are embedded
      // Format: http://user:pass@host:port or https://user:pass@host:port
      let server = customProxy.server;
      let username = customProxy.username;
      let password = customProxy.password;

      console.log("[Stagehand] Parsing custom proxy URL:", server?.replace(/:[^:@]+@/, ":***@"));

      // Check if credentials are embedded in the URL
      if (server && server.includes("@")) {
        // Use URL parsing for robust extraction
        // Format: http://username:password@host:port
        try {
          // Add protocol if missing for URL parsing
          const urlToParse = server.startsWith("http") ? server : "http://" + server;
          const url = new URL(urlToParse);
          
          // Extract components
          username = username || decodeURIComponent(url.username);
          password = password || decodeURIComponent(url.password);
          // Server is just protocol + host + port (no credentials)
          server = `${url.protocol}//${url.host}`;
          
          console.log("[Stagehand] Parsed proxy using URL API:");
          console.log("  - Server:", server);
          console.log("  - Username:", username?.substring(0, 30) + (username && username.length > 30 ? "..." : ""));
          console.log("  - Password:", password ? `[SET, ${password.length} chars]` : "[NOT SET]");
        } catch (parseError) {
          console.warn("[Stagehand] URL parsing failed, trying regex fallback:", parseError);
          
          // Fallback regex: protocol://username:password@host:port
          // [^:] matches anything except colon (for username up to first colon)
          // [^@] matches anything except @ (for password up to @)
          const match = server.match(/^(https?:\/\/)?([^:]+):([^@]+)@(.+)$/);
          if (match) {
            const [, protocol, user, pass, hostPort] = match;
            username = username || user;
            password = password || pass;
            server = (protocol || "http://") + hostPort;
            
            console.log("[Stagehand] Parsed proxy using regex:");
            console.log("  - Server:", server);
            console.log("  - Username:", username?.substring(0, 30) + "...");
            console.log("  - Password:", password ? "[SET]" : "[NOT SET]");
          } else {
            console.error("[Stagehand] Failed to parse proxy URL format");
          }
        }
      }

      // Ensure server has protocol
      if (server && !server.startsWith("http://") && !server.startsWith("https://")) {
        server = "http://" + server;
      }

      const proxyConfig = [
        {
          type: "external" as const,
          server,
          username,
          password,
        },
      ];

      console.log("[Stagehand] Final proxy config for Browserbase:", JSON.stringify({
        type: proxyConfig[0].type,
        server: proxyConfig[0].server,
        usernameLength: proxyConfig[0].username?.length || 0,
        hasPassword: !!proxyConfig[0].password,
        passwordLength: proxyConfig[0].password?.length || 0,
      }));

      return proxyConfig;
    }

    // Default: use Browserbase proxies
    console.log("[Stagehand] Proxy mode: browserbase (built-in proxies)");
    return true;
  }

  /**
   * Initialize the Stagehand browser session
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    console.log("[Stagehand] Initializing browser session...");
    console.log("[Stagehand] Proxy mode:", this.config.proxyMode);

    const proxyConfig = this.buildProxyConfig();

    // Build browser settings with optional context
    const browserSettings: Record<string, unknown> = {
      // Advanced Stealth enabled for enhanced bot detection evasion
      advancedStealth: true,
      viewport: { width: 1920, height: 1080 },
      // Fingerprint to appear as a real user
      fingerprint: {
        browsers: ["chrome"],
        devices: ["desktop"],
        operatingSystems: ["windows"],
        locales: ["en-US"],
      },
      // Block ads to reduce detection vectors
      blockAds: true,
      // Solve captchas if they appear
      solveCaptchas: true,
    };

    // Add persistent context if provided (saves cookies, localStorage, browser history)
    if (this.config.contextId) {
      console.log("[Stagehand] Using persistent context:", this.config.contextId);
      browserSettings.context = {
        id: this.config.contextId,
        persist: true, // Save state after session ends
      };
    } else {
      console.log("[Stagehand] No context ID - using fresh browser profile");
    }

    this.stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: this.config.apiKey,
      projectId: this.config.projectId,
      // LLM configuration for natural language commands (Google Gemini)
      model: {
        modelName: (this.config.modelName || "gemini-2.0-flash") as "gemini-2.0-flash",
        apiKey: this.config.modelApiKey,
      },
      browserbaseSessionCreateParams: {
        proxies: proxyConfig,
        browserSettings,
      },
    });

    await this.stagehand.init();
    this.isInitialized = true;
    
    // Log session URLs for debugging
    console.log("[Stagehand] Browser session initialized");
    console.log("[Stagehand] Session ID:", this.stagehand.browserbaseSessionID);
    console.log("[Stagehand] Live View URL:", this.stagehand.browserbaseSessionURL);
    console.log("[Stagehand] Debug URL:", this.stagehand.browserbaseDebugURL);
  }

  /**
   * Get session viewing URLs (available after init)
   */
  getSessionInfo(): {
    sessionId?: string;
    liveViewUrl?: string;
    debugUrl?: string;
  } {
    return {
      sessionId: this.stagehand?.browserbaseSessionID,
      liveViewUrl: this.stagehand?.browserbaseSessionURL,
      debugUrl: this.stagehand?.browserbaseDebugURL,
    };
  }

  /**
   * Add a human-like random delay between actions
   */
  private async humanDelay(): Promise<void> {
    const { min_delay, max_delay } = this.config.timing!;
    const delay = Math.random() * (max_delay - min_delay) + min_delay;
    console.log(`[Stagehand] Waiting ${Math.round(delay)}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Get the active page from context
   */
  private getPage() {
    if (!this.stagehand) return null;
    return this.stagehand.context.activePage();
  }

  /**
   * Login to Reddit with username and password
   */
  async login(username: string, password: string): Promise<RedditLoginResult> {
    if (!this.stagehand) {
      return { success: false, error: "Stagehand not initialized" };
    }

    try {
      console.log(`[Stagehand] Logging in as ${username}...`);
      const page = this.getPage();
      if (!page) {
        return { success: false, error: "No active page available" };
      }

      // Enable Network domain for cookie management
      try {
        await page.sendCDP("Network.enable", {});
      } catch (error) {
        console.warn("[Stagehand] Network domain may already be enabled:", error);
      }

      // Navigate to Old Reddit login (less aggressive bot detection)
      await page.goto("https://old.reddit.com/login");
      await this.humanDelay();

      // Check which Reddit version we're on and adapt
      const currentUrl = page.url();
      const isOldReddit = currentUrl.includes("old.reddit.com");
      
      if (isOldReddit) {
        // Old Reddit login form
        console.log("[Stagehand] Using Old Reddit login flow...");
        await this.stagehand.act(`type "${username}" into the username input field`);
        await this.humanDelay();
        
        await this.stagehand.act(`type "${password}" into the password input field`);
        await this.humanDelay();
        
        await this.stagehand.act('click the "log in" button to submit the login form');
        await this.humanDelay();
      } else {
        // New Reddit login form
        console.log("[Stagehand] Using New Reddit login flow...");
        await this.stagehand.act(`click on the input field labeled "Email or username" and type "${username}"`);
        await this.humanDelay();

        await this.stagehand.act(`click on the password input field (the second input field, type="password") and type the password "${password}"`);
        await this.humanDelay();

        await this.stagehand.act('click the orange "Log In" button to submit the login form');
        await this.humanDelay();
      }

      // Wait for navigation/login to complete
      await new Promise((r) => setTimeout(r, 3000));

      // Check if login was successful by looking for user menu
      const loginCheck = await this.stagehand.extract(
        "Check if there is a user profile menu or avatar visible indicating successful login",
        z.object({
          isLoggedIn: z.boolean(),
          username: z.string().nullish(), // Allow null, undefined, or string
        })
      );

      if (loginCheck.isLoggedIn) {
        console.log(`[Stagehand] Login successful for ${username}`);
        
        // Get cookies using CDP
        try {
          const cookiesResponse = await page.sendCDP<{ cookies: Array<{ name: string; value: string; domain?: string; path?: string }> }>(
            "Network.getCookies",
            {}
          );
          
          if (cookiesResponse?.cookies) {
            const cookieString = cookiesResponse.cookies
              .map(c => `${c.name}=${c.value}`)
              .join("; ");
            return { success: true, cookies: cookieString };
          }
        } catch (error) {
          console.warn("[Stagehand] Failed to get cookies via CDP:", error);
        }
        
        return { success: true };
      } else {
        console.log(`[Stagehand] Login may have failed for ${username}`);
        return { success: false, error: "Login verification failed" };
      }
    } catch (error) {
      console.error("[Stagehand] Login error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown login error",
      };
    }
  }

  /**
   * Post a comment on a Reddit post
   */
  async postComment(postUrl: string, comment: string): Promise<RedditCommentResult> {
    if (!this.stagehand) {
      return { success: false, error: "Stagehand not initialized" };
    }

    try {
      console.log(`[Stagehand] Posting comment to ${postUrl}...`);
      const page = this.getPage();
      if (!page) {
        return { success: false, error: "No active page available" };
      }

      // Navigate to the post
      await page.goto(postUrl);
      await this.humanDelay();

      // Click on the comment box to focus it
      await this.stagehand.act("click on the comment input box or text area");
      await this.humanDelay();

      // Type the comment (character by character for more human-like behavior)
      await this.stagehand.act(`type "${comment}" into the comment box`);
      await this.humanDelay();

      // Submit the comment
      await this.stagehand.act("click the comment submit button or post button");
      await this.humanDelay();

      // Wait for comment to be posted
      await new Promise((r) => setTimeout(r, 2000));

      // Verify comment was posted
      const verifyResult = await this.stagehand.extract(
        `Check if the comment "${comment.substring(0, 30)}..." appears on the page, indicating successful posting`,
        z.object({
          commentPosted: z.boolean(),
          errorMessage: z.string().nullish(), // Allow null, undefined, or string
        })
      );

      if (verifyResult.commentPosted) {
        console.log("[Stagehand] Comment posted successfully");
        return { success: true };
      } else {
        console.log("[Stagehand] Comment may not have been posted");
        return {
          success: false,
          error: verifyResult.errorMessage || "Comment verification failed",
        };
      }
    } catch (error) {
      console.error("[Stagehand] Comment error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown comment error",
      };
    }
  }

  /**
   * Create a new post in a subreddit
   */
  async createPost(
    subreddit: string,
    title: string,
    body: string
  ): Promise<RedditPostResult> {
    if (!this.stagehand) {
      return { success: false, error: "Stagehand not initialized" };
    }

    try {
      console.log(`[Stagehand] Creating post in r/${subreddit}...`);
      const page = this.getPage();
      if (!page) {
        return { success: false, error: "No active page available" };
      }

      // Navigate to subreddit submit page
      await page.goto(`https://www.reddit.com/r/${subreddit}/submit`);
      await this.humanDelay();

      // Enter the title
      await this.stagehand.act(`type "${title}" into the post title field`);
      await this.humanDelay();

      // Enter the body/content
      await this.stagehand.act(`type "${body}" into the post body or content area`);
      await this.humanDelay();

      // Submit the post
      await this.stagehand.act("click the post submit button");
      await this.humanDelay();

      // Wait for post to be created and redirected
      await new Promise((r) => setTimeout(r, 3000));

      // Get the new post URL
      const currentUrl = page.url();
      
      if (currentUrl.includes("/comments/")) {
        console.log(`[Stagehand] Post created successfully: ${currentUrl}`);
        return { success: true, postUrl: currentUrl };
      } else {
        // Try to extract any error messages
        const errorCheck = await this.stagehand.extract(
          "Check if there are any error messages visible on the page",
          z.object({
            hasError: z.boolean(),
            errorMessage: z.string().nullish(), // Allow null, undefined, or string
          })
        );

        if (errorCheck.hasError) {
          return { success: false, error: errorCheck.errorMessage || "Post creation failed" };
        }
        
        return { success: false, error: "Post URL not detected after submission" };
      }
    } catch (error) {
      console.error("[Stagehand] Post creation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown post error",
      };
    }
  }

  /**
   * Restore a session using saved cookies via CDP
   */
  async restoreSession(cookies: string): Promise<boolean> {
    if (!this.stagehand) return false;

    try {
      const page = this.getPage();
      if (!page) return false;

      // Enable Network domain for cookie management
      try {
        await page.sendCDP("Network.enable", {});
      } catch (error) {
        console.warn("[Stagehand] Network domain may already be enabled:", error);
      }

      // Parse cookie string into CDP format
      const cookieObjects = cookies.split("; ").map((cookie) => {
        const [name, value] = cookie.split("=");
        return {
          name: name.trim(),
          value: value?.trim() || "",
          domain: ".reddit.com",
          path: "/",
          secure: true,
          httpOnly: false,
          sameSite: "None" as const,
        };
      });

      // Set cookies using CDP before navigation
      try {
        for (const cookie of cookieObjects) {
          await page.sendCDP("Network.setCookie", cookie);
        }
        console.log(`[Stagehand] Restored ${cookieObjects.length} cookies`);
      } catch (error) {
        console.warn("[Stagehand] Failed to set cookies via CDP:", error);
      }

      // Navigate to Reddit to verify session
      await page.goto("https://www.reddit.com");
      await this.humanDelay();

      // Check if logged in
      const loginCheck = await this.stagehand.extract(
        "Check if there is a user profile menu or avatar visible indicating an active login session",
        z.object({
          isLoggedIn: z.boolean(),
        })
      );

      return loginCheck.isLoggedIn;
    } catch (error) {
      console.error("[Stagehand] Session restore error:", error);
      return false;
    }
  }

  /**
   * Close the browser session
   */
  async close(): Promise<void> {
    if (this.stagehand) {
      console.log("[Stagehand] Closing browser session...");
      await this.stagehand.close();
      this.stagehand = null;
      this.isInitialized = false;
    }
  }

  /**
   * Get the current page URL
   */
  async getCurrentUrl(): Promise<string | null> {
    const page = this.getPage();
    if (!page) return null;
    return page.url();
  }
}

/**
 * Create a Stagehand Reddit client instance
 */
export function createStagehandRedditClient(
  config: StagehandRedditConfig
): StagehandRedditClient {
  return new StagehandRedditClient(config);
}

/**
 * Create a new Browserbase Context for persistent browser profiles
 * Uses the Browserbase SDK directly
 */
export async function createBrowserbaseContext(
  apiKey: string,
  projectId: string
): Promise<string> {
  // Import Browserbase SDK dynamically
  const { Browserbase } = await import("@browserbasehq/sdk");
  
  const bb = new Browserbase({ apiKey });
  
  console.log("[Browserbase] Creating new context for project:", projectId);
  
  const context = await bb.contexts.create({ projectId });
  
  console.log("[Browserbase] Context created:", context.id);
  
  return context.id;
}

