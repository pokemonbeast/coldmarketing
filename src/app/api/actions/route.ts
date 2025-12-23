import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/api/server-impersonation';

// GET: List planned actions for user's businesses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userId);

    const businessIds = businesses?.map(b => b.id) || [];

    if (businessIds.length === 0) {
      return NextResponse.json({ actions: [], total: 0 });
    }

    // Build query
    let query = supabase
      .from('planned_actions')
      .select('*, business:businesses(id, name)', { count: 'exact' })
      .in('business_id', businessId ? [businessId] : businessIds)
      .order('scheduled_for', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      if (status === 'pending') {
        query = query.in('status', ['pending_review', 'approved', 'scheduled']);
      } else {
        query = query.eq('status', status as 'completed' | 'failed' | 'skipped');
      }
    }

    const { data: actions, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      actions: actions || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('Error fetching actions:', error);
    return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 });
  }
}

