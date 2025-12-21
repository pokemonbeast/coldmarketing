// Reddapi.online API Types and Client
// API Documentation: https://reddapi.online

export interface ReddapiLoginResponse {
  success: boolean;
  cookies?: string;      // RapidAPI returns cookies
  token_v2?: string;     // RapidAPI returns token_v2
  bearer?: string;       // Legacy support
  error?: string;
  message?: string;
}

export interface ReddapiCommentResponse {
  success: boolean;
  data?: {
    id?: string;
    name?: string;
    [key: string]: unknown;
  };
  error?: string;
  message?: string;
}

export interface ReddapiLoginParams {
  username: string;
  password: string;
  proxy: string; // Format: hostname:port:user:pass
}

export interface ReddapiCommentParams {
  text: string;
  post_url: string;
  bearer: string;         // token_v2 from login response (used as bearer)
  proxy: string;          // Format: hostname:port:user:pass or ip:port
}

const DEFAULT_API_URL = "https://reddapi.p.rapidapi.com";
const DEFAULT_API_HOST = "reddapi.p.rapidapi.com";

/**
 * Reddapi.online API Client (via RapidAPI)
 * Handles Reddit account authentication and commenting via proxy
 */
export class ReddapiClient {
  private apiUrl: string;
  private apiKey: string;
  private apiHost: string;

  constructor(apiKey: string, apiUrl: string = DEFAULT_API_URL, apiHost: string = DEFAULT_API_HOST) {
    this.apiUrl = apiUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
    this.apiHost = apiHost;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-rapidapi-key": this.apiKey,
      "x-rapidapi-host": this.apiHost,
    };
  }

  /**
   * Login to Reddit account via reddapi
   * POST /api/login (RapidAPI endpoint)
   * 
   * @param params - Login parameters (username, password, proxy)
   * @returns Login response with cookies and token_v2 on success
   */
  async login(params: ReddapiLoginParams): Promise<ReddapiLoginResponse> {
    const { username, password, proxy } = params;

    console.log(`[Reddapi] Attempting login for user: ${username}`);
    console.log(`[Reddapi] Request URL: ${this.apiUrl}/api/login`);

    try {
      const response = await fetch(`${this.apiUrl}/api/login`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          username,
          password,
          proxy, // Pass as string: hostname:port:user:pass or ip:port
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Reddapi] Login HTTP error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log(`[Reddapi] Raw login response:`, JSON.stringify(data, null, 2));
      
      // RapidAPI returns: cookies (string), token_v2 (string)
      if (data.cookies || data.token_v2) {
        console.log(`[Reddapi] Login successful for user: ${username}`);
        return {
          success: true,
          cookies: data.cookies,
          token_v2: data.token_v2,
        };
      }

      // Handle error responses
      console.error(`[Reddapi] Login failed for user: ${username}`, data);
      return {
        success: false,
        error: data.error || data.message || "Login failed - no cookies/token returned",
      };
    } catch (error) {
      console.error(`[Reddapi] Login exception for user: ${username}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error during login",
      };
    }
  }

  /**
   * Post a comment to a Reddit post
   * POST /api/comment
   * 
   * @param params - Comment parameters (text, post_url, cookies, proxy)
   * @returns Comment response with result data on success
   */
  async comment(params: ReddapiCommentParams): Promise<ReddapiCommentResponse> {
    const { text, post_url, bearer, proxy } = params;

    console.log(`[Reddapi] Posting comment to: ${post_url}`);
    console.log(`[Reddapi] Request URL: ${this.apiUrl}/api/comment`);

    try {
      const response = await fetch(`${this.apiUrl}/api/comment`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          text,
          post_url,
          bearer,   // Use token_v2 from login as bearer
          proxy,    // Pass as string: hostname:port:user:pass or ip:port
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Reddapi] Comment HTTP error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      // Check for error in response
      if (data.error) {
        console.error(`[Reddapi] Comment failed:`, data);
        return {
          success: false,
          error: data.error,
          message: data.message,
        };
      }

      console.log(`[Reddapi] Comment posted successfully`);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`[Reddapi] Comment exception:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error during comment",
      };
    }
  }
}

/**
 * Create a Reddapi client instance
 */
export function createReddapiClient(apiKey: string, apiUrl: string = DEFAULT_API_URL): ReddapiClient {
  return new ReddapiClient(apiKey, apiUrl);
}

/**
 * Default exports
 */
export const REDDAPI_DEFAULT_URL = DEFAULT_API_URL;
export const REDDAPI_DEFAULT_HOST = DEFAULT_API_HOST;

