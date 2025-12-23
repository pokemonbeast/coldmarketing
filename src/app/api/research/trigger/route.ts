import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/api/server-impersonation';
import {
  triggerInitialResearch,
  triggerWeeklyResearch,
  hasActiveSubscription,
  isRedditScrapingActive,
  getBusinessWithKeywords,
} from '@/lib/services/research';

export async function POST(request: NextRequest) {
  try {
    // Use service client to bypass RLS (needed for admin impersonation)
    const supabase = await createServiceClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, runType = 'initial' } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }

    // Verify business belongs to user (or user is admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const business = await getBusinessWithKeywords(supabase, businessId);
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check ownership (unless admin)
    if (profile?.role !== 'admin' && business.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to access this business' },
        { status: 403 }
      );
    }

    // Check subscription
    const hasSubscription = await hasActiveSubscription(supabase, business.user_id);
    if (!hasSubscription) {
      return NextResponse.json(
        { error: 'Active subscription required to run research' },
        { status: 403 }
      );
    }

    // Check provider is active
    const { active } = await isRedditScrapingActive(supabase);
    if (!active) {
      return NextResponse.json(
        { error: 'Reddit scraping provider is not currently active' },
        { status: 503 }
      );
    }

    // Check keywords exist
    if (!business.keywords || business.keywords.length === 0) {
      return NextResponse.json(
        { error: 'Please add keywords to your business before running research' },
        { status: 400 }
      );
    }

    // Trigger research based on type
    let result;
    if (runType === 'weekly') {
      result = await triggerWeeklyResearch(supabase, businessId);
    } else {
      result = await triggerInitialResearch(supabase, businessId);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Research failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      runId: result.runId,
      itemCount: result.itemCount,
      message: `Research started! Found ${result.itemCount} results that will be revealed over the next week.`,
    });
  } catch (error) {
    console.error('Research trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

