import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getBusinessLimitForPlan } from '@/lib/services/stripe';
import { getEffectiveUserId } from '@/lib/api/server-impersonation';
import { triggerInitialResearch, isRedditScrapingActive } from '@/lib/services/research';
import { 
  isGmbScrapingActive, 
  isEmailVerificationActive,
  processTarget,
  getNextUnfulfilledTarget,
} from '@/lib/services/gmb-research';
import type { GMBTarget, Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// GET: List user's businesses
export async function GET(request: NextRequest) {
  try {
    // Use service client to bypass RLS (needed for admin impersonation)
    const supabase = await createServiceClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Also fetch profile to include subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_plan_name')
      .eq('id', userId)
      .single();

    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
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
    // Use service client to bypass RLS (needed for admin impersonation)
    const serviceClient = await createServiceClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription status and business limit
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('subscription_status, subscription_plan_name, subscription_actions_limit')
      .eq('id', userId)
      .single();

    const hasActiveSubscription = profile?.subscription_status === 'active';

    // Get current business count
    const { count } = await serviceClient
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

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
      gmb_targets,
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
    // Use service client to bypass RLS (needed for admin impersonation)
    const { data: business, error } = await serviceClient
      .from('businesses')
      .insert({
        user_id: userId,
        name,
        website_url,
        description,
        target_audience,
        keywords: keywords || [],
        gmb_targets: gmb_targets || [],
        industry,
        tone_of_voice: tone_of_voice || 'professional',
        auto_approve: auto_approve || false,
        is_active: hasActiveSubscription, // Only active if they have subscription
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger initial research if user has subscription and keywords
    let researchTriggered = false;
    let researchMessage: string | undefined;
    
    if (hasActiveSubscription && keywords && keywords.length > 0) {
      // Check if reddit-scraping provider is active
      const { active: providerActive } = await isRedditScrapingActive(serviceClient as SupabaseClient<Database>);
      
      if (providerActive) {
        // Trigger research asynchronously (don't await - let it run in background)
        triggerInitialResearch(serviceClient as SupabaseClient<Database>, business.id)
          .then((result) => {
            if (result.success) {
              console.log(`Initial research started for business ${business.id}: ${result.itemCount} items`);
            } else {
              console.error(`Initial research failed for business ${business.id}:`, result.error);
            }
          })
          .catch((err) => {
            console.error(`Initial research error for business ${business.id}:`, err);
          });
        
        researchTriggered = true;
        researchMessage = 'Research has started! Results will appear in Live Research over the next week.';
      }
    }

    // Trigger GMB research if user has subscription and gmb_targets
    let gmbResearchTriggered = false;
    let gmbResearchMessage: string | undefined;

    if (hasActiveSubscription && gmb_targets && gmb_targets.length > 0) {
      // Check if GMB and email verification providers are active
      const { active: gmbActive } = await isGmbScrapingActive(serviceClient);
      const { active: emailActive } = await isEmailVerificationActive(serviceClient);

      if (gmbActive && emailActive) {
        const targets = gmb_targets as GMBTarget[];
        const nextTarget = getNextUnfulfilledTarget(targets);

        if (nextTarget) {
          // Process first target asynchronously
          processTarget(serviceClient, business.id, nextTarget.target, nextTarget.index)
            .then((result) => {
              if (result.success) {
                console.log(`Initial GMB research started for business ${business.id}: ${result.resultCount} results, ${result.emailCount} emails`);
              } else {
                console.error(`Initial GMB research failed for business ${business.id}:`, result.error);
              }
            })
            .catch((err) => {
              console.error(`Initial GMB research error for business ${business.id}:`, err);
            });

          gmbResearchTriggered = true;
          gmbResearchMessage = 'Business lead research has started! Your first target is being scraped.';
        }
      }
    }

    // Return success with subscription prompt if needed
    return NextResponse.json({ 
      business,
      requiresSubscription: !hasActiveSubscription,
      researchTriggered,
      gmbResearchTriggered,
      message: !hasActiveSubscription 
        ? 'Business saved! Subscribe to activate AI-powered outreach for this business.'
        : (researchMessage || gmbResearchMessage),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}

