import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/emails/[id]
 * Get a single email reply
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: email, error } = await supabase
      .from('email_replies')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    return NextResponse.json({ email });
  } catch (error) {
    console.error('Get email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/emails/[id]
 * Update email (mark as read, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { is_read } = body;

    // First check the current state
    const { data: currentEmail } = await supabase
      .from('email_replies')
      .select('is_read')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!currentEmail) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Update the email
    const { data: email, error } = await supabase
      .from('email_replies')
      .update({ is_read })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
    }

    // Update unread count if status changed
    if (currentEmail.is_read !== is_read) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('unread_emails_count')
        .eq('id', user.id)
        .single();

      if (profile) {
        const newCount = is_read
          ? Math.max(0, (profile.unread_emails_count || 0) - 1)
          : (profile.unread_emails_count || 0) + 1;

        await supabase
          .from('profiles')
          .update({ unread_emails_count: newCount })
          .eq('id', user.id);
      }
    }

    return NextResponse.json({ email });
  } catch (error) {
    console.error('Update email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

