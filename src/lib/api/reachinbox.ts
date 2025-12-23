// ReachInbox.ai API Client
// API Documentation: https://docs.reachinbox.ai

const DEFAULT_API_URL = "https://api.reachinbox.ai";

// Response types
export interface ReachInboxApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ReachInboxAccount {
  id: number;
  email: string;
  status: string;
  warmupStatus?: string;
  createdAt?: string;
}

export interface ReachInboxCampaign {
  id: number;
  name: string;
  status: string;
  createdAt?: string;
}

export interface ReachInboxSequenceStep {
  waitDays: number;
  variants: {
    subject: string;
    body: string;
  }[];
}

export interface ReachInboxSequence {
  steps: ReachInboxSequenceStep[];
}

export interface ReachInboxEmailThread {
  id: number;
  leadEmail: string;
  leadFirstName?: string;
  leadLastName?: string;
  emailAccount: string;
  subject?: string;
  messages: {
    id: string;
    from: string;
    to: string;
    body: string;
    timestamp: string;
  }[];
}

export interface ReachInboxOneboxEmail {
  email_id: number;
  lead_id: number;
  lead_email: string;
  lead_first_name?: string;
  lead_last_name?: string;
  email_account: string;
  step_number: number;
  message_id: string;
  campaign_id: number;
  campaign_name: string;
  event: string;
  timestamp: string;
  email_sent_body?: string;
  email_replied_body?: string;
}

// Webhook payload type
export interface ReachInboxWebhookPayload {
  email_id: number;
  lead_id: number;
  lead_email: string;
  email_account: string;
  step_number: number;
  message_id: string;
  timestamp: string;
  campaign_id: number;
  campaign_name: string;
  event: string;
  user_webhook_id: string;
  lead_first_name?: string;
  lead_last_name?: string;
  email_sent_body?: string;
  email_replied_body?: string;
}

/**
 * ReachInbox.ai API Client
 * Handles email campaigns, sequences, and inbox management
 */
export class ReachInboxClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiKey: string, apiUrl: string = DEFAULT_API_URL) {
    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
    };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<ReachInboxApiResponse<T>> {
    const url = `${this.apiUrl}${endpoint}`;
    console.log(`[ReachInbox] ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`[ReachInbox] Error: ${response.status}`, data);
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`[ReachInbox] Request failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // ============ Account Endpoints ============

  /**
   * Get all email accounts in the workspace
   * GET /api/v1/account/all
   */
  async getAllAccounts(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ReachInboxApiResponse<ReachInboxAccount[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set("status", params.status);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());
    
    const query = queryParams.toString();
    return this.request<ReachInboxAccount[]>(
      "GET",
      `/api/v1/account/all${query ? `?${query}` : ""}`
    );
  }

  // ============ Campaign Endpoints ============

  /**
   * Create a new campaign
   * POST /api/v1/campaigns/create
   */
  async createCampaign(name: string): Promise<ReachInboxApiResponse<{ id: number }>> {
    return this.request<{ id: number }>("POST", "/api/v1/campaigns/create", { name });
  }

  /**
   * Add sequences to a campaign
   * POST /api/v1/campaigns/add-sequence
   */
  async addSequences(
    campaignId: number,
    sequences: ReachInboxSequence[]
  ): Promise<ReachInboxApiResponse<unknown>> {
    return this.request("POST", "/api/v1/campaigns/add-sequence", {
      campaignId,
      sequences,
    });
  }

  /**
   * Set email accounts for a campaign
   * PUT /api/v1/campaigns/accounts/set/{campaignId}
   */
  async setAccounts(
    campaignId: number,
    accountIds: number[]
  ): Promise<ReachInboxApiResponse<unknown>> {
    return this.request("PUT", `/api/v1/campaigns/accounts/set/${campaignId}`, {
      accountIds,
    });
  }

  /**
   * Set schedule for a campaign
   * PUT /api/v1/campaigns/set-schedule
   */
  async setSchedule(
    campaignId: number,
    schedule: {
      timezone?: string;
      days?: string[];
      startHour?: number;
      endHour?: number;
    }
  ): Promise<ReachInboxApiResponse<unknown>> {
    return this.request("PUT", "/api/v1/campaigns/set-schedule", {
      campaignId,
      ...schedule,
    });
  }

  /**
   * Start a campaign
   * POST /api/v1/campaigns/start/{campaignId}
   */
  async startCampaign(campaignId: number): Promise<ReachInboxApiResponse<unknown>> {
    return this.request("POST", `/api/v1/campaigns/start/${campaignId}`, {});
  }

  /**
   * Pause a campaign
   * POST /api/v1/campaigns/pause/{campaignId}
   */
  async pauseCampaign(campaignId: number): Promise<ReachInboxApiResponse<unknown>> {
    return this.request("POST", `/api/v1/campaigns/pause/${campaignId}`, {});
  }

  /**
   * List all campaigns
   * GET /api/v1/campaigns/list
   */
  async listCampaigns(params?: {
    filter?: string;
    limit?: number;
    offset?: number;
  }): Promise<ReachInboxApiResponse<ReachInboxCampaign[]>> {
    const queryParams = new URLSearchParams();
    if (params?.filter) queryParams.set("filter", params.filter);
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.offset) queryParams.set("offset", params.offset.toString());
    
    const query = queryParams.toString();
    return this.request<ReachInboxCampaign[]>(
      "GET",
      `/api/v1/campaigns/list${query ? `?${query}` : ""}`
    );
  }

  /**
   * Get campaign status
   * GET /api/v1/campaigns/{campaignId}/status
   */
  async getCampaignStatus(
    campaignId: number
  ): Promise<ReachInboxApiResponse<{ status: string }>> {
    return this.request<{ status: string }>(
      "GET",
      `/api/v1/campaigns/${campaignId}/status`
    );
  }

  // ============ Lead Endpoints ============

  /**
   * Add leads to a campaign
   * POST /api/v1/lead/add
   */
  async addLeads(
    campaignId: number,
    leads: {
      email: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      customVariables?: Record<string, string>;
    }[]
  ): Promise<ReachInboxApiResponse<unknown>> {
    return this.request("POST", "/api/v1/lead/add", {
      campaignId,
      leads,
    });
  }

  // ============ Onebox (Inbox) Endpoints ============

  /**
   * List onebox emails
   * POST /api/v1/onebox/list
   */
  async listOneboxEmails(params: {
    limit?: number;
    offset?: number;
    status?: string;
    inbox?: string;
  }): Promise<ReachInboxApiResponse<ReachInboxOneboxEmail[]>> {
    return this.request<ReachInboxOneboxEmail[]>("POST", "/api/v1/onebox/list", params);
  }

  /**
   * Get onebox thread
   * POST /api/v1/onebox/thread
   */
  async getOneboxThread(
    threadId: string
  ): Promise<ReachInboxApiResponse<ReachInboxEmailThread>> {
    return this.request<ReachInboxEmailThread>("POST", "/api/v1/onebox/thread", {
      threadId,
    });
  }

  /**
   * Send onebox email reply
   * POST /api/v1/onebox/send
   * Uses multipart/form-data for file attachments
   */
  async sendOneboxEmail(params: {
    threadId: string;
    to: string;
    from: string;
    subject: string;
    body: string;
    inReplyTo?: string;
  }): Promise<ReachInboxApiResponse<unknown>> {
    const formData = new FormData();
    formData.append(
      "emaildata",
      JSON.stringify({
        threadId: params.threadId,
        to: params.to,
        from: params.from,
        subject: params.subject,
        body: params.body,
        inReplyTo: params.inReplyTo,
      })
    );

    const url = `${this.apiUrl}/api/v1/onebox/send`;
    console.log(`[ReachInbox] POST ${url} (multipart)`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`[ReachInbox] Send error: ${response.status}`, data);
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`,
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error(`[ReachInbox] Send failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  /**
   * Mark emails as read
   * POST /api/v1/onebox/mark-read
   */
  async markAsRead(emailIds: number[]): Promise<ReachInboxApiResponse<unknown>> {
    return this.request("POST", "/api/v1/onebox/mark-read", { emailIds });
  }
}

/**
 * Create a ReachInbox client instance
 */
export function createReachInboxClient(
  apiKey: string,
  apiUrl: string = DEFAULT_API_URL
): ReachInboxClient {
  return new ReachInboxClient(apiKey, apiUrl);
}

/**
 * Create the default 3-step email sequence with template variables
 */
export function createDefaultSequence(): ReachInboxSequence[] {
  return [
    {
      steps: [
        {
          waitDays: 0,
          variants: [
            {
              subject: "{{Subject}}",
              body: "{{body1}}",
            },
          ],
        },
        {
          waitDays: 3,
          variants: [
            {
              subject: "{{same subject}}",
              body: "{{body2}}",
            },
          ],
        },
        {
          waitDays: 3,
          variants: [
            {
              subject: "{{same subject}}",
              body: "{{body3}}",
            },
          ],
        },
      ],
    },
  ];
}

export const REACHINBOX_DEFAULT_URL = DEFAULT_API_URL;

