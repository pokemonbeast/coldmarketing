import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  isGmbScrapingActive,
  isEmailVerificationActive,
  getBusinessesWithPendingTargets,
  getNextUnfulfilledTarget,
  processTarget,
  processXmisoTarget,
  hasActiveSubscription,
  cleanupExpiredCache,
  type GmbScraperType,
} from '@/lib/services/gmb-research';
import type { XmisoGMBTarget } from '@/lib/data/xmiso-categories';

// Vercel cron job secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Daily cron job for Business Lead Finder
 * 
 * For each business with unfulfilled targets:
 * 1. Pick the first unfulfilled target
 * 2. Check if cached data exists (reuse if available)
 * 3. Otherwise run fresh scrape via Apify
 * 4. Verify emails and save to verified_leads
 * 5. Mark target as fulfilled
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret (Vercel adds this header for cron jobs)
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      // Also check for Vercel's cron header
      const vercelCron = request.headers.get('x-vercel-cron');
      if (!vercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = await createClient();

    // Check if GMB scraping provider is active and get scraper type
    const { active: gmbActive, scraperType } = await isGmbScrapingActive(supabase);
    if (!gmbActive || !scraperType) {
      return NextResponse.json({
        success: true,
        message: 'GMB scraping provider is not active, skipping research',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }
    
    console.log(`🔧 Using GMB scraper type: ${scraperType}`);

    // Check if email verification provider is active
    const { active: emailActive } = await isEmailVerificationActive(supabase);
    if (!emailActive) {
      return NextResponse.json({
        success: true,
        message: 'Email verification provider is not active, skipping research',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    // Clean up expired cache entries (housekeeping)
    const cleanedCount = await cleanupExpiredCache(supabase);
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }

    // Get all businesses with pending (unfulfilled) targets
    const businesses = await getBusinessesWithPendingTargets(supabase);

    if (businesses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No businesses with pending targets found',
        processed: 0,
        cleanedCache: cleanedCount,
        duration: Date.now() - startTime,
      });
    }

    console.log(`📋 Found ${businesses.length} businesses with pending targets`);

    const results: Array<{
      businessId: string;
      businessName: string;
      targetIndustry: string;
      success: boolean;
      fromCache?: boolean;
      resultCount?: number;
      emailCount?: number;
      error?: string;
    }> = [];

    // Process ONE target per business per day
    for (const business of businesses) {
      // Check if user has active subscription
      const hasSubscription = await hasActiveSubscription(supabase, business.user_id);
      
      if (!hasSubscription) {
        results.push({
          businessId: business.id,
          businessName: business.name,
          targetIndustry: 'N/A',
          success: false,
          error: 'No active subscription',
        });
        continue;
      }

      // Get the first unfulfilled target
      const nextTarget = getNextUnfulfilledTarget(business.gmb_targets);
      
      if (!nextTarget) {
        // All targets are fulfilled for this business
        results.push({
          businessId: business.id,
          businessName: business.name,
          targetIndustry: 'N/A',
          success: true,
          error: 'All targets already fulfilled',
        });
        continue;
      }

      const { target, index } = nextTarget;

      // Get the search term for display
      const xmisoTarget = target as unknown as XmisoGMBTarget;
      const searchTerm = scraperType === 'xmiso' 
        ? (xmisoTarget.keyword || xmisoTarget.category || 'business')
        : target.industry;
      const locationName = scraperType === 'xmiso'
        ? xmisoTarget.countryName
        : target.countryName;

      console.log(`🔍 Processing target for ${business.name}: "${searchTerm}" in ${locationName} (${scraperType})`);

      // Process the target based on scraper type (both use same caching strategy)
      const result = scraperType === 'xmiso'
        ? await processXmisoTarget(supabase, business.id, xmisoTarget, index)
        : await processTarget(supabase, business.id, target, index);
      
      results.push({
        businessId: business.id,
        businessName: business.name,
        targetIndustry: searchTerm,
        success: result.success,
        fromCache: result.fromCache,
        resultCount: result.resultCount,
        emailCount: result.emailCount,
        error: result.error,
      });

      // Add delay between businesses to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const successCount = results.filter((r) => r.success).length;
    const cacheHits = results.filter((r) => r.fromCache).length;
    const totalResults = results.reduce((sum, r) => sum + (r.resultCount || 0), 0);
    const totalEmails = results.reduce((sum, r) => sum + (r.emailCount || 0), 0);

    return NextResponse.json({
      success: true,
      message: `GMB research completed for ${successCount}/${businesses.length} businesses`,
      processed: businesses.length,
      successCount,
      cacheHits,
      totalResults,
      totalEmails,
      cleanedCache: cleanedCount,
      results,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('GMB research cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Manual trigger from admin panel
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run the same logic as GET
    return GET(request);
  } catch (error) {
    console.error('Manual GMB research trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

