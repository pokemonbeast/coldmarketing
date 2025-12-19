import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApifyClient } from "apify-client";
import { 
  extractLeadsFromGmbScrape, 
  type GmbScrapedItem 
} from "@/lib/services/lead-extraction";
import { 
  processAndSaveVerifiedLeads,
  type EmailVerificationResult,
} from "@/lib/services/lead-lists";

// Actor ID for GMB scraper that triggers email verification
const GMB_SCRAPER_ACTOR_ID = "compass/crawler-google-places";
const EMAIL_VERIFICATION_PROVIDER_SLUG = "email-verification";

export interface ApifyRunResult {
  success: boolean;
  runId?: string;
  datasetId?: string;
  status?: string;
  items?: unknown[];
  itemCount?: number;
  usageUsd?: number;
  error?: string;
  timestamp: string;
  // Email verification results (for GMB scrapes)
  emailVerification?: {
    triggered: boolean;
    totalEmails?: number;
    deliverableCount?: number;
    insertedCount?: number;
    error?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { providerId, input, waitForFinish = true, saveResults = true } = body;

    // Get provider details
    const { data: provider } = await supabase
      .from("api_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    if (provider.provider_type !== "apify") {
      return NextResponse.json(
        { error: "Provider is not an Apify provider" },
        { status: 400 }
      );
    }

    if (!provider.api_key_encrypted) {
      return NextResponse.json(
        { error: "API token not configured for this provider" },
        { status: 400 }
      );
    }

    const config = provider.config as Record<string, unknown> | null;
    const actorId = config?.actor_id as string;

    if (!actorId) {
      return NextResponse.json(
        { error: "Actor ID not configured for this provider" },
        { status: 400 }
      );
    }

    // Merge default input with provided input
    const defaultInput = (config?.default_input as Record<string, unknown>) || {};
    const mergedInput = { ...defaultInput, ...input };

    // Create Apify client
    const client = new ApifyClient({
      token: provider.api_key_encrypted,
    });

    let result: ApifyRunResult;

    if (waitForFinish) {
      // Run actor and wait for completion
      const run = await client.actor(actorId).call(mergedInput, {
        waitSecs: 300, // Wait up to 5 minutes
      });

      // Get the dataset items
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      result = {
        success: true,
        runId: run.id,
        datasetId: run.defaultDatasetId,
        status: run.status,
        items: items,
        itemCount: items.length,
        usageUsd: typeof run.usageUsd === "number" ? run.usageUsd : 0,
        timestamp: new Date().toISOString(),
      };

      // Save results to database if requested
      if (saveResults && items.length > 0) {
        const { data: savedResult, error: saveError } = await supabase
          .from("apify_scrape_results")
          .insert({
            provider_id: providerId,
            actor_id: actorId,
            run_id: run.id,
            dataset_id: run.defaultDatasetId,
            input_config: mergedInput,
            results_data: items,
            item_count: items.length,
            usage_usd: result.usageUsd,
            status: run.status,
          })
          .select()
          .single();

        if (saveError) {
          console.error("Failed to save scrape results:", saveError);
          // Don't fail the request, just log the error
        } else {
          result = {
            ...result,
            savedResultId: savedResult?.id,
          } as ApifyRunResult & { savedResultId?: string };

          // Trigger email verification for GMB scrapes
          if (actorId === GMB_SCRAPER_ACTOR_ID && savedResult?.id) {
            try {
              const verificationResult = await triggerEmailVerification(
                supabase,
                savedResult.id,
                items as GmbScrapedItem[],
                mergedInput
              );
              
              result = {
                ...result,
                emailVerification: verificationResult,
              } as ApifyRunResult & { savedResultId?: string };
            } catch (verifyError) {
              console.error("Email verification failed:", verifyError);
              result = {
                ...result,
                emailVerification: {
                  triggered: false,
                  error: verifyError instanceof Error ? verifyError.message : "Verification failed",
                },
              } as ApifyRunResult & { savedResultId?: string };
            }
          }
        }
      }
    } else {
      // Start the run without waiting
      const run = await client.actor(actorId).start(mergedInput);

      result = {
        success: true,
        runId: run.id,
        datasetId: run.defaultDatasetId,
        status: run.status,
        timestamp: new Date().toISOString(),
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Apify run error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET: Check status of a run
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const runId = searchParams.get("runId");

    if (!providerId || !runId) {
      return NextResponse.json(
        { error: "providerId and runId are required" },
        { status: 400 }
      );
    }

    // Get provider details
    const { data: provider } = await supabase
      .from("api_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (!provider || !provider.api_key_encrypted) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const client = new ApifyClient({
      token: provider.api_key_encrypted,
    });

    const run = await client.run(runId).get();

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    // If run is finished, get the items
    let items: unknown[] = [];
    if (run.status === "SUCCEEDED") {
      const dataset = await client.dataset(run.defaultDatasetId).listItems();
      items = dataset.items;
    }

    return NextResponse.json({
      success: true,
      runId: run.id,
      status: run.status,
      items: items.length > 0 ? items : undefined,
      itemCount: items.length,
      usageUsd: run.usageUsd,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Apify status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Trigger email verification for GMB scrape results
 * Extracts emails, verifies them, and saves verified leads
 */
async function triggerEmailVerification(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  scrapeResultId: string,
  items: GmbScrapedItem[],
  inputConfig: Record<string, unknown>
): Promise<{
  triggered: boolean;
  totalEmails?: number;
  deliverableCount?: number;
  insertedCount?: number;
  error?: string;
}> {
  // Extract leads from scrape results
  const defaultIndustry = (inputConfig?.searchStringsArray as string[])?.[0] || "Unknown";
  const extraction = extractLeadsFromGmbScrape(items, defaultIndustry);

  if (extraction.leads.length === 0) {
    return {
      triggered: false,
      totalEmails: 0,
      error: "No valid emails found in scrape results",
    };
  }

  // Get email verification provider
  const { data: provider } = await supabase
    .from("api_providers")
    .select("*")
    .eq("slug", EMAIL_VERIFICATION_PROVIDER_SLUG)
    .eq("is_active", true)
    .single();

  if (!provider || !provider.api_key_encrypted) {
    return {
      triggered: false,
      totalEmails: extraction.leads.length,
      error: "Email verification provider not configured or inactive",
    };
  }

  const providerConfig = provider.config as { actor_id?: string } | null;
  const actorId = providerConfig?.actor_id;

  if (!actorId) {
    return {
      triggered: false,
      totalEmails: extraction.leads.length,
      error: "Email verification actor not configured",
    };
  }

  // Create queue entry
  const { error: queueError } = await supabase
    .from("email_verification_queue")
    .insert({
      scrape_result_id: scrapeResultId,
      emails_to_verify: extraction.leads.map(l => ({ email: l.email, domain: l.domain })),
      email_count: extraction.leads.length,
      status: "processing",
    });

  if (queueError) {
    console.error("Failed to create verification queue:", queueError);
    // Continue anyway - the queue is just for tracking
  }

  // Call email verification API
  const client = new ApifyClient({
    token: provider.api_key_encrypted,
  });

  const emailList = extraction.leads.map(l => l.email);

  const run = await client.actor(actorId).call(
    { emailList },
    { waitSecs: 300 }
  );

  // Get verification results
  const { items: verificationItems } = await client.dataset(run.defaultDatasetId).listItems();

  // Map results to our format
  const verificationResults: EmailVerificationResult[] = verificationItems.map((item: unknown) => {
    const i = item as Record<string, unknown>;
    const data = i.data as Record<string, unknown> | undefined;
    
    return {
      email: (data?.email || data?.Email || i.email || "") as string,
      domain: (i.domain || data?.Domain || "") as string,
      state: (i.state || "Unknown") as string,
      data: {
        Email: (data?.Email || data?.email || "") as string,
        Domain: (data?.Domain || "") as string,
        IsValid: (data?.IsValid || false) as boolean,
        Free: (data?.Free || false) as boolean,
        Role: (data?.Role || false) as boolean,
        Disposable: (data?.Disposable || false) as boolean,
        AcceptAll: (data?.AcceptAll || false) as boolean,
        ...data,
      },
    };
  });

  // Count deliverable
  const deliverableCount = verificationResults.filter(
    r => r.state === "Deliverable" && r.data.IsValid
  ).length;

  // Save verified leads
  const saveResult = await processAndSaveVerifiedLeads(
    supabase,
    extraction.leads,
    verificationResults,
    scrapeResultId
  );

  // Update queue as completed
  await supabase
    .from("email_verification_queue")
    .update({
      status: "completed",
      verification_run_id: run.id,
      verification_dataset_id: run.defaultDatasetId,
      processed_at: new Date().toISOString(),
    })
    .eq("scrape_result_id", scrapeResultId);

  return {
    triggered: true,
    totalEmails: extraction.leads.length,
    deliverableCount,
    insertedCount: saveResult.totalInserted,
  };
}


