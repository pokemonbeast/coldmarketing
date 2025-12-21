// Stagehand Reddit Automation Client
// Uses Browserbase's AI-powered Stagehand framework for natural language browser automation

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

export interface StagehandRedditConfig {
  apiKey: string;
  projectId: string;
  proxies?: boolean;
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
      proxies: true,
      stealth: true,
      timing: { min_delay: 2000, max_delay: 5000 },
      ...config,
    };
  }

  /**
   * Initialize the Stagehand browser session
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    console.log("[Stagehand] Initializing browser session...");

    this.stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: this.config.apiKey,
      projectId: this.config.projectId,
      browserbaseSessionCreateParams: {
        proxies: this.config.proxies,
        browserSettings: {
          advancedStealth: this.config.stealth,
          viewport: { width: 1920, height: 1080 },
        },
      },
    });

    await this.stagehand.init();
    this.isInitialized = true;
    console.log("[Stagehand] Browser session initialized");
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

      // Navigate to Reddit login
      await page.goto("https://www.reddit.com/login");
      await this.humanDelay();

      // Enter username
      await this.stagehand.act(`type "${username}" into the username field`);
      await this.humanDelay();

      // Enter password
      await this.stagehand.act(`type "${password}" into the password field`);
      await this.humanDelay();

      // Click login button
      await this.stagehand.act("click the login button");
      await this.humanDelay();

      // Wait for navigation/login to complete
      await new Promise((r) => setTimeout(r, 3000));

      // Check if login was successful by looking for user menu
      const loginCheck = await this.stagehand.extract(
        "Check if there is a user profile menu or avatar visible indicating successful login",
        z.object({
          isLoggedIn: z.boolean(),
          username: z.string().optional(),
        })
      );

      if (loginCheck.isLoggedIn) {
        console.log(`[Stagehand] Login successful for ${username}`);
        
        // Note: Cookie extraction may need adjustment based on V3 API
        // For now, return success without cookies
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
          errorMessage: z.string().optional(),
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
            errorMessage: z.string().optional(),
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
   * Restore a session using saved cookies
   * Note: Cookie restoration may require direct CDP commands in V3
   */
  async restoreSession(_cookies: string): Promise<boolean> {
    if (!this.stagehand) return false;

    try {
      const page = this.getPage();
      if (!page) return false;

      // Navigate to Reddit first
      await page.goto("https://www.reddit.com");
      await this.humanDelay();

      // Check if already logged in (cookies may have persisted in session)
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

