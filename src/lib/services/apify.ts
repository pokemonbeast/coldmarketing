import { ApifyClient, ActorRun } from 'apify-client';

export interface ApifyScraperConfig {
  apiToken: string;
  actorId: string;
  maxResults?: number;
}

export interface RedditScraperInput {
  // Subreddits to search
  subreddits?: string[];
  // Search terms/keywords
  searchTerms?: string[];
  // Type of content: posts, comments, or both
  type?: 'posts' | 'comments' | 'both';
  // Sort order
  sort?: 'hot' | 'new' | 'top' | 'rising';
  // Time filter for top posts
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  // Max items to return
  maxItems?: number;
  // Include post comments
  includeComments?: boolean;
  // Proxy configuration
  proxy?: {
    useApifyProxy: boolean;
    apifyProxyGroups?: string[];
  };
}

export interface RedditPost {
  id: string;
  title: string;
  url: string;
  permalink: string;
  subreddit: string;
  author: string;
  score: number;
  numComments: number;
  created: string;
  selftext?: string;
  thumbnail?: string;
  isVideo?: boolean;
  isSelf?: boolean;
}

export interface GenericScraperInput {
  [key: string]: unknown;
}

export interface ScraperResult<T = unknown> {
  runId: string;
  status: string;
  items: T[];
  itemCount: number;
  startedAt: string;
  finishedAt: string;
  usageUsd?: number;
}

/**
 * APIFY Service for running scrapers
 */
export class ApifyService {
  private client: ApifyClient;
  private actorId: string;
  private maxResults: number;

  constructor(config: ApifyScraperConfig) {
    this.client = new ApifyClient({
      token: config.apiToken,
    });
    this.actorId = config.actorId;
    this.maxResults = config.maxResults || 100;
  }

  /**
   * Run the Reddit scraper
   */
  async runRedditScraper(input: RedditScraperInput): Promise<ScraperResult<RedditPost>> {
    // Apply max results limit
    const limitedInput = {
      ...input,
      maxItems: Math.min(input.maxItems || this.maxResults, this.maxResults),
      proxy: input.proxy || {
        useApifyProxy: true,
      },
    };

    return this.runActor<RedditPost>(limitedInput);
  }

  /**
   * Run any actor with generic input
   */
  async runActor<T = unknown>(input: GenericScraperInput): Promise<ScraperResult<T>> {
    try {
      // Start the actor run
      const run = await this.client.actor(this.actorId).call(input, {
        waitSecs: 300, // Wait up to 5 minutes
      });

      // Get the dataset items
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      return {
        runId: run.id,
        status: run.status,
        items: items as T[],
        itemCount: items.length,
        startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
        finishedAt: run.finishedAt?.toISOString() || new Date().toISOString(),
        usageUsd: typeof run.usageUsd === 'number' ? run.usageUsd : (run.usageUsd as any)?.ACTOR_COMPUTE_UNITS || 0,
      };
    } catch (error) {
      console.error('APIFY actor run failed:', error);
      throw error;
    }
  }

  /**
   * Start an actor run without waiting (async)
   */
  async startActorRun(input: GenericScraperInput): Promise<{ runId: string; datasetId: string }> {
    const run = await this.client.actor(this.actorId).start(input);
    return {
      runId: run.id,
      datasetId: run.defaultDatasetId,
    };
  }

  /**
   * Get the status of a run
   */
  async getRunStatus(runId: string): Promise<ActorRun | undefined> {
    return this.client.run(runId).get();
  }

  /**
   * Get items from a dataset
   */
  async getDatasetItems<T = unknown>(datasetId: string, limit?: number): Promise<T[]> {
    const { items } = await this.client.dataset(datasetId).listItems({
      limit: limit || this.maxResults,
    });
    return items as T[];
  }

  /**
   * Check account balance/usage
   */
  async getAccountUsage(): Promise<{ usageUsd: number; usageCreditUsd: number }> {
    const user = await this.client.user().get();
    return {
      usageUsd: (user as any)?.monthlyUsageUsd || 0,
      usageCreditUsd: (user as any)?.proxy?.usedCreditsUsd || 0,
    };
  }
}

/**
 * Create an APIFY service from scraper config
 */
export function createApifyService(
  apiToken: string,
  actorId: string,
  maxResults?: number
): ApifyService {
  return new ApifyService({
    apiToken,
    actorId,
    maxResults,
  });
}

/**
 * Default Reddit scraper actors on APIFY
 */
export const REDDIT_ACTORS = {
  // Community Reddit scrapers - verify these exist on APIFY store
  REDDIT_SCRAPER: 'trudax/reddit-scraper',
  REDDIT_POSTS: 'apify/reddit-scraper', 
  REDDIT_SEARCH: 'curious_coder/reddit-scraper',
} as const;

/**
 * Build Reddit scraper input based on business keywords
 */
export function buildRedditInput(
  keywords: string[],
  subreddits: string[] = [],
  maxItems: number = 100
): RedditScraperInput {
  return {
    searchTerms: keywords,
    subreddits: subreddits.length > 0 ? subreddits : undefined,
    type: 'posts',
    sort: 'new',
    time: 'week',
    maxItems,
    includeComments: true,
    proxy: {
      useApifyProxy: true,
    },
  };
}

