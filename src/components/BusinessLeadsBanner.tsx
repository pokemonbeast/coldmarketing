"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Target, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getImpersonationHeaders } from "@/lib/api/impersonation";

interface BusinessLeadsBannerProps {
  className?: string;
}

interface BusinessStatus {
  id: string;
  name: string;
  hasTargets: boolean;
  allFulfilled: boolean;
  fulfilledCount: number;
  totalCount: number;
}

/**
 * Global banner that appears when all Business Lead targets have been scraped
 * Prompts user to add more targets to continue finding leads
 */
export function BusinessLeadsBanner({ className = "" }: BusinessLeadsBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [businessStatus, setBusinessStatus] = useState<BusinessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBusinessStatus = async () => {
      try {
        const response = await fetch("/api/businesses", {
          headers: getImpersonationHeaders(),
        });
        const data = await response.json();
        
        if (data.businesses && data.businesses.length > 0) {
          // Check the first/primary business
          const business = data.businesses[0];
          const targets = business.gmb_targets || [];
          
          if (targets.length > 0) {
            const fulfilledCount = targets.filter((t: { fulfilled_at?: string | null }) => t.fulfilled_at).length;
            const allFulfilled = targets.every((t: { fulfilled_at?: string | null }) => t.fulfilled_at);
            
            setBusinessStatus({
              id: business.id,
              name: business.name,
              hasTargets: targets.length > 0,
              allFulfilled,
              fulfilledCount,
              totalCount: targets.length,
            });
          }
        }
      } catch (error) {
        console.error("Failed to check business status:", error);
      }
      setLoading(false);
    };

    checkBusinessStatus();

    // Check if previously dismissed (stored in session)
    const wasDismissed = sessionStorage.getItem("business-leads-banner-dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("business-leads-banner-dismissed", "true");
  };

  // Don't show if loading, dismissed, no targets, or not all fulfilled
  if (loading || dismissed || !businessStatus?.hasTargets || !businessStatus?.allFulfilled) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 ${className}`}
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        
        <div className="relative flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-amber-400 font-medium">
                All Business Lead targets have been scraped
              </p>
              <p className="text-amber-400/70 text-sm">
                Add new targets to continue finding verified email leads for your business.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/dashboard/businesses"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors font-medium text-sm"
            >
              Add Targets
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-lg text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BusinessLeadsBanner;

