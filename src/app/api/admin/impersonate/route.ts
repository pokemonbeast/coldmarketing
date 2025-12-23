import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Start impersonation session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id, email, role, full_name")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Fetch the user to impersonate
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Don't allow impersonating other admins (security measure)
    if (targetUser.role === "admin" && targetUser.id !== user.id) {
      return NextResponse.json(
        { error: "Cannot impersonate other admin accounts" },
        { status: 403 }
      );
    }

    // Return the impersonation session data
    // Note: We don't actually change the auth session - just return data for client-side state
    return NextResponse.json({
      success: true,
      impersonation: {
        adminId: adminProfile.id,
        adminEmail: adminProfile.email,
        impersonatedUser: targetUser,
      },
    });
  } catch (error) {
    console.error("Impersonation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start impersonation" },
      { status: 500 }
    );
  }
}

// DELETE - End impersonation session (mostly for logging purposes)
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // In a production system, you might want to log the end of impersonation session
    // For now, we just return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("End impersonation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to end impersonation" },
      { status: 500 }
    );
  }
}

