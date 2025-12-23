import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/api/server-impersonation';

interface SimulatedPost {
  subreddit: string;
  title: string;
  relevance: number;
}

// Fallback posts if no data in database
function generateFallbackPosts(keywords: string[]): SimulatedPost[] {
  const templates = [
    { template: "Best way to handle {keyword}?", subreddit: "r/AskReddit" },
    { template: "Anyone have experience with {keyword}?", subreddit: "r/Entrepreneur" },
    { template: "{keyword} - what's working for you in 2025?", subreddit: "r/smallbusiness" },
    { template: "Struggling with {keyword}, need advice", subreddit: "r/startups" },
    { template: "Is {keyword} worth investing in?", subreddit: "r/business" },
    { template: "How do you approach {keyword} for clients?", subreddit: "r/freelance" },
    { template: "{keyword} tools and resources?", subreddit: "r/marketing" },
    { template: "Just started with {keyword}, any tips?", subreddit: "r/advice" },
    { template: "What's the future of {keyword}?", subreddit: "r/Futurology" },
    { template: "{keyword} - overrated or underrated?", subreddit: "r/unpopularopinion" },
  ];

  const posts: SimulatedPost[] = [];
  const usedTemplates = new Set<number>();

  keywords.forEach((keyword) => {
    const count = Math.min(4, Math.ceil(10 / keywords.length));
    for (let i = 0; i < count && posts.length < 10; i++) {
      let templateIndex;
      do {
        templateIndex = Math.floor(Math.random() * templates.length);
      } while (usedTemplates.has(templateIndex) && usedTemplates.size < templates.length);
      
      usedTemplates.add(templateIndex);
      const t = templates[templateIndex];
      
      posts.push({
        subreddit: t.subreddit,
        title: t.template.replace('{keyword}', keyword),
        relevance: Math.floor(Math.random() * 25) + 70,
      });
    }
  });

  return posts.slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    
    // Get effective user ID (supports admin impersonation)
    const { userId, error: authError } = await getEffectiveUserId(request);
    if (authError || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId required' }, { status: 400 });
    }

    // Get the latest research run for this business
    const { data: researchRun } = await supabase
      .from('business_research_runs')
      .select('simulated_posts, keywords_used')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (researchRun?.simulated_posts && Array.isArray(researchRun.simulated_posts) && researchRun.simulated_posts.length > 0) {
      return NextResponse.json({ posts: researchRun.simulated_posts });
    }

    // Fallback: get keywords from business and generate template posts
    const { data: business } = await supabase
      .from('businesses')
      .select('keywords')
      .eq('id', businessId)
      .single();

    const keywords = business?.keywords || researchRun?.keywords_used || ['business'];
    return NextResponse.json({ posts: generateFallbackPosts(keywords) });

  } catch (error) {
    console.error('Failed to fetch simulated posts:', error);
    return NextResponse.json({ posts: generateFallbackPosts(['business']) });
  }
}
