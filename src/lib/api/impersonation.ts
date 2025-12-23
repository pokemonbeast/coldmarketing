// Utility for making API calls that respect admin impersonation

const IMPERSONATION_STORAGE_KEY = "admin_impersonation";

interface ImpersonationState {
  isImpersonating: boolean;
  adminId: string | null;
  impersonatedUser: {
    id: string;
    email: string;
  } | null;
}

/**
 * Get the current impersonation state from localStorage
 */
export function getImpersonationState(): ImpersonationState | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Get headers for API requests that should include impersonation info
 */
export function getImpersonationHeaders(): HeadersInit {
  const state = getImpersonationState();
  
  if (state?.isImpersonating && state.impersonatedUser) {
    return {
      "X-Impersonate-User-Id": state.impersonatedUser.id,
    };
  }
  
  return {};
}

/**
 * Make an API fetch request with impersonation support
 */
export async function fetchWithImpersonation(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const impersonationHeaders = getImpersonationHeaders();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...impersonationHeaders,
    },
  });
}

