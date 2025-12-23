import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// This endpoint creates the initial admin user
// It should only be called once during setup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, setupKey } = body;

    // Simple protection - in production, use a more secure method
    const expectedSetupKey = process.env.SETUP_KEY || "cold-marketing-setup-2024";
    
    if (setupKey !== expectedSetupKey) {
      return NextResponse.json(
        { error: "Invalid setup key" },
        { status: 401 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Check if admin already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (existingProfile) {
      // Update existing user to admin if not already
      if (existingProfile.role !== "admin") {
        await supabase
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", existingProfile.id);

        return NextResponse.json({
          success: true,
          message: "Existing user promoted to admin",
          userId: existingProfile.id,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Admin user already exists",
        userId: existingProfile.id,
      });
    }

    // Create new admin user using Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin
      user_metadata: {
        full_name: "Admin",
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Update the profile to be admin
    // Note: The trigger should have already created the profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "admin", full_name: "Admin" })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile error:", profileError);
      // Try to insert if update failed (profile might not exist yet)
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: email,
        full_name: "Admin",
        role: "admin",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      userId: authData.user.id,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}







