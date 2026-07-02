import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase, ADMIN_EMAIL } from "../../lib/supabase";
import { useTheme } from "../../lib/ThemeContext";

export default function SellerLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push(form.email.trim() === ADMIN_EMAIL ? "/admin/dashboard" : "/seller/dashboard");
  }

  return (
    <AuthShell title="Seller Login" subtitle="Sign in to manage your products and orders.">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-lg mb-4 border border-red-100 dark:border-red-900">
          {error}
        </div>
      )}
      <form onSubmit={handleLogin} className="space-y-4">
        <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <button type="submit" disabled={loading}
          className="w-full bg-gray-900 text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <p className="text-center mt-4">
        <Link href="/reset-password" className="text-sm text-gray-500 dark:text-[#a0a0a0] hover:underline">Forgot password?</Link>
      </p>
      <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center mt-3">
        No account?{" "}
        <Link href="/seller/signup" className="text-gray-900 dark:text-white font-semibold hover:underline">Create one →</Link>
      </p>
      <p className="text-center mt-3">
        <Link href="/" className="text-xs text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#a0a0a0] transition-colors">
          ← Back to shop
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  const { dark, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col transition-colors duration-200">
      <nav className="bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-[#2a2a2a] transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            Soko Yangu
          </Link>
          <button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors text-base"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "☀" : "☽"}
          </button>
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white dark:bg-[#141414] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] p-8 w-full max-w-md">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{title}</h1>
          <p className="text-gray-500 dark:text-[#a0a0a0] text-sm mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Input({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-[#a0a0a0] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 dark:border-[#2a2a2a] rounded-xl bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors"
      />
    </div>
  );
}