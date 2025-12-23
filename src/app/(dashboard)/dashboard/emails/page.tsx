"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  RefreshCw,
  Search,
  Check,
  Reply,
  X,
  ChevronLeft,
  Inbox,
  Clock,
  User,
  Send,
  MailOpen,
  AlertCircle,
} from "lucide-react";

interface EmailReply {
  id: string;
  user_id: string;
  campaign_id: number;
  lead_email: string;
  lead_first_name: string | null;
  lead_last_name: string | null;
  email_account: string;
  subject: string | null;
  body: string;
  message_id: string | null;
  thread_id: string | null;
  step_number: number | null;
  is_read: boolean;
  received_at: string;
  created_at: string;
}

interface EmailThread {
  id: string;
  leadEmail: string;
  leadFirstName?: string;
  leadLastName?: string;
  emailAccount: string;
  subject?: string;
  messages: {
    id: string;
    from: string;
    to: string;
    body: string;
    timestamp: string;
  }[];
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailReply | null>(null);
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [replyMode, setReplyMode] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showUnreadOnly) params.set("unread", "true");
      
      const response = await fetch(`/api/emails?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails);
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    } finally {
      setLoading(false);
    }
  }, [showUnreadOnly]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const selectEmail = async (email: EmailReply) => {
    setSelectedEmail(email);
    setReplyMode(false);
    setReplyBody("");

    // Mark as read if not already
    if (!email.is_read) {
      await fetch(`/api/emails/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      
      // Update local state
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, is_read: true } : e))
      );
    }

    // Fetch full thread
    setLoadingThread(true);
    try {
      const response = await fetch(`/api/emails/${email.id}/thread`);
      if (response.ok) {
        const data = await response.json();
        setThread(data.thread);
      }
    } catch (error) {
      console.error("Failed to fetch thread:", error);
    } finally {
      setLoadingThread(false);
    }
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyBody.trim()) return;

    setSending(true);
    try {
      const response = await fetch(`/api/emails/${selectedEmail.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `Re: ${selectedEmail.subject || "Your message"}`,
          replyBody: replyBody.trim(),
        }),
      });

      if (response.ok) {
        setReplyMode(false);
        setReplyBody("");
        // Refresh the thread
        const threadResponse = await fetch(`/api/emails/${selectedEmail.id}/thread`);
        if (threadResponse.ok) {
          const data = await threadResponse.json();
          setThread(data.thread);
        }
      } else {
        const data = await response.json();
        alert(data.error || "Failed to send reply");
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const filteredEmails = emails.filter((email) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.lead_email.toLowerCase().includes(query) ||
      (email.lead_first_name?.toLowerCase().includes(query)) ||
      (email.lead_last_name?.toLowerCase().includes(query)) ||
      (email.subject?.toLowerCase().includes(query)) ||
      email.body.toLowerCase().includes(query)
    );
  });

  const getLeadName = (email: EmailReply) => {
    if (email.lead_first_name || email.lead_last_name) {
      return `${email.lead_first_name || ""} ${email.lead_last_name || ""}`.trim();
    }
    return email.lead_email.split("@")[0];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const unreadCount = emails.filter((e) => !e.is_read).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Mail className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">E-Mails</h1>
              <p className="text-sm text-gray-400">
                {unreadCount > 0
                  ? `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
          </div>
          <button
            onClick={fetchEmails}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Email List */}
        <div className={`${selectedEmail ? "hidden md:flex" : "flex"} flex-col w-full md:w-96 border-r border-slate-800`}>
          {/* Search & Filter */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded border-gray-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              Show unread only
            </label>
          </div>

          {/* Email List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Inbox className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-400">No emails yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Replies to your campaigns will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-800/50 transition-colors ${
                      selectedEmail?.id === email.id ? "bg-slate-800" : ""
                    } ${!email.is_read ? "bg-emerald-500/5" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        email.is_read ? "bg-transparent" : "bg-emerald-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-medium truncate ${
                            email.is_read ? "text-gray-300" : "text-white"
                          }`}>
                            {getLeadName(email)}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatDate(email.received_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {email.lead_email}
                        </p>
                        <p className={`text-sm truncate mt-1 ${
                          email.is_read ? "text-gray-500" : "text-gray-400"
                        }`}>
                          {email.body.replace(/<[^>]*>/g, "").slice(0, 100)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email Detail / Thread View */}
        <div className={`${selectedEmail ? "flex" : "hidden md:flex"} flex-col flex-1`}>
          {selectedEmail ? (
            <>
              {/* Detail Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white truncate">
                      {getLeadName(selectedEmail)}
                    </h2>
                    <p className="text-sm text-gray-400">{selectedEmail.lead_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReplyMode(!replyMode)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        replyMode
                          ? "bg-slate-700 text-white"
                          : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      }`}
                    >
                      <Reply className="w-4 h-4" />
                      Reply
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingThread ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
                  </div>
                ) : thread ? (
                  thread.messages.map((message, idx) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-xl ${
                        message.from === selectedEmail.email_account
                          ? "bg-emerald-500/10 border border-emerald-500/20 ml-8"
                          : "bg-slate-800/50 border border-slate-700 mr-8"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${
                            message.from === selectedEmail.email_account
                              ? "bg-emerald-500/20"
                              : "bg-blue-500/20"
                          }`}>
                            <User className={`w-3 h-3 ${
                              message.from === selectedEmail.email_account
                                ? "text-emerald-400"
                                : "text-blue-400"
                            }`} />
                          </div>
                          <span className="text-sm font-medium text-white">
                            {message.from === selectedEmail.email_account
                              ? "You"
                              : getLeadName(selectedEmail)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(message.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div
                        className="text-gray-300 prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: message.body.replace(/\n/g, "<br />"),
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-full bg-blue-500/20">
                        <User className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-sm font-medium text-white">
                        {getLeadName(selectedEmail)}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(selectedEmail.received_at).toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="text-gray-300 prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: selectedEmail.body.replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Reply Composer */}
              {replyMode && (
                <div className="flex-shrink-0 p-4 border-t border-slate-800 bg-slate-900/50">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Reply className="w-4 h-4" />
                      <span>Replying to {selectedEmail.lead_email}</span>
                    </div>
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Type your reply..."
                      rows={5}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setReplyMode(false);
                          setReplyBody("");
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendReply}
                        disabled={!replyBody.trim() || sending}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                      >
                        {sending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="p-4 bg-slate-800/50 rounded-2xl mb-4">
                <MailOpen className="w-12 h-12 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-400">Select an email</h3>
              <p className="text-sm text-gray-500 mt-1">
                Choose an email from the list to view the conversation
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

