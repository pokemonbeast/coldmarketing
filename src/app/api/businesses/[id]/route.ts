import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
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

// GET: Get a single business
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Use service client to bypass RLS (needed for admin impersonation)
    const supabase = await createServiceClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Error fetching business:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business' },
      { status: 500 }
    );
  }
}

// PATCH: Update a business
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Use service client to bypass RLS (needed for admin impersonation)
    const supabase = await createServiceClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current business state before update
    const { data: currentBusiness } = await supabase
      .from('businesses')
      .select('keywords, gmb_targets, user_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    const body = await request.json();
    const allowedFields = [
      'name',
      'website_url',
      'description',
      'target_audience',
      'keywords',
      'gmb_targets',
      'industry',
      'tone_of_voice',
      'auto_approve',
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

    const { data: business, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if keywords were added (didn't have before, now has)
    const hadKeywords = currentBusiness?.keywords && currentBusiness.keywords.length > 0;
    const hasKeywords = business.keywords && business.keywords.length > 0;
    let researchTriggered = false;
    let researchMessage: string | undefined;

    if (!hadKeywords && hasKeywords) {
      // Check if research has already run for this business
      const { count: existingRuns } = await supabase
        .from('business_research_runs')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', id);

      // Only trigger if no research has run yet
      if (!existingRuns || existingRuns === 0) {
        // Check subscription
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', business.user_id)
          .single();

        if (profile?.subscription_status === 'active') {
          // Check if provider is active
          const { active: providerActive } = await isRedditScrapingActive(supabase as unknown as SupabaseClient<Database>);

          if (providerActive) {
            // Trigger research asynchronously
            triggerInitialResearch(supabase as unknown as SupabaseClient<Database>, id)
              .then((result) => {
                if (result.success) {
                  console.log(`Research started for business ${id}: ${result.itemCount} items`);
                } else {
                  console.error(`Research failed for business ${id}:`, result.error);
                }
              })
              .catch((err) => {
                console.error(`Research error for business ${id}:`, err);
              });

            researchTriggered = true;
            researchMessage = 'Research has started! Results will appear in Live Research over the next week.';
          }
        }
      }
    }

    // Check if GMB targets were added (didn't have unfulfilled targets before, now has)
    const currentGmbTargets = (currentBusiness?.gmb_targets as unknown as GMBTarget[]) || [];
    const newGmbTargets = (business.gmb_targets as unknown as GMBTarget[]) || [];
    
    const hadUnfulfilledTargets = currentGmbTargets.some(t => !t.fulfilled_at);
    const hasUnfulfilledTargets = newGmbTargets.some(t => !t.fulfilled_at);
    let gmbResearchTriggered = false;
    let gmbResearchMessage: string | undefined;

    // Trigger GMB research if new unfulfilled targets were added
    if (!hadUnfulfilledTargets && hasUnfulfilledTargets) {
      // Check subscription
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', business.user_id)
        .single();

      if (profile?.subscription_status === 'active') {
        // Check if GMB and email verification providers are active
        const { active: gmbActive } = await isGmbScrapingActive(supabase);
        const { active: emailActive } = await isEmailVerificationActive(supabase);

        if (gmbActive && emailActive) {
          // Get the first unfulfilled target and process it
          const nextTarget = getNextUnfulfilledTarget(newGmbTargets);
          
          if (nextTarget) {
            // Process first target asynchronously
            processTarget(supabase, id, nextTarget.target, nextTarget.index)
              .then((result) => {
                if (result.success) {
                  console.log(`GMB research started for business ${id}: ${result.resultCount} results, ${result.emailCount} emails`);
                } else {
                  console.error(`GMB research failed for business ${id}:`, result.error);
                }
              })
              .catch((err) => {
                console.error(`GMB research error for business ${id}:`, err);
              });

            gmbResearchTriggered = true;
            gmbResearchMessage = 'Business lead research has started! Your first target is being scraped.';
          }
        }
      }
    }

    return NextResponse.json({ 
      business,
      researchTriggered,
      gmbResearchTriggered,
      message: researchMessage || gmbResearchMessage,
    });
  } catch (error) {
    console.error('Error updating business:', error);
    return NextResponse.json(
      { error: 'Failed to update business' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a business
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Use service client to bypass RLS (needed for admin impersonation)
    const supabase = await createServiceClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting business:', error);
    return NextResponse.json(
      { error: 'Failed to delete business' },
      { status: 500 }
    );
  }
}
