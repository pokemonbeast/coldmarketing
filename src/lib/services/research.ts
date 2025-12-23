import { ApifyClient } from 'apify-client';
import { SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Database } from '@/types/database';
import { generateEmbedding, calculateRelevanceScore } from './google-ai';

// Constants for reveal timing
const INTERVALS_PER_WEEK = 672; // 7 * 24 * 4 (15-minute intervals in a week)
const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

// Reddit scraper actor ID (harshmaur/reddit-scraper-pro)
const REDDIT_SCRAPER_ACTOR = 'harshmaur/reddit-scraper-pro';

export interface RedditScraperInput {
  searchTerms: string[];
  sort?: 'hot' | 'new' | 'top' | 'rising';
  time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  maxPosts?: number;
  searchPosts?: boolean;
  searchComments?: boolean;
  searchCommunities?: boolean;
  startUrls?: string[];
  crawlCommentsPerPost?: boolean;
  fastMode?: boolean;
  searchSort?: 'new' | 'hot' | 'top' | 'relevance';
  withinCommunity?: string;
  searchTime?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  includeNSFW?: boolean;
  proxy?: {
    useApifyProxy: boolean;
    apifyProxyGroups?: string[];
  };
  // Remove limits by setting high values
  maxPostsCount?: number;
  maxCommentsCount?: number;
  maxCommentsPerPost?: number;
  maxCommunitiesCount?: number;
}

export interface RedditScrapedPost {
  id: string;
  title: string;
  url: string;
  permalink: string;
  subreddit: string;
  author: string;
  score: number;
  numComments: number;
  createdAt: string;
  selftext?: string;
  thumbnail?: string;
  dataType?: string;
}

export interface ResearchRunResult {
  success: boolean;
  runId?: string;
  itemCount?: number;
  error?: string;
}

export interface SimulatedPost {
  subreddit: string;
  title: string;
  relevance: number;
}

/**
 * Generate simulated posts using Gemini for the animation
 */
async function generateSimulatedPosts(keywords: string[]): Promise<SimulatedPost[]> {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    console.log('🔑 GOOGLE_AI_API_KEY exists:', !!apiKey, '| Length:', apiKey?.length || 0);
    
    if (!apiKey) {
      console.log('⚠️ No GOOGLE_AI_API_KEY set - using fallback template posts');
      return generateFallbackPosts(keywords);
    }
    
    console.log('🤖 Calling Gemini to generate simulated posts for keywords:', keywords);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `Generate 10 realistic Reddit post titles that someone might search for or post about these topics: ${keywords.join(', ')}

Requirements:
- Make them sound like real Reddit posts (questions, discussions, seeking advice)
- Include the subreddit name that would fit each post
- Vary the style: some questions, some discussions, some seeking help
- Make them feel authentic and natural
- Cover different aspects/angles of the topics

Return ONLY a valid JSON array with this exact format, no markdown, no explanation:
[{"subreddit": "r/example", "title": "Post title here"}, ...]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up potential markdown formatting
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(text);
    
    // Add random relevance scores
    const posts: SimulatedPost[] = parsed.map((p: { subreddit: string; title: string }) => ({
      subreddit: p.subreddit.startsWith('r/') ? p.subreddit : `r/${p.subreddit}`,
      title: p.title,
      relevance: Math.floor(Math.random() * 25) + 70, // 70-95%
    }));

    console.log('✅ Gemini generated', posts.length, 'simulated posts');
    return posts;
  } catch (error) {
    console.error('❌ Gemini failed, using fallback posts:', error);
    return generateFallbackPosts(keywords);
  }
}

/**
 * Fallback simulated posts using templates
 */
function generateFallbackPosts(keywords: string[]): SimulatedPost[] {
  const templates = [
    { template: "Best way to handle {keyword}?", subreddit: "r/AskReddit" },
    { template: "Anyone have experience with {keyword}?", subreddit: "r/Entrepreneur" },
    { template: "{keyword} - what's working for you in 2025?", subreddit: "r/smallbusiness" },
    { template: "Struggling with {keyword}, need advice", subreddit: "r/startups" },
    { template: "Is {keyword} worth investing in?", subreddit: "r/business" },
    { template: "How do you approach {keyword} for clients?", subreddit: "r/freelance" },
    { template: "{keyword} tools and resources?", subreddit: "r/marketing" },
    { template: "Just started with {keyword}, any tips?", subreddit: "r/advice" },
    { template: "What's the future of {keyword}?", subreddit: "r/Futurology" },
    { template: "{keyword} - overrated or underrated?", subreddit: "r/unpopularopinion" },
  ];

  const posts: SimulatedPost[] = [];
  const usedTemplates = new Set<number>();

  keywords.forEach((keyword) => {
    const count = Math.min(4, Math.ceil(10 / keywords.length));
    for (let i = 0; i < count && posts.length < 10; i++) {
      let templateIndex;
      do {
        templateIndex = Math.floor(Math.random() * templates.length);
      } while (usedTemplates.has(templateIndex) && usedTemplates.size < templates.length);
      
      usedTemplates.add(templateIndex);
      const t = templates[templateIndex];
      
      posts.push({
        subreddit: t.subreddit,
        title: t.template.replace('{keyword}', keyword),
        relevance: Math.floor(Math.random() * 25) + 70,
      });
    }
  });

  return posts.slice(0, 10);
}

/**
 * Format a keyword for Reddit search - wrap multi-word keywords in quotes for exact phrase matching
 */
function formatRedditSearchTerm(keyword: string): string {
  // If keyword contains spaces, wrap it in quotes for exact phrase matching
  // This ensures "niche edits" searches for the exact phrase, not "niche" AND "edits" separately
  if (keyword.includes(' ')) {
    return `"${keyword}"`;
  }
  return keyword;
}

/**
 * Distribute reveal times across 15-minute intervals over 1 week
 * Results are shuffled for variety, then assigned reveal times
 * For large batches (>672), multiple results per interval
 */
export function distributeRevealTimes<T>(results: T[]): (T & { reveal_at: Date })[] {
  const totalResults = results.length;
  
  if (totalResults === 0) return [];
  
  // Calculate how many records per 15-minute interval (distribute over 1 week)
  const recordsPerInterval = Math.max(1, totalResults / INTERVALS_PER_WEEK);
  const now = Date.now();
  
  // Shuffle results for variety
  const shuffled = [...results].sort(() => Math.random() - 0.5);
  
  return shuffled.map((result, index) => {
    // Calculate which 15-min interval this result belongs to
    const intervalIndex = Math.floor(index / recordsPerInterval);
    // Cap at 1 week (672 intervals) - if more results, they'll be grouped in later intervals
    const cappedInterval = Math.min(intervalIndex, INTERVALS_PER_WEEK - 1);
    const revealAt = new Date(now + (cappedInterval * INTERVAL_MS));
    
    return {
      ...result,
      reveal_at: revealAt,
    };
  });
}

/**
 * Check if the reddit-scraping provider is active
 */
export async function isRedditScrapingActive(
  supabase: SupabaseClient<Database>
): Promise<{ active: boolean; provider?: { id: string; api_key_encrypted: string | null; config: unknown } }> {
  const { data: provider } = await supabase
    .from('api_providers')
    .select('id, api_key_encrypted, config')
    .eq('slug', 'reddit-scraping')
    .eq('is_active', true)
    .single();

  if (!provider || !provider.api_key_encrypted) {
    return { active: false };
  }

  return { active: true, provider };
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  return profile?.subscription_status === 'active';
}

/**
 * Get business with keywords
 */
export async function getBusinessWithKeywords(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<{ id: string; user_id: string; keywords: string[] | null; name: string } | null> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, user_id, keywords, name')
    .eq('id', businessId)
    .single();

  return business;
}

/**
 * Run the Reddit scraper via Apify
 */
async function runRedditScraper(
  apiToken: string,
  input: RedditScraperInput
): Promise<{ runId: string; datasetId: string; items: RedditScrapedPost[] }> {
  const client = new ApifyClient({ token: apiToken });
  
  const run = await client.actor(REDDIT_SCRAPER_ACTOR).call(input, {
    waitSecs: 300, // Wait up to 5 minutes
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    items: items as unknown as RedditScrapedPost[],
  };
}

/**
 * Trigger initial research for a business (1000 posts/keyword, all time)
 */
export async function triggerInitialResearch(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<ResearchRunResult> {
  try {
    // Get business details
    const business = await getBusinessWithKeywords(supabase, businessId);
    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    const keywords = business.keywords || [];
    if (keywords.length === 0) {
      return { success: false, error: 'No keywords configured for business' };
    }

    // Check subscription
    const hasSubscription = await hasActiveSubscription(supabase, business.user_id);
    if (!hasSubscription) {
      return { success: false, error: 'Active subscription required' };
    }

    // Check provider is active
    const { active, provider } = await isRedditScrapingActive(supabase);
    if (!active || !provider) {
      return { success: false, error: 'Reddit scraping provider not active' };
    }

    // Create research run record
    const { data: researchRun, error: runError } = await supabase
      .from('business_research_runs')
      .insert({
        business_id: businessId,
        user_id: business.user_id,
        provider_slug: 'reddit-scraping',
        run_type: 'initial',
        status: 'running',
        keywords_used: keywords.slice(0, 5), // Max 5 keywords
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !researchRun) {
      console.error('Failed to create research run:', runError);
      return { success: false, error: 'Failed to create research run' };
    }

    // Generate simulated posts for the animation (runs in parallel with scraper)
    const keywordsToUse = keywords.slice(0, 5);
    generateSimulatedPosts(keywordsToUse).then(async (simulatedPosts) => {
      await supabase
        .from('business_research_runs')
        .update({ simulated_posts: simulatedPosts })
        .eq('id', researchRun.id);
      console.log(`Generated ${simulatedPosts.length} simulated posts for animation`);
    }).catch(err => {
      console.error('Failed to generate simulated posts:', err);
    });

    // Run scraper calls for all keywords in parallel
    console.log(`🔍 Running scrapers for ${keywordsToUse.length} keywords in parallel...`);
    
    const scraperPromises = keywordsToUse.map(async (keyword) => {
      console.log(`🔍 Starting scraper for keyword: "${keyword}"`);
      
      const scraperInput: RedditScraperInput = {
        searchTerms: [formatRedditSearchTerm(keyword)], // Single keyword per call, wrapped in quotes if multi-word
        sort: 'hot',
        time: 'all',
        maxPosts: 1000, // 1000 per keyword
        searchPosts: true,
        searchComments: false,
        searchCommunities: false,
        startUrls: [],
        crawlCommentsPerPost: false,
        fastMode: true,
        searchSort: 'new',
        withinCommunity: '',
        searchTime: 'all',
        includeNSFW: false,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
        },
        // Set reasonable limits
        maxPostsCount: 900,
        maxCommentsCount: 900,
        maxCommentsPerPost: 900,
        maxCommunitiesCount: 900,
      };

      try {
        const { runId, datasetId, items } = await runRedditScraper(
          provider.api_key_encrypted!,
          scraperInput
        );
        
        console.log(`✅ Keyword "${keyword}": Found ${items.length} items`);
        return { keyword, runId, datasetId, items, success: true };
      } catch (error) {
        console.error(`❌ Keyword "${keyword}" failed:`, error);
        return { keyword, runId: '', datasetId: '', items: [] as RedditScrapedPost[], success: false };
      }
    });

    // Wait for all scrapers to complete
    const results = await Promise.all(scraperPromises);
    
    // Combine all results
    let allItems: RedditScrapedPost[] = [];
    let lastRunId = '';
    let lastDatasetId = '';
    
    for (const result of results) {
      if (result.success) {
        allItems = allItems.concat(result.items);
        lastRunId = result.runId;
        lastDatasetId = result.datasetId;
      }
    }
    
    console.log(`🏁 All ${keywordsToUse.length} scrapers completed`)

    // Filter out comments - only keep posts
    const postsOnly = allItems.filter((item) => {
      const dataType = (item as any).dataType;
      return dataType !== 'comment';
    });

    console.log(`Initial research: Total ${allItems.length} items, ${postsOnly.length} posts (removed ${allItems.length - postsOnly.length} comments)`);
    
    const runId = lastRunId;
    const datasetId = lastDatasetId;

    // Distribute reveal times
    const resultsWithReveal = distributeRevealTimes(postsOnly);

    // Insert results
    if (resultsWithReveal.length > 0) {
      const resultsToInsert = resultsWithReveal.map((item) => ({
        business_id: businessId,
        research_run_id: researchRun.id,
        platform: 'reddit' as const,
        result_data: item as unknown as Record<string, unknown>,
        reveal_at: item.reveal_at.toISOString(),
        external_id: item.id,
        title: item.title,
        url: item.url || item.permalink,
        score: item.score || 0,
      }));

      // Insert results - use insert with conflict handling
      // The unique constraint is a partial index, so we handle errors manually
      let insertedCount = 0;
      const batchSize = 50;
      
      for (let i = 0; i < resultsToInsert.length; i += batchSize) {
        const batch = resultsToInsert.slice(i, i + batchSize);
        const { data: inserted, error: insertError } = await supabase
          .from('research_results')
          .insert(batch)
          .select('id');
        
        if (insertError) {
          // If duplicate key error, try inserting one by one to get as many as possible
          if (insertError.code === '23505') {
            console.log(`Batch ${i / batchSize + 1}: Some duplicates found, inserting individually...`);
            for (const record of batch) {
              const { error: singleError } = await supabase
                .from('research_results')
                .insert(record);
              if (!singleError) {
                insertedCount++;
              }
            }
          } else {
            console.error('Failed to insert research results batch:', insertError);
          }
        } else {
          insertedCount += inserted?.length || 0;
        }
      }
      console.log(`✅ Inserted ${insertedCount}/${resultsToInsert.length} research results`);
    }

    // Update research run as completed
    await supabase
      .from('business_research_runs')
      .update({
        status: 'completed',
        apify_run_id: runId,
        apify_dataset_id: datasetId,
        item_count: postsOnly.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', researchRun.id);

    // Score results using embeddings (runs async, doesn't block return)
    scoreResearchResults(supabase, businessId, researchRun.id)
      .then(({ scored, failed }) => {
        console.log(`Initial research scoring: ${scored} scored, ${failed} failed`);
      })
      .catch(err => {
        console.error('Initial research scoring failed:', err);
      });

    return {
      success: true,
      runId: researchRun.id,
      itemCount: postsOnly.length,
    };
  } catch (error) {
    console.error('Research trigger error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger weekly research for a business (200 posts/keyword, past week, sort by new)
 */
export async function triggerWeeklyResearch(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<ResearchRunResult> {
  try {
    // Get business details
    const business = await getBusinessWithKeywords(supabase, businessId);
    if (!business) {
      return { success: false, error: 'Business not found' };
    }

    const keywords = business.keywords || [];
    if (keywords.length === 0) {
      return { success: false, error: 'No keywords configured for business' };
    }

    // Check subscription
    const hasSubscription = await hasActiveSubscription(supabase, business.user_id);
    if (!hasSubscription) {
      return { success: false, error: 'Active subscription required' };
    }

    // Check provider is active
    const { active, provider } = await isRedditScrapingActive(supabase);
    if (!active || !provider) {
      return { success: false, error: 'Reddit scraping provider not active' };
    }

    // Create research run record
    const { data: researchRun, error: runError } = await supabase
      .from('business_research_runs')
      .insert({
        business_id: businessId,
        user_id: business.user_id,
        provider_slug: 'reddit-scraping',
        run_type: 'weekly',
        status: 'running',
        keywords_used: keywords.slice(0, 5),
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !researchRun) {
      console.error('Failed to create research run:', runError);
      return { success: false, error: 'Failed to create research run' };
    }

    // Generate simulated posts for the animation (runs in parallel with scraper)
    const keywordsToUse = keywords.slice(0, 5);
    generateSimulatedPosts(keywordsToUse).then(async (simulatedPosts) => {
      await supabase
        .from('business_research_runs')
        .update({ simulated_posts: simulatedPosts })
        .eq('id', researchRun.id);
      console.log(`Generated ${simulatedPosts.length} simulated posts for weekly animation`);
    }).catch(err => {
      console.error('Failed to generate simulated posts:', err);
    });

    // Run separate scraper calls for each keyword (weekly - smaller scale)
    let allItems: RedditScrapedPost[] = [];
    let lastRunId = '';
    let lastDatasetId = '';
    
    for (const keyword of keywordsToUse) {
      console.log(`🔍 Weekly scraper for keyword: "${keyword}"`);
      
      const scraperInput: RedditScraperInput = {
        searchTerms: [formatRedditSearchTerm(keyword)], // Single keyword per call, wrapped in quotes if multi-word
        sort: 'new',
        time: 'week',
        maxPosts: 200, // 200 per keyword for weekly
        searchPosts: true,
        searchComments: false,
        searchCommunities: false,
        startUrls: [],
        crawlCommentsPerPost: false,
        fastMode: true,
        searchSort: 'new',
        withinCommunity: '',
        searchTime: 'week',
        includeNSFW: false,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
        },
        // Set reasonable limits
        maxPostsCount: 900,
        maxCommentsCount: 900,
        maxCommentsPerPost: 900,
        maxCommunitiesCount: 900,
      };

      try {
        const { runId, datasetId, items } = await runRedditScraper(
          provider.api_key_encrypted!,
          scraperInput
        );
        
        console.log(`✅ Weekly "${keyword}": Found ${items.length} items`);
        allItems = allItems.concat(items);
        lastRunId = runId;
        lastDatasetId = datasetId;
      } catch (error) {
        console.error(`❌ Weekly "${keyword}" failed:`, error);
        // Continue with other keywords
      }
    }
    
    const runId = lastRunId;
    const datasetId = lastDatasetId;
    const items = allItems;

    // Filter out comments - only keep posts
    const postsOnly = items.filter((item) => {
      const dataType = (item as any).dataType;
      return dataType !== 'comment';
    });

    console.log(`Weekly research: Filtered ${items.length} items to ${postsOnly.length} posts (removed ${items.length - postsOnly.length} comments)`);

    // Distribute reveal times
    const resultsWithReveal = distributeRevealTimes(postsOnly);

    // Insert results (will skip duplicates due to unique constraint)
    if (resultsWithReveal.length > 0) {
      const resultsToInsert = resultsWithReveal.map((item) => ({
        business_id: businessId,
        research_run_id: researchRun.id,
        platform: 'reddit' as const,
        result_data: item as unknown as Record<string, unknown>,
        reveal_at: item.reveal_at.toISOString(),
        external_id: item.id,
        title: item.title,
        url: item.url || item.permalink,
        score: item.score || 0,
      }));

      // Insert results - handle partial unique index with manual conflict handling
      let insertedCount = 0;
      const batchSize = 50;
      
      for (let i = 0; i < resultsToInsert.length; i += batchSize) {
        const batch = resultsToInsert.slice(i, i + batchSize);
        const { data: inserted, error: insertError } = await supabase
          .from('research_results')
          .insert(batch)
          .select('id');
        
        if (insertError) {
          if (insertError.code === '23505') {
            console.log(`Batch ${i / batchSize + 1}: Some duplicates found, inserting individually...`);
            for (const record of batch) {
              const { error: singleError } = await supabase
                .from('research_results')
                .insert(record);
              if (!singleError) {
                insertedCount++;
              }
            }
          } else {
            console.error('Failed to insert research results batch:', insertError);
          }
        } else {
          insertedCount += inserted?.length || 0;
        }
      }
      console.log(`✅ Inserted ${insertedCount}/${resultsToInsert.length} weekly research results`);
    }

    // Update research run as completed
    await supabase
      .from('business_research_runs')
      .update({
        status: 'completed',
        apify_run_id: runId,
        apify_dataset_id: datasetId,
        item_count: postsOnly.length,
        completed_at: new Date().toISOString(),
      })
      .eq('id', researchRun.id);

    // Score results using embeddings (runs async, doesn't block return)
    scoreResearchResults(supabase, businessId, researchRun.id)
      .then(({ scored, failed }) => {
        console.log(`Weekly research scoring: ${scored} scored, ${failed} failed`);
      })
      .catch(err => {
        console.error('Weekly research scoring failed:', err);
      });

    return {
      success: true,
      runId: researchRun.id,
      itemCount: postsOnly.length,
    };
  } catch (error) {
    console.error('Weekly research error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all active businesses that need weekly research
 */
export async function getBusinessesForWeeklyResearch(
  supabase: SupabaseClient<Database>
): Promise<{ id: string; user_id: string; keywords: string[] | null }[]> {
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, user_id, keywords')
    .eq('is_active', true)
    .not('keywords', 'is', null);

  return businesses || [];
}

/**
 * Get revealed research results for a business
 */
export async function getRevealedResults(
  supabase: SupabaseClient<Database>,
  businessId: string,
  platform: 'reddit' | 'gmb' = 'reddit',
  limit: number = 50,
  offset: number = 0
): Promise<{
  results: Array<{
    id: string;
    platform: string;
    result_data: unknown;
    reveal_at: string;
    title: string | null;
    url: string | null;
    score: number | null;
    created_at: string;
    relevance_score: number | null;
  }>;
  total: number;
  nextRevealAt: string | null;
}> {
  const now = new Date().toISOString();

  // For GMB platform, query verified_leads through the cache system
  if (platform === 'gmb') {
    return getGmbLeadsForBusiness(supabase, businessId, limit, offset);
  }

  // For Reddit, use research_results as before
  const { data: results, count } = await supabase
    .from('research_results')
    .select('id, platform, result_data, reveal_at, title, url, score, created_at, relevance_score', { count: 'exact' })
    .eq('business_id', businessId)
    .eq('platform', platform)
    .lte('reveal_at', now)
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  // Get next unrevealed result time
  const { data: nextResult } = await supabase
    .from('research_results')
    .select('reveal_at')
    .eq('business_id', businessId)
    .eq('platform', platform)
    .gt('reveal_at', now)
    .order('reveal_at', { ascending: true })
    .limit(1)
    .single();

  return {
    results: results || [],
    total: count || 0,
    nextRevealAt: nextResult?.reveal_at || null,
  };
}

/**
 * Get GMB leads for a business through the shared cache system
 * Multiple businesses with the same targets share the same verified leads
 */
async function getGmbLeadsForBusiness(
  supabase: SupabaseClient<Database>,
  businessId: string,
  limit: number,
  offset: number
): Promise<{
  results: Array<{
    id: string;
    platform: string;
    result_data: unknown;
    reveal_at: string;
    title: string | null;
    url: string | null;
    score: number | null;
    created_at: string;
    relevance_score: number | null;
  }>;
  total: number;
  nextRevealAt: string | null;
}> {
  // Get business's fulfilled GMB targets with their cache_ids
  const { data: business } = await supabase
    .from('businesses')
    .select('gmb_targets')
    .eq('id', businessId)
    .single();

  if (!business?.gmb_targets) {
    return { results: [], total: 0, nextRevealAt: null };
  }

  const targets = business.gmb_targets as Array<{
    cache_id?: string | null;
    fulfilled_at?: string | null;
  }>;

  // Get cache_ids from fulfilled targets
  const cacheIds = targets
    .filter(t => t.fulfilled_at && t.cache_id)
    .map(t => t.cache_id as string);

  if (cacheIds.length === 0) {
    return { results: [], total: 0, nextRevealAt: null };
  }

  // Get scrape_result_ids from cache entries
  const { data: cacheEntries } = await supabase
    .from('gmb_scrape_cache')
    .select('scrape_result_id')
    .in('id', cacheIds);

  const scrapeResultIds = (cacheEntries || [])
    .map(c => c.scrape_result_id)
    .filter((id): id is string => id !== null);

  if (scrapeResultIds.length === 0) {
    return { results: [], total: 0, nextRevealAt: null };
  }

  // Query verified_leads linked to these scrape results
  const { data: leads, count } = await supabase
    .from('verified_leads')
    .select('*', { count: 'exact' })
    .in('source_scrape_id', scrapeResultIds)
    .eq('verification_state', 'Deliverable')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Transform to match the expected result format
  const results = (leads || []).map(lead => ({
    id: lead.id,
    platform: 'gmb' as const,
    result_data: {
      email: lead.email,
      company_name: lead.company_name,
      phone: lead.phone,
      website: lead.website,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      country_code: lead.country_code,
      industry: lead.industry,
      domain: lead.domain,
      verification_state: lead.verification_state,
    },
    reveal_at: lead.created_at || new Date().toISOString(),
    title: lead.company_name,
    url: lead.website,
    score: null,
    created_at: lead.created_at || new Date().toISOString(),
    relevance_score: null,
  }));

  return {
    results,
    total: count || 0,
    nextRevealAt: null, // GMB leads don't have timed reveals
  };
}

/**
 * Get research stats for a business
 */
export async function getResearchStats(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<{
  totalResults: number;
  revealedCount: number;
  pendingCount: number;
  lastRunAt: string | null;
  nextRevealAt: string | null;
}> {
  const now = new Date().toISOString();

  // Get total and revealed counts
  const { count: totalResults } = await supabase
    .from('research_results')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);

  const { count: revealedCount } = await supabase
    .from('research_results')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .lte('reveal_at', now);

  // Get last run
  const { data: lastRun } = await supabase
    .from('business_research_runs')
    .select('completed_at')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  // Get next reveal
  const { data: nextResult } = await supabase
    .from('research_results')
    .select('reveal_at')
    .eq('business_id', businessId)
    .gt('reveal_at', now)
    .order('reveal_at', { ascending: true })
    .limit(1)
    .single();

  return {
    totalResults: totalResults || 0,
    revealedCount: revealedCount || 0,
    pendingCount: (totalResults || 0) - (revealedCount || 0),
    lastRunAt: lastRun?.completed_at || null,
    nextRevealAt: nextResult?.reveal_at || null,
  };
}

/**
 * Score research results using embeddings to determine relevance for commenting
 * Compares business context against each post's title + body
 */
export async function scoreResearchResults(
  supabase: SupabaseClient<Database>,
  businessId: string,
  researchRunId?: string
): Promise<{ scored: number; failed: number }> {
  console.log('📊 Starting relevance scoring for business:', businessId);
  
  try {
    // Get business data for embedding
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('name, description, target_audience, industry, keywords')
      .eq('id', businessId)
      .single();

    if (bizError || !business) {
      console.error('Failed to get business for scoring:', bizError);
      return { scored: 0, failed: 0 };
    }

    // Generate business embedding
    const businessText = `
      ${business.name || ''}
      ${business.description || ''}
      Target audience: ${business.target_audience || ''}
      Industry: ${business.industry || ''}
      Keywords: ${(business.keywords || []).join(', ')}
    `.trim();

    console.log('🧠 Generating business embedding...');
    const businessEmbedding = await generateEmbedding(businessText);

    // Get unscored results for this business (or specific run)
    let query = supabase
      .from('research_results')
      .select('id, result_data')
      .eq('business_id', businessId)
      .is('relevance_score', null);

    if (researchRunId) {
      query = query.eq('research_run_id', researchRunId);
    }

    const { data: results, error: resultsError } = await query;

    if (resultsError || !results || results.length === 0) {
      console.log('No unscored results found');
      return { scored: 0, failed: 0 };
    }

    console.log(`📝 Scoring ${results.length} posts...`);

    let scored = 0;
    let failed = 0;

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 20;
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      
      const updatePromises = batch.map(async (result) => {
        try {
          const data = result.result_data as Record<string, unknown>;
          const title = (data.title as string) || (data.searchTerm as string) || '';
          const body = (data.body as string) || (data.selftext as string) || '';
          
          // Skip if no content
          if (!title && !body) {
            return null;
          }

          // Generate embedding for post content and calculate similarity using Google's embeddings
          // This uses semantic similarity rather than keyword matching, which is more accurate
          const postText = `${title}\n${body}`.slice(0, 2000); // Limit to ~2000 chars
          const postEmbedding = await generateEmbedding(postText);

          // Calculate similarity score using cosine similarity between embeddings
          const score = await calculateRelevanceScore(businessEmbedding, postEmbedding);

          // Update the result with the score
          await supabase
            .from('research_results')
            .update({ relevance_score: score })
            .eq('id', result.id);

          scored++;
          return score;
        } catch (err) {
          console.error(`Failed to score result ${result.id}:`, err);
          failed++;
          return null;
        }
      });

      await Promise.all(updatePromises);
      
      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < results.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Scoring complete: ${scored} scored, ${failed} failed`);
    return { scored, failed };
  } catch (error) {
    console.error('Scoring failed:', error);
    return { scored: 0, failed: 0 };
  }
}

