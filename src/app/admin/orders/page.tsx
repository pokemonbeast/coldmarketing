"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  RefreshCw,
  Loader2,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
} from "lucide-react";

interface Order {
  id: string;
  external_order_id: string;
  service_id: string;
  service_name: string;
  link: string;
  quantity: number | null;
  comments: string | null;
  status: string;
  charge: number | null;
  start_count: string | null;
  remains: string | null;
  currency: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  last_checked_at: string | null;
  provider: {
    name: string;
    slug: string;
  } | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", icon: Clock },
  processing: { bg: "bg-blue-500/20", text: "text-blue-400", icon: Loader2 },
  "in progress": { bg: "bg-blue-500/20", text: "text-blue-400", icon: Loader2 },
  completed: { bg: "bg-green-500/20", text: "text-green-400", icon: CheckCircle },
  partial: { bg: "bg-orange-500/20", text: "text-orange-400", icon: AlertCircle },
  cancelled: { bg: "bg-red-500/20", text: "text-red-400", icon: XCircle },
  canceled: { bg: "bg-red-500/20", text: "text-red-400", icon: XCircle },
  refunded: { bg: "bg-purple-500/20", text: "text-purple-400", icon: XCircle },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pollResult, setPollResult] = useState<any>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/orders?status=${statusFilter}&limit=100`);
      const data = await response.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
    setLoading(false);
  };

  const triggerPoll = async () => {
    setPolling(true);
    setPollResult(null);
    try {
      const response = await fetch("/api/admin/orders/poll", {
        method: "POST",
      });
      const data = await response.json();
      setPollResult(data);
      // Refresh orders after polling
      await fetchOrders();
    } catch (error) {
      console.error("Failed to poll orders:", error);
      setPollResult({ error: "Failed to poll orders" });
    }
    setPolling(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const getStatusStyle = (status: string) => {
    const normalized = status.toLowerCase();
    return STATUS_STYLES[normalized] || STATUS_STYLES.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const pendingCount = orders.filter(
    (o) => !["completed", "partial", "cancelled", "canceled", "refunded"].includes(o.status.toLowerCase())
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
            </div>
            Orders
          </h1>
          <p className="text-gray-400 mt-1">
            Track API orders and their statuses
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={triggerPoll}
            disabled={polling}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
          >
            {polling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Poll Status Now
          </button>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Poll Result */}
      {pollResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl ${
            pollResult.error
              ? "bg-red-500/10 border border-red-500/20"
              : "bg-green-500/10 border border-green-500/20"
          }`}
        >
          {pollResult.error ? (
            <p className="text-red-400">{pollResult.error}</p>
          ) : (
            <div className="text-green-400">
              <p className="font-medium">Poll completed!</p>
              <p className="text-sm text-green-400/80">
                Checked: {pollResult.checked} orders | Updated: {pollResult.updated} orders
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Total Orders</p>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Pending/Processing</p>
          <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Completed</p>
          <p className="text-2xl font-bold text-green-400">
            {orders.filter((o) => o.status.toLowerCase() === "completed").length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-gray-400 text-sm">Failed/Cancelled</p>
          <p className="text-2xl font-bold text-red-400">
            {orders.filter((o) =>
              ["cancelled", "canceled", "refunded"].includes(o.status.toLowerCase())
            ).length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "processing", "completed", "partial", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-slate-800 text-gray-400 hover:text-white"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No orders found</p>
            <p className="text-gray-500 text-sm mt-1">
              Orders placed via API Testing will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Order ID</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Service</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Link</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Charge</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Created</th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">Last Check</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => {
                  const statusStyle = getStatusStyle(order.status);
                  const StatusIcon = statusStyle.icon;

                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-white font-mono text-sm">
                            {order.external_order_id}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {order.provider?.name || "Unknown"}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-white text-sm">{order.service_name}</p>
                          <p className="text-gray-500 text-xs">ID: {order.service_id}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <a
                          href={order.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 max-w-[200px] truncate"
                        >
                          {order.link.replace(/^https?:\/\//, "").slice(0, 30)}...
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <StatusIcon className={`w-3.5 h-3.5 ${
                            order.status.toLowerCase() === "processing" ||
                            order.status.toLowerCase() === "in progress"
                              ? "animate-spin"
                              : ""
                          }`} />
                          {order.status}
                        </span>
                        {order.remains && (
                          <p className="text-gray-500 text-xs mt-1">
                            Remains: {order.remains}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-300">
                        {order.charge
                          ? `$${order.charge.toFixed(4)}`
                          : "-"}
                      </td>
                      <td className="py-4 px-6 text-gray-400 text-sm">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-4 px-6 text-gray-400 text-sm">
                        {order.last_checked_at
                          ? formatDate(order.last_checked_at)
                          : "Never"}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}







