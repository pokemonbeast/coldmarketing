import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List all scrape results
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
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("apify_scrape_results")
      .select(`
        id,
        provider_id,
        actor_id,
        run_id,
        dataset_id,
        input_config,
        item_count,
        usage_usd,
        status,
        created_at,
        api_providers!inner (
          name,
          slug
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (providerId) {
      query = query.eq("provider_id", providerId);
    }

    const { data: results, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      results,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching scrape results:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch results" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a scrape result
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Result ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("apify_scrape_results")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scrape result:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete result" },
      { status: 500 }
    );
  }
}





