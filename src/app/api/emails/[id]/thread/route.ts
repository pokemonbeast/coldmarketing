import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmailThread } from '@/lib/services/reachinbox-campaign';

/**
 * GET /api/emails/[id]/thread
 * Get the full email thread from ReachInbox
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

    // Get the email to find the thread ID
    const { data: email, error: emailError } = await supabase
      .from('email_replies')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (emailError || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const threadId = email.thread_id || email.id;

    // Fetch thread from ReachInbox
    const result = await getEmailThread(supabase, threadId);

    if (!result.success) {
      // Return just the email we have if thread fetch fails
      return NextResponse.json({
        thread: {
          id: email.id,
          leadEmail: email.lead_email,
          leadFirstName: email.lead_first_name,
          leadLastName: email.lead_last_name,
          emailAccount: email.email_account,
          subject: email.subject,
          messages: [
            {
              id: email.message_id || email.id,
              from: email.lead_email,
              to: email.email_account,
              body: email.body,
              timestamp: email.received_at,
            },
          ],
        },
      });
    }

    return NextResponse.json({ thread: result.data });
  } catch (error) {
    console.error('Get thread error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

