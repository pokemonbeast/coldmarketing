import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createJAPClient } from "@/lib/api/just-another-panel";

// GET - List all orders
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
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("orders")
      .select("*, provider:api_providers(name, slug)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get orders" },
      { status: 500 }
    );
  }
}

// POST - Create a new order
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { providerId, service, link, quantity, comments, serviceName } = body;

    // Get provider
    const { data: provider } = await supabase
      .from("api_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (!provider || !provider.api_key_encrypted) {
      return NextResponse.json(
        { error: "Provider not found or not configured" },
        { status: 400 }
      );
    }

    // Create API client and place order
    const client = createJAPClient(provider.api_url, provider.api_key_encrypted);
    
    const orderParams: Record<string, unknown> = {
      service: parseInt(service),
      link,
    };

    if (quantity) orderParams.quantity = parseInt(quantity);
    if (comments) orderParams.comments = comments;

    const apiResponse = await client.addOrder(orderParams as any);

    if (apiResponse.error) {
      return NextResponse.json(
        { error: apiResponse.error, success: false },
        { status: 400 }
      );
    }

    // Save order to database
    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        provider_id: providerId,
        external_order_id: String(apiResponse.order),
        service_id: String(service),
        service_name: serviceName || `Service ${service}`,
        link,
        quantity: quantity ? parseInt(quantity) : null,
        comments,
        status: "pending",
        provider_response: JSON.parse(JSON.stringify(apiResponse)),
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to save order:", insertError);
      // Order was placed but not saved - return success with warning
      return NextResponse.json({
        success: true,
        warning: "Order placed but failed to save to database",
        external_order_id: apiResponse.order,
        provider_response: apiResponse,
      });
    }

    return NextResponse.json({
      success: true,
      order,
      external_order_id: apiResponse.order,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 }
    );
  }
}

