"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useImpersonation } from "@/lib/contexts/ImpersonationContext";
import { getImpersonationHeaders } from "@/lib/api/impersonation";
import {
  Search,
  Loader2,
  Clock,
  ExternalLink,
  MessageSquare,
  ArrowUp,
  RefreshCw,
  Building2,
  AlertCircle,
  Sparkles,
  Radio,
  MapPin,
  ChevronDown,
  CheckCircle2,
  Circle,
  Target,
  Mail,
  Phone,
  Globe,
  Briefcase,
} from "lucide-react";
import LiveResearchAnimation from "@/components/LiveResearchAnimation";

interface GMBTargetUI {
  industry: string;
  country: string;
  countryName: string;
  state: string | null;
  stateCode: string | null;
  city: string | null;
  fulfilled_at?: string | null;
  cache_id?: string | null;
  result_count?: number | null;
}

interface Business {
  id: string;
  name: string;
  keywords: string[] | null;
  gmb_targets?: GMBTargetUI[] | null;
}

interface ResearchResult {
  id: string;
  platform: string;
  result_data: {
    id?: string;
    // Post fields
    title?: string;
    selftext?: string;
    subreddit?: string;
    author?: string;
    score?: number;
    numComments?: number;
    url?: string;
    permalink?: string;
    createdAt?: string;
    // Comment fields (from harshmaur/reddit-scraper-pro)
    body?: string;
    subredditName?: string;
    authorName?: string;
    commentUpVotes?: number;
    dataType?: 'post' | 'comment';
    commentCreatedAt?: string;
    // Additional fields from scraper
    parsedCommunityName?: string;
    searchTerm?: string;
    postUrl?: string;
  };
  reveal_at: string;
  title: string | null;
  url: string | null;
  score: number | null;
  created_at: string;
  relevance_score: number | null;
}

interface ResearchStats {
  totalResults: number;
  revealedCount: number;
  pendingCount: number;
  lastRunAt: string | null;
}

type Platform = "reddit" | "gmb";

const PLATFORMS: { value: Platform; label: string; icon: React.ReactNode; available: boolean }[] = [
  { value: "reddit", label: "Reddit", icon: <MessageSquare className="w-4 h-4" />, available: true },
  { value: "gmb", label: "Business Leads", icon: <MapPin className="w-4 h-4" />, available: true },
];

export default function LiveResearchPage() {
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [platform, setPlatform] = useState<Platform>("reddit");
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [stats, setStats] = useState<ResearchStats | null>(null);
  const [nextRevealAt, setNextRevealAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [newResultsCount, setNewResultsCount] = useState(0);

  // Fetch businesses
  const fetchBusinesses = useCallback(async () => {
    try {
      const response = await fetch("/api/businesses", {
        headers: getImpersonationHeaders(),
      });
      const data = await response.json();
      if (data.businesses) {
        setBusinesses(data.businesses);
        // Auto-select first business with keywords
        const businessWithKeywords = data.businesses.find(
          (b: Business) => b.keywords && b.keywords.length > 0
        );
        if (businessWithKeywords && !selectedBusiness) {
          setSelectedBusiness(businessWithKeywords);
        }
      }
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
    }
    setLoading(false);
  }, [selectedBusiness]);

  // Fetch research results
  const fetchResults = useCallback(async (showLoading = true) => {
    if (!selectedBusiness) return;

    if (showLoading) setLoadingResults(true);
    try {
      const response = await fetch(
        `/api/research/${selectedBusiness.id}?platform=${platform}&limit=50`,
        { headers: getImpersonationHeaders() }
      );
      const data = await response.json();
      
      if (data.results) {
        // Check for new results
        if (results.length > 0 && data.results.length > results.length) {
          setNewResultsCount(data.results.length - results.length);
          setTimeout(() => setNewResultsCount(0), 3000);
        }
        setResults(data.results);
      }
      if (data.stats) setStats(data.stats);
      if (data.nextRevealAt !== undefined) setNextRevealAt(data.nextRevealAt);
    } catch (error) {
      console.error("Failed to fetch research results:", error);
    }
    setLoadingResults(false);
  }, [selectedBusiness, platform, results.length]);

  // Initial fetch
  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses, isImpersonating, impersonatedUser]);

  // Fetch results when business or platform changes
  useEffect(() => {
    if (selectedBusiness) {
      fetchResults();
    }
  }, [selectedBusiness, platform, fetchResults]);

  // Countdown timer - for Reddit uses nextRevealAt, for GMB uses next cron run (2 AM UTC daily)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      let targetTime: Date;

      if (platform === 'gmb') {
        // Calculate next 2 AM UTC
        targetTime = new Date(now);
        targetTime.setUTCHours(2, 0, 0, 0);
        
        // If we're past 2 AM UTC today, target tomorrow
        if (now.getTime() > targetTime.getTime()) {
          targetTime.setUTCDate(targetTime.getUTCDate() + 1);
        }
      } else if (nextRevealAt) {
        targetTime = new Date(nextRevealAt);
      } else {
        setCountdown("");
        return;
      }

      const diffMs = targetTime.getTime() - now.getTime();

      if (diffMs <= 0) {
        setCountdown("New data available!");
        fetchResults(false);
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextRevealAt, fetchResults, platform]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!selectedBusiness) return;
    
    const interval = setInterval(() => {
      fetchResults(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedBusiness, fetchResults]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <Search className="w-5 h-5 text-emerald-400" />
            </div>
            Live Research
          </h1>
          <p className="text-gray-400 mt-1">
            AI-powered research findings for your business
          </p>
        </div>

        {/* Business Selector */}
        <div className="relative">
          <button
            onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors min-w-[200px]"
          >
            <Building2 className="w-5 h-5 text-gray-400" />
            <span className="text-white flex-1 text-left truncate">
              {selectedBusiness?.name || "Select Business"}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBusinessDropdown ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showBusinessDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 w-full min-w-[250px] bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {businesses.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    No businesses found
                  </div>
                ) : (
                  businesses.map((business) => (
                    <button
                      key={business.id}
                      onClick={() => {
                        setSelectedBusiness(business);
                        setShowBusinessDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors text-left ${
                        selectedBusiness?.id === business.id ? "bg-slate-700" : ""
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{business.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {business.keywords?.length || 0} keywords
                        </p>
                      </div>
                      {selectedBusiness?.id === business.id && (
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            onClick={() => p.available && setPlatform(p.value)}
            disabled={!p.available}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              platform === p.value
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : p.available
                ? "bg-slate-800/50 text-gray-400 border border-slate-700 hover:border-slate-600"
                : "bg-slate-800/30 text-gray-600 border border-slate-700/50 cursor-not-allowed"
            }`}
          >
            {p.icon}
            {p.label}
            {!p.available && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-gray-500">
                Coming Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Business Lead Targets Section - Only show when Business Leads tab is active */}
      {platform === "gmb" && selectedBusiness && selectedBusiness.gmb_targets && selectedBusiness.gmb_targets.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Business Lead Targets</h3>
                <p className="text-gray-500 text-sm">
                  {selectedBusiness.gmb_targets.filter(t => t.fulfilled_at).length}/{selectedBusiness.gmb_targets.length} completed
                </p>
              </div>
            </div>
            <a
              href="/dashboard/businesses"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Manage Targets
            </a>
          </div>

          <div className="grid gap-2">
            {selectedBusiness.gmb_targets.map((target, index) => {
              const isFulfilled = !!target.fulfilled_at;
              const locationDisplay = target.city 
                ? `${target.city}, ${target.stateCode}, ${target.country}`
                : target.state 
                  ? `Anywhere in ${target.state}, ${target.country}`
                  : `Anywhere in ${target.countryName}`;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    isFulfilled
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-slate-800/30 border-slate-700/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isFulfilled ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isFulfilled ? "text-emerald-400" : "text-gray-300"}`}>
                          {target.industry}
                        </span>
                        <span className="text-gray-500">in</span>
                        <span className="text-gray-400 truncate">{locationDisplay}</span>
                      </div>
                      {isFulfilled && target.fulfilled_at && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Scraped {new Date(target.fulfilled_at).toLocaleDateString()}
                          {target.result_count != null && ` • ${target.result_count} results`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isFulfilled ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                        Complete
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-gray-400">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All completed message */}
          {selectedBusiness.gmb_targets.every(t => t.fulfilled_at) && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-400">
                All targets have been scraped. <a href="/dashboard/businesses" className="underline hover:no-underline">Add more targets</a> to continue finding leads.
              </p>
            </div>
          )}
        </div>
      )}

      {!selectedBusiness ? (
        <div className="glass-card p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">Select a business to view research</p>
          <p className="text-gray-500 text-sm">
            Research results will appear here as your AI agent discovers relevant content
          </p>
        </div>
      ) : !selectedBusiness.keywords || selectedBusiness.keywords.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500/50 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">No keywords configured</p>
          <p className="text-gray-500 text-sm mb-4">
            Add keywords to your business to start receiving research insights
          </p>
          <a
            href="/dashboard/businesses"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
          >
            Edit Business
          </a>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Researching Status */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  stats?.pendingCount && stats.pendingCount > 0
                    ? "bg-emerald-500/20"
                    : "bg-slate-700"
                }`}>
                  {stats?.pendingCount && stats.pendingCount > 0 ? (
                    <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                  ) : (
                    <Search className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`font-semibold ${
                    stats?.pendingCount && stats.pendingCount > 0
                      ? "text-emerald-400"
                      : "text-gray-400"
                  }`}>
                    {stats?.pendingCount && stats.pendingCount > 0
                      ? "Researching..."
                      : "Idle"}
                  </p>
                </div>
              </div>
            </div>

            {/* Countdown */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  platform === 'gmb' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                }`}>
                  <Clock className={`w-5 h-5 ${platform === 'gmb' ? 'text-emerald-400' : 'text-blue-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    {platform === 'gmb' ? 'Next scrape' : 'New data'}
                  </p>
                  <p className="font-semibold text-white font-mono">
                    {countdown || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="glass-card p-4">
              <button
                onClick={() => fetchResults()}
                disabled={loadingResults}
                className="w-full h-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loadingResults ? "animate-spin" : ""}`} />
                <span className="font-medium">Refresh</span>
              </button>
            </div>
          </div>

          {/* New Results Banner */}
          <AnimatePresence>
            {newResultsCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  {newResultsCount} new insight{newResultsCount > 1 ? "s" : ""} discovered!
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Grid */}
          {loadingResults && results.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            platform === 'gmb' ? (
              /* GMB Empty State */
              <div className="glass-card p-12 text-center">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Building2 className="w-8 h-8 text-emerald-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-white mb-2">No Business Leads Yet</h3>
                {selectedBusiness?.gmb_targets && selectedBusiness.gmb_targets.length > 0 ? (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      Your targets are being scraped. Verified business leads will appear here once processing completes.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-emerald-400"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className="text-emerald-400">Scraping in progress...</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      Add Business Lead Targets to start finding verified local business contacts.
                    </p>
                    <a
                      href="/dashboard/businesses"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
                    >
                      <Target className="w-4 h-4" />
                      Add Targets
                    </a>
                  </>
                )}
              </div>
            ) : (
              /* Reddit Empty State */
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Live Animation */}
                <LiveResearchAnimation 
                  businessId={selectedBusiness?.id}
                  keywords={selectedBusiness?.keywords || []} 
                  isActive={stats?.pendingCount ? stats.pendingCount > 0 : true}
                />
                
                {/* Status Card */}
                <div className="glass-card p-8 flex flex-col items-center justify-center text-center">
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Search className="w-8 h-8 text-emerald-400" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white mb-2">Research in Progress</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Your AI agent is scanning Reddit for relevant conversations about your business.
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-emerald-400"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-emerald-400">Results will appear as they&apos;re discovered</span>
                  </div>
                  {stats?.pendingCount && stats.pendingCount > 0 && (
                    <div className="mt-4 px-4 py-2 bg-slate-800/50 rounded-lg">
                      <span className="text-gray-400 text-sm">
                        <span className="text-white font-medium">{stats.pendingCount}</span> results queued for reveal
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => {
                const data = result.result_data;
                
                // GMB Lead Card
                if (platform === 'gmb') {
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="glass-card p-5 hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Business Icon */}
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-emerald-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-semibold text-lg">
                                {data.company_name || 'Unknown Business'}
                              </h3>
                              
                              {/* Industry & Location */}
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                {data.industry && (
                                  <>
                                    <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{data.industry}</span>
                                  </>
                                )}
                                {(data.city || data.state) && (
                                  <>
                                    <span className="text-gray-600">•</span>
                                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                    <span>
                                      {[data.city, data.state].filter(Boolean).join(', ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Verified Badge */}
                            <div className="flex-shrink-0">
                              <span className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                ✓ Verified
                              </span>
                            </div>
                          </div>

                          {/* Contact Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            {/* Email */}
                            {data.email && (
                              <a
                                href={`mailto:${data.email}`}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors group"
                              >
                                <Mail className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-gray-300 group-hover:text-white truncate">
                                  {data.email}
                                </span>
                              </a>
                            )}

                            {/* Phone */}
                            {data.phone && (
                              <a
                                href={`tel:${data.phone}`}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors group"
                              >
                                <Phone className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-gray-300 group-hover:text-white">
                                  {data.phone}
                                </span>
                              </a>
                            )}

                            {/* Website */}
                            {data.website && (
                              <a
                                href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors group"
                              >
                                <Globe className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-gray-300 group-hover:text-white truncate">
                                  {data.website.replace(/^https?:\/\//, '')}
                                </span>
                                <ExternalLink className="w-3 h-3 text-gray-500 ml-auto" />
                              </a>
                            )}

                            {/* Address */}
                            {data.address && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50">
                                <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
                                <span className="text-sm text-gray-400 truncate">
                                  {data.address}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                
                // Reddit Post/Comment Card (existing logic)
                const isComment = data.dataType === 'comment' || !!data.body;
                const threadTitle = data.title || data.searchTerm || result.title;
                const commentBody = data.body?.slice(0, 200) + (data.body && data.body.length > 200 ? '...' : '');
                const displayTitle = isComment ? threadTitle : (result.title || data.title || 'Untitled');
                const subreddit = data.parsedCommunityName || data.subredditName || data.subreddit || 'unknown';
                const author = data.authorName || data.author || 'unknown';
                const score = data.commentUpVotes ?? data.score ?? result.score ?? 0;
                const bodyText = isComment ? data.body : data.selftext;
                const redditUrl = result.url || data.url || (data.permalink ? `https://reddit.com${data.permalink}` : null);
                
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-card p-5 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Platform Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isComment ? 'bg-blue-500/20' : 'bg-orange-500/20'
                      }`}>
                        <MessageSquare className={`w-5 h-5 ${isComment ? 'text-blue-400' : 'text-orange-400'}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {isComment && (
                              <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400 mb-2">
                                Thread
                              </span>
                            )}
                            <h3 className="text-white font-medium line-clamp-2">
                              {displayTitle || 'Untitled Thread'}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span className="text-orange-400">
                                r/{subreddit}
                              </span>
                              <span>•</span>
                              <span>u/{author}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(data.commentCreatedAt || data.createdAt || result.created_at)}</span>
                            </div>
                            
                            {/* Comment body - show below title for threads */}
                            {isComment && commentBody && (
                              <p className="text-gray-400 text-sm mt-2 line-clamp-3 border-l-2 border-blue-500/30 pl-3">
                                {commentBody}
                              </p>
                            )}
                          </div>

                          {/* Relevance Score & Upvotes */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {result.relevance_score !== null && (
                              <div 
                                className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                  result.relevance_score >= 0.7 
                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                    : result.relevance_score >= 0.5 
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-slate-600/50 text-gray-400'
                                }`}
                                title="Relevance score for your business"
                              >
                                {Math.round(result.relevance_score * 100)}%
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-gray-400">
                              <ArrowUp className="w-4 h-4" />
                              <span className="font-medium">{score}</span>
                            </div>
                          </div>
                        </div>

                        {/* Snippet - show for posts with selftext */}
                        {!isComment && bodyText && (
                          <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                            {bodyText}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-3">
                          {data.postUrl && (
                            <a
                              href={data.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Thread
                            </a>
                          )}
                          {redditUrl && !data.postUrl && (
                            <a
                              href={redditUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View on Reddit
                            </a>
                          )}
                          {!isComment && (
                            <span className="text-gray-600 text-sm">
                              {data.numComments || 0} comments
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Click outside to close dropdown */}
      {showBusinessDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowBusinessDropdown(false)}
        />
      )}
    </div>
  );
}

