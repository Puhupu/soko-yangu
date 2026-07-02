import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { AuthShell, Input } from "../seller/login";

export default function BuyerLogin() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      setLoading(false);
      if (err) { setError(err.message); return; }
      router.push(router.query.next || "/");
    } else {
      const { error: err } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
      });
      setLoading(false);
      if (err) { setError(err.message); return; }
      setDone(true);
    }
  }

  if (done) return (
    <AuthShell
      title="Check your email"
      subtitle="We sent a confirmation link. Click it to activate your account, then sign in."
    >
      <button
        onClick={() => { setDone(false); setMode("login"); }}
        className="w-full bg-gray-900 text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
      >
        Back to Sign In
      </button>
      <p className="text-center mt-4">
        <Link href="/" className="text-xs text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#a0a0a0] transition-colors">
          ← Back to shop
        </Link>
      </p>
    </AuthShell>
  );

  return (
    <AuthShell
      title={mode === "login" ? "Sign In" : "Create Account"}
      subtitle={
        mode === "login"
          ? "Optional — sign in to pre-fill your checkout details."
          : "Create a free buyer account."
      }
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-lg mb-4 border border-red-100 dark:border-red-900">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>
      {mode === "login" && (
        <p className="text-center mt-4">
          <Link href="/reset-password" className="text-sm text-gray-500 dark:text-[#a0a0a0] hover:underline">Forgot password?</Link>
        </p>
      )}
      <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center mt-5">
        {mode === "login" ? (
          <>No account?{" "}<button onClick={() => setMode("signup")} className="text-gray-900 dark:text-white font-semibold hover:underline">Create one →</button></>
        ) : (
          <>Already have one?{" "}<button onClick={() => setMode("login")} className="text-gray-900 dark:text-white font-semibold hover:underline">Sign in →</button></>
        )}
      </p>
      <p className="text-center mt-3">
        <Link href="/" className="text-xs text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#a0a0a0] transition-colors">
          ← Continue without signing in
        </Link>
      </p>
    </AuthShell>
  );
}
