"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Check,
  Loader2,
  Crown,
  Zap,
  TrendingUp,
  Building2,
  Star,
  ExternalLink,
} from "lucide-react";
import { STRIPE_PLANS, type StripePlan } from "@/types/database";

interface Profile {
  subscription_status: string | null;
  subscription_plan_name: string | null;
  subscription_actions_limit: number | null;
  subscription_current_period_end: string | null;
  stripe_customer_id: string | null;
}

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [managingBilling, setManagingBilling] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_plan_name, subscription_actions_limit, subscription_current_period_end, stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    }
    setSubscribing(null);
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal. Please try again.");
    }
    setManagingBilling(false);
  };

  const isCurrentPlan = (plan: StripePlan) => {
    return profile?.subscription_plan_name === plan.name;
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "starter":
        return Zap;
      case "growth":
        return TrendingUp;
      case "scale":
        return Building2;
      case "enterprise":
        return Crown;
      default:
        return Star;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-green-400" />
          </div>
          Billing & Plans
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your subscription and billing settings
        </p>
      </div>

      {/* Current Plan */}
      {profile?.subscription_status === "active" && profile.subscription_plan_name && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Plan</p>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {profile.subscription_plan_name}
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-lg">
                  Active
                </span>
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {profile.subscription_actions_limit} actions per month
                {profile.subscription_current_period_end && (
                  <> • Renews {new Date(profile.subscription_current_period_end).toLocaleDateString()}</>
                )}
              </p>
            </div>
            {profile.stripe_customer_id && (
              <button
                onClick={handleManageBilling}
                disabled={managingBilling}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                {managingBilling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Manage Billing
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Plans Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {profile?.subscription_status === "active" ? "Change Plan" : "Choose Your Plan"}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STRIPE_PLANS.map((plan, index) => {
            const Icon = getPlanIcon(plan.id);
            const isCurrent = isCurrentPlan(plan);
            const isPopular = plan.id === "growth";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`glass-card p-6 relative ${
                  isPopular ? "border-2 border-purple-500/50" : ""
                } ${isCurrent ? "ring-2 ring-green-500/50" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    Current Plan
                  </div>
                )}

                <div className="mb-4">
                  <div className={`w-12 h-12 rounded-xl ${
                    isPopular ? "bg-purple-500/20" : "bg-slate-800"
                  } flex items-center justify-center mb-3`}>
                    <Icon className={`w-6 h-6 ${isPopular ? "text-purple-400" : "text-gray-400"}`} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{plan.name.replace(" Plan", "")}</h3>
                  <p className="text-gray-500 text-sm mt-1">{plan.actionsPerMonth} actions/month</p>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-white">${plan.price}</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        isPopular ? "text-purple-400" : "text-green-400"
                      }`} />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || subscribing === plan.id}
                  className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-green-500/20 text-green-400 cursor-not-allowed"
                      : isPopular
                      ? "btn-primary text-white"
                      : "bg-slate-800 text-white hover:bg-slate-700"
                  }`}
                >
                  {subscribing === plan.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isCurrent ? (
                    <>
                      <Check className="w-5 h-5" />
                      Current Plan
                    </>
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-white font-medium mb-1">What counts as an action?</h3>
            <p className="text-gray-400 text-sm">
              An action is counted when you approve (or auto-approve) a comment to be posted. 
              Reviewing or editing comments doesn&apos;t count towards your limit.
            </p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-1">Can I change plans later?</h3>
            <p className="text-gray-400 text-sm">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
              and we&apos;ll prorate the difference.
            </p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-1">What happens if I run out of actions?</h3>
            <p className="text-gray-400 text-sm">
              You won&apos;t be charged extra. You&apos;ll need to wait until your next billing cycle or 
              upgrade to a higher plan to continue posting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

