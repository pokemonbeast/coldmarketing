import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createApifyService, buildRedditInput, type RedditPost } from '@/lib/services/apify';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessId, scraperConfigId, customInput } = await request.json();

    if (!businessId || !scraperConfigId) {
      return NextResponse.json(
        { error: 'Business ID and Scraper Config ID are required' },
        { status: 400 }
      );
    }

    // Verify business ownership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get scraper config
    const { data: scraperConfig, error: scraperError } = await supabase
      .from('scraper_configs')
      .select('*')
      .eq('id', scraperConfigId)
      .eq('is_active', true)
      .single();

    if (scraperError || !scraperConfig) {
      return NextResponse.json({ error: 'Scraper config not found or inactive' }, { status: 404 });
    }

    // Check for business-specific overrides
    const { data: platformConfig } = await supabase
      .from('business_platform_configs')
      .select('*')
      .eq('business_id', businessId)
      .eq('scraper_config_id', scraperConfigId)
      .single();

    // Determine max results (use override if available)
    const maxResults = platformConfig?.max_results_override || 
                       scraperConfig.default_max_results_per_run || 100;

    // Check weekly run limits
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count: runsThisWeek } = await supabase
      .from('scraper_run_logs')
      .select('*', { count: 'exact', head: true })
      .eq('scraper_config_id', scraperConfigId)
      .eq('business_id', businessId)
      .gte('started_at', oneWeekAgo.toISOString());

    if ((runsThisWeek || 0) >= (scraperConfig.max_runs_per_week || 7)) {
      return NextResponse.json(
        { error: 'Weekly run limit reached for this scraper' },
        { status: 429 }
      );
    }

    // Check monthly budget if set
    if (scraperConfig.monthly_budget_limit) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyRuns } = await supabase
        .from('scraper_run_logs')
        .select('estimated_cost')
        .eq('scraper_config_id', scraperConfigId)
        .gte('started_at', startOfMonth.toISOString());

      const totalCost = monthlyRuns?.reduce((sum, run) => sum + (run.estimated_cost || 0), 0) || 0;
      
      if (totalCost >= scraperConfig.monthly_budget_limit) {
        return NextResponse.json(
          { error: 'Monthly budget limit reached for this scraper' },
          { status: 429 }
        );
      }
    }

    // Create run log entry
    const { data: runLog, error: logError } = await supabase
      .from('scraper_run_logs')
      .insert({
        scraper_config_id: scraperConfigId,
        business_id: businessId,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create run log:', logError);
    }

    try {
      // Get API token (in production, decrypt this)
      const apiToken = scraperConfig.api_token_encrypted;
      if (!apiToken) {
        throw new Error('Scraper API token not configured');
      }

      // Create APIFY service
      const apifyService = createApifyService(
        apiToken,
        scraperConfig.actor_id || 'apify/reddit-scraper',
        maxResults
      );

      // Build input based on platform and business settings
      let input = customInput;
      
      if (!input && scraperConfig.platform === 'reddit') {
        // Get platform-specific settings
        const platformSettings = platformConfig?.platform_settings || scraperConfig.default_config || {};
        const subreddits = (platformSettings as any).subreddits || [];
        
        input = buildRedditInput(
          business.keywords || [],
          subreddits,
          maxResults
        );
      }

      // Run the scraper
      const result = await apifyService.runActor<RedditPost>(input);

      // Calculate estimated cost
      const estimatedCost = result.usageUsd || 
        (result.itemCount * (scraperConfig.estimated_cost_per_result || 0.001));

      // Update run log
      if (runLog) {
        await supabase
          .from('scraper_run_logs')
          .update({
            run_id: result.runId,
            status: result.status,
            results_count: result.itemCount,
            estimated_cost: estimatedCost,
            completed_at: result.finishedAt,
          })
          .eq('id', runLog.id);
      }

      // Store scraped content in pool (condensed as JSONB)
      const { data: pool, error: poolError } = await supabase
        .from('scraped_content_pool')
        .insert({
          business_id: businessId,
          scraper_config_id: scraperConfigId,
          platform: scraperConfig.platform,
          batch_data: JSON.parse(JSON.stringify(result.items)),
          item_count: result.itemCount,
          scrape_run_id: result.runId,
          scraped_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
        })
        .select()
        .single();

      if (poolError) {
        console.error('Failed to store scraped content:', poolError);
      }

      // Create content embeddings (store items individually for vector search)
      if (pool && result.items.length > 0) {
        const embeddings = result.items.slice(0, 100).map((item: RedditPost) => ({
          scraped_pool_id: pool.id,
          business_id: businessId,
          content_hash: crypto.createHash('md5').update(item.url || item.id).digest('hex'),
          content_text: `${item.title || ''}\n${item.selftext || ''}`.slice(0, 5000),
          content_url: item.permalink ? `https://reddit.com${item.permalink}` : item.url,
          platform: scraperConfig.platform,
          metadata: {
            subreddit: item.subreddit,
            author: item.author,
            score: item.score,
            numComments: item.numComments,
            created: item.created,
          },
        }));

        // Insert embeddings (ignore duplicates based on content_hash)
        const { error: embeddingsError } = await supabase
          .from('content_embeddings')
          .upsert(embeddings, {
            onConflict: 'business_id,content_hash',
            ignoreDuplicates: true,
          });

        if (embeddingsError) {
          console.error('Failed to create embeddings:', embeddingsError);
        }
      }

      return NextResponse.json({
        success: true,
        runId: result.runId,
        itemCount: result.itemCount,
        estimatedCost,
        poolId: pool?.id,
      });
    } catch (scraperError) {
      // Update run log with error
      if (runLog) {
        await supabase
          .from('scraper_run_logs')
          .update({
            status: 'failed',
            error_message: scraperError instanceof Error ? scraperError.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', runLog.id);
      }

      throw scraperError;
    }
  } catch (error) {
    console.error('Scraper run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scraper run failed' },
      { status: 500 }
    );
  }
}

