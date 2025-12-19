"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  ExternalLink,
  ChevronDown,
  Loader2,
  Filter,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Target,
  AlertCircle,
  Check,
  X,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface PlannedAction {
  id: string;
  business_id: string;
  platform: string;
  target_url: string;
  target_title: string | null;
  target_snippet: string | null;
  generated_comment: string;
  edited_comment: string | null;
  relevance_score: number | null;
  status: string | null;
  scheduled_for: string | null;
  auto_approved: boolean | null;
  created_at: string | null;
  business?: { id: string; name: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending_review: { label: "Pending Review", color: "amber", icon: Clock },
  approved: { label: "Approved", color: "green", icon: CheckCircle },
  scheduled: { label: "Scheduled", color: "blue", icon: Calendar },
  executing: { label: "Executing", color: "purple", icon: Loader2 },
  completed: { label: "Completed", color: "green", icon: CheckCircle },
  failed: { label: "Failed", color: "red", icon: XCircle },
  skipped: { label: "Skipped", color: "gray", icon: X },
};

const PLATFORM_ICONS: Record<string, string> = {
  reddit: "🔴",
  instagram: "📸",
  tiktok: "🎵",
  linkedin: "💼",
  youtube: "▶️",
  twitter: "𝕏",
};

export default function ActionsPage() {
  const [actions, setActions] = useState<PlannedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [editingAction, setEditingAction] = useState<PlannedAction | null>(null);
  const [editedComment, setEditedComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === "all" ? "" : filter === "pending" ? "pending" : "completed";
      const response = await fetch(`/api/actions?status=${status}&limit=100`);
      const data = await response.json();
      if (data.actions) {
        setActions(data.actions);
      }
    } catch (error) {
      console.error("Failed to fetch actions:", error);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleApprove = async (actionId: string) => {
    try {
      const response = await fetch(`/api/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (response.ok) {
        fetchActions();
      }
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleSkip = async (actionId: string) => {
    try {
      const response = await fetch(`/api/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "skipped" }),
      });
      if (response.ok) {
        fetchActions();
      }
    } catch (error) {
      console.error("Failed to skip:", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAction) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/actions/${editingAction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited_comment: editedComment }),
      });
      if (response.ok) {
        setEditingAction(null);
        fetchActions();
      }
    } catch (error) {
      console.error("Failed to save edit:", error);
    }
    setSaving(false);
  };

  const handleBatchApprove = async () => {
    if (selectedActions.size === 0) return;
    try {
      const response = await fetch("/api/actions/approve-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionIds: Array.from(selectedActions) }),
      });
      if (response.ok) {
        setSelectedActions(new Set());
        fetchActions();
      }
    } catch (error) {
      console.error("Failed to batch approve:", error);
    }
  };

  const toggleSelectAction = (actionId: string) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  const selectAllPending = () => {
    const pendingIds = actions
      .filter((a) => a.status === "pending_review")
      .map((a) => a.id);
    setSelectedActions(new Set(pendingIds));
  };

  const getComment = (action: PlannedAction) => {
    return action.edited_comment || action.generated_comment;
  };

  const pendingCount = actions.filter((a) => 
    ["pending_review", "approved", "scheduled"].includes(a.status || "pending_review")
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            Action Queue
          </h1>
          <p className="text-gray-400 mt-1">
            Review and approve AI-generated marketing comments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchActions}
            className="p-2 rounded-xl bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {selectedActions.size > 0 && (
            <button
              onClick={handleBatchApprove}
              className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
            >
              <Check className="w-4 h-4" />
              Approve ({selectedActions.size})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-xl w-fit">
        {[
          { key: "pending", label: "Pending", count: pendingCount },
          { key: "completed", label: "Completed" },
          { key: "all", label: "All" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab.key
                ? "bg-slate-700 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Select All */}
      {filter === "pending" && actions.filter((a) => a.status === "pending_review").length > 0 && (
        <button
          onClick={selectAllPending}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Select all pending ({actions.filter((a) => a.status === "pending_review").length})
        </button>
      )}

      {/* Actions List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      ) : actions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">No actions found</p>
          <p className="text-gray-500 text-sm">
            {filter === "pending"
              ? "All caught up! No pending actions to review."
              : "Actions will appear here after scraping runs."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((action, index) => {
            const statusConfig = STATUS_CONFIG[action.status || "pending_review"];
            const StatusIcon = statusConfig.icon;
            const isPending = action.status === "pending_review";
            const isSelected = selectedActions.has(action.id);

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card overflow-hidden ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50 flex items-center gap-4">
                  {isPending && (
                    <button
                      onClick={() => toggleSelectAction(action.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  )}
                  
                  <span className="text-2xl">{PLATFORM_ICONS[action.platform] || "📦"}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium truncate">
                        {action.target_title || "Untitled Post"}
                      </h3>
                      <a
                        href={action.target_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{action.business?.name}</span>
                      {action.relevance_score && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {Math.round(action.relevance_score * 100)}% match
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400`}
                  >
                    <StatusIcon className={`w-3 h-3 ${action.status === "executing" ? "animate-spin" : ""}`} />
                    {statusConfig.label}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  {action.target_snippet && (
                    <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-gray-400 text-sm line-clamp-2">{action.target_snippet}</p>
                    </div>
                  )}

                  <div className="relative">
                    <div className="flex items-start gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-purple-400 mt-0.5" />
                      <span className="text-sm text-gray-400">AI Generated Comment:</span>
                      {action.edited_comment && (
                        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                          Edited
                        </span>
                      )}
                    </div>
                    <p className="text-white text-sm leading-relaxed pl-6">
                      {getComment(action)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {isPending && (
                  <div className="px-4 pb-4 flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(action.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors font-medium text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setEditingAction(action);
                        setEditedComment(getComment(action));
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleSkip(action.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      Skip
                    </button>
                  </div>
                )}

                {action.status === "approved" && (
                  <div className="px-4 pb-4">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm">
                        Approved - will be posted soon
                      </span>
                    </div>
                  </div>
                )}

                {action.status === "completed" && (
                  <div className="px-4 pb-4">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm">
                        Successfully posted
                      </span>
                    </div>
                  </div>
                )}

                {action.status === "failed" && (
                  <div className="px-4 pb-4">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm">
                        Failed to post - will retry with alternative content
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 w-full max-w-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Edit Comment</h2>
                <button
                  onClick={() => setEditingAction(null)}
                  className="p-2 rounded-lg bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-2">Target Post:</p>
                <p className="text-white font-medium">{editingAction.target_title}</p>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Comment
                </label>
                <textarea
                  value={editedComment}
                  onChange={(e) => setEditedComment(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
                <p className="text-gray-500 text-xs mt-1">
                  {editedComment.length} characters
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingAction(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl btn-primary text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}



