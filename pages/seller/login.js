import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase, ADMIN_EMAIL } from "../../lib/supabase";

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
      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      <form onSubmit={handleLogin} className="space-y-4">
        <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
      <p className="text-sm text-gray-500 text-center mt-4">
        No account? <Link href="/seller/signup" className="text-green-600 font-medium">Create one</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <Link href="/" className="text-xl font-bold text-green-600">🛍️ Soko Yangu</Link>
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
          <p className="text-gray-500 text-sm mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Input({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500" />
    </div>
  );
}
