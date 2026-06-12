import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { AuthShell, Input } from "./login";

export default function SellerSignup() {
  const router = useRouter();
  const [form, setForm]     = useState({ business_name: "", email: "", phone: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    if (!form.business_name.trim()) { setError("Please enter your business name."); return; }
    if (form.password.length < 6)   { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");

    const { data, error: authErr } = await supabase.auth.signUp({
      email:    form.email.trim(),
      password: form.password,
      options:  { data: { business_name: form.business_name.trim() } },
    });
    if (authErr) { setLoading(false); setError(authErr.message); return; }

    if (data.user) {
      await supabase.from("seller_profiles").insert({
        id:            data.user.id,
        business_name: form.business_name.trim(),
        email:         form.email.trim(),
        phone:         form.phone.trim(),
      });
    }
    setLoading(false);

    if (data.session) {
      router.push("/seller/dashboard");
    } else {
      setError("Account created! Check your email to confirm, then log in.");
    }
  }

  return (
    <AuthShell title="Create Seller Account" subtitle="Start selling on Soko Yangu today.">
      {error && (
        <div className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-sm px-4 py-3 rounded-xl mb-4 border border-amber-100 dark:border-amber-900">
          {error}
        </div>
      )}
      <form onSubmit={handleSignup} className="space-y-4">
        <Input label="Business / Shop Name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} placeholder="e.g. Mama Njeri's Shop" />
        <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Input label="WhatsApp Number" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="07xx xxx xxx — buyers will notify you here" />
        <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="At least 6 characters" />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white dark:bg-white dark:text-black py-3 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>
      <p className="text-sm text-gray-500 dark:text-[#a0a0a0] text-center mt-5">
        Have an account?{" "}
        <Link href="/seller/login" className="text-gray-900 dark:text-white font-semibold hover:underline">Sign in →</Link>
      </p>
    </AuthShell>
  );
}