"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useImpersonation } from "@/lib/contexts/ImpersonationContext";
import { getImpersonationHeaders } from "@/lib/api/impersonation";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Globe,
  Target,
  Hash,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Power,
  CreditCard,
  Sparkles,
  MapPin,
  ChevronLeft,
} from "lucide-react";
import type { Business, GMBTarget } from "@/types/database";
import { GMBTargetSelector } from "@/components/GMBTargetSelector";
import { GMBTargetSelectorXmiso } from "@/components/GMBTargetSelectorXmiso";
import type { XmisoGMBTarget } from "@/lib/data/xmiso-categories";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "casual", label: "Casual" },
  { value: "authoritative", label: "Authoritative" },
  { value: "helpful", label: "Helpful" },
  { value: "witty", label: "Witty" },
];

export default function BusinessesPage() {
  const router = useRouter();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  const [gmbScraperType, setGmbScraperType] = useState<'compass' | 'xmiso' | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    website_url: "",
    description: "",
    target_audience: "",
    keywords: [] as string[],
    gmb_targets: [] as GMBTarget[],
    industry: "",
    tone_of_voice: "professional",
    auto_approve: false,
  });

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/businesses", {
        headers: getImpersonationHeaders(),
      });
      const data = await response.json();
      if (data.businesses) {
        setBusinesses(data.businesses);
      }
      setHasActiveSubscription(data.hasActiveSubscription || false);
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBusinesses();
    // Fetch GMB scraper type
    fetch('/api/gmb/scraper-type')
      .then(res => res.json())
      .then(data => setGmbScraperType(data.scraperType))
      .catch(() => setGmbScraperType(null));
  }, [isImpersonating, impersonatedUser]);

  const openForm = (business?: Business) => {
    if (business) {
      setEditingBusiness(business);
      setFormData({
        name: business.name,
        website_url: business.website_url || "",
        description: business.description || "",
        target_audience: business.target_audience || "",
        keywords: business.keywords || [],
        gmb_targets: (business.gmb_targets as unknown as GMBTarget[]) || [],
        industry: business.industry || "",
        tone_of_voice: business.tone_of_voice || "professional",
        auto_approve: business.auto_approve ?? false,
      });
    } else {
      setEditingBusiness(null);
      setFormData({
        name: "",
        website_url: "",
        description: "",
        target_audience: "",
        keywords: [],
        gmb_targets: [],
        industry: "",
        tone_of_voice: "professional",
        auto_approve: false,
      });
    }
    setKeywordInput("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBusiness(null);
  };

  const MAX_KEYWORDS = 5;

  const handleAddKeyword = () => {
    if (formData.keywords.length >= MAX_KEYWORDS) {
      return;
    }
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keywordInput.trim()],
      });
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((k) => k !== keyword),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const url = editingBusiness
        ? `/api/businesses/${editingBusiness.id}`
        : "/api/businesses";
      const method = editingBusiness ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          ...getImpersonationHeaders(),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresSubscription) {
          setShowForm(false);
          setShowSubscribePrompt(true);
          setSaving(false);
          return;
        }
        throw new Error(data.error || "Failed to save business");
      }

      setShowForm(false);
      fetchBusinesses();

      if (data.requiresSubscription) {
        setShowSubscribePrompt(true);
        setMessage({
          type: "info",
          text: data.message || "Business saved! Subscribe to activate it.",
        });
      } else {
        setMessage({
          type: "success",
          text: `Business ${editingBusiness ? "updated" : "created"} successfully!`,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save business",
      });
    }
    setSaving(false);
  };

  const handleDelete = async (businessId: string) => {
    if (!confirm("Are you sure you want to delete this business? All associated data will be lost.")) return;

    try {
      const response = await fetch(`/api/businesses/${businessId}`, {
        method: "DELETE",
        headers: getImpersonationHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete business");
      }

      setMessage({ type: "success", text: "Business deleted successfully!" });
      fetchBusinesses();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete business",
      });
    }
  };

  const toggleActive = async (business: Business) => {
    try {
      const response = await fetch(`/api/businesses/${business.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...getImpersonationHeaders(),
        },
        body: JSON.stringify({ is_active: !business.is_active }),
      });

      if (!response.ok) {
        throw new Error("Failed to update business");
      }

      fetchBusinesses();
    } catch (error) {
      console.error("Failed to toggle business:", error);
    }
  };

  // If showing form, render the inline form view
  if (showForm) {
    return (
      <div className="space-y-6">
        {/* Form Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={closeForm}
            className="p-2 rounded-xl bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              {editingBusiness ? "Edit Business" : "Add Business"}
            </h1>
            <p className="text-gray-400 mt-1">
              {editingBusiness 
                ? "Update your business profile settings" 
                : "Create a new business profile for AI-powered outreach"}
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="glass-card p-6 lg:p-8">
          <div className="max-w-3xl space-y-6">
            {/* Basic Info Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Basic Information
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Acme Corporation"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Industry</label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="SaaS, E-commerce, etc."
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What does your business do? What products or services do you offer?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Targeting Section */}
            <div className="pt-6 border-t border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                Targeting & Research
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Target Audience
                  </label>
                  <textarea
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                    placeholder="Who are your ideal customers? What problems do they have?"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Keywords
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      formData.keywords.length >= MAX_KEYWORDS
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-slate-700 text-gray-400"
                    }`}>
                      {formData.keywords.length}/{MAX_KEYWORDS}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      disabled={formData.keywords.length >= MAX_KEYWORDS}
                      placeholder={formData.keywords.length >= MAX_KEYWORDS 
                        ? "Maximum keywords reached" 
                        : "Add keyword and press Enter"}
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={handleAddKeyword}
                      disabled={formData.keywords.length >= MAX_KEYWORDS}
                      className="px-4 py-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  {formData.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm flex items-center gap-2"
                        >
                          {keyword}
                          <button
                            onClick={() => handleRemoveKeyword(keyword)}
                            className="hover:text-blue-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Keywords are used for AI research. Add up to {MAX_KEYWORDS} keywords to find relevant conversations.
                  </p>
                </div>

                {/* Business Lead Finder Targets */}
                {gmbScraperType === 'xmiso' ? (
                  <GMBTargetSelectorXmiso
                    targets={formData.gmb_targets as unknown as XmisoGMBTarget[]}
                    onChange={(targets) => setFormData({ ...formData, gmb_targets: targets as unknown as GMBTarget[] })}
                    maxTargets={20}
                    disabled={saving}
                  />
                ) : (
                  <GMBTargetSelector
                    targets={formData.gmb_targets}
                    onChange={(targets) => setFormData({ ...formData, gmb_targets: targets })}
                    maxTargets={20}
                    disabled={saving}
                  />
                )}
              </div>
            </div>

            {/* Settings Section */}
            <div className="pt-6 border-t border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                Response Settings
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Tone of Voice
                  </label>
                  <select
                    value={formData.tone_of_voice}
                    onChange={(e) => setFormData({ ...formData, tone_of_voice: e.target.value })}
                    className="w-full sm:w-80 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    {TONE_OPTIONS.map((tone) => (
                      <option key={tone.value} value={tone.value}>
                        {tone.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-approve Toggle */}
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-800/50 rounded-xl max-w-xl">
                  <input
                    type="checkbox"
                    checked={formData.auto_approve}
                    onChange={(e) => setFormData({ ...formData, auto_approve: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-gray-300 font-medium">Auto-approve actions</span>
                    <p className="text-gray-500 text-sm">
                      Automatically approve AI-generated comments without manual review
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-6 border-t border-slate-700">
              <button
                onClick={closeForm}
                className="px-6 py-3 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || saving}
                className="px-8 py-3 rounded-xl btn-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {editingBusiness ? "Save Changes" : "Create Business"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            Businesses
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your business profiles for AI-powered outreach
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Business
        </button>
      </div>

      {/* Subscription Banner */}
      {!loading && !hasActiveSubscription && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span className="text-amber-400">
            Active subscription required to add businesses
          </span>
          <button
            onClick={() => router.push("/dashboard/billing")}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors text-sm"
          >
            <CreditCard className="w-4 h-4" />
            Subscribe Now
          </button>
        </motion.div>
      )}

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-500/20 border border-green-500/30"
                : message.type === "info"
                ? "bg-blue-500/20 border border-blue-500/30"
                : "bg-red-500/20 border border-red-500/30"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : message.type === "info" ? (
              <Sparkles className="w-5 h-5 text-blue-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={
              message.type === "success" 
                ? "text-green-400" 
                : message.type === "info"
                ? "text-blue-400"
                : "text-red-400"
            }>
              {message.text}
            </span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Businesses Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : businesses.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">No businesses yet</p>
          <p className="text-gray-500 text-sm mb-6">
            Add your first business to start generating AI-powered outreach opportunities
          </p>
          <button
            onClick={() => openForm()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Your First Business
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business, index) => (
            <motion.div
              key={business.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card p-6 ${!business.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{business.name}</h3>
                  {business.industry && (
                    <p className="text-gray-500 text-sm">{business.industry}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(business)}
                  className={`p-2 rounded-lg transition-colors ${
                    business.is_active
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                  }`}
                  title={business.is_active ? "Deactivate" : "Activate"}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              {business.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{business.description}</p>
              )}

              {/* Keywords */}
              {business.keywords && business.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {business.keywords.slice(0, 3).map((keyword) => (
                    <span
                      key={keyword}
                      className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-lg"
                    >
                      {keyword}
                    </span>
                  ))}
                  {business.keywords.length > 3 && (
                    <span className="px-2 py-1 bg-slate-700 text-gray-400 text-xs rounded-lg">
                      +{business.keywords.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* GMB Targets */}
              {business.gmb_targets && Array.isArray(business.gmb_targets) && business.gmb_targets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(business.gmb_targets as unknown as GMBTarget[]).slice(0, 2).map((target, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      {target.industry}
                    </span>
                  ))}
                  {(business.gmb_targets as unknown as GMBTarget[]).length > 2 && (
                    <span className="px-2 py-1 bg-slate-700 text-gray-400 text-xs rounded-lg">
                      +{(business.gmb_targets as unknown as GMBTarget[]).length - 2} more
                    </span>
                  )}
                </div>
              )}

              {/* Status badges */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    business.is_active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      business.is_active ? "bg-green-400" : "bg-gray-400"
                    }`}
                  />
                  {business.is_active ? "Active" : "Inactive"}
                </span>
                {business.auto_approve && (
                  <span className="px-2.5 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-lg font-medium">
                    Auto-approve
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <button
                  onClick={() => openForm(business)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(business.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Subscribe Prompt Modal - Keep this as a modal since it's a prompt */}
      <AnimatePresence>
        {showSubscribePrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-8 w-full max-w-md text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">
                Business Saved!
              </h2>
              
              <p className="text-gray-400 mb-6">
                Subscribe to a plan to activate AI-powered outreach for your business. 
                Your AI agent will find relevant conversations and generate personalized comments.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowSubscribePrompt(false);
                    router.push("/dashboard/billing");
                  }}
                  className="w-full px-4 py-3 rounded-xl btn-primary text-white font-medium flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  View Plans & Subscribe
                </button>
                <button
                  onClick={() => setShowSubscribePrompt(false)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors font-medium"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
