"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Check,
  X,
  DollarSign,
} from "lucide-react";
import type { SubscriptionPlan } from "@/types/database";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    features: "",
    is_active: true,
  });

  const fetchPlans = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price_monthly", { ascending: true });

    if (data) {
      setPlans(data as unknown as SubscriptionPlan[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || "",
        price_monthly: plan.price_monthly ?? 0,
        price_yearly: plan.price_yearly ?? 0,
        features: (plan.features as string[] || []).join("\n"),
        is_active: plan.is_active ?? true,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: "",
        description: "",
        price_monthly: 0,
        price_yearly: 0,
        features: "",
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    const planData = {
      name: formData.name,
      description: formData.description,
      price_monthly: formData.price_monthly,
      price_yearly: formData.price_yearly,
      features: formData.features.split("\n").filter((f) => f.trim()),
      is_active: formData.is_active,
    };

    if (editingPlan) {
      await supabase
        .from("subscription_plans")
        .update(planData)
        .eq("id", editingPlan.id);
    } else {
      await supabase.from("subscription_plans").insert(planData);
    }

    setSaving(false);
    setShowModal(false);
    fetchPlans();
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    const supabase = createClient();
    await supabase.from("subscription_plans").delete().eq("id", planId);
    fetchPlans();
  };

  const toggleActive = async (plan: SubscriptionPlan) => {
    const supabase = createClient();
    await supabase
      .from("subscription_plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);
    fetchPlans();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-400" />
            </div>
            Subscription Plans
          </h1>
          <p className="text-gray-400 mt-1">
            Manage subscription plans and pricing
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      {/* Plans grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card p-6 relative ${
                !plan.is_active ? "opacity-60" : ""
              }`}
            >
              {/* Status badge */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => toggleActive(plan)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    plan.is_active
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                  }`}
                >
                  {plan.is_active ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Plan header */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="flex items-baseline gap-1 mb-6">
                <DollarSign className="w-5 h-5 text-blue-400" />
                <span className="text-3xl font-bold text-white">
                  {plan.price_monthly}
                </span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-gray-500 text-sm -mt-4 mb-4">
                ${plan.price_yearly}/year
              </p>

              {/* Features */}
              <div className="space-y-2 mb-6">
                {(plan.features as string[]).slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
                {(plan.features as string[]).length > 4 && (
                  <p className="text-gray-500 text-sm">
                    +{(plan.features as string[]).length - 4} more features
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <button
                  onClick={() => openModal(plan)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingPlan ? "Edit Plan" : "Create Plan"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Pro"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the plan"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Monthly Price ($)
                  </label>
                  <input
                    type="number"
                    value={formData.price_monthly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_monthly: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Yearly Price ($)
                  </label>
                  <input
                    type="number"
                    value={formData.price_yearly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_yearly: parseFloat(e.target.value) || 0,
                      })
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Features (one per line)
                </label>
                <textarea
                  value={formData.features}
                  onChange={(e) =>
                    setFormData({ ...formData, features: e.target.value })
                  }
                  placeholder="Enter features, one per line"
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-gray-300">Plan is active</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || saving}
                className="flex-1 px-4 py-3 rounded-xl btn-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save Plan"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

