"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Profile } from "@/types/database";

interface ImpersonationState {
  isImpersonating: boolean;
  adminId: string | null;
  adminEmail: string | null;
  impersonatedUser: Profile | null;
}

interface ImpersonationContextType extends ImpersonationState {
  startImpersonation: (user: Profile, adminId: string, adminEmail: string) => void;
  stopImpersonation: () => void;
  getEffectiveUserId: () => string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

const STORAGE_KEY = "admin_impersonation";

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImpersonationState>({
    isImpersonating: false,
    adminId: null,
    adminEmail: null,
    impersonatedUser: null,
  });

  // Load impersonation state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState(parsed);
      }
    } catch (error) {
      console.error("Failed to load impersonation state:", error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save impersonation state to localStorage
  const persistState = useCallback((newState: ImpersonationState) => {
    if (newState.isImpersonating) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const startImpersonation = useCallback((user: Profile, adminId: string, adminEmail: string) => {
    const newState: ImpersonationState = {
      isImpersonating: true,
      adminId,
      adminEmail,
      impersonatedUser: user,
    };
    setState(newState);
    persistState(newState);
  }, [persistState]);

  const stopImpersonation = useCallback(() => {
    const newState: ImpersonationState = {
      isImpersonating: false,
      adminId: null,
      adminEmail: null,
      impersonatedUser: null,
    };
    setState(newState);
    persistState(newState);
  }, [persistState]);

  const getEffectiveUserId = useCallback(() => {
    if (state.isImpersonating && state.impersonatedUser) {
      return state.impersonatedUser.id;
    }
    return null;
  }, [state.isImpersonating, state.impersonatedUser]);

  return (
    <ImpersonationContext.Provider
      value={{
        ...state,
        startImpersonation,
        stopImpersonation,
        getEffectiveUserId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
}

