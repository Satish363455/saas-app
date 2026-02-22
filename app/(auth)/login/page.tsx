"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) return setMsg(error.message);

    router.push("/dashboard");
    router.refresh();
  }

  async function signUp() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) return setMsg(error.message);

    setMsg("Account created. Now sign in.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={signIn} className="w-full max-w-sm space-y-4 border rounded-xl p-6">
        <h1 className="text-2xl font-semibold">Login</h1>

        <input className="w-full border rounded-md p-2" placeholder="Email" type="email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />

        <input className="w-full border rounded-md p-2" placeholder="Password" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />

        {msg ? <p className="text-sm">{msg}</p> : null}

        <button className="w-full border rounded-md p-2" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <button className="w-full border rounded-md p-2" disabled={loading} type="button" onClick={signUp}>
          Create Account
        </button>
      </form>
    </main>
  );
}