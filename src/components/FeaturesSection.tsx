"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Globe,
  Zap,
  BarChart3,
  Shield,
  Clock,
  Users,
  Target,
} from "lucide-react";

const features = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "AI That Learns Your Business",
    description:
      "Our agents study your brand, products, and messaging to create perfectly tailored content.",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Multi-Platform Presence",
    description:
      "Automatically create and manage accounts across TikTok, Instagram, YouTube, X, LinkedIn, and more.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Instant Content Generation",
    description:
      "Generate posts, captions, and ads in seconds that resonate with your target audience.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Smart Prospect Targeting",
    description:
      "AI identifies and reaches out to prospects most likely to convert, maximizing your ROI.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Real-Time Analytics",
    description:
      "Track performance across all platforms with unified dashboards and actionable insights.",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "24/7 Automation",
    description:
      "Your marketing never sleeps. Agents work around the clock to grow your presence.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Brand Consistency",
    description:
      "Maintain your unique voice and style across every piece of content, automatically.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Audience Growth Engine",
    description:
      "Build genuine followings through consistent, engaging content that drives organic growth.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Everything You Need to{" "}
            <span className="text-gradient">Dominate</span> Online Marketing
          </h2>
          <p className="text-gray-400 text-lg">
            Deploy AI agents that handle every aspect of your digital presence,
            from content creation to lead generation.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group glass-card p-6 hover:border-blue-500/40 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Platform Logos */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20"
        >
          <p className="text-center text-gray-500 text-sm mb-8">
            Connect Once. Agents Run Forever.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {[
              { name: "TikTok", color: "hover:text-pink-400" },
              { name: "Instagram", color: "hover:text-pink-500" },
              { name: "YouTube", color: "hover:text-red-500" },
              { name: "X (Twitter)", color: "hover:text-gray-200" },
              { name: "LinkedIn", color: "hover:text-blue-400" },
              { name: "Facebook", color: "hover:text-blue-500" },
            ].map((platform, index) => (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-gray-400 font-medium transition-colors cursor-pointer ${platform.color}`}
              >
                {platform.name}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}









