import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  triggerWeeklyResearch,
  getBusinessesForWeeklyResearch,
  hasActiveSubscription,
  isRedditScrapingActive,
} from '@/lib/services/research';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// Vercel cron job secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
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
    const supabaseTyped = supabase as SupabaseClient<Database>;

    // Check if Reddit scraping provider is active
    const { active } = await isRedditScrapingActive(supabaseTyped);
    if (!active) {
      return NextResponse.json({
        success: true,
        message: 'Reddit scraping provider is not active, skipping weekly research',
        processed: 0,
      });
    }

    // Get all active businesses with keywords
    const businesses = await getBusinessesForWeeklyResearch(supabaseTyped);

    const results: Array<{
      businessId: string;
      success: boolean;
      itemCount?: number;
      error?: string;
    }> = [];

    // Process each business
    for (const business of businesses) {
      // Check if user has active subscription
      const hasSubscription = await hasActiveSubscription(supabaseTyped, business.user_id);
      
      if (!hasSubscription) {
        results.push({
          businessId: business.id,
          success: false,
          error: 'No active subscription',
        });
        continue;
      }

      // Check if business has keywords
      if (!business.keywords || business.keywords.length === 0) {
        results.push({
          businessId: business.id,
          success: false,
          error: 'No keywords configured',
        });
        continue;
      }

      // Run weekly research
      const result = await triggerWeeklyResearch(supabaseTyped, business.id);
      
      results.push({
        businessId: business.id,
        success: result.success,
        itemCount: result.itemCount,
        error: result.error,
      });

      // Add small delay between businesses to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const successCount = results.filter((r) => r.success).length;
    const totalItems = results.reduce((sum, r) => sum + (r.itemCount || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Weekly research completed for ${successCount}/${businesses.length} businesses`,
      processed: businesses.length,
      successCount,
      totalItems,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Weekly research cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering from admin
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
    console.error('Manual research cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

