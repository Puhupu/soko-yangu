import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { AuthShell, Input } from "./login";

export default function SellerSignup() {
  const router = useRouter();
  const [form, setForm] = useState({ business_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    if (!form.business_name.trim()) { setError("Please enter your businessname."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { business_name: form.business_name.trim() } },
    });
    if (error) { setLoading(false); setError(error.message); return; }

    if (data.user) {
      await supabase.from("seller_profiles").insert({
        id: data.user.id,
        business_name: form.business_name.trim(),
        email: form.email.trim(),
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
      {error && <div className="bg-amber-50 text-amber-800 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      <form onSubmit={handleSignup} className="space-y-4">
        <Input label="Business / Shop Name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} placeholder="e.g. Mama Njeri's Shop" />
        <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Input label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="At least 6 characters" />
        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>
      <p className="text-sm text-gray-500 text-center mt-4">
        Have an account? <Link href="/seller/login" className="text-green-600 font-medium">Sign in</Link>
      </p>
    </AuthShell>
  );
}
