import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/api/server-impersonation';

// GET: Get single action
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get action with business validation
    const { data: action, error } = await supabase
      .from('planned_actions')
      .select('*, business:businesses(*)')
      .eq('id', id)
      .single();

    if (error || !action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Verify ownership
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', action.business_id)
      .eq('user_id', userId)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ action });
  } catch (error) {
    console.error('Error fetching action:', error);
    return NextResponse.json({ error: 'Failed to fetch action' }, { status: 500 });
  }
}

// PATCH: Update action (edit comment, approve, skip, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, edited_comment, scheduled_for } = body;

    // Get current action
    const { data: currentAction } = await supabase
      .from('planned_actions')
      .select('*, business:businesses(user_id)')
      .eq('id', id)
      .single();

    if (!currentAction) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    // Verify ownership
    if ((currentAction as any).business?.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    
    if (status !== undefined) {
      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        pending_review: ['approved', 'skipped'],
        approved: ['scheduled', 'pending_review', 'skipped'],
        scheduled: ['executing', 'pending_review', 'skipped'],
        executing: ['completed', 'failed'],
        completed: [],
        failed: ['pending_review', 'skipped'],
        skipped: ['pending_review'],
      };

      const currentStatus = currentAction.status || 'pending_review';
      if (!validTransitions[currentStatus]?.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${status}` },
          { status: 400 }
        );
      }

      updates.status = status;

      // If approving, mark as approved
      if (status === 'approved') {
        updates.auto_approved = false;
      }
    }

    if (edited_comment !== undefined) {
      updates.edited_comment = edited_comment;
    }

    if (scheduled_for !== undefined) {
      updates.scheduled_for = scheduled_for;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update action
    const { data: action, error } = await supabase
      .from('planned_actions')
      .update(updates)
      .eq('id', id)
      .select('*, business:businesses(id, name)')
      .single();

    if (error) throw error;

    return NextResponse.json({ action });
  } catch (error) {
    console.error('Error updating action:', error);
    return NextResponse.json({ error: 'Failed to update action' }, { status: 500 });
  }
}

// DELETE: Remove action
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get action to verify ownership
    const { data: action } = await supabase
      .from('planned_actions')
      .select('*, business:businesses(user_id)')
      .eq('id', id)
      .single();

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    if ((action as any).business?.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete action
    const { error } = await supabase
      .from('planned_actions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting action:', error);
    return NextResponse.json({ error: 'Failed to delete action' }, { status: 500 });
  }
}
