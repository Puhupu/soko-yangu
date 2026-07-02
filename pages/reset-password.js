import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { AuthShell, Input } from "./seller/login";

export default function ResetPassword() {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/update-password` : undefined;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  if (sent) return (
    <AuthShell title="Check your email" subtitle="If an account exists for that address, we've sent a password reset link. Click it to choose a new password.">
      <Link href="/seller/login" className="block w-full text-center bg-gray-900 text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
        Back to Sign In
      </Link>
    </AuthShell>
  );

  return (
    <AuthShell title="Reset Password" subtitle="Enter your email and we'll send you a reset link.">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-lg mb-4 border border-red-100 dark:border-red-900">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        <button type="submit" disabled={loading}
          className="w-full bg-gray-900 text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>
      <p className="text-center mt-5">
        <Link href="/seller/login" className="text-sm text-gray-500 dark:text-[#a0a0a0] hover:underline">← Back to Sign In</Link>
      </p>
    </AuthShell>
  );
}
