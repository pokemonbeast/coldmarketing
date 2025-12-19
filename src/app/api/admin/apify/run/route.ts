import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApifyClient } from "apify-client";

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

