import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import { AuthShell, Input } from "./seller/login";

export default function UpdatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [ready, setReady]       = useState(false);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    // Supabase establishes a recovery session from the email link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => router.push("/seller/login"), 2000);
  }

  if (done) return (
    <AuthShell title="Password updated" subtitle="Your password has been changed. Redirecting you to sign in…">
      <Link href="/seller/login" className="block w-full text-center bg-gray-900 text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
        Sign In Now
      </Link>
    </AuthShell>
  );

  return (
    <AuthShell title="Choose a new password" subtitle="Enter a new password for your account.">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-lg mb-4 border border-red-100 dark:border-red-900">
          {error}
        </div>
      )}
      {!ready && (
        <div className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-sm px-4 py-3 rounded-lg mb-4 border border-amber-100 dark:border-amber-900">
          Open this page from the reset link in your email to continue.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="New Password" type="password" value={password} onChange={setPassword} />
        <button type="submit" disabled={loading || !ready}
          className="w-full bg-gray-900 text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">
          {loading ? "Updating…" : "Update Password"}
        </button>
      </form>
    </AuthShell>
  );
}
