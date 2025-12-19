import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateComment,
  rankContentByRelevance,
  type BusinessContext,
  type ContentItem,
} from '@/lib/services/google-ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId, poolId, maxComments, minRelevanceScore } = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Get business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Build business context
    const businessContext: BusinessContext = {
      name: business.name,
      description: business.description || '',
      targetAudience: business.target_audience || '',
      keywords: business.keywords || [],
      industry: business.industry || '',
      websiteUrl: business.website_url || undefined,
      toneOfVoice: business.tone_of_voice || 'helpful',
    };

    // Get content from embeddings table (items without planned actions yet)
    let query = supabase
      .from('content_embeddings')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(maxComments || 20);

    if (poolId) {
      query = query.eq('scraped_pool_id', poolId);
    }

    const { data: contentItems, error: contentError } = await query;

    if (contentError) {
      console.error('Content fetch error:', contentError);
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
    }

    if (!contentItems || contentItems.length === 0) {
      return NextResponse.json({ 
        message: 'No new content to process',
        actionsCreated: 0 
      });
    }

    // Convert to ContentItem format
    const contents: ContentItem[] = contentItems.map((item) => ({
      title: ((item.metadata as any)?.title as string) || 'Untitled',
      content: item.content_text || '',
      url: item.content_url || '',
      platform: item.platform || 'unknown',
      subreddit: (item.metadata as any)?.subreddit,
      author: (item.metadata as any)?.author,
    }));

    // Rank by relevance
    const rankedContent = await rankContentByRelevance(businessContext, contents);

    // Filter by minimum relevance score
    const minScore = minRelevanceScore || 0.5;
    const relevantContent = rankedContent.filter((item) => item.score >= minScore);

    // Generate comments and create planned actions
    const actionsCreated: string[] = [];
    
    for (const { content, score } of relevantContent) {
      try {
        // Find the original content item
        const originalItem = contentItems.find((i) => i.content_url === content.url);
        if (!originalItem) continue;

        // Generate comment
        const comment = await generateComment(businessContext, content, {
          maxLength: 300,
          includeLink: false,
          style: 'helpful',
        });

        // Create planned action
        const { data: action, error: actionError } = await supabase
          .from('planned_actions')
          .insert({
            business_id: businessId,
            embedding_id: originalItem.id,
            platform: content.platform as 'reddit' | 'instagram' | 'tiktok' | 'linkedin' | 'youtube' | 'twitter',
            target_url: content.url,
            target_title: content.title,
            target_snippet: content.content.slice(0, 500),
            generated_comment: comment,
            relevance_score: score,
            status: business.auto_approve ? 'approved' : 'pending_review',
            auto_approved: business.auto_approve || false,
          })
          .select()
          .single();

        if (actionError) {
          console.error('Failed to create action:', actionError);
          continue;
        }

        // Mark content as used (cast to any to avoid type inference issues)
        await supabase
          .from('content_embeddings')
          .update({ is_used: true } as any)
          .eq('id', originalItem.id);

        actionsCreated.push(action.id);
      } catch (genError) {
        console.error('Failed to generate comment:', genError);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      actionsCreated: actionsCreated.length,
      actionIds: actionsCreated,
    });
  } catch (error) {
    console.error('Generate comments error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate comments' },
      { status: 500 }
    );
  }
}

