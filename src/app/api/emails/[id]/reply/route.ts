import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmailReply } from '@/lib/services/reachinbox-campaign';

/**
 * POST /api/emails/[id]/reply
 * Send a reply to an email thread via ReachInbox
 */
export async function POST(
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
    const { subject, replyBody } = body;

    if (!replyBody) {
      return NextResponse.json({ error: 'Reply body is required' }, { status: 400 });
    }

    // Get the original email
    const { data: email, error: emailError } = await supabase
      .from('email_replies')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (emailError || !email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Send the reply via ReachInbox
    const result = await sendEmailReply(supabase, user.id, {
      threadId: email.thread_id || email.id,
      to: email.lead_email,
      from: email.email_account,
      subject: subject || `Re: ${email.subject || 'Your message'}`,
      body: replyBody,
      inReplyTo: email.message_id || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send reply' },
        { status: 500 }
      );
    }

    // Mark the original email as read
    await supabase
      .from('email_replies')
      .update({ is_read: true })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reply email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

