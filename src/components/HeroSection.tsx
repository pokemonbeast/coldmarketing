"use client";

import { motion } from "framer-motion";
import { ArrowRight, Calendar, Star } from "lucide-react";
import AgentWorkflowCard from "./AgentWorkflowCard";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto w-full">
        {/* Hero Content - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-blue-400 text-sm font-medium">
              AI-Powered Marketing Agents
            </span>
          </motion.div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-8">
            AI Agents That{" "}
            <span className="text-gradient">Market Your Business</span> Across the{" "}
            <motion.span
              className="relative inline-block"
              animate={{
                color: ["#a855f7", "#ec4899", "#3b82f6", "#a855f7"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              Internet
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
              />
            </motion.span>
          </h1>
        </motion.div>

        {/* Description Section - Separate block below headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center mt-4 mb-10"
        >
          <p className="text-gray-400 text-lg sm:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed">
            Deploy AI agents that find relevant conversations, engage with prospects,
            and promote your business 24/7 across LinkedIn, YouTube, Reddit, X, Threads
            &amp; more.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
        >
          <button className="group flex items-center gap-2 px-8 py-4 rounded-xl btn-primary text-white font-semibold text-lg w-full sm:w-auto justify-center">
            Start for Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="flex items-center gap-2 px-8 py-4 rounded-xl btn-secondary text-white font-semibold text-lg w-full sm:w-auto justify-center">
            <Calendar className="w-5 h-5" />
            Book a Demo
          </button>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-3 mb-16"
        >
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">G2</span>
            </div>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4 text-orange-400 fill-orange-400"
                />
              ))}
            </div>
          </div>
          <span className="text-gray-400">
            <span className="text-white font-semibold">4.6</span> out of 5
          </span>
        </motion.div>

        {/* Agent Workflow Card - Below hero content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex justify-center"
        >
          <AgentWorkflowCard />
        </motion.div>
      </div>
    </section>
  );
}

