"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      
      // Check auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // Check profile
      let profile: { role?: string } | null = null;
      let profileError = null;
      if (user) {
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single() as { data: { role?: string } | null; error: unknown };
        profile = result.data;
        profileError = result.error;
      }

      setDebugInfo({
        user: user ? { id: user.id, email: user.email } : null,
        authError,
        profile,
        profileError,
        isAdmin: profile?.role === 'admin',
      });
    };

    checkAuth();
  }, []);

  if (!debugInfo) {
    return <div className="p-8 text-white">Loading debug info...</div>;
  }

  return (
    <div className="p-8 text-white space-y-4">
      <h1 className="text-2xl font-bold">Debug Info</h1>
      <pre className="bg-slate-900 p-4 rounded overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      {debugInfo.isAdmin && (
        <button
          onClick={() => router.push('/admin')}
          className="px-4 py-2 bg-blue-500 rounded"
        >
          Go to Admin Panel
        </button>
      )}
    </div>
  );
}

