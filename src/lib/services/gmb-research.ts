/**
 * GMB Research Service
 * 
 * Handles automated scraping of Google My Business data via Apify,
 * with universal caching (shared across users) and one-time-per-target logic.
 */

import { ApifyClient } from 'apify-client';
import type { GMBTarget } from '@/types/database';
import type { Json } from '@/types/supabase';
import { generateCacheKey } from '@/lib/data/locations';

// Use a simpler type for Supabase client to avoid complex generic issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = any;
import { 
  extractLeadsFromGmbScrape, 
  type GmbScrapedItem 
} from './lead-extraction';
import {
  processAndSaveVerifiedLeads,
  type EmailVerificationResult,
} from './lead-lists';

// Constants
const GMB_SCRAPER_ACTOR_ID = 'compass/crawler-google-places';
const GMB_PROVIDER_SLUG = 'gmb-leads';
const EMAIL_VERIFICATION_PROVIDER_SLUG = 'email-verification';

export interface GmbResearchResult {
  success: boolean;
  cacheId?: string;
  scrapeResultId?: string;
  resultCount?: number;
  emailCount?: number;
  fromCache?: boolean;
  error?: string;
}

/**
 * Check if GMB scraping provider is active
 */
export async function isGmbScrapingActive(
  supabase: SupabaseClientType
): Promise<{ active: boolean; provider?: { id: string; api_key_encrypted: string | null; config: unknown } }> {
  const { data: provider } = await supabase
    .from('api_providers')
    .select('id, api_key_encrypted, config')
    .eq('slug', GMB_PROVIDER_SLUG)
    .eq('is_active', true)
    .single();

  if (!provider || !provider.api_key_encrypted) {
    return { active: false };
  }

  return { active: true, provider };
}

/**
 * Check if email verification provider is active
 */
export async function isEmailVerificationActive(
  supabase: SupabaseClientType
): Promise<{ active: boolean; provider?: { id: string; api_key_encrypted: string | null; config: unknown } }> {
  const { data: provider } = await supabase
    .from('api_providers')
    .select('id, api_key_encrypted, config')
    .eq('slug', EMAIL_VERIFICATION_PROVIDER_SLUG)
    .eq('is_active', true)
    .single();

  if (!provider || !provider.api_key_encrypted) {
    return { active: false };
  }

  return { active: true, provider };
}

/**
 * Get all businesses that have unfulfilled GMB targets
 */
export async function getBusinessesWithPendingTargets(
  supabase: SupabaseClientType
): Promise<Array<{
  id: string;
  user_id: string;
  name: string;
  gmb_targets: GMBTarget[];
}>> {
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, user_id, name, gmb_targets')
    .eq('is_active', true)
    .not('gmb_targets', 'is', null);

  if (!businesses) return [];

  // Filter to only businesses with at least one unfulfilled target
  return businesses
    .map((b: { id: string; user_id: string; name: string; gmb_targets: unknown }) => ({
      id: b.id,
      user_id: b.user_id,
      name: b.name,
      gmb_targets: (b.gmb_targets as unknown as GMBTarget[]) || [],
    }))
    .filter((b: { gmb_targets: GMBTarget[] }) => {
      const hasUnfulfilled = b.gmb_targets.some((t: GMBTarget) => !t.fulfilled_at);
      return hasUnfulfilled;
    });
}

/**
 * Get the first unfulfilled target for a business
 */
export function getNextUnfulfilledTarget(targets: GMBTarget[]): { target: GMBTarget; index: number } | null {
  const index = targets.findIndex(t => !t.fulfilled_at);
  if (index === -1) return null;
  return { target: targets[index], index };
}

/**
 * Check if cache exists and is valid for a target
 */
export async function getCacheEntry(
  supabase: SupabaseClientType,
  cacheKey: string
): Promise<{
  id: string;
  scrape_result_id: string;
  result_count: number;
  email_count: number;
} | null> {
  const { data } = await supabase
    .from('gmb_scrape_cache')
    .select('id, scrape_result_id, result_count, email_count')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  return data;
}

/**
 * Create or update cache entry
 */
export async function upsertCacheEntry(
  supabase: SupabaseClientType,
  params: {
    cacheKey: string;
    industry: string;
    country: string;
    state: string | null;
    city: string | null;
    scrapeResultId: string;
    resultCount: number;
    emailCount: number;
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from('gmb_scrape_cache')
    .upsert({
      cache_key: params.cacheKey,
      industry: params.industry,
      country: params.country,
      state: params.state,
      city: params.city,
      scrape_result_id: params.scrapeResultId,
      result_count: params.resultCount,
      email_count: params.emailCount,
      scraped_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
    }, {
      onConflict: 'cache_key',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to upsert cache entry:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Mark a target as fulfilled in the business's gmb_targets
 */
export async function markTargetFulfilled(
  supabase: SupabaseClientType,
  businessId: string,
  targetIndex: number,
  cacheId: string,
  resultCount: number
): Promise<boolean> {
  // Get current targets
  const { data: business } = await supabase
    .from('businesses')
    .select('gmb_targets')
    .eq('id', businessId)
    .single();

  if (!business) return false;

  const targets = (business.gmb_targets as unknown as GMBTarget[]) || [];
  if (targetIndex < 0 || targetIndex >= targets.length) return false;

  // Update the specific target
  targets[targetIndex] = {
    ...targets[targetIndex],
    fulfilled_at: new Date().toISOString(),
    cache_id: cacheId,
    result_count: resultCount,
  };

  // Save back
  const { error } = await supabase
    .from('businesses')
    .update({ gmb_targets: targets as unknown as Json })
    .eq('id', businessId);

  return !error;
}

/**
 * Build the location query string for the GMB scraper
 */
function buildLocationQuery(target: GMBTarget): string {
  const parts: string[] = [];
  
  if (target.city) {
    parts.push(target.city);
  }
  
  if (target.state) {
    parts.push(target.state);
  }
  
  parts.push(target.countryName);
  
  return parts.join(', ');
}

/**
 * Run the GMB scraper via Apify
 */
async function runGmbScraper(
  apiToken: string,
  target: GMBTarget,
  maxResults: number = 50
): Promise<{ runId: string; datasetId: string; items: GmbScrapedItem[] }> {
  const client = new ApifyClient({ token: apiToken });
  
  const locationQuery = buildLocationQuery(target);
  
  const input = {
    searchStringsArray: [target.industry],
    locationQuery,
    maxCrawledPlacesPerSearch: maxResults,
    language: 'en',
    scrapeContacts: true,           // IMPORTANT: Enable email scraping
    scrapePlaceDetailPage: true,    // IMPORTANT: Need detail page for emails
    skipClosedPlaces: false,
    includeWebResults: false,
    scrapeDirectories: false,
    maxImages: 0,
    scrapeImageAuthors: false,
    scrapeReviewsPersonalData: false,
    scrapeSocialMediaProfiles: {
      facebooks: false,
      instagrams: false,
      twitters: false,
      youtubes: false,
      tiktoks: false,
    },
    maximumLeadsEnrichmentRecords: 0,
    scrapeTableReservationProvider: false,
  };

  console.log(`🔍 Running GMB scraper for "${target.industry}" in "${locationQuery}"`);

  const run = await client.actor(GMB_SCRAPER_ACTOR_ID).call(input, {
    waitSecs: 300, // Wait up to 5 minutes
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  console.log(`✅ GMB scraper found ${items.length} results`);

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    items: items as GmbScrapedItem[],
  };
}

/**
 * Verify emails using the email verification provider
 */
async function verifyEmails(
  apiToken: string,
  actorId: string,
  emails: string[]
): Promise<EmailVerificationResult[]> {
  if (emails.length === 0) return [];

  const client = new ApifyClient({ token: apiToken });

  console.log(`📧 Verifying ${emails.length} emails...`);

  const run = await client.actor(actorId).call(
    { emailList: emails },
    { waitSecs: 300 }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const results: EmailVerificationResult[] = items.map((item: unknown) => {
    const i = item as Record<string, unknown>;
    const data = i.data as Record<string, unknown> | undefined;
    
    return {
      email: (data?.email || data?.Email || i.email || "") as string,
      domain: (i.domain || data?.Domain || "") as string,
      state: (i.state || "Unknown") as string,
      data: {
        Email: (data?.Email || data?.email || "") as string,
        Domain: (data?.Domain || "") as string,
        IsValid: (data?.IsValid || false) as boolean,
        Free: (data?.Free || false) as boolean,
        Role: (data?.Role || false) as boolean,
        Disposable: (data?.Disposable || false) as boolean,
        AcceptAll: (data?.AcceptAll || false) as boolean,
        ...data,
      },
    };
  });

  const deliverableCount = results.filter(r => r.state === 'Deliverable' && r.data.IsValid).length;
  console.log(`✅ Email verification: ${deliverableCount}/${emails.length} deliverable`);

  return results;
}

/**
 * Process a single target for a business
 * Uses cache if available, otherwise runs fresh scrape
 */
export async function processTarget(
  supabase: SupabaseClientType,
  businessId: string,
  target: GMBTarget,
  targetIndex: number
): Promise<GmbResearchResult> {
  try {
    // Check if GMB provider is active
    const { active: gmbActive, provider: gmbProvider } = await isGmbScrapingActive(supabase);
    if (!gmbActive || !gmbProvider) {
      return { success: false, error: 'GMB scraping provider not active' };
    }

    // Check if email verification is active
    const { active: emailActive, provider: emailProvider } = await isEmailVerificationActive(supabase);
    if (!emailActive || !emailProvider) {
      return { success: false, error: 'Email verification provider not active' };
    }

    const emailProviderConfig = emailProvider.config as { actor_id?: string } | null;
    const emailActorId = emailProviderConfig?.actor_id;
    if (!emailActorId) {
      return { success: false, error: 'Email verification actor not configured' };
    }

    const cacheKey = generateCacheKey(target);
    
    // Check for existing cache entry
    const existingCache = await getCacheEntry(supabase, cacheKey);
    
    if (existingCache) {
      // Use cached data - just mark the target as fulfilled
      console.log(`📦 Using cached data for "${target.industry}" in cache ${existingCache.id}`);
      
      await markTargetFulfilled(
        supabase,
        businessId,
        targetIndex,
        existingCache.id,
        existingCache.result_count
      );

      return {
        success: true,
        cacheId: existingCache.id,
        scrapeResultId: existingCache.scrape_result_id,
        resultCount: existingCache.result_count,
        emailCount: existingCache.email_count,
        fromCache: true,
      };
    }

    // No cache - run fresh scrape
    console.log(`🆕 No cache found, running fresh scrape for "${target.industry}"`);

    // Run the GMB scraper
    const { runId, datasetId, items } = await runGmbScraper(
      gmbProvider.api_key_encrypted!,
      target,
      50
    );

    // Save raw results to apify_scrape_results
    const { data: savedResult, error: saveError } = await supabase
      .from('apify_scrape_results')
      .insert({
        provider_id: gmbProvider.id,
        actor_id: GMB_SCRAPER_ACTOR_ID,
        run_id: runId,
        dataset_id: datasetId,
        input_config: {
          industry: target.industry,
          location: buildLocationQuery(target),
          cacheKey,
        },
        results_data: items,
        item_count: items.length,
        status: 'completed',
      })
      .select('id')
      .single();

    if (saveError || !savedResult) {
      console.error('Failed to save scrape results:', saveError);
      return { success: false, error: 'Failed to save scrape results' };
    }

    // Extract emails from results
    const extraction = extractLeadsFromGmbScrape(items, target.industry);
    const emails = extraction.leads.map(l => l.email);

    let emailCount = 0;

    // Verify emails if any were found
    if (emails.length > 0) {
      const verificationResults = await verifyEmails(
        emailProvider.api_key_encrypted!,
        emailActorId,
        emails
      );

      // Save verified leads with business_id for direct linking
      const saveResult = await processAndSaveVerifiedLeads(
        supabase,
        extraction.leads,
        verificationResults,
        savedResult.id,
        businessId
      );

      emailCount = saveResult.totalInserted;
      console.log(`💾 Saved ${emailCount} verified leads`);
    }

    // Create cache entry
    const cacheId = await upsertCacheEntry(supabase, {
      cacheKey,
      industry: target.industry,
      country: target.country,
      state: target.state,
      city: target.city,
      scrapeResultId: savedResult.id,
      resultCount: items.length,
      emailCount,
    });

    if (!cacheId) {
      return { success: false, error: 'Failed to create cache entry' };
    }

    // Mark target as fulfilled
    await markTargetFulfilled(
      supabase,
      businessId,
      targetIndex,
      cacheId,
      items.length
    );

    return {
      success: true,
      cacheId,
      scrapeResultId: savedResult.id,
      resultCount: items.length,
      emailCount,
      fromCache: false,
    };

  } catch (error) {
    console.error('GMB target processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(
  supabase: SupabaseClientType,
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
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(
  supabase: SupabaseClientType
): Promise<number> {
  const { data, error } = await supabase
    .from('gmb_scrape_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('Failed to cleanup expired cache:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Get GMB target status for a business (for UI display)
 */
export async function getTargetStatus(
  supabase: SupabaseClientType,
  businessId: string
): Promise<{
  targets: GMBTarget[];
  fulfilled: number;
  pending: number;
  allFulfilled: boolean;
}> {
  const { data: business } = await supabase
    .from('businesses')
    .select('gmb_targets')
    .eq('id', businessId)
    .single();

  const targets = (business?.gmb_targets as unknown as GMBTarget[]) || [];
  const fulfilled = targets.filter(t => t.fulfilled_at).length;
  const pending = targets.length - fulfilled;

  return {
    targets,
    fulfilled,
    pending,
    allFulfilled: targets.length > 0 && pending === 0,
  };
}

