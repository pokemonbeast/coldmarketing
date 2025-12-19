import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: List all scraper configs (admin only for all, users see active only)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = supabase.from('scraper_configs').select('*');

    // Non-admins only see active scrapers
    if (profile?.role !== 'admin') {
      query = query.eq('is_active', true);
    }

    const { data: scrapers, error } = await query.order('name');

    if (error) throw error;

    // Hide API tokens for non-admins
    if (profile?.role !== 'admin') {
      scrapers?.forEach((scraper) => {
        scraper.api_token_encrypted = scraper.api_token_encrypted ? '••••••••' : null;
      });
    }

    return NextResponse.json({ scrapers });
  } catch (error) {
    console.error('Error fetching scrapers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scrapers' },
      { status: 500 }
    );
  }
}

// POST: Create a new scraper config (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      provider,
      platform,
      api_endpoint,
      api_token_encrypted,
      actor_id,
      default_max_results_per_run,
      max_runs_per_week,
      estimated_cost_per_result,
      monthly_budget_limit,
      default_config,
      is_active,
    } = body;

    if (!name || !slug || !platform) {
      return NextResponse.json(
        { error: 'Name, slug, and platform are required' },
        { status: 400 }
      );
    }

    const { data: scraper, error } = await supabase
      .from('scraper_configs')
      .insert({
        name,
        slug,
        provider: provider || 'apify',
        platform,
        api_endpoint,
        api_token_encrypted,
        actor_id,
        default_max_results_per_run: default_max_results_per_run || 100,
        max_runs_per_week: max_runs_per_week || 7,
        estimated_cost_per_result: estimated_cost_per_result || 0.001,
        monthly_budget_limit,
        default_config: default_config || {},
        is_active: is_active || false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ scraper }, { status: 201 });
  } catch (error) {
    console.error('Error creating scraper:', error);
    return NextResponse.json(
      { error: 'Failed to create scraper' },
      { status: 500 }
    );
  }
}

