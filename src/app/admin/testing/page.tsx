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
  MessageSquare,
  User,
  Twitter,
  Bot,
  Wifi,
  MessagesSquare,
} from "lucide-react";
import type { ApiProvider } from "@/types/database";

interface RedditAccountForTesting {
  id: string;
  username: string;
  is_active: boolean;
  failure_count: number;
  last_used_at: string | null;
  proxy_masked: string;
  proxy: string;
}

interface TwitterAccountForTesting {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  failure_count: number;
  last_used_at: string | null;
  proxy_masked: string;
  proxy: string;
  has_cached_cookie: boolean;
  login_cookie_updated_at: string | null;
}

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

// Reddit Scraper Actions (for harshmaur/reddit-scraper-pro)
const REDDIT_SCRAPER_ACTIONS = [
  {
    id: "run_reddit_scraper",
    name: "Run Reddit Scraper",
    description: "Search Reddit posts with custom search terms",
    params: [
      { key: "searchTerms", label: "Search Terms (comma-separated)", type: "text", required: true },
      { key: "searchSort", label: "Sort By", type: "select", required: false, options: [
        { value: "relevance", label: "Relevance" },
        { value: "hot", label: "Hot" },
        { value: "top", label: "Top" },
        { value: "new", label: "New" },
        { value: "comments", label: "Most Comments" },
      ]},
      { key: "searchTime", label: "Time Range", type: "select", required: false, options: [
        { value: "hour", label: "Past Hour" },
        { value: "day", label: "Past 24 Hours" },
        { value: "week", label: "Past Week" },
        { value: "month", label: "Past Month" },
        { value: "year", label: "Past Year" },
        { value: "all", label: "All Time" },
      ]},
      { key: "maxPostsCount", label: "Max Posts", type: "number", required: false },
      { key: "searchPosts", label: "Search Posts", type: "checkbox", required: false },
      { key: "searchComments", label: "Search Comments", type: "checkbox", required: false },
      { key: "searchCommunities", label: "Search Communities", type: "checkbox", required: false },
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

// Reddapi Actions (multi-step flow)
const REDDAPI_ACTIONS = [
  {
    id: "login",
    name: "Test Login",
    description: "Test login with a Reddit account (saves token_v2 for next step)",
    params: [],
    requiresAccount: true,
  },
  {
    id: "comment",
    name: "Test Comment (requires login first)",
    description: "Post a comment using token_v2 (bearer) from login step",
    params: [
      { key: "text", label: "Comment Text", type: "textarea", required: true },
      { key: "post_url", label: "Reddit Post URL", type: "text", required: true },
    ],
    requiresToken: true,
  },
  {
    id: "full_flow",
    name: "Full Flow (Login + Comment)",
    description: "Complete flow: login to account and post comment in one step",
    params: [
      { key: "text", label: "Comment Text", type: "textarea", required: true },
      { key: "post_url", label: "Reddit Post URL", type: "text", required: true },
    ],
    requiresAccount: true,
  },
];

// TwitterAPI Actions (multi-step flow)
const TWITTERAPI_ACTIONS = [
  {
    id: "login",
    name: "Test Login",
    description: "Test login with a Twitter account (caches login_cookie for next steps)",
    params: [],
    requiresAccount: true,
  },
  {
    id: "tweet",
    name: "Test Tweet (requires login first)",
    description: "Post a tweet using login_cookie from login step",
    params: [
      { key: "tweet_text", label: "Tweet Text", type: "textarea", required: true },
      { key: "reply_to_tweet_id", label: "Reply to Tweet ID (optional)", type: "text", required: false },
    ],
    requiresLoginCookie: true,
  },
  {
    id: "dm",
    name: "Test DM (requires login first)",
    description: "Send a DM using login_cookie from login step",
    params: [
      { key: "user_id", label: "Target User ID", type: "text", required: true },
      { key: "text", label: "Message Text", type: "textarea", required: true },
    ],
    requiresLoginCookie: true,
  },
  {
    id: "tweet_flow",
    name: "Full Flow (Login + Tweet)",
    description: "Complete flow: login and post tweet in one step",
    params: [
      { key: "tweet_text", label: "Tweet Text", type: "textarea", required: true },
      { key: "reply_to_tweet_id", label: "Reply to Tweet ID (optional)", type: "text", required: false },
    ],
    requiresAccount: true,
  },
  {
    id: "dm_flow",
    name: "Full Flow (Login + DM)",
    description: "Complete flow: login and send DM in one step",
    params: [
      { key: "user_id", label: "Target User ID", type: "text", required: true },
      { key: "text", label: "Message Text", type: "textarea", required: true },
    ],
    requiresAccount: true,
  },
];

// Stagehand Actions (Reddit automation via Browserbase)
const STAGEHAND_ACTIONS = [
  {
    id: "login",
    name: "Test Login",
    description: "Login to Reddit account using Stagehand (saves session for next steps)",
    params: [],
    requiresAccount: true,
  },
  {
    id: "comment",
    name: "Post Comment (requires login first)",
    description: "Post a comment on a Reddit thread using Stagehand automation",
    params: [
      { key: "text", label: "Comment Text", type: "textarea", required: true },
      { key: "post_url", label: "Reddit Post URL", type: "text", required: true },
    ],
    requiresAccount: true,
  },
  {
    id: "create_post",
    name: "Create Post (requires login first)",
    description: "Create a new post in a subreddit using Stagehand automation",
    params: [
      { key: "subreddit", label: "Subreddit (without r/)", type: "text", required: true },
      { key: "title", label: "Post Title", type: "text", required: true },
      { key: "body", label: "Post Body", type: "textarea", required: true },
    ],
    requiresAccount: true,
  },
  {
    id: "full_flow_comment",
    name: "Full Flow (Login + Comment)",
    description: "Complete flow: login and post comment in one step",
    params: [
      { key: "text", label: "Comment Text", type: "textarea", required: true },
      { key: "post_url", label: "Reddit Post URL", type: "text", required: true },
    ],
    requiresAccount: true,
  },
  {
    id: "full_flow_post",
    name: "Full Flow (Login + Create Post)",
    description: "Complete flow: login and create post in one step",
    params: [
      { key: "subreddit", label: "Subreddit (without r/)", type: "text", required: true },
      { key: "title", label: "Post Title", type: "text", required: true },
      { key: "body", label: "Post Body", type: "textarea", required: true },
    ],
    requiresAccount: true,
  },
];

// CrowdReply Actions (Reddit comment service)
// Documentation: https://documenter.getpostman.com/view/5613076/2sB2qi9xwq
const CROWDREPLY_ACTIONS = [
  {
    id: "create_comment",
    name: "Create Comment Task",
    description: "Create a Reddit comment task via CrowdReply API",
    params: [
      { key: "content", label: "Comment Content", type: "textarea", required: true },
      { key: "threadUrl", label: "Reddit Post URL", type: "text", required: true },
      { key: "project", label: "Project ID (optional if set in config)", type: "text", required: false },
      { key: "scheduleAt", label: "Schedule At (YYYY-MM-DDTHH:MM:SS)", type: "text", required: false },
      { key: "shouldAssignOP", label: "Assign to OP", type: "checkbox", required: false },
    ],
  },
  {
    id: "get_projects",
    name: "Get Projects",
    description: "Fetch all projects from CrowdReply to get project IDs",
    params: [],
  },
  {
    id: "get_balance",
    name: "Get Balance",
    description: "Check remaining balance on CrowdReply account",
    params: [],
  },
  {
    id: "get_task",
    name: "Get Task Status",
    description: "Check the status of a specific task",
    params: [
      { key: "taskId", label: "Task ID", type: "text", required: true },
    ],
  },
  {
    id: "get_tasks",
    name: "Get All Tasks",
    description: "Fetch all tasks from CrowdReply",
    params: [],
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
  
  // Reddapi-specific state
  const [redditAccounts, setRedditAccounts] = useState<RedditAccountForTesting[]>([]);
  const [selectedRedditAccount, setSelectedRedditAccount] = useState<string>("");
  const [redditToken, setRedditToken] = useState<string>("");  // token_v2 used as bearer
  const [lastLoginProxy, setLastLoginProxy] = useState<string>("");
  
  // TwitterAPI-specific state
  const [twitterAccounts, setTwitterAccounts] = useState<TwitterAccountForTesting[]>([]);
  const [selectedTwitterAccount, setSelectedTwitterAccount] = useState<string>("");
  const [loginCookie, setLoginCookie] = useState<string>("");
  const [lastTwitterProxy, setLastTwitterProxy] = useState<string>("");
  
  // Stagehand proxy mode state
  const [proxyMode, setProxyMode] = useState<"browserbase" | "custom" | "none">("browserbase");

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

  const fetchRedditAccounts = async () => {
    try {
      const response = await fetch("/api/admin/test-reddapi");
      const data = await response.json();
      if (data.success && data.accounts) {
        setRedditAccounts(data.accounts);
        if (data.accounts.length > 0) {
          setSelectedRedditAccount(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch Reddit accounts:", error);
    }
  };
  
  const fetchTwitterAccounts = async () => {
    try {
      const response = await fetch("/api/admin/test-twitterapi");
      const data = await response.json();
      if (data.success && data.accounts) {
        setTwitterAccounts(data.accounts);
        if (data.accounts.length > 0) {
          setSelectedTwitterAccount(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch Twitter accounts:", error);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // Determine provider type
  const selectedProviderData = providers.find((p) => p.id === selectedProvider);
  const isApifyProvider = selectedProviderData?.provider_type === "apify";
  const isReddapiProvider = selectedProviderData?.provider_type === "reddapi";
  const isTwitterapiProvider = selectedProviderData?.provider_type === "twitterapi";
  const isStagehandProvider = selectedProviderData?.provider_type === "stagehand_reddit";
  const isCrowdreplyProvider = selectedProviderData?.provider_type === "crowdreply";
  
  // Check if it's a Reddit scraper (Apify with reddit-scraper actor)
  const providerConfig = selectedProviderData?.config as Record<string, unknown> | null;
  const actorId = providerConfig?.actor_id as string | undefined;
  const isRedditScraperProvider = isApifyProvider && actorId?.includes("reddit-scraper");
  
  // Get available actions based on provider type
  const API_ACTIONS = isRedditScraperProvider
    ? REDDIT_SCRAPER_ACTIONS
    : isApifyProvider 
    ? APIFY_ACTIONS 
    : isReddapiProvider 
    ? REDDAPI_ACTIONS 
    : isTwitterapiProvider
    ? TWITTERAPI_ACTIONS
    : isStagehandProvider
    ? STAGEHAND_ACTIONS
    : isCrowdreplyProvider
    ? CROWDREPLY_ACTIONS
    : SMM_ACTIONS;
  const currentAction = API_ACTIONS.find((a) => a.id === selectedAction);

  // Reset action when provider changes
  useEffect(() => {
    if (selectedProviderData) {
      // Check if it's a Reddit scraper
      const config = selectedProviderData.config as Record<string, unknown> | null;
      const actor = config?.actor_id as string | undefined;
      const isRedditScraper = selectedProviderData.provider_type === "apify" && actor?.includes("reddit-scraper");
      
      const defaultAction = isRedditScraper
        ? "run_reddit_scraper"
        : selectedProviderData.provider_type === "apify" 
        ? "run_scraper" 
        : selectedProviderData.provider_type === "reddapi"
        ? "login"
        : selectedProviderData.provider_type === "twitterapi"
        ? "login"
        : selectedProviderData.provider_type === "stagehand_reddit"
        ? "login"
        : selectedProviderData.provider_type === "crowdreply"
        ? "create_comment"
        : "services";
      setSelectedAction(defaultAction);
      setParams({});
      setResult(null);
      setRedditToken("");
      setLastLoginProxy("");
      setLoginCookie("");
      setLastTwitterProxy("");
      setProxyMode("browserbase"); // Reset proxy mode to default
      
      // Fetch Reddit accounts when reddapi or stagehand provider is selected
      if (selectedProviderData.provider_type === "reddapi" || selectedProviderData.provider_type === "stagehand_reddit") {
        fetchRedditAccounts();
      }
      
      // Fetch Twitter accounts when twitterapi provider is selected
      if (selectedProviderData.provider_type === "twitterapi") {
        fetchTwitterAccounts();
      }
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

      // Handle Reddapi actions differently
      if (isReddapiProvider) {
        await handleReddapiAction();
        return;
      }
      
      // Handle TwitterAPI actions differently
      if (isTwitterapiProvider) {
        await handleTwitterapiAction();
        return;
      }

      // Handle Stagehand actions differently
      if (isStagehandProvider) {
        await handleStagehandAction();
        return;
      }

      // Handle CrowdReply actions differently
      if (isCrowdreplyProvider) {
        await handleCrowdreplyAction();
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
      } else if (selectedAction === "run_reddit_scraper") {
        // Reddit scraper with user-friendly fields
        if (!params.searchTerms) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Search terms are required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Build input from form fields
        const inputOverride: Record<string, unknown> = {
          searchTerms: params.searchTerms.split(",").map((t: string) => t.trim()).filter(Boolean),
        };
        
        if (params.searchSort) inputOverride.searchSort = params.searchSort;
        if (params.searchTime) inputOverride.searchTime = params.searchTime;
        if (params.maxPostsCount) inputOverride.maxPostsCount = parseInt(params.maxPostsCount);
        if (params.searchPosts === "true") inputOverride.searchPosts = true;
        if (params.searchPosts === "false") inputOverride.searchPosts = false;
        if (params.searchComments === "true") inputOverride.searchComments = true;
        if (params.searchComments === "false") inputOverride.searchComments = false;
        if (params.searchCommunities === "true") inputOverride.searchCommunities = true;
        if (params.searchCommunities === "false") inputOverride.searchCommunities = false;

        const response = await fetch("/api/admin/apify/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId: selectedProvider,
            input: inputOverride,
            waitForFinish: false, // Reddit scraper can take a while, run async
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
            inputUsed: inputOverride,
            items: data.items?.slice(0, 5),
            totalItems: data.items?.length,
            hint: data.status === "RUNNING" ? "Scraper is running! Use 'Check Run Status' to monitor progress." : undefined,
          } : undefined,
          error: data.error,
          timestamp: new Date().toISOString(),
          itemCount: data.itemCount,
          usageUsd: data.usageUsd,
        });
      } else {
        // Run scraper (generic)
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

  const handleReddapiAction = async () => {
    try {
      const selectedAccountData = redditAccounts.find(a => a.id === selectedRedditAccount);
      
      if (selectedAction === "login") {
        // Test login
        if (!selectedRedditAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Reddit account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/admin/test-reddapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "login",
            accountId: selectedRedditAccount,
            providerId: selectedProvider,
          }),
        });

        const data = await response.json();
        
        // Store token_v2 for next step if successful
        if (data.success && data.result?.token_v2) {
          setRedditToken(data.result.token_v2);
          setLastLoginProxy(selectedAccountData?.proxy || "");
        }

        setResult({
          success: data.success,
          action: selectedAction,
          result: data.success ? {
            ...data.result,
            hint: "Token saved! You can now test commenting.",
          } : data.result,
          error: data.error,
          timestamp: new Date().toISOString(),
        });
      } else if (selectedAction === "comment") {
        // Test comment with stored token_v2 as bearer
        if (!redditToken || !lastLoginProxy) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please run a successful login test first to get token_v2",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.text || !params.post_url) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Comment text and post URL are required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/admin/test-reddapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "comment",
            providerId: selectedProvider,
            params: {
              text: params.text,
              post_url: params.post_url,
              bearer: redditToken,  // Use token_v2 as bearer
              proxy: lastLoginProxy,
            },
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data.result,
          error: data.error,
          timestamp: new Date().toISOString(),
        });
      } else if (selectedAction === "full_flow") {
        // Full flow: login + comment
        if (!selectedRedditAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Reddit account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.text || !params.post_url) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Comment text and post URL are required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/admin/test-reddapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "full_flow",
            accountId: selectedRedditAccount,
            providerId: selectedProvider,
            params: {
              text: params.text,
              post_url: params.post_url,
            },
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: {
            steps: data.steps,
            finalResult: data.result,
          },
          error: data.error,
          timestamp: new Date().toISOString(),
        });

        // Refresh accounts to see updated failure counts
        fetchRedditAccounts();
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
  
  const handleTwitterapiAction = async () => {
    try {
      const selectedAccountData = twitterAccounts.find(a => a.id === selectedTwitterAccount);
      
      if (selectedAction === "login") {
        // Test login
        if (!selectedTwitterAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Twitter account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/admin/test-twitterapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "login",
            accountId: selectedTwitterAccount,
            providerId: selectedProvider,
          }),
        });

        const data = await response.json();
        
        // Store login cookie for next step if successful
        if (data.success && data.result?.login_cookie) {
          setLoginCookie(data.result.login_cookie);
          setLastTwitterProxy(selectedAccountData?.proxy || "");
        }

        setResult({
          success: data.success,
          action: selectedAction,
          result: data.success ? {
            ...data.result,
            hint: "Login cookie saved! You can now test tweeting or DMs.",
          } : data.result,
          error: data.error,
          timestamp: new Date().toISOString(),
        });
      } else if (selectedAction === "tweet") {
        // Test tweet with stored login cookie
        if (!loginCookie || !lastTwitterProxy) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please run a successful login test first to get a login cookie",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.tweet_text) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Tweet text is required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/admin/test-twitterapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "tweet",
            providerId: selectedProvider,
            params: {
              tweet_text: params.tweet_text,
              reply_to_tweet_id: params.reply_to_tweet_id || undefined,
              login_cookie: loginCookie,
              proxy: lastTwitterProxy,
            },
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data.result,
          error: data.error,
          timestamp: new Date().toISOString(),
        });
      } else if (selectedAction === "dm") {
        // Test DM with stored login cookie
        if (!loginCookie || !lastTwitterProxy) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please run a successful login test first to get a login cookie",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.user_id || !params.text) {
          setResult({
            success: false,
            action: selectedAction,
            error: "User ID and message text are required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/admin/test-twitterapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "dm",
            providerId: selectedProvider,
            params: {
              user_id: params.user_id,
              text: params.text,
              login_cookie: loginCookie,
              proxy: lastTwitterProxy,
            },
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data.result,
          error: data.error,
          timestamp: new Date().toISOString(),
        });
      } else if (selectedAction === "tweet_flow") {
        // Full flow: login + tweet
        if (!selectedTwitterAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Twitter account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.tweet_text) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Tweet text is required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/admin/test-twitterapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "tweet_flow",
            accountId: selectedTwitterAccount,
            providerId: selectedProvider,
            params: {
              tweet_text: params.tweet_text,
              reply_to_tweet_id: params.reply_to_tweet_id || undefined,
            },
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: {
            steps: data.steps,
            finalResult: data.result,
          },
          error: data.error,
          timestamp: new Date().toISOString(),
        });

        // Refresh accounts to see updated failure counts
        fetchTwitterAccounts();
      } else if (selectedAction === "dm_flow") {
        // Full flow: login + DM
        if (!selectedTwitterAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Twitter account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.user_id || !params.text) {
          setResult({
            success: false,
            action: selectedAction,
            error: "User ID and message text are required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/admin/test-twitterapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "dm_flow",
            accountId: selectedTwitterAccount,
            providerId: selectedProvider,
            params: {
              user_id: params.user_id,
              text: params.text,
            },
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: {
            steps: data.steps,
            finalResult: data.result,
          },
          error: data.error,
          timestamp: new Date().toISOString(),
        });

        // Refresh accounts to see updated failure counts
        fetchTwitterAccounts();
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

  const handleStagehandAction = async () => {
    try {
      const selectedAccountData = redditAccounts.find(a => a.id === selectedRedditAccount);
      
      if (selectedAction === "login") {
        // Test login - we'll use a simple comment endpoint but with a test URL
        // The actual login happens inside the endpoint
        if (!selectedRedditAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Reddit account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Use comment endpoint which will login first
        // We'll use a test post URL that won't actually post (or use a real test post)
        const response = await fetch("/api/stagehand/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "Test login comment",
            post_url: "https://www.reddit.com/r/test/comments/test/", // Test URL
            account_id: selectedRedditAccount,
            provider_id: selectedProvider,
            proxy_mode: proxyMode,
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: {
            message: data.success ? "Login successful - cookies saved" : "Login failed",
            account_used: data.account_used,
            elapsed_ms: data.elapsed_ms,
            error: data.error,
            session: data.session, // Include session info for live view links
          },
          error: data.error,
          timestamp: new Date().toISOString(),
        });

        // Refresh accounts to see updated failure counts and cookies
        fetchRedditAccounts();
      } else if (selectedAction === "comment") {
        // Post comment (requires login first)
        if (!selectedRedditAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Reddit account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.text || !params.post_url) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Comment text and post URL are required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/stagehand/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: params.text,
            post_url: params.post_url,
            account_id: selectedRedditAccount,
            provider_id: selectedProvider,
            proxy_mode: proxyMode,
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data,
          error: data.error,
          timestamp: new Date().toISOString(),
        });

        // Refresh accounts to see updated failure counts
        fetchRedditAccounts();
      } else if (selectedAction === "create_post") {
        // Create post (requires login first)
        if (!selectedRedditAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Reddit account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.subreddit || !params.title || !params.body) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Subreddit, title, and body are required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/stagehand/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subreddit: params.subreddit,
            title: params.title,
            body: params.body,
            account_id: selectedRedditAccount,
            provider_id: selectedProvider,
            proxy_mode: proxyMode,
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data,
          error: data.error,
          timestamp: new Date().toISOString(),
        });

        // Refresh accounts to see updated failure counts
        fetchRedditAccounts();
      } else if (selectedAction === "full_flow_comment") {
        // Full flow: login + comment
        if (!selectedRedditAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Reddit account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.text || !params.post_url) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Comment text and post URL are required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/stagehand/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: params.text,
            post_url: params.post_url,
            account_id: selectedRedditAccount,
            provider_id: selectedProvider,
            proxy_mode: proxyMode,
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data,
          error: data.error,
          timestamp: new Date().toISOString(),
        });

        // Refresh accounts to see updated failure counts
        fetchRedditAccounts();
      } else if (selectedAction === "full_flow_post") {
        // Full flow: login + create post
        if (!selectedRedditAccount) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Please select a Reddit account",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!params.subreddit || !params.title || !params.body) {
          setResult({
            success: false,
            action: selectedAction,
            error: "Subreddit, title, and body are required",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const response = await fetch("/api/stagehand/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subreddit: params.subreddit,
            title: params.title,
            body: params.body,
            account_id: selectedRedditAccount,
            provider_id: selectedProvider,
            proxy_mode: proxyMode,
          }),
        });

        const data = await response.json();
        setResult({
          success: data.success,
          action: selectedAction,
          result: data,
          error: data.error,
          timestamp: new Date().toISOString(),
        });

        // Refresh accounts to see updated failure counts
        fetchRedditAccounts();
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

  const handleCrowdreplyAction = async () => {
    try {
      // Build params object
      const requestParams: Record<string, unknown> = {};
      
      // Map form params to API params
      if (params.content) requestParams.content = params.content;
      if (params.threadUrl) requestParams.threadUrl = params.threadUrl;
      if (params.project) requestParams.project = params.project;
      if (params.scheduleAt) requestParams.scheduleAt = params.scheduleAt;
      if (params.shouldAssignOP === "true") requestParams.shouldAssignOP = true;
      if (params.taskId) requestParams.taskId = params.taskId;

      const response = await fetch("/api/admin/test-crowdreply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          providerId: selectedProvider,
          params: requestParams,
        }),
      });

      const data = await response.json();
      setResult({
        success: data.success,
        action: selectedAction,
        result: data.success ? {
          ...data.result,
          request_sent: data.request_sent,
        } : data.result,
        error: data.error,
        timestamp: data.timestamp || new Date().toISOString(),
      });
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
                  {isRedditScraperProvider ? (
                    <>
                      <MessageSquare className="w-3 h-3 text-orange-400" />
                      <span className="text-orange-400">Reddit Scraper</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 font-mono truncate">
                        {actorId}
                      </span>
                    </>
                  ) : selectedProviderData.provider_type === "apify" ? (
                    <>
                      <Map className="w-3 h-3 text-orange-400" />
                      <span className="text-orange-400">Apify Scraper</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 font-mono">
                        {(() => {
                          const config = selectedProviderData.config as Record<string, unknown> | null;
                          const actId = config?.actor_id;
                          return actId ? String(actId) : "No actor";
                        })()}
                      </span>
                    </>
                  ) : selectedProviderData.provider_type === "reddapi" ? (
                    <>
                      <MessageSquare className="w-3 h-3 text-red-400" />
                      <span className="text-red-400">Reddapi (Reddit)</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 truncate">{selectedProviderData.api_url}</span>
                    </>
                  ) : selectedProviderData.provider_type === "twitterapi" ? (
                    <>
                      <Twitter className="w-3 h-3 text-sky-400" />
                      <span className="text-sky-400">TwitterAPI (X)</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 truncate">{selectedProviderData.api_url}</span>
                    </>
                  ) : selectedProviderData.provider_type === "stagehand_reddit" ? (
                    <>
                      <Bot className="w-3 h-3 text-purple-400" />
                      <span className="text-purple-400">Stagehand (Reddit)</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 truncate">{selectedProviderData.api_url}</span>
                    </>
                  ) : selectedProviderData.provider_type === "crowdreply" ? (
                    <>
                      <MessagesSquare className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">CrowdReply (Reddit)</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 truncate">{selectedProviderData.api_url}</span>
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

            {/* Reddit Account selector (for Reddapi and Stagehand) */}
            {((isReddapiProvider && (selectedAction === "login" || selectedAction === "full_flow")) || 
             (isStagehandProvider && (selectedAction === "login" || selectedAction === "comment" || selectedAction === "create_post" || selectedAction === "full_flow_comment" || selectedAction === "full_flow_post"))) && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <User className={`w-4 h-4 ${isStagehandProvider ? "text-purple-400" : "text-red-400"}`} />
                  Reddit Account
                </label>
                <div className="relative">
                  <select
                    value={selectedRedditAccount}
                    onChange={(e) => setSelectedRedditAccount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all appearance-none"
                  >
                    {redditAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.username} {!account.is_active ? "(disabled)" : ""} 
                        {account.failure_count > 0 ? `(${account.failure_count} failures)` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
                {redditAccounts.length === 0 && (
                  <p className="text-amber-400 text-xs">
                    No Reddit accounts found. Add accounts to the reddit_accounts table.
                  </p>
                )}
                {selectedRedditAccount && (() => {
                  const account = redditAccounts.find(a => a.id === selectedRedditAccount);
                  return account ? (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Proxy: <span className="font-mono">{account.proxy_masked}</span></p>
                      {account.last_used_at && (
                        <p>Last used: {new Date(account.last_used_at).toLocaleString()}</p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Proxy Mode selector (for Stagehand only) */}
            {isStagehandProvider && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-purple-400" />
                  Proxy Mode
                </label>
                <div className="relative">
                  <select
                    value={proxyMode}
                    onChange={(e) => setProxyMode(e.target.value as "browserbase" | "custom" | "none")}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all appearance-none"
                  >
                    <option value="browserbase">Browserbase Proxies (Built-in)</option>
                    <option value="custom">Custom Proxy (from account)</option>
                    <option value="none">No Proxy (Direct)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500">
                  {proxyMode === "browserbase" && "Uses Browserbase's managed residential proxies (US-based)"}
                  {proxyMode === "custom" && "Uses the proxy configured in the Reddit account settings"}
                  {proxyMode === "none" && "Direct connection without proxy (may be detected/blocked)"}
                </p>
                {proxyMode === "custom" && selectedRedditAccount && (() => {
                  const account = redditAccounts.find(a => a.id === selectedRedditAccount);
                  return account?.proxy ? (
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <p className="text-purple-400 text-xs font-medium mb-1">Custom Proxy:</p>
                      <p className="text-gray-400 text-xs font-mono break-all">{account.proxy_masked}</p>
                    </div>
                  ) : (
                    <p className="text-amber-400 text-xs">
                      ⚠️ Selected account has no proxy configured - will use direct connection
                    </p>
                  );
                })()}
              </div>
            )}

            {/* Twitter Account selector (for TwitterAPI) */}
            {isTwitterapiProvider && (selectedAction === "login" || selectedAction === "tweet_flow" || selectedAction === "dm_flow") && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-sky-400" />
                  Twitter Account
                </label>
                <div className="relative">
                  <select
                    value={selectedTwitterAccount}
                    onChange={(e) => setSelectedTwitterAccount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all appearance-none"
                  >
                    {twitterAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        @{account.username} {!account.is_active ? "(disabled)" : ""} 
                        {account.failure_count > 0 ? `(${account.failure_count} failures)` : ""}
                        {account.has_cached_cookie ? " ✓ cookie" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
                {twitterAccounts.length === 0 && (
                  <p className="text-amber-400 text-xs">
                    No Twitter accounts found. Add accounts to the twitter_accounts table.
                  </p>
                )}
                {selectedTwitterAccount && (() => {
                  const account = twitterAccounts.find(a => a.id === selectedTwitterAccount);
                  return account ? (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Email: {account.email}</p>
                      <p>Proxy: <span className="font-mono">{account.proxy_masked}</span></p>
                      {account.has_cached_cookie && account.login_cookie_updated_at && (
                        <p className="text-green-400">Cached cookie from: {new Date(account.login_cookie_updated_at).toLocaleString()}</p>
                      )}
                      {account.last_used_at && (
                        <p>Last used: {new Date(account.last_used_at).toLocaleString()}</p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Login cookie status for tweet/dm action */}
            {isTwitterapiProvider && (selectedAction === "tweet" || selectedAction === "dm") && (
              <div className={`p-4 rounded-xl space-y-2 ${loginCookie ? "bg-green-500/10 border border-green-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
                <p className={`text-sm font-medium flex items-center gap-2 ${loginCookie ? "text-green-400" : "text-amber-400"}`}>
                  <Twitter className="w-4 h-4" />
                  {loginCookie ? "Login Cookie Ready" : "No Login Cookie"}
                </p>
                {loginCookie ? (
                  <p className="text-xs text-gray-400">
                    Cookie from last login is ready. Using proxy from login.
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    Run a &quot;Test Login&quot; first to get a login cookie for tweeting/DMs.
                  </p>
                )}
              </div>
            )}

            {/* Token status for comment action */}
            {isReddapiProvider && selectedAction === "comment" && (
              <div className={`p-4 rounded-xl space-y-2 ${redditToken ? "bg-green-500/10 border border-green-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
                <p className={`text-sm font-medium flex items-center gap-2 ${redditToken ? "text-green-400" : "text-amber-400"}`}>
                  <MessageSquare className="w-4 h-4" />
                  {redditToken ? "Bearer Token Ready" : "No Bearer Token"}
                </p>
                {redditToken ? (
                  <p className="text-xs text-gray-400">
                    Token (token_v2) from last login ready. Using proxy: <span className="font-mono">{lastLoginProxy.split(":").slice(0, 2).join(":")}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    Run a &quot;Test Login&quot; first to get token_v2 for commenting.
                  </p>
                )}
              </div>
            )}

            {/* Dynamic parameters */}
            {currentAction?.params && currentAction.params.length > 0 && (
              <div className="space-y-4 pt-2">
                <p className="text-sm font-medium text-gray-300">Parameters</p>
                {currentAction.params.map((param) => (
                  <div key={param.key} className="space-y-2">
                    {param.type === "checkbox" ? (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={params[param.key] === "true"}
                          onChange={(e) =>
                            setParams({ ...params, [param.key]: e.target.checked ? "true" : "false" })
                          }
                          className="w-5 h-5 rounded bg-slate-900/50 border border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-sm text-gray-400">{param.label}</span>
                      </label>
                    ) : param.type === "select" ? (
                      <>
                        <label className="text-sm text-gray-400 flex items-center gap-2">
                          {param.label}
                          {param.required && (
                            <span className="text-red-400 text-xs">*</span>
                          )}
                        </label>
                        <div className="relative">
                          <select
                            value={params[param.key] || ""}
                            onChange={(e) =>
                              setParams({ ...params, [param.key]: e.target.value })
                            }
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
                          >
                            <option value="">Select {param.label.toLowerCase()}</option>
                            {(param as { options?: { value: string; label: string }[] }).options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                        </div>
                      </>
                    ) : (
                      <>
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
                      </>
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

            {/* Show Reddit Scraper info */}
            {isRedditScraperProvider && selectedProviderData && selectedAction === "run_reddit_scraper" && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-3">
                <p className="text-sm font-medium text-orange-400 flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  Reddit Scraper
                </p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Actor: <span className="font-mono text-orange-300">{actorId}</span></p>
                  <p>Default sort: <span className="text-gray-300">{(providerConfig?.default_input as Record<string, unknown>)?.searchSort as string || "hot"}</span></p>
                  <p>Default time: <span className="text-gray-300">{(providerConfig?.default_input as Record<string, unknown>)?.searchTime as string || "week"}</span></p>
                </div>
                <p className="text-xs text-gray-500">
                  Enter search terms separated by commas. Empty fields use default config values.
                </p>
              </div>
            )}

            {/* Show CrowdReply info */}
            {isCrowdreplyProvider && selectedProviderData && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                  <MessagesSquare className="w-4 h-4" />
                  CrowdReply Configuration
                </p>
                {(() => {
                  const config = selectedProviderData.config as Record<string, unknown> | null;
                  const projectId = config?.project_id as string | undefined;
                  return (
                    <div className="space-y-2">
                      {projectId ? (
                        <p className="text-xs text-gray-400">
                          Default Project ID: <span className="font-mono text-emerald-300">{projectId}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-amber-400">
                          ⚠️ No default project ID configured. You&apos;ll need to provide one in the params or add it to the provider config.
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        API Endpoint: <span className="font-mono">https://crowdreply.io/api/tasks</span>
                      </p>
                    </div>
                  );
                })()}
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

                {/* Stagehand session info - show for any response with session data */}
                {(typeof result.result === "object" && result.result !== null && "session" in result.result) && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                    <p className="text-purple-400 text-sm font-medium flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Browserbase Session
                    </p>
                    {(() => {
                      // Try to get session from result or error
                      const resultObj = result.result as { session?: { sessionId?: string; liveViewUrl?: string; debugUrl?: string } } | null;
                      const session = resultObj?.session;
                      return session ? (
                        <div className="space-y-2">
                          {session.sessionId && (
                            <p className="text-gray-400 text-xs font-mono">
                              Session ID: {session.sessionId}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {session.liveViewUrl && (
                              <a
                                href={session.liveViewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Live View
                              </a>
                            )}
                            {session.debugUrl && (
                              <a
                                href={session.debugUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 text-gray-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                Debug View
                              </a>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs">
                            Click &quot;Live View&quot; to watch the browser session in real-time
                          </p>
                        </div>
                      ) : null;
                    })()}
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

