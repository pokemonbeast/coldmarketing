import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBusinessLimitForPlan } from '@/lib/services/stripe';

// GET: List user's businesses
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Also fetch profile to include subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_plan_name')
      .eq('id', user.id)
      .single();

    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ 
      businesses,
      hasActiveSubscription: profile?.subscription_status === 'active',
      planName: profile?.subscription_plan_name,
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch businesses' },
      { status: 500 }
    );
  }
}

// POST: Create a new business
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription status and business limit
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_plan_name, subscription_actions_limit')
      .eq('id', user.id)
      .single();

    const hasActiveSubscription = profile?.subscription_status === 'active';

    // Get current business count
    const { count } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Determine business limit based on plan (0 if no active subscription)
    const limit = hasActiveSubscription 
      ? getBusinessLimitForPlan(profile?.subscription_plan_name || null)
      : 1; // Allow 1 business to be saved without subscription (but it will be inactive)

    if ((count || 0) >= limit && hasActiveSubscription) {
      return NextResponse.json(
        { error: `Your plan allows up to ${limit} business(es). Upgrade to add more.` },
        { status: 403 }
      );
    }

    // If no subscription and already has a business, block
    if (!hasActiveSubscription && (count || 0) >= 1) {
      return NextResponse.json(
        { 
          error: 'Subscribe to add more businesses',
          requiresSubscription: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      website_url,
      description,
      target_audience,
      keywords,
      industry,
      tone_of_voice,
      auto_approve,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    // Create business - set inactive if no subscription
    const { data: business, error } = await supabase
      .from('businesses')
      .insert({
        user_id: user.id,
        name,
        website_url,
        description,
        target_audience,
        keywords: keywords || [],
        industry,
        tone_of_voice: tone_of_voice || 'professional',
        auto_approve: auto_approve || false,
        is_active: hasActiveSubscription, // Only active if they have subscription
      })
      .select()
      .single();

    if (error) throw error;

    // Return success with subscription prompt if needed
    return NextResponse.json({ 
      business,
      requiresSubscription: !hasActiveSubscription,
      message: !hasActiveSubscription 
        ? 'Business saved! Subscribe to activate AI-powered outreach for this business.'
        : undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}

