import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createJAPClient } from "@/lib/api/just-another-panel";

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
    const { providerId, action, params } = body;

    // Get provider details
    const { data: provider } = await supabase
      .from("api_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    if (!provider.api_key_encrypted) {
      return NextResponse.json(
        { error: "API key not configured for this provider" },
        { status: 400 }
      );
    }

    // Create API client
    const client = createJAPClient(provider.api_url, provider.api_key_encrypted);

    let result: unknown;

    // Execute the requested action
    switch (action) {
      case "services":
        result = await client.getServices();
        break;

      case "balance":
        result = await client.getBalance();
        break;

      case "add_order":
        if (!params?.service || !params?.link) {
          return NextResponse.json(
            { error: "Missing required parameters: service and link" },
            { status: 400 }
          );
        }
        result = await client.addOrder(params);
        break;

      case "add_order_comments":
        if (!params?.service || !params?.link || !params?.comments) {
          return NextResponse.json(
            { error: "Missing required parameters: service, link, and comments" },
            { status: 400 }
          );
        }
        // Comments should already be newline-separated from the textarea
        result = await client.addOrder({
          service: params.service,
          link: params.link,
          comments: params.comments,
        });
        break;

      case "order_status":
        if (!params?.order_id) {
          return NextResponse.json(
            { error: "Missing required parameter: order_id" },
            { status: 400 }
          );
        }
        result = await client.getOrderStatus(params.order_id);
        break;

      case "multi_order_status":
        if (!params?.order_ids || !Array.isArray(params.order_ids)) {
          return NextResponse.json(
            { error: "Missing required parameter: order_ids (array)" },
            { status: 400 }
          );
        }
        result = await client.getMultipleOrdersStatus(params.order_ids);
        break;

      case "refill":
        if (!params?.order_id) {
          return NextResponse.json(
            { error: "Missing required parameter: order_id" },
            { status: 400 }
          );
        }
        result = await client.createRefill(params.order_id);
        break;

      case "refill_status":
        if (!params?.refill_id) {
          return NextResponse.json(
            { error: "Missing required parameter: refill_id" },
            { status: 400 }
          );
        }
        result = await client.getRefillStatus(params.refill_id);
        break;

      case "cancel":
        if (!params?.order_ids || !Array.isArray(params.order_ids)) {
          return NextResponse.json(
            { error: "Missing required parameter: order_ids (array)" },
            { status: 400 }
          );
        }
        result = await client.cancelOrders(params.order_ids);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API test error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An error occurred",
        success: false,
      },
      { status: 500 }
    );
  }
}

