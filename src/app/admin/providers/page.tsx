"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Plug,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Eye,
  EyeOff,
  Power,
  ExternalLink,
  Map,
  Server,
  MessageSquare,
  Twitter,
  Bot,
  Mail,
} from "lucide-react";
import type { ApiProvider, TablesInsert, Json } from "@/types/database";

type ProviderType = "smm_panel" | "apify" | "reddapi" | "twitterapi" | "stagehand_reddit" | "reachinbox";

const PROVIDER_TYPES: { value: ProviderType; label: string; icon: React.ReactNode }[] = [
  { value: "smm_panel", label: "SMM Panel", icon: <Server className="w-4 h-4" /> },
  { value: "apify", label: "Apify Scraper", icon: <Map className="w-4 h-4" /> },
  { value: "reddapi", label: "Reddapi (Reddit)", icon: <MessageSquare className="w-4 h-4" /> },
  { value: "twitterapi", label: "TwitterAPI (X)", icon: <Twitter className="w-4 h-4" /> },
  { value: "stagehand_reddit", label: "Stagehand (Reddit)", icon: <Bot className="w-4 h-4" /> },
  { value: "reachinbox", label: "ReachInbox (Email)", icon: <Mail className="w-4 h-4" /> },
];

// Default configs for Apify actors
const APIFY_ACTOR_PRESETS: Record<string, { name: string; actorId: string; defaultConfig: object; slug?: string }> = {
  "google-maps": {
    name: "Google Maps Scraper (Compass)",
    actorId: "compass/crawler-google-places",
    slug: "gmb-leads",
    defaultConfig: {
      includeWebResults: false,
      language: "en",
      locationQuery: "New York, USA",
      maxCrawledPlacesPerSearch: 50,
      maxImages: 0,
      maximumLeadsEnrichmentRecords: 0,
      scrapeContacts: false,
      scrapeDirectories: false,
      scrapeImageAuthors: false,
      scrapePlaceDetailPage: false,
      scrapeReviewsPersonalData: true,
      scrapeSocialMediaProfiles: {
        facebooks: false,
        instagrams: false,
        tiktoks: false,
        twitters: false,
        youtubes: false,
      },
      scrapeTableReservationProvider: false,
      searchStringsArray: ["restaurant"],
      skipClosedPlaces: false,
    },
  },
  "google-maps-xmiso": {
    name: "Google Maps Leads (XMiso)",
    actorId: "xmiso_scrapers/millions-us-businesses-leads-with-emails-from-google-maps",
    slug: "gmb-leads-xmiso",
    defaultConfig: {
      category: "restaurant",
      country: "US",
      state: "All",
      area: 10,
      max_results: 100,
    },
  },
};

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    provider_type: "smm_panel" as ProviderType,
    api_url: "",
    api_key_encrypted: "",
    actor_id: "",
    project_id: "", // For Stagehand/Browserbase
    is_active: false,
    description: "",
    config: "{}",
  });

  const fetchProviders = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("api_providers")
      .select("*")
      .order("name", { ascending: true });

    if (data) {
      setProviders(data as unknown as ApiProvider[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const openModal = (provider?: ApiProvider) => {
    if (provider) {
      setEditingProvider(provider);
      const config = provider.config as Record<string, unknown> | null;
      setFormData({
        name: provider.name,
        slug: provider.slug,
        provider_type: (provider.provider_type as ProviderType) || "smm_panel",
        api_url: provider.api_url,
        api_key_encrypted: "", // Don't pre-fill the key
        actor_id: (config?.actor_id as string) || "",
        project_id: (config?.project_id as string) || "",
        is_active: provider.is_active ?? false,
        description: provider.description || "",
        config: JSON.stringify(config?.default_input || {}, null, 2),
      });
    } else {
      setEditingProvider(null);
      setFormData({
        name: "",
        slug: "",
        provider_type: "smm_panel",
        api_url: "",
        api_key_encrypted: "",
        actor_id: "",
        project_id: "",
        is_active: false,
        description: "",
        config: "{}",
      });
    }
    setSelectedPreset("");
    setShowApiKey(false);
    setShowModal(true);
  };

  const applyPreset = (presetKey: string) => {
    const preset = APIFY_ACTOR_PRESETS[presetKey];
    if (preset) {
      setFormData({
        ...formData,
        name: preset.name,
        slug: preset.slug || presetKey,
        actor_id: preset.actorId,
        config: JSON.stringify(preset.defaultConfig, null, 2),
      });
      setSelectedPreset(presetKey);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    // Parse config JSON
    let parsedConfig: Json = {};
    try {
      const inputConfig = JSON.parse(formData.config || "{}");
      if (formData.provider_type === "stagehand_reddit") {
        parsedConfig = {
          project_id: formData.project_id || undefined,
          proxies: true,
          stealth: true,
          timing: { min_delay: 2000, max_delay: 5000 },
        } as Json;
      } else {
        parsedConfig = {
          actor_id: formData.actor_id || undefined,
          default_input: inputConfig,
        } as Json;
      }
    } catch {
      alert("Invalid JSON in config");
      setSaving(false);
      return;
    }

    const providerData: TablesInsert<"api_providers"> = {
      name: formData.name,
      slug: formData.slug.toLowerCase().replace(/\s+/g, "-"),
      provider_type: formData.provider_type,
      api_url: formData.api_url || (
        formData.provider_type === "apify" 
          ? "https://api.apify.com/v2" 
          : formData.provider_type === "reddapi"
          ? "https://reddapi.online"
          : formData.provider_type === "twitterapi"
          ? "https://api.twitterapi.io"
          : formData.provider_type === "stagehand_reddit"
          ? "wss://connect.browserbase.com"
          : formData.provider_type === "reachinbox"
          ? "https://api.reachinbox.ai"
          : ""
      ),
      is_active: formData.is_active,
      description: formData.description,
      config: parsedConfig,
    };

    // Only update API key if provided
    if (formData.api_key_encrypted) {
      providerData.api_key_encrypted = formData.api_key_encrypted;
    }

    if (editingProvider) {
      await supabase
        .from("api_providers")
        .update(providerData)
        .eq("id", editingProvider.id);
    } else {
      await supabase.from("api_providers").insert(providerData);
    }

    setSaving(false);
    setShowModal(false);
    fetchProviders();
  };

  const handleDelete = async (providerId: string) => {
    if (!confirm("Are you sure you want to delete this API provider?")) return;

    const supabase = createClient();
    await supabase.from("api_providers").delete().eq("id", providerId);
    fetchProviders();
  };

  const toggleActive = async (provider: ApiProvider) => {
    const supabase = createClient();
    await supabase
      .from("api_providers")
      .update({ is_active: !provider.is_active })
      .eq("id", provider.id);
    fetchProviders();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Plug className="w-5 h-5 text-green-400" />
            </div>
            API Providers
          </h1>
          <p className="text-gray-400 mt-1">
            Manage SMM panel connections and API integrations
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      {/* Providers grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : providers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Plug className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">No API providers configured yet</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Your First Provider
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {providers.map((provider, index) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card p-6 ${
                !provider.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      provider.provider_type === "apify"
                        ? provider.is_active
                          ? "bg-orange-500/20"
                          : "bg-gray-500/20"
                        : provider.provider_type === "reddapi"
                        ? provider.is_active
                          ? "bg-red-500/20"
                          : "bg-gray-500/20"
                        : provider.provider_type === "twitterapi"
                        ? provider.is_active
                          ? "bg-sky-500/20"
                          : "bg-gray-500/20"
                        : provider.provider_type === "stagehand_reddit"
                        ? provider.is_active
                          ? "bg-purple-500/20"
                          : "bg-gray-500/20"
                        : provider.provider_type === "reachinbox"
                        ? provider.is_active
                          ? "bg-emerald-500/20"
                          : "bg-gray-500/20"
                        : provider.is_active
                        ? "bg-green-500/20"
                        : "bg-gray-500/20"
                    }`}
                  >
                    {provider.provider_type === "apify" ? (
                      <Map
                        className={`w-6 h-6 ${
                          provider.is_active ? "text-orange-400" : "text-gray-400"
                        }`}
                      />
                    ) : provider.provider_type === "reddapi" ? (
                      <MessageSquare
                        className={`w-6 h-6 ${
                          provider.is_active ? "text-red-400" : "text-gray-400"
                        }`}
                      />
                    ) : provider.provider_type === "twitterapi" ? (
                      <Twitter
                        className={`w-6 h-6 ${
                          provider.is_active ? "text-sky-400" : "text-gray-400"
                        }`}
                      />
                    ) : provider.provider_type === "stagehand_reddit" ? (
                      <Bot
                        className={`w-6 h-6 ${
                          provider.is_active ? "text-purple-400" : "text-gray-400"
                        }`}
                      />
                    ) : provider.provider_type === "reachinbox" ? (
                      <Mail
                        className={`w-6 h-6 ${
                          provider.is_active ? "text-emerald-400" : "text-gray-400"
                        }`}
                      />
                    ) : (
                      <Plug
                        className={`w-6 h-6 ${
                          provider.is_active ? "text-green-400" : "text-gray-400"
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {provider.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-500 text-sm">{provider.slug}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        provider.provider_type === "apify"
                          ? "bg-orange-500/20 text-orange-400"
                          : provider.provider_type === "reddapi"
                          ? "bg-red-500/20 text-red-400"
                          : provider.provider_type === "twitterapi"
                          ? "bg-sky-500/20 text-sky-400"
                          : provider.provider_type === "stagehand_reddit"
                          ? "bg-purple-500/20 text-purple-400"
                          : provider.provider_type === "reachinbox"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {provider.provider_type === "apify" ? "Apify" : provider.provider_type === "reddapi" ? "Reddit" : provider.provider_type === "twitterapi" ? "Twitter" : provider.provider_type === "stagehand_reddit" ? "Stagehand" : provider.provider_type === "reachinbox" ? "Email" : "SMM"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(provider)}
                  className={`p-2 rounded-lg transition-colors ${
                    provider.is_active
                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                  }`}
                  title={provider.is_active ? "Deactivate" : "Activate"}
                >
                  <Power className="w-5 h-5" />
                </button>
              </div>

              {provider.description && (
                <p className="text-gray-400 text-sm mb-4">
                  {provider.description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                {provider.provider_type === "apify" ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Actor ID:</span>
                      <span className="text-orange-400 font-mono text-xs">
                        {(() => {
                          const config = provider.config as Record<string, unknown> | null;
                          const actorId = config?.actor_id;
                          return actorId ? String(actorId) : "Not set";
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">API Token:</span>
                      <span className="text-gray-300">
                        {provider.api_key_encrypted
                          ? "••••••••••••"
                          : "Not configured"}
                      </span>
                    </div>
                  </>
                ) : provider.provider_type === "reddapi" ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">API URL:</span>
                      <a
                        href={provider.api_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 truncate"
                      >
                        {provider.api_url}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className="text-gray-300">
                        Uses reddit_accounts table for credentials
                      </span>
                    </div>
                  </>
                ) : provider.provider_type === "twitterapi" ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">API URL:</span>
                      <a
                        href={provider.api_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-1 truncate"
                      >
                        {provider.api_url}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">API Key:</span>
                      <span className="text-gray-300">
                        {provider.api_key_encrypted
                          ? "••••••••••••"
                          : "Not configured"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Accounts:</span>
                      <span className="text-gray-300">
                        Uses twitter_accounts table
                      </span>
                    </div>
                  </>
                ) : provider.provider_type === "stagehand_reddit" ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Project ID:</span>
                      <span className="text-purple-400 font-mono text-xs">
                        {(() => {
                          const config = provider.config as Record<string, unknown> | null;
                          const projectId = config?.project_id;
                          return projectId ? String(projectId) : "Not set";
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">API Key:</span>
                      <span className="text-gray-300">
                        {provider.api_key_encrypted
                          ? "••••••••••••"
                          : "Not configured"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Features:</span>
                      <span className="text-gray-300">
                        {(() => {
                          const config = provider.config as Record<string, unknown> | null;
                          const features = [];
                          if (config?.proxies) features.push("Proxies");
                          if (config?.stealth) features.push("Stealth");
                          return features.length ? features.join(", ") : "Default";
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Accounts:</span>
                      <span className="text-gray-300">
                        Uses reddit_accounts table
                      </span>
                    </div>
                  </>
                ) : provider.provider_type === "reachinbox" ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">API URL:</span>
                      <a
                        href={provider.api_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 truncate"
                      >
                        {provider.api_url}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">API Key:</span>
                      <span className="text-gray-300">
                        {provider.api_key_encrypted
                          ? "••••••••••••"
                          : "Not configured"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Purpose:</span>
                      <span className="text-gray-300">
                        Email campaigns with 3-step sequences
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">API URL:</span>
                      <a
                        href={provider.api_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 truncate"
                      >
                        {provider.api_url}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">API Key:</span>
                      <span className="text-gray-300">
                        {provider.api_key_encrypted
                          ? "••••••••••••"
                          : "Not configured"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    provider.is_active
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      provider.is_active ? "bg-green-400" : "bg-gray-400"
                    }`}
                  />
                  {provider.is_active ? "Connected" : "Disconnected"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <button
                  onClick={() => openModal(provider)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(provider.id)}
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
                {editingProvider ? "Edit Provider" : "Add Provider"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Provider Type Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Provider Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {PROVIDER_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, provider_type: type.value })
                      }
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                        formData.provider_type === type.value
                          ? type.value === "apify"
                            ? "border-orange-500 bg-orange-500/20 text-orange-400"
                            : type.value === "reddapi"
                            ? "border-red-500 bg-red-500/20 text-red-400"
                            : type.value === "twitterapi"
                            ? "border-sky-500 bg-sky-500/20 text-sky-400"
                            : type.value === "stagehand_reddit"
                            ? "border-purple-500 bg-purple-500/20 text-purple-400"
                            : type.value === "reachinbox"
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                            : "border-blue-500 bg-blue-500/20 text-blue-400"
                          : "border-slate-700 bg-slate-900/50 text-gray-400 hover:border-slate-600"
                      }`}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apify Preset Selector */}
              {formData.provider_type === "apify" && !editingProvider && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Quick Setup Preset
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(APIFY_ACTOR_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyPreset(key)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                          selectedPreset === key
                            ? "border-green-500 bg-green-500/20 text-green-400"
                            : "border-slate-700 bg-slate-900/50 text-gray-400 hover:border-slate-600"
                        }`}
                      >
                        <Map className="w-5 h-5" />
                        <div>
                          <div className="font-medium text-white">{preset.name}</div>
                          <div className="text-xs text-gray-500">{preset.actorId}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={formData.provider_type === "apify" ? "e.g. Google Maps Scraper" : "e.g. Just Another Panel"}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Slug (identifier)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder={formData.provider_type === "apify" ? "e.g. google-maps" : "e.g. just-another-panel"}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Apify-specific fields */}
              {formData.provider_type === "apify" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Apify Actor ID
                  </label>
                  <input
                    type="text"
                    value={formData.actor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, actor_id: e.target.value })
                    }
                    placeholder="e.g. compass/crawler-google-places"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              )}

              {/* Stagehand-specific fields */}
              {formData.provider_type === "stagehand_reddit" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Browserbase Project ID
                  </label>
                  <input
                    type="text"
                    value={formData.project_id}
                    onChange={(e) =>
                      setFormData({ ...formData, project_id: e.target.value })
                    }
                    placeholder="e.g. abc123-def456-..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                  <p className="text-xs text-gray-500">
                    Find your Project ID in the Browserbase Dashboard
                  </p>
                </div>
              )}

              {formData.provider_type !== "reddapi" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    {formData.provider_type === "apify" ? "API Token" : formData.provider_type === "twitterapi" ? "X-API-Key" : formData.provider_type === "stagehand_reddit" ? "Browserbase API Key" : formData.provider_type === "reachinbox" ? "ReachInbox API Key" : "API Key"}{" "}
                    {editingProvider && <span className="text-gray-500">(leave blank to keep existing)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={formData.api_key_encrypted}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          api_key_encrypted: e.target.value,
                        })
                      }
                      placeholder={
                        formData.provider_type === "apify" 
                          ? "apify_api_xxxxx..." 
                          : formData.provider_type === "twitterapi"
                          ? "Your twitterapi.io API key"
                          : formData.provider_type === "stagehand_reddit"
                          ? "bb_live_xxxxx..."
                          : formData.provider_type === "reachinbox"
                          ? "Your ReachInbox API key from Settings > Integrations"
                          : "Enter your API key"
                      }
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {(formData.provider_type === "smm_panel" || formData.provider_type === "reddapi" || formData.provider_type === "twitterapi") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    API URL
                  </label>
                  <input
                    type="url"
                    value={formData.api_url}
                    onChange={(e) =>
                      setFormData({ ...formData, api_url: e.target.value })
                    }
                    placeholder={
                      formData.provider_type === "reddapi" 
                        ? "https://reddapi.online" 
                        : formData.provider_type === "twitterapi"
                        ? "https://api.twitterapi.io"
                        : "https://api.example.com/v2"
                    }
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  {formData.provider_type === "reddapi" && (
                    <p className="text-xs text-gray-500">
                      Reddapi uses credentials from the reddit_accounts table. No API key needed here.
                    </p>
                  )}
                  {formData.provider_type === "twitterapi" && (
                    <p className="text-xs text-gray-500">
                      TwitterAPI uses credentials from the twitter_accounts table. API key is required for authentication.
                    </p>
                  )}
                </div>
              )}

              {/* Default Config for Apify */}
              {formData.provider_type === "apify" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Default Input Configuration (JSON)
                  </label>
                  <textarea
                    value={formData.config}
                    onChange={(e) =>
                      setFormData({ ...formData, config: e.target.value })
                    }
                    placeholder='{"searchStringsArray": ["restaurant"], "locationQuery": "New York, USA"}'
                    rows={8}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm resize-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of this provider"
                  rows={2}
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
                <span className="text-gray-300">Provider is active</span>
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
                disabled={!formData.name || (formData.provider_type === "smm_panel" && !formData.api_url) || saving}
                className="flex-1 px-4 py-3 rounded-xl btn-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save Provider"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

