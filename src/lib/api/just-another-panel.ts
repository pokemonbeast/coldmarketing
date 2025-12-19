// Just Another Panel API Types
export interface JAPService {
  service: number;
  name: string;
  type: string;
  rate: string;
  min: string;
  max: string;
  category: string;
  refill?: boolean;
  cancel?: boolean;
}

export interface JAPOrderResponse {
  order?: number;
  error?: string;
}

export interface JAPOrderStatus {
  charge: string;
  start_count: string;
  status: string;
  remains: string;
  currency: string;
  error?: string;
}

export interface JAPBalance {
  balance: string;
  currency: string;
}

export interface JAPRefillResponse {
  refill?: number;
  error?: string;
}

export interface JAPOrderParams {
  service: number;
  link: string;
  quantity?: number;
  runs?: number;
  interval?: number;
  comments?: string;
  usernames?: string;
  hashtags?: string;
  hashtag?: string;
  username?: string;
  media?: string;
  keywords?: string;
  answer_number?: string;
  groups?: string;
}

export class JustAnotherPanelAPI {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(params: Record<string, string | number>): Promise<T> {
    const body = new URLSearchParams();
    body.append("key", this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      body.append(key, String(value));
    });

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Get all available services
   */
  async getServices(): Promise<JAPService[]> {
    return this.request<JAPService[]>({ action: "services" });
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<JAPBalance> {
    return this.request<JAPBalance>({ action: "balance" });
  }

  /**
   * Add a new order
   */
  async addOrder(params: JAPOrderParams): Promise<JAPOrderResponse> {
    const requestParams: Record<string, string | number> = {
      action: "add",
      service: params.service,
      link: params.link,
    };

    if (params.quantity) requestParams.quantity = params.quantity;
    if (params.runs) requestParams.runs = params.runs;
    if (params.interval) requestParams.interval = params.interval;
    if (params.comments) requestParams.comments = params.comments;
    if (params.usernames) requestParams.usernames = params.usernames;
    if (params.hashtags) requestParams.hashtags = params.hashtags;
    if (params.hashtag) requestParams.hashtag = params.hashtag;
    if (params.username) requestParams.username = params.username;
    if (params.media) requestParams.media = params.media;
    if (params.keywords) requestParams.keywords = params.keywords;
    if (params.answer_number) requestParams.answer_number = params.answer_number;
    if (params.groups) requestParams.groups = params.groups;

    return this.request<JAPOrderResponse>(requestParams);
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: number): Promise<JAPOrderStatus> {
    return this.request<JAPOrderStatus>({
      action: "status",
      order: orderId,
    });
  }

  /**
   * Get multiple orders status
   */
  async getMultipleOrdersStatus(orderIds: number[]): Promise<Record<string, JAPOrderStatus>> {
    return this.request<Record<string, JAPOrderStatus>>({
      action: "status",
      orders: orderIds.join(","),
    });
  }

  /**
   * Create a refill for an order
   */
  async createRefill(orderId: number): Promise<JAPRefillResponse> {
    return this.request<JAPRefillResponse>({
      action: "refill",
      order: orderId,
    });
  }

  /**
   * Create refills for multiple orders
   */
  async createMultipleRefills(orderIds: number[]): Promise<JAPRefillResponse[]> {
    return this.request<JAPRefillResponse[]>({
      action: "refill",
      orders: orderIds.join(","),
    });
  }

  /**
   * Get refill status
   */
  async getRefillStatus(refillId: number): Promise<{ status: string }> {
    return this.request<{ status: string }>({
      action: "refill_status",
      refill: refillId,
    });
  }

  /**
   * Get multiple refill statuses
   */
  async getMultipleRefillStatuses(
    refillIds: number[]
  ): Promise<Array<{ refill: number; status: string }>> {
    return this.request<Array<{ refill: number; status: string }>>({
      action: "refill_status",
      refills: refillIds.join(","),
    });
  }

  /**
   * Cancel orders
   */
  async cancelOrders(
    orderIds: number[]
  ): Promise<Array<{ order: number; cancel: number | { error: string } }>> {
    return this.request<Array<{ order: number; cancel: number | { error: string } }>>({
      action: "cancel",
      orders: orderIds.join(","),
    });
  }
}

/**
 * Create a Just Another Panel API instance
 */
export function createJAPClient(apiUrl: string, apiKey: string): JustAnotherPanelAPI {
  return new JustAnotherPanelAPI(apiUrl, apiKey);
}

