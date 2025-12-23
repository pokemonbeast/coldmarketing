"use client";

import { useImpersonation } from "@/lib/contexts/ImpersonationContext";
import { useRouter } from "next/navigation";
import { UserCheck, X, ArrowLeft, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, adminEmail, stopImpersonation } = useImpersonation();
  const router = useRouter();

  const handleStopImpersonation = () => {
    stopImpersonation();
    router.push("/admin");
  };

  return (
    <AnimatePresence>
      {isImpersonating && impersonatedUser && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-white font-semibold text-sm">
                    Viewing as: {impersonatedUser.full_name || impersonatedUser.email}
                  </span>
                  <span className="hidden sm:inline text-white/70 text-xs">•</span>
                  <span className="text-white/80 text-xs">
                    Logged in as admin ({adminEmail})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleStopImpersonation}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors backdrop-blur-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Admin</span>
                  <span className="sm:hidden">Exit</span>
                </button>
                <button
                  onClick={handleStopImpersonation}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                  title="Exit impersonation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Subtle animated border at bottom */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Quick access floating button for admin navigation while impersonating
export function ImpersonationQuickAccess() {
  const { isImpersonating, impersonatedUser, stopImpersonation } = useImpersonation();
  const router = useRouter();

  if (!isImpersonating || !impersonatedUser) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed bottom-6 right-6 z-[99]"
    >
      <button
        onClick={() => {
          stopImpersonation();
          router.push("/admin");
        }}
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all font-medium"
      >
        <Shield className="w-5 h-5" />
        <span>Return to Admin</span>
      </button>
    </motion.div>
  );
}

