"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const oldWay = [
  "Manually creating content for each platform",
  "Switching between 10+ different tools",
  "Spending hours on prospect research",
  "Inconsistent posting schedules",
  "Generic outreach that gets ignored",
];

const newWay = [
  "AI agents create tailored content 24/7",
  "One platform to manage everything",
  "Automated prospect identification",
  "Consistent, optimized posting times",
  "Personalized outreach that converts",
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 px-6 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />

      <div className="max-w-7xl mx-auto relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Stop the Grind.{" "}
            <span className="text-gradient">Deploy AI Agents.</span>
          </h2>
          <p className="text-gray-400 text-lg">
            Managing marketing manually is a full-time job. Cold Marketing&apos;s AI
            agents do the work for you—researching, creating, and publishing
            while you focus on what matters.
          </p>
        </motion.div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* The Old Way */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card p-8 border-red-500/20 hover:border-red-500/40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">The Old Way</h3>
            </div>
            <ul className="space-y-4">
              {oldWay.map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-red-400" />
                  </span>
                  <span className="text-gray-400">{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* With Cold Marketing */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card p-8 border-green-500/20 hover:border-green-500/40 transition-colors relative overflow-hidden"
          >
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  With Cold Marketing
                </h3>
              </div>
              <ul className="space-y-4">
                {newWay.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-400" />
                    </span>
                    <span className="text-gray-300">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: "10x", label: "Faster Content Creation" },
            { value: "24/7", label: "Automated Publishing" },
            { value: "50+", label: "Platforms Supported" },
            { value: "95%", label: "Time Saved" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-6 glass-card"
            >
              <div className="text-3xl sm:text-4xl font-bold text-gradient mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}








