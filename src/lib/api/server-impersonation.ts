import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ImpersonationResult {
  userId: string;
  isImpersonating: boolean;
  error?: string;
}

/**
 * Get the effective user ID for API requests, supporting admin impersonation.
 * 
 * Returns the impersonated user ID if:
 * 1. The X-Impersonate-User-Id header is present
 * 2. The authenticated user is an admin
 * 
 * Otherwise, returns the authenticated user's ID.
 */
export async function getEffectiveUserId(
  request: NextRequest
): Promise<ImpersonationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userId: "", isImpersonating: false, error: "Unauthorized" };
  }

  // Check for impersonation header
  const impersonateUserId = request.headers.get("X-Impersonate-User-Id");

  if (!impersonateUserId) {
    // No impersonation - return regular user
    return { userId: user.id, isImpersonating: false };
  }

  // Impersonation requested - verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    // Non-admin trying to impersonate - ignore and use their own ID
    console.warn(`Non-admin ${user.id} attempted impersonation`);
    return { userId: user.id, isImpersonating: false };
  }

  // Verify the target user exists
  const { data: targetUser } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", impersonateUserId)
    .single();

  if (!targetUser) {
    // Target user doesn't exist - use admin's own ID
    return { userId: user.id, isImpersonating: false };
  }

  // Don't allow impersonating other admins
  if (targetUser.role === "admin") {
    console.warn(`Admin ${user.id} attempted to impersonate admin ${impersonateUserId}`);
    return { userId: user.id, isImpersonating: false };
  }

  // Admin impersonation verified
  return { userId: impersonateUserId, isImpersonating: true };
}

/**
 * Simpler version that just gets the user ID without the full validation.
 * Use this for read-only operations where security is less critical.
 */
export async function getEffectiveUserIdSimple(
  request: NextRequest
): Promise<string | null> {
  const result = await getEffectiveUserId(request);
  if (result.error) return null;
  return result.userId;
}

