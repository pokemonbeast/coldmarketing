import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createJAPClient } from "@/lib/api/just-another-panel";

// Terminal statuses that don't need further polling
const TERMINAL_STATUSES = ["completed", "partial", "cancelled", "refunded", "canceled"];

// This endpoint polls for order status updates
// It can be called by a cron job every 15 minutes
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret, Vercel cron, or admin auth
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const vercelCronSecret = request.headers.get("x-vercel-cron-secret");
    
    // Allow either cron secret, Vercel cron, or check for admin user
    let isAuthorized = false;
    
    // Check Vercel Cron (automatically set by Vercel)
    if (process.env.CRON_SECRET && vercelCronSecret === process.env.CRON_SECRET) {
      isAuthorized = true;
    }
    
    // Check custom cron secret
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    }

    // Use service role client for cron jobs
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // If not cron, check admin auth
    if (!isAuthorized) {
      const { createClient: createAuthClient } = await import("@/lib/supabase/server");
      const authSupabase = await createAuthClient();
      const { data: { user } } = await authSupabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await authSupabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (profile?.role === "admin") {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending orders that need status checks
    const { data: pendingOrders, error: fetchError } = await supabase
      .from("orders")
      .select("*, provider:api_providers(*)")
      .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`)
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error("Failed to fetch pending orders:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending orders to check",
        checked: 0,
        updated: 0,
      });
    }

    // Group orders by provider for efficient API calls
    const ordersByProvider = pendingOrders.reduce((acc, order) => {
      const providerId = order.provider_id;
      if (!acc[providerId]) {
        acc[providerId] = {
          provider: order.provider,
          orders: [],
        };
      }
      acc[providerId].orders.push(order);
      return acc;
    }, {} as Record<string, { provider: any; orders: any[] }>);

    let totalChecked = 0;
    let totalUpdated = 0;
    const results: any[] = [];

    // Process each provider's orders
    for (const [providerId, value] of Object.entries(ordersByProvider)) {
      const { provider, orders } = value as { provider: any; orders: any[] };
      if (!provider?.api_key_encrypted) {
        console.error(`Provider ${providerId} has no API key`);
        continue;
      }

      const client = createJAPClient(provider.api_url, provider.api_key_encrypted);

      // Get order IDs for batch status check
      const orderIds = orders.map((o) => parseInt(o.external_order_id));

      try {
        // Use multi-status API for efficiency (up to 100 at a time)
        const statusResponse = await client.getMultipleOrdersStatus(orderIds);

        for (const order of orders) {
          totalChecked++;
          const statusData = statusResponse[order.external_order_id];

          if (!statusData) {
            console.error(`No status data for order ${order.external_order_id}`);
            continue;
          }

          if (statusData.error) {
            // Update order with error
            await supabase
              .from("orders")
              .update({
                error_message: statusData.error,
                last_checked_at: new Date().toISOString(),
              })
              .eq("id", order.id);
            continue;
          }

          // Normalize status to lowercase
          const newStatus = statusData.status?.toLowerCase() || "unknown";
          const isTerminal = TERMINAL_STATUSES.includes(newStatus);

          // Update order
          const updateData: Record<string, unknown> = {
            status: newStatus,
            charge: statusData.charge ? parseFloat(statusData.charge) : null,
            start_count: statusData.start_count,
            remains: statusData.remains,
            currency: statusData.currency || "USD",
            provider_response: statusData,
            last_checked_at: new Date().toISOString(),
          };

          if (isTerminal) {
            updateData.completed_at = new Date().toISOString();
          }

          const { error: updateError } = await supabase
            .from("orders")
            .update(updateData)
            .eq("id", order.id);

          if (updateError) {
            console.error(`Failed to update order ${order.id}:`, updateError);
          } else {
            totalUpdated++;
            results.push({
              order_id: order.id,
              external_id: order.external_order_id,
              old_status: order.status,
              new_status: newStatus,
              is_terminal: isTerminal,
            });
          }
        }
      } catch (apiError) {
        console.error(`API error for provider ${providerId}:`, apiError);
        results.push({
          provider_id: providerId,
          error: apiError instanceof Error ? apiError.message : "API error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: totalChecked,
      updated: totalUpdated,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Poll orders error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to poll orders" },
      { status: 500 }
    );
  }
}

// GET - Simple health check / manual trigger
export async function GET() {
  return NextResponse.json({
    message: "Order polling endpoint. Use POST to trigger polling.",
    cron_schedule: "Every 15 minutes",
  });
}

