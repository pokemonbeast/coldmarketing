"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Zap,
  Building2,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  X,
  PartyPopper,
} from "lucide-react";

interface DashboardStats {
  totalBusinesses: number;
  activeBusinesses: number;
  pendingActions: number;
  completedThisMonth: number;
  actionsRemaining: number;
  actionsLimit: number;
  hasActiveSubscription: boolean;
}

interface UpcomingAction {
  id: string;
  target_title: string | null;
  status: string | null;
  business?: { name: string };
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingActions, setUpcomingActions] = useState<UpcomingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);

  // Handle checkout success
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      setShowCheckoutSuccess(true);
      // Clear the query param from URL without reload
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch profile for subscription status
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_plan_name")
        .eq("id", user.id)
        .single();

      const hasActiveSubscription = profile?.subscription_status === "active";

      // Fetch businesses count
      const { count: totalBusinesses } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: activeBusinesses } = await supabase
        .from("businesses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Fetch pending actions
      const { data: businesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id) as { data: { id: string }[] | null };

      const businessIds = businesses?.map((b) => b.id) || [];

      let pendingActions = 0;
      let completedThisMonth = 0;

      if (businessIds.length > 0) {
        const { count: pending } = await supabase
          .from("planned_actions")
          .select("*", { count: "exact", head: true })
          .in("business_id", businessIds)
          .in("status", ["pending_review", "approved", "scheduled"]);

        pendingActions = pending || 0;

        // Get upcoming actions for display
        const { data: upcoming } = await supabase
          .from("planned_actions")
          .select("*, business:businesses(name)")
          .in("business_id", businessIds)
          .in("status", ["pending_review", "approved", "scheduled"])
          .order("scheduled_for", { ascending: true })
          .limit(5);

        if (upcoming) {
          setUpcomingActions(upcoming as unknown as UpcomingAction[]);
        }

        // Completed this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: completed } = await supabase
          .from("executed_actions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("executed_at", startOfMonth.toISOString());

        completedThisMonth = completed || 0;
      }

      // Get usage
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabase
        .from("action_usage")
        .select("actions_used, actions_limit")
        .eq("user_id", user.id)
        .lte("period_start", today)
        .gte("period_end", today)
        .single() as { data: { actions_used: number; actions_limit: number } | null };

      setStats({
        totalBusinesses: totalBusinesses || 0,
        activeBusinesses: activeBusinesses || 0,
        pendingActions,
        completedThisMonth,
        actionsRemaining: usage ? usage.actions_limit - usage.actions_used : 0,
        actionsLimit: usage?.actions_limit || 0,
        hasActiveSubscription,
      });

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    subtext,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
    subtext?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtext && <p className="text-gray-500 text-sm mt-1">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Checkout Success Banner */}
      <AnimatePresence>
        {showCheckoutSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/30 flex items-center justify-center">
              <PartyPopper className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-green-400 font-medium">
                🎉 Subscription activated successfully!
              </p>
              <p className="text-green-400/70 text-sm">
                Your account is now active. Start adding businesses to begin AI-powered outreach.
              </p>
            </div>
            <button
              onClick={() => setShowCheckoutSuccess(false)}
              className="p-2 rounded-lg hover:bg-green-500/20 transition-colors text-green-400"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your outreach.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Building2}
          label="Active Businesses"
          value={stats?.activeBusinesses || 0}
          color="bg-blue-500/20 text-blue-400"
          subtext={`${stats?.totalBusinesses || 0} total`}
        />
        <StatCard
          icon={Zap}
          label="Pending Actions"
          value={stats?.pendingActions || 0}
          color="bg-amber-500/20 text-amber-400"
          subtext="Awaiting review"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed This Month"
          value={stats?.completedThisMonth || 0}
          color="bg-green-500/20 text-green-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Actions Remaining"
          value={stats?.actionsRemaining || 0}
          color="bg-purple-500/20 text-purple-400"
          subtext={`of ${stats?.actionsLimit || 0} this month`}
        />
      </div>

      {/* Quick Actions & Upcoming */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Upcoming Actions
            </h2>
            <Link
              href="/dashboard/actions"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {upcomingActions.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No pending actions</p>
              <p className="text-gray-500 text-sm">
                Add a business to start generating outreach opportunities
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingActions.map((action) => (
                <div
                  key={action.id}
                  className="p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {action.target_title || "Untitled Post"}
                      </p>
                      <p className="text-gray-500 text-sm truncate">
                        {action.business?.name}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        action.status === "pending_review"
                          ? "bg-amber-500/20 text-amber-400"
                          : action.status === "approved"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {(action.status || "pending").replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Quick Actions
          </h2>

          <div className="space-y-3">
            <Link
              href="/dashboard/businesses"
              className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Add Business</p>
                <p className="text-gray-500 text-sm">Set up a new business profile</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
            </Link>

            <Link
              href="/dashboard/actions"
              className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Review Actions</p>
                <p className="text-gray-500 text-sm">Approve or edit pending outreach</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-amber-400 transition-colors" />
            </Link>

            <Link
              href="/dashboard/billing"
              className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Upgrade Plan</p>
                <p className="text-gray-500 text-sm">Get more actions & features</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition-colors" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* No Subscription Banner */}
      {stats && !stats.hasActiveSubscription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">
                Subscribe to Get Started
              </h3>
              <p className="text-gray-400 text-sm">
                Choose a plan to start automating your marketing outreach with AI
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="px-6 py-3 rounded-xl btn-primary text-white font-medium"
            >
              View Plans
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

