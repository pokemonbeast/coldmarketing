import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApifyClient } from "apify-client";
import { 
  extractLeadsFromGmbScrape, 
  type GmbScrapedItem,
  type ExtractedLead 
} from "@/lib/services/lead-extraction";
import {
  processAndSaveVerifiedLeads,
  type EmailVerificationResult,
} from "@/lib/services/lead-lists";

const EMAIL_VERIFICATION_PROVIDER_SLUG = "email-verification";

interface VerifyEmailsRequest {
  scrapeResultId: string;
  // Optional: manually provide leads instead of extracting from scrape
  leads?: ExtractedLead[];
}

interface VerifyEmailsResponse {
  success: boolean;
  queueId?: string;
  verificationRunId?: string;
  totalEmails?: number;
  deliverableCount?: number;
  insertedCount?: number;
  duplicateCount?: number;
  error?: string;
  timestamp: string;
}

/**
 * POST: Verify emails from a scrape result
 * 
 * 1. Extracts unique emails from the scrape result
 * 2. Calls the email verification API
 * 3. Saves verified (deliverable) leads to the database
 */
export async function POST(request: NextRequest): Promise<NextResponse<VerifyEmailsResponse>> {
  const timestamp = new Date().toISOString();
  
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized", timestamp }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden", timestamp }, { status: 403 });
    }

    // Parse request
    const body: VerifyEmailsRequest = await request.json();
    const { scrapeResultId, leads: providedLeads } = body;

    if (!scrapeResultId) {
      return NextResponse.json(
        { success: false, error: "scrapeResultId is required", timestamp },
        { status: 400 }
      );
    }

    // Get the scrape result
    const { data: scrapeResult, error: scrapeError } = await supabase
      .from("apify_scrape_results")
      .select("*")
      .eq("id", scrapeResultId)
      .single();

    if (scrapeError || !scrapeResult) {
      return NextResponse.json(
        { success: false, error: "Scrape result not found", timestamp },
        { status: 404 }
      );
    }

    // Check if this is a GMB scrape
    if (scrapeResult.actor_id !== "compass/crawler-google-places") {
      return NextResponse.json(
        { success: false, error: "Only GMB scrape results can be verified", timestamp },
        { status: 400 }
      );
    }

    // Check if already queued
    const { data: existingQueue } = await supabase
      .from("email_verification_queue")
      .select("id, status")
      .eq("scrape_result_id", scrapeResultId)
      .single();

    if (existingQueue && existingQueue.status !== "failed") {
      return NextResponse.json(
        { 
          success: false, 
          error: `Verification already ${existingQueue.status} for this scrape`, 
          queueId: existingQueue.id,
          timestamp 
        },
        { status: 409 }
      );
    }

    // Extract leads from scrape result or use provided leads
    let leads: ExtractedLead[];
    if (providedLeads && providedLeads.length > 0) {
      leads = providedLeads;
    } else {
      const items = scrapeResult.results_data as GmbScrapedItem[];
      const inputConfig = scrapeResult.input_config as { searchStringsArray?: string[] } | null;
      const defaultIndustry = inputConfig?.searchStringsArray?.[0] || "Unknown";
      
      const extraction = extractLeadsFromGmbScrape(items, defaultIndustry);
      leads = extraction.leads;
    }

    if (leads.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid emails found in scrape result", timestamp },
        { status: 400 }
      );
    }

    // Get email verification provider
    const { data: provider } = await supabase
      .from("api_providers")
      .select("*")
      .eq("slug", EMAIL_VERIFICATION_PROVIDER_SLUG)
      .eq("is_active", true)
      .single();

    if (!provider || !provider.api_key_encrypted) {
      return NextResponse.json(
        { success: false, error: "Email verification provider not configured", timestamp },
        { status: 500 }
      );
    }

    const providerConfig = provider.config as { actor_id?: string } | null;
    const actorId = providerConfig?.actor_id;

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: "Email verification actor not configured", timestamp },
        { status: 500 }
      );
    }

    // Create queue entry
    const { data: queueEntry, error: queueError } = await supabase
      .from("email_verification_queue")
      .upsert({
        scrape_result_id: scrapeResultId,
        emails_to_verify: leads.map(l => ({ email: l.email, domain: l.domain })),
        email_count: leads.length,
        status: "processing",
      }, {
        onConflict: "scrape_result_id",
      })
      .select()
      .single();

    if (queueError) {
      console.error("Failed to create queue entry:", queueError);
      return NextResponse.json(
        { success: false, error: "Failed to create verification queue entry", timestamp },
        { status: 500 }
      );
    }

    // Call email verification API
    const client = new ApifyClient({
      token: provider.api_key_encrypted,
    });

    const emailList = leads.map(l => l.email);

    try {
      const run = await client.actor(actorId).call(
        { emailList },
        { waitSecs: 300 } // Wait up to 5 minutes
      );

      // Get verification results
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      // Update queue with run info
      await supabase
        .from("email_verification_queue")
        .update({
          verification_run_id: run.id,
          verification_dataset_id: run.defaultDatasetId,
        })
        .eq("id", queueEntry.id);

      // Map results to our format
      const verificationResults: EmailVerificationResult[] = items.map((item: unknown) => {
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

      // Count deliverable emails
      const deliverableCount = verificationResults.filter(
        r => r.state === "Deliverable" && r.data.IsValid
      ).length;

      // Save verified leads to database
      const saveResult = await processAndSaveVerifiedLeads(
        supabase,
        leads,
        verificationResults,
        scrapeResultId
      );

      // Update queue as completed
      await supabase
        .from("email_verification_queue")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", queueEntry.id);

      return NextResponse.json({
        success: true,
        queueId: queueEntry.id,
        verificationRunId: run.id,
        totalEmails: leads.length,
        deliverableCount,
        insertedCount: saveResult.totalInserted,
        duplicateCount: saveResult.totalDuplicates,
        timestamp,
      });

    } catch (apifyError) {
      // Update queue as failed
      await supabase
        .from("email_verification_queue")
        .update({
          status: "failed",
          error_message: apifyError instanceof Error ? apifyError.message : "Unknown error",
          processed_at: new Date().toISOString(),
        })
        .eq("id", queueEntry.id);

      throw apifyError;
    }

  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
        timestamp,
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Get verification queue status for a scrape result
 */
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
    const scrapeResultId = searchParams.get("scrapeResultId");

    if (!scrapeResultId) {
      // Return all queue entries
      const { data: queue, error } = await supabase
        .from("email_verification_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ queue });
    }

    // Get specific queue entry
    const { data: queueEntry, error } = await supabase
      .from("email_verification_queue")
      .select("*")
      .eq("scrape_result_id", scrapeResultId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({ queueEntry: queueEntry || null });

  } catch (error) {
    console.error("Error fetching verification queue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An error occurred" },
      { status: 500 }
    );
  }
}


