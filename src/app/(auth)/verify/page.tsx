"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function VerifyContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      const supabase = createClient();
      
      // Check if there's an error in the URL
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      
      if (error) {
        setStatus("error");
        setMessage(errorDescription || "Verification failed. Please try again.");
        return;
      }

      // Check if the user is now authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setStatus("error");
        setMessage("Verification link expired or invalid. Please request a new one.");
        return;
      }

      // Check if email is verified
      if (user.email_confirmed_at) {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
      } else {
        setStatus("error");
        setMessage("Email verification pending. Please check your inbox.");
      }
    };

    // Small delay to allow for redirect processing
    const timer = setTimeout(verifyEmail, 500);
    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="glass-card p-8 text-center">
        {status === "loading" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
            >
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-3">Verifying Email</h1>
            <p className="text-gray-400">Please wait while we verify your email...</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-3">Email Verified!</h1>
            <p className="text-gray-400 mb-6">{message}</p>
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary text-white font-semibold"
              >
                Continue to Sign In
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center"
            >
              <XCircle className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-3">Verification Failed</h1>
            <p className="text-gray-400 mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-primary text-white font-semibold"
                >
                  Try Again
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link
                href="/login"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>}>
      <VerifyContent />
    </Suspense>
  );
}

