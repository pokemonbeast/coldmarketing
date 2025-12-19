import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateHashtags, generateSubreddits, type BusinessContext } from '@/lib/services/google-ai';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId, type, platform, count } = await request.json();

    if (!businessId || !type) {
      return NextResponse.json(
        { error: 'Business ID and type are required' },
        { status: 400 }
      );
    }

    // Get business with ownership check
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();

    if (error || !business) {
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

    let suggestions: string[] = [];

    switch (type) {
      case 'hashtags':
        suggestions = await generateHashtags(
          businessContext,
          platform || 'instagram',
          count || 10
        );
        break;
      
      case 'subreddits':
        suggestions = await generateSubreddits(businessContext, count || 20);
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('AI suggestions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

