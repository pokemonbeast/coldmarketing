// Reddapi.online API Types and Client
// API Documentation: https://reddapi.online

export interface ReddapiLoginResponse {
  success: boolean;
  bearer?: string;
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
  bearer: string;
  proxy: string; // Format: hostname:port:user:pass
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
      "X-RapidAPI-Key": this.apiKey,
      "X-RapidAPI-Host": this.apiHost,
    };
  }

  /**
   * Login to Reddit account via reddapi
   * POST /api/v2/login
   * 
   * @param params - Login parameters (username, password, proxy)
   * @returns Login response with bearer token on success
   */
  async login(params: ReddapiLoginParams): Promise<ReddapiLoginResponse> {
    const { username, password, proxy } = params;

    console.log(`[Reddapi] Attempting login for user: ${username}`);

    try {
      const response = await fetch(`${this.apiUrl}/api/v2/login`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          username,
          password,
          proxy, // Pass as string: hostname:port:user:pass
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
      
      // Check for bearer token in response
      if (data.bearer) {
        console.log(`[Reddapi] Login successful for user: ${username}`);
        return {
          success: true,
          bearer: data.bearer,
        };
      }

      // Handle error responses
      console.error(`[Reddapi] Login failed for user: ${username}`, data);
      return {
        success: false,
        error: data.error || data.message || "Login failed - no bearer token returned",
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
   * @param params - Comment parameters (text, post_url, bearer, proxy)
   * @returns Comment response with result data on success
   */
  async comment(params: ReddapiCommentParams): Promise<ReddapiCommentResponse> {
    const { text, post_url, bearer, proxy } = params;

    console.log(`[Reddapi] Posting comment to: ${post_url}`);

    try {
      const response = await fetch(`${this.apiUrl}/api/comment`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          text,
          post_url,
          bearer,
          proxy, // Pass as string: hostname:port:user:pass
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

