import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/emails
 * List email replies for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = supabase
      .from('email_replies')
      .select('*')
      .eq('user_id', user.id)
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: emails, error } = await query;

    if (error) {
      console.error('Error fetching emails:', error);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    // Get total count
    const { count } = await supabase
      .from('email_replies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      emails: emails || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Emails API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

