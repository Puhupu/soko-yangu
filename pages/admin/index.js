import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, ADMIN_EMAIL } from "../../lib/supabase";

export default function AdminLogin() {
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
    if (form.email.trim() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      setError("This is not the admin account.");
      return;
    }
    router.push("/admin/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔐</div>
          <h1 className="text-xl font-black text-white">Admin Access</h1>
          <p className="text-sm text-[#a0a0a0]">Soko Yangu Control Panel</p>
        </div>
        {error && (
          <div className="bg-red-950 border border-red-900 text-red-300 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Admin email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 border border-[#2a2a2a] rounded-xl bg-[#0a0a0a] text-white placeholder-[#555] focus:outline-none focus:border-white text-sm transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-3 border border-[#2a2a2a] rounded-xl bg-[#0a0a0a] text-white placeholder-[#555] focus:outline-none focus:border-white text-sm transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Access Dashboard"}
          </button>
        </form>
        <p className="text-center mt-5">
          <Link href="/" className="text-sm text-[#555] hover:text-[#a0a0a0] transition-colors">← Back to store</Link>
        </p>
      </div>
    </div>
  );
}