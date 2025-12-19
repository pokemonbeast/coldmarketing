"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Building2,
  Zap,
  History,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: string | null;
  subscription_plan_name: string | null;
  subscription_actions_limit: number | null;
}

interface ActionUsage {
  actions_used: number | null;
  actions_limit: number;
}

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/businesses", icon: Building2, label: "Businesses" },
  { href: "/dashboard/actions", icon: Zap, label: "Action Queue" },
  { href: "/dashboard/history", icon: History, label: "History" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
];

export default function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<ActionUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, email, full_name, subscription_status, subscription_plan_name, subscription_actions_limit")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch current usage
    const today = new Date().toISOString().split("T")[0];
    const { data: usageData } = await supabase
      .from("action_usage")
      .select("actions_used, actions_limit")
      .eq("user_id", user.id)
      .lte("period_start", today)
      .gte("period_end", today)
      .single();

    if (usageData) {
      setUsage(usageData);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch data after checkout success (with polling for webhook processing)
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      let attempts = 0;
      const maxAttempts = 5;
      
      const pollForSubscription = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from("profiles")
          .select("subscription_status, subscription_plan_name")
          .eq("id", user.id)
          .single();
        
        if (data?.subscription_status === "active" && data?.subscription_plan_name) {
          // Subscription is active, do a full refetch
          fetchData();
        } else if (attempts < maxAttempts) {
          // Keep polling
          attempts++;
          setTimeout(pollForSubscription, 2000);
        }
      };
      
      // Start polling after initial delay
      const timer = setTimeout(pollForSubscription, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, fetchData]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const usagePercentage = usage
    ? Math.min(((usage.actions_used || 0) / usage.actions_limit) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#050816] bg-grid bg-radial-gradient">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">ColdMarketing</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 text-gray-400"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">ColdMarketing</h1>
                <p className="text-xs text-gray-500">AI Outreach Platform</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-gray-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Usage Stats */}
          {!loading && profile?.subscription_status === "active" && usage && (
            <div className="p-4 mx-4 mb-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Actions This Month</span>
                <span className="text-sm font-semibold text-white">
                  {usage.actions_used}/{usage.actions_limit}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercentage}%` }}
                  className={`h-full rounded-full ${
                    usagePercentage > 90
                      ? "bg-red-500"
                      : usagePercentage > 70
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-blue-500 to-purple-500"
                  }`}
                />
              </div>
            </div>
          )}

          {/* User Section */}
          <div className="p-4 border-t border-slate-800">
            {loading ? (
              <div className="h-12 bg-slate-800 rounded-xl animate-pulse" />
            ) : profile ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold">
                    {profile.full_name?.[0] || profile.email[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile.full_name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {profile.subscription_plan_name || "No Plan"}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

