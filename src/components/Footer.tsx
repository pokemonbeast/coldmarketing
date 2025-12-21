"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const footerLinks = {
  Features: [
    "AI Content Generator",
    "Multi-Platform Publishing",
    "Lead Generation",
    "Analytics Dashboard",
    "Brand Voice AI",
  ],
  Platforms: ["TikTok", "Instagram", "YouTube", "X (Twitter)", "LinkedIn", "Facebook"],
  Resources: ["Blog", "Documentation", "API Reference", "Contact Support"],
  Company: ["About Us", "Careers", "Privacy Policy", "Terms of Service"],
};

export default function Footer() {
  return (
    <footer className="py-16 px-6 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                COLD<span className="text-blue-400">MARKETING</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              Deploy AI agents that learn your business and automate marketing
              across the entire internet.
            </p>
            <div className="flex items-center gap-4">
              {["TikTok", "YouTube", "X", "Instagram", "LinkedIn"].map(
                (platform) => (
                  <motion.a
                    key={platform}
                    href="#"
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500/50 transition-colors"
                  >
                    <span className="text-xs font-medium">
                      {platform.charAt(0)}
                    </span>
                  </motion.a>
                )
              )}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-gray-400 text-sm hover:text-white transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © 2025 Cold Marketing. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-gray-500 text-sm hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-gray-500 text-sm hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-gray-500 text-sm hover:text-white transition-colors"
            >
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}









