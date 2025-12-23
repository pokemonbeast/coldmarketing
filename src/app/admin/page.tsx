"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useImpersonation } from "@/lib/contexts/ImpersonationContext";
import {
  Users,
  Search,
  ChevronDown,
  Crown,
  Edit,
  Loader2,
  RefreshCw,
  LogIn,
  UserCheck,
} from "lucide-react";
import type { Profile, UserSubscription, SubscriptionPlan } from "@/types/database";

interface UserWithSubscription extends Profile {
  subscription?: UserSubscription & { plan?: SubscriptionPlan };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");
  const [updating, setUpdating] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const router = useRouter();
  const { startImpersonation } = useImpersonation();

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch all profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Fetch all subscription plans
    const { data: plansData } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true);

    // Fetch all user subscriptions with plan info
    const { data: subscriptionsData } = await supabase
      .from("user_subscriptions")
      .select("*, plan:subscription_plans(*)");

    if (profilesData) {
      const usersWithSubs = profilesData.map((profile) => {
        const subscription = subscriptionsData?.find(
          (sub) => sub.user_id === profile.id
        );
        return {
          ...profile,
          subscription,
        } as UserWithSubscription;
      });
      setUsers(usersWithSubs);
    }

    if (plansData) {
      setPlans(plansData as unknown as SubscriptionPlan[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openPlanModal = (user: UserWithSubscription) => {
    setSelectedUser(user);
    setSelectedPlanId(user.subscription?.plan_id || "");
    setOverrideReason("");
    setShowPlanModal(true);
  };

  const handlePlanOverride = async () => {
    if (!selectedUser || !selectedPlanId) return;

    setUpdating(true);
    const supabase = createClient();

    // Get current admin user
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (selectedUser.subscription) {
      // Update existing subscription
      await supabase
        .from("user_subscriptions")
        .update({
          plan_id: selectedPlanId,
          status: "overridden",
          is_override: true,
          override_by: adminUser?.id,
          override_reason: overrideReason || "Admin override",
        })
        .eq("id", selectedUser.subscription.id);
    } else {
      // Create new subscription
      await supabase.from("user_subscriptions").insert({
        user_id: selectedUser.id,
        plan_id: selectedPlanId,
        status: "overridden",
        is_override: true,
        override_by: adminUser?.id,
        override_reason: overrideReason || "Admin override",
      });
    }

    setShowPlanModal(false);
    setUpdating(false);
    fetchData();
  };

  const getPlanBadgeColor = (planName?: string) => {
    switch (planName?.toLowerCase()) {
      case "enterprise":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "pro":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const handleImpersonate = async (user: UserWithSubscription) => {
    if (user.role === "admin") {
      alert("Cannot impersonate admin accounts");
      return;
    }

    setImpersonating(user.id);

    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start impersonation");
      }

      // Start impersonation in context
      startImpersonation(
        data.impersonation.impersonatedUser,
        data.impersonation.adminId,
        data.impersonation.adminEmail
      );

      // Navigate to user's dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Impersonation error:", error);
      alert(error instanceof Error ? error.message : "Failed to impersonate user");
    } finally {
      setImpersonating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            Users Management
          </h1>
          <p className="text-gray-400 mt-1">
            View and manage all users and their subscriptions
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by email or name..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Users table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">User</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Role</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Plan</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Joined</th>
                  <th className="text-right py-4 px-6 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold">
                            {user.full_name?.[0] || user.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">
                            {user.full_name || "No name"}
                          </p>
                          <p className="text-gray-500 text-sm truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-sm border border-amber-500/30">
                          <Crown className="w-3.5 h-3.5" />
                          Admin
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-700 text-gray-300 text-sm">
                          User
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-sm border ${getPlanBadgeColor(
                          user.subscription?.plan?.name
                        )}`}
                      >
                        {user.subscription?.plan?.name || "No Plan"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {user.subscription?.is_override ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-sm border border-orange-500/30">
                          Override
                        </span>
                      ) : user.subscription?.status === "active" ? (
                        <span className="px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 text-sm border border-green-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-gray-500/20 text-gray-400 text-sm border border-gray-500/30">
                          {user.subscription?.status || "None"}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role !== "admin" && (
                          <button
                            onClick={() => handleImpersonate(user)}
                            disabled={impersonating === user.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Sign in as this user"
                          >
                            {impersonating === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <LogIn className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">Sign In As</span>
                          </button>
                        )}
                        <button
                          onClick={() => openPlanModal(user)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="hidden sm:inline">Edit Plan</span>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Plan Override Modal */}
      {showPlanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-white mb-4">
              Override Plan for {selectedUser.full_name || selectedUser.email}
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Select Plan
                </label>
                <div className="relative">
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
                  >
                    <option value="">Select a plan...</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price_monthly}/mo
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Override Reason (Optional)
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Enter a reason for the override..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePlanOverride}
                disabled={!selectedPlanId || updating}
                className="flex-1 px-4 py-3 rounded-xl btn-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Apply Override"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

