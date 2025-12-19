import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper to check admin
async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user, profile };
}

// GET: Get a single scraper config
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminCheck = await checkAdmin(supabase);
    
    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { data: scraper, error } = await supabase
      .from('scraper_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !scraper) {
      return NextResponse.json(
        { error: 'Scraper not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ scraper });
  } catch (error) {
    console.error('Error fetching scraper:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scraper' },
      { status: 500 }
    );
  }
}

// PATCH: Update a scraper config
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminCheck = await checkAdmin(supabase);
    
    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = await request.json();
    const allowedFields = [
      'name',
      'slug',
      'provider',
      'platform',
      'api_endpoint',
      'api_token_encrypted',
      'actor_id',
      'default_max_results_per_run',
      'max_runs_per_week',
      'estimated_cost_per_result',
      'monthly_budget_limit',
      'default_config',
      'is_active',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: scraper, error } = await supabase
      .from('scraper_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!scraper) {
      return NextResponse.json(
        { error: 'Scraper not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ scraper });
  } catch (error) {
    console.error('Error updating scraper:', error);
    return NextResponse.json(
      { error: 'Failed to update scraper' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a scraper config
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminCheck = await checkAdmin(supabase);
    
    if ('error' in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { error } = await supabase
      .from('scraper_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scraper:', error);
    return NextResponse.json(
      { error: 'Failed to delete scraper' },
      { status: 500 }
    );
  }
}

