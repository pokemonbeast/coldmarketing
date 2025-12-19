"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  TestTube,
  Play,
  Loader2,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Map,
  Server,
} from "lucide-react";
import type { ApiProvider } from "@/types/database";

interface TestResult {
  success: boolean;
  action: string;
  result?: unknown;
  error?: string;
  timestamp: string;
  itemCount?: number;
  usageUsd?: number;
}

// SMM Panel Actions
const SMM_ACTIONS = [
  {
    id: "services",
    name: "Get Services",
    description: "Fetch all available services from the provider",
    params: [],
  },
  {
    id: "balance",
    name: "Get Balance",
    description: "Check your account balance",
    params: [],
  },
  {
    id: "add_order",
    name: "Add Order (Default)",
    description: "Create a standard order with quantity",
    params: [
      { key: "service", label: "Service ID", type: "number", required: true },
      { key: "link", label: "Target URL", type: "text", required: true },
      { key: "quantity", label: "Quantity", type: "number", required: true },
      { key: "runs", label: "Runs", type: "number", required: false },
      { key: "interval", label: "Interval (minutes)", type: "number", required: false },
    ],
  },
  {
    id: "add_order_comments",
    name: "Add Order (Custom Comments)",
    description: "Create an order with custom comments (e.g., Reddit/YouTube comments)",
    params: [
      { key: "service", label: "Service ID", type: "number", required: true },
      { key: "link", label: "Target URL", type: "text", required: true },
      { key: "comments", label: "Comments (1 per line)", type: "textarea", required: true },
    ],
  },
  {
    id: "order_status",
    name: "Get Order Status",
    description: "Check the status of an order",
    params: [
      { key: "order_id", label: "Order ID", type: "number", required: true },
    ],
  },
  {
    id: "multi_order_status",
    name: "Get Multiple Order Status",
    description: "Check status of multiple orders",
    params: [
      {
        key: "order_ids",
        label: "Order IDs (comma-separated)",
        type: "text",
        required: true,
      },
    ],
  },
  {
    id: "refill",
    name: "Create Refill",
    description: "Request a refill for an order",
    params: [
      { key: "order_id", label: "Order ID", type: "number", required: true },
    ],
  },
  {
    id: "refill_status",
    name: "Get Refill Status",
    description: "Check the status of a refill",
    params: [
      { key: "refill_id", label: "Refill ID", type: "number", required: true },
    ],
  },
  {
    id: "cancel",
    name: "Cancel Orders",
    description: "Cancel one or more orders",
    params: [
      {
        key: "order_ids",
        label: "Order IDs (comma-separated)",
        type: "text",
        required: true,
      },
    ],
  },
];

// Apify Actions
const APIFY_ACTIONS = [
  {
    id: "run_scraper",
    name: "Run Scraper (Wait for Results)",
    description: "Run the configured scraper and wait for results",
    params: [
      { key: "input_override", label: "Input Override (JSON)", type: "json", required: false },
    ],
  },
  {
    id: "run_scraper_async",
    name: "Start Scraper (Async)",
    description: "Start the scraper without waiting for results",
    params: [
      { key: "input_override", label: "Input Override (JSON)", type: "json", required: false },
    ],
  },
  {
    id: "check_run_status",
    name: "Check Run Status",
    description: "Check the status of a running scraper",
    params: [
      { key: "runId", label: "Run ID", type: "text", required: true },
    ],
  },
];

export default function AdminTestingPage() {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("services");
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchProviders = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("api_providers")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (data) {
      setProviders(data as unknown as ApiProvider[]);
      if (data.length > 0) {
        setSelectedProvider(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Determine if selected provider is Apify
  const selectedProviderData = providers.find((p) => p.id === selectedProvider);
  const isApifyProvider = selectedProviderData?.provider_type === "apify";
  
  // Get available actions based on provider type
  const API_ACTIONS = isApifyProvider ? APIFY_ACTIONS : SMM_ACTIONS;
  const currentAction = API_ACTIONS.find((a) => a.id === selectedAction);

  // Reset action when provider changes
  useEffect(() => {
    if (selectedProviderData) {
      const defaultAction = selectedProviderData.provider_type === "apify" ? "run_scraper" : "services";
      setSelectedAction(defaultAction);
      setParams({});
      setResult(null);
    }
  }, [selectedProvider, selectedProviderData?.provider_type]);

  const handleTest = async () => {
    if (!selectedProvider || !selectedAction) return;

    setTesting(true);
    setResult(null);

    try {
      // Handle Apify actions differently
      if (isApifyProvider) {
        await handleApifyAction();
        return;
      }

      // Process params for SMM panel
      const processedParams: Record<string, unknown> = {};
      currentAction?.params.forEach((param) => {
        const value = params[param.key];
        if (value) {
          if (param.key.includes("ids") && param.type === "text") {
            // Convert comma-separated to array
            processedParams[param.key] = value
              .split(",")
              .map((id) => parseInt(id.trim()))
              .filter((n) => !isNaN(n));
          } else if (param.type === "number") {
            processedParams[param.key] = parseInt(value);
          } else if (param.type === "textarea") {
            // Keep textarea content as-is (e.g., comments with newlines)
            processedParams[param.key] = value;
          } else {
            processedParams[param.key] = value;
          }
        }
      });

      // For order actions, use the orders API to save to database
      if (selectedAction === "add_order" || selectedAction === "add_order_comments") {
        const response = await fetch("/api/admin/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            providerId: selectedProvider,
            service: processedParams.service,
            link: processedParams.link,
            quantity: processedParams.quantity,
            comments: processedParams.comments,
            serviceName: `Service ${processedParams.service}`,
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data.success ? {
            order: data.external_order_id,
            saved_to_database: true,
            internal_id: data.order?.id,
          } : undefined,
          error: data.error,
          timestamp: new Date().toISOString(),
        });
      } else {
        // For non-order actions, use the test API directly
        const response = await fetch("/api/admin/test-api", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            providerId: selectedProvider,
            action: selectedAction,
            params: processedParams,
          }),
        });

        const data = await response.json();
        setResult(data);
      }
    } catch (error) {
      setResult({
        success: false,
        action: selectedAction,
        error: error instanceof Error ? error.message : "Request failed",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleApifyAction = async () => {
    try {
      if (selectedAction === "check_run_status") {
        // Check run status
        const runId = params.runId;
        if (!runId) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Run ID is required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch(
          `/api/admin/apify/run?providerId=${selectedProvider}&runId=${runId}`,
          { method: "GET" }
        );
        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data,
          error: data.error,
          timestamp: new Date().toISOString(),
          itemCount: data.itemCount,
          usageUsd: data.usageUsd,
        });
      } else {
        // Run scraper
        let inputOverride = {};
        if (params.input_override) {
          try {
            inputOverride = JSON.parse(params.input_override);
          } catch {
            setResult({
              success: false,
              action: selectedAction,
              error: "Invalid JSON in input override",
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }

        const response = await fetch("/api/admin/apify/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId: selectedProvider,
            input: inputOverride,
            waitForFinish: selectedAction === "run_scraper",
            saveResults: true,
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data.success ? {
            runId: data.runId,
            datasetId: data.datasetId,
            status: data.status,
            itemCount: data.itemCount,
            usageUsd: data.usageUsd,
            items: data.items?.slice(0, 5), // Show only first 5 items in preview
            totalItems: data.items?.length,
          } : undefined,
          error: data.error,
          timestamp: new Date().toISOString(),
          itemCount: data.itemCount,
          usageUsd: data.usageUsd,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        action: selectedAction,
        error: error instanceof Error ? error.message : "Request failed",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <TestTube className="w-5 h-5 text-cyan-400" />
            </div>
            API Testing
          </h1>
          <p className="text-gray-400 mt-1">
            Test API endpoints and view responses
          </p>
        </div>
        <button
          onClick={fetchProviders}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Providers
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : providers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-medium mb-2">No Active Providers</p>
          <p className="text-gray-400">
            Please configure and activate at least one API provider to test.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Request Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 space-y-5"
          >
            <h2 className="text-lg font-bold text-white">Request</h2>

            {/* Provider selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                API Provider
              </label>
              <div className="relative">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              </div>
              {selectedProviderData && (
                <div className="flex items-center gap-2 text-xs">
                  {selectedProviderData.provider_type === "apify" ? (
                    <>
                      <Map className="w-3 h-3 text-orange-400" />
                      <span className="text-orange-400">Apify Scraper</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 font-mono">
                        {(() => {
                          const config = selectedProviderData.config as Record<string, unknown> | null;
                          const actorId = config?.actor_id;
                          return actorId ? String(actorId) : "No actor";
                        })()}
                      </span>
                    </>
                  ) : (
                    <>
                      <Server className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-400">SMM Panel</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 truncate">{selectedProviderData.api_url}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                API Action
              </label>
              <div className="relative">
                <select
                  value={selectedAction}
                  onChange={(e) => {
                    setSelectedAction(e.target.value);
                    setParams({});
                    setResult(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
                >
                  {API_ACTIONS.map((action) => (
                    <option key={action.id} value={action.id}>
                      {action.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              </div>
              {currentAction && (
                <p className="text-gray-500 text-xs">
                  {currentAction.description}
                </p>
              )}
            </div>

            {/* Dynamic parameters */}
            {currentAction?.params && currentAction.params.length > 0 && (
              <div className="space-y-4 pt-2">
                <p className="text-sm font-medium text-gray-300">Parameters</p>
                {currentAction.params.map((param) => (
                  <div key={param.key} className="space-y-2">
                    <label className="text-sm text-gray-400 flex items-center gap-2">
                      {param.label}
                      {param.required && (
                        <span className="text-red-400 text-xs">*</span>
                      )}
                    </label>
                    {param.type === "textarea" || param.type === "json" ? (
                      <textarea
                        value={params[param.key] || ""}
                        onChange={(e) =>
                          setParams({ ...params, [param.key]: e.target.value })
                        }
                        placeholder={param.type === "json" 
                          ? '{"searchStringsArray": ["pizza"], "locationQuery": "Los Angeles, USA"}'
                          : `Enter ${param.label.toLowerCase()}`
                        }
                        rows={param.type === "json" ? 8 : 6}
                        className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none font-mono text-sm"
                      />
                    ) : (
                      <input
                        type={param.type}
                        value={params[param.key] || ""}
                        onChange={(e) =>
                          setParams({ ...params, [param.key]: e.target.value })
                        }
                        placeholder={`Enter ${param.label.toLowerCase()}`}
                        className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Show default config for Apify providers */}
            {isApifyProvider && selectedAction === "run_scraper" && selectedProviderData && (
              <div className="p-4 bg-slate-800/50 rounded-xl space-y-2">
                <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Map className="w-4 h-4 text-orange-400" />
                  Default Configuration
                </p>
                <pre className="text-xs text-gray-500 overflow-x-auto max-h-32 overflow-y-auto">
                  {JSON.stringify((selectedProviderData.config as Record<string, unknown>)?.default_input || {}, null, 2)}
                </pre>
                <p className="text-xs text-gray-600">
                  Use Input Override to modify these values for this run only.
                </p>
              </div>
            )}

            {/* Test button */}
            <motion.button
              onClick={handleTest}
              disabled={testing || !selectedProvider}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl btn-primary text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Send Request
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Response Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Response</h2>
              {result && (
                <button
                  onClick={copyResult}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 transition-colors text-sm"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>

            {!result ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <TestTube className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-400">
                  Select an action and click &quot;Send Request&quot; to test
                  the API
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status indicator */}
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Success</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Error</span>
                    </div>
                  )}
                  <span className="text-gray-500 text-sm">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Response content */}
                <div className="relative">
                  <pre className="p-4 rounded-xl bg-slate-900 border border-slate-700 overflow-x-auto text-sm max-h-96">
                    <code className="text-gray-300">
                      {JSON.stringify(
                        result.error || result.result,
                        null,
                        2
                      )}
                    </code>
                  </pre>
                </div>

                {/* Additional info for services */}
                {result.success &&
                  result.action === "services" &&
                  Array.isArray(result.result) && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-blue-400 text-sm font-medium mb-2">
                        Found {result.result.length} services
                      </p>
                      <p className="text-gray-400 text-xs">
                        Use the service IDs above when creating orders or
                        mapping services.
                      </p>
                    </div>
                  )}

                {/* Balance info */}
                {result.success &&
                  result.action === "balance" &&
                  typeof result.result === "object" &&
                  result.result !== null &&
                  "balance" in result.result && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <p className="text-green-400 text-sm font-medium">
                        Current Balance: $
                        {parseFloat(
                          (result.result as { balance: string }).balance
                        ).toFixed(2)}{" "}
                        {(result.result as { currency?: string }).currency}
                      </p>
                    </div>
                  )}

                {/* Apify scrape results */}
                {result.success && result.itemCount !== undefined && (
                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-orange-400 text-sm font-medium flex items-center gap-2">
                        <Map className="w-4 h-4" />
                        Scraped {result.itemCount} places
                      </p>
                      {result.usageUsd !== undefined && (
                        <span className="text-gray-400 text-xs">
                          Cost: ${result.usageUsd?.toFixed(4) || "0.0000"}
                        </span>
                      )}
                    </div>
                    {typeof result.result === "object" && result.result !== null && "runId" in result.result && (
                      <p className="text-gray-500 text-xs font-mono">
                        Run ID: {(result.result as { runId: string }).runId}
                      </p>
                    )}
                    {typeof result.result === "object" && result.result !== null && "totalItems" in result.result && (result.result as { totalItems?: number }).totalItems! > 5 && (
                      <p className="text-gray-400 text-xs">
                        Showing first 5 of {(result.result as { totalItems: number }).totalItems} results. Full data saved to database.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

