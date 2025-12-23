"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Globe,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// Reddit icon
const RedditIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

interface SimulatedPost {
  subreddit: string;
  title: string;
  relevance: number;
}

// Fallback posts if API fails (will be replaced dynamically)
const fallbackPosts: SimulatedPost[] = [
  { subreddit: "r/business", title: "Looking for advice on this topic", relevance: 85 },
  { subreddit: "r/Entrepreneur", title: "What's working for you right now?", relevance: 82 },
  { subreddit: "r/smallbusiness", title: "Need recommendations", relevance: 79 },
  { subreddit: "r/startups", title: "Anyone have experience with this?", relevance: 88 },
];

const searchingPhrases = [
  "Scanning Reddit for relevant discussions...",
  "Analyzing post engagement metrics...",
  "Evaluating conversation relevance...",
  "Identifying high-value opportunities...",
  "Processing natural language patterns...",
  "Matching keywords to discussions...",
];

interface Props {
  businessId?: string;
  keywords?: string[];
  isActive?: boolean;
}

// Cache for generated posts (persists across component re-renders)
const postsCache = new Map<string, SimulatedPost[]>();

export default function LiveResearchAnimation({ businessId, keywords = ["business"], isActive = true }: Props) {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [visiblePosts, setVisiblePosts] = useState<number[]>([]);
  const [analyzingPost, setAnalyzingPost] = useState<number | null>(null);
  const [completedPosts, setCompletedPosts] = useState<number[]>([]);
  const [urlText, setUrlText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [simulatedPosts, setSimulatedPosts] = useState<SimulatedPost[]>(fallbackPosts);
  const fetchedRef = useRef(false);

  // Fetch contextual posts on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Check local cache first
    const cacheKey = businessId || keywords.sort().join('|').toLowerCase();
    if (postsCache.has(cacheKey)) {
      setSimulatedPosts(postsCache.get(cacheKey)!);
      return;
    }

    // Fetch from API
    const url = businessId 
      ? `/api/research/simulate-posts?businessId=${businessId}`
      : `/api/research/simulate-posts`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.posts && data.posts.length > 0) {
          postsCache.set(cacheKey, data.posts);
          setSimulatedPosts(data.posts);
        }
      })
      .catch(err => {
        console.error('Failed to fetch simulated posts:', err);
        // Keep using fallback posts
      });
  }, [businessId, keywords]);

  // Cycle through searching phrases
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % searchingPhrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isActive]);

  // Simulate URL typing effect
  const typeUrl = useCallback((url: string) => {
    setIsTyping(true);
    setUrlText("");
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < url.length) {
        setUrlText(url.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
      }
    }, 30);
    return () => clearInterval(typeInterval);
  }, []);

  // Animate posts appearing and being analyzed
  useEffect(() => {
    if (!isActive || simulatedPosts.length === 0) return;

    const showPost = (index: number) => {
      // Type the URL
      const post = simulatedPosts[index];
      const subredditSlug = post.subreddit.replace('r/', '').toLowerCase();
      typeUrl(`reddit.com/r/${subredditSlug}/comments/...`);
      
      // Show the post
      setTimeout(() => {
        setVisiblePosts((prev) => [...prev, index]);
        setAnalyzingPost(index);
      }, 800);

      // Mark as completed
      setTimeout(() => {
        setAnalyzingPost(null);
        setCompletedPosts((prev) => [...prev, index]);
      }, 2000);
    };

    // Start animation sequence
    let postIndex = 0;
    const interval = setInterval(() => {
      if (postIndex < simulatedPosts.length) {
        showPost(postIndex);
        postIndex++;
      } else {
        // Reset and loop
        setVisiblePosts([]);
        setCompletedPosts([]);
        setAnalyzingPost(null);
        postIndex = 0;
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isActive, typeUrl, simulatedPosts]);

  if (!isActive) return null;

  return (
    <div className="glass-card p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <motion.div 
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <RedditIcon />
        </motion.div>
        <div>
          <h3 className="text-white font-semibold">AI Agent Browsing</h3>
          <p className="text-xs text-gray-500">Real-time Reddit research</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs text-green-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Browser URL Bar */}
      <div className="bg-slate-900/80 rounded-lg p-3 mb-4 border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 flex items-center gap-2 bg-slate-800/50 rounded px-3 py-1.5">
            <Globe className="w-4 h-4 text-gray-500" />
            <motion.span 
              className="text-sm text-gray-400 font-mono truncate"
              key={urlText}
            >
              {urlText}
              {isTyping && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Keywords being searched */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Search className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-500">Searching:</span>
        <div className="flex gap-1.5 flex-wrap">
          {keywords.slice(0, 3).map((keyword) => (
            <motion.span
              key={keyword}
              className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {keyword}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Status text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhrase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 mb-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
          </motion.div>
          <span className="text-sm text-purple-400">{searchingPhrases[currentPhrase]}</span>
        </motion.div>
      </AnimatePresence>

      {/* Simulated posts being discovered */}
      <div className="space-y-2 max-h-[200px] overflow-hidden">
        <AnimatePresence>
          {visiblePosts.slice(-4).map((postIndex) => {
            const post = simulatedPosts[postIndex];
            if (!post) return null;
            
            const isAnalyzing = analyzingPost === postIndex;
            const isCompleted = completedPosts.includes(postIndex);

            return (
              <motion.div
                key={postIndex}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20 }}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  isAnalyzing
                    ? "bg-blue-500/10 border-blue-500/30"
                    : isCompleted
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-slate-800/30 border-slate-700/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 transition-colors ${
                    isCompleted ? "text-green-400" : "text-orange-400"
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-orange-400 font-medium">{post.subreddit}</span>
                      {isAnalyzing && (
                        <motion.span
                          className="text-xs text-blue-400"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          analyzing...
                        </motion.span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 truncate">{post.title}</p>
                    {isCompleted && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 mt-1"
                      >
                        <div className="h-1 flex-1 bg-slate-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${post.relevance}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="text-xs text-green-400 font-medium">{post.relevance}%</span>
                      </motion.div>
                    )}
                  </div>
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-400"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Progress indicator */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Posts analyzed: <span className="text-white font-medium">{completedPosts.length}</span>
          </span>
          <span className="text-gray-500">
            Queue: <span className="text-blue-400 font-medium">{Math.max(0, simulatedPosts.length - completedPosts.length)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
