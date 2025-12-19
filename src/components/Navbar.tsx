"use client";

import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto">
        <div className="glass-card px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              COLD<span className="text-blue-400">MARKETING</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              href="#features"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              FAQs
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl btn-secondary text-white font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-white font-medium"
            >
              <Calendar className="w-4 h-4" />
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}




