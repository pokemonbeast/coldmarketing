import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/api/server-impersonation';
import { getRevealedResults, getResearchStats } from '@/lib/services/research';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    // Use service client to bypass RLS (needed for admin impersonation)
    const supabase = await createServiceClient();
    const { businessId } = await params;
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify business belongs to user (or user is admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const { data: business } = await supabase
      .from('businesses')
      .select('id, user_id, name, keywords')
      .eq('id', businessId)
      .single();

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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const platform = (searchParams.get('platform') || 'reddit') as 'reddit' | 'gmb';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get results and stats
    const [resultsData, stats] = await Promise.all([
      getRevealedResults(supabase, businessId, platform, limit, offset),
      getResearchStats(supabase, businessId),
    ]);

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        keywords: business.keywords,
      },
      results: resultsData.results,
      pagination: {
        total: resultsData.total,
        limit,
        offset,
        hasMore: offset + limit < resultsData.total,
      },
      stats: {
        totalResults: stats.totalResults,
        revealedCount: stats.revealedCount,
        pendingCount: stats.pendingCount,
        lastRunAt: stats.lastRunAt,
      },
      nextRevealAt: resultsData.nextRevealAt,
    });
  } catch (error) {
    console.error('Research results error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

