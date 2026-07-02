import { useState } from "react";
import Link from "next/link";
import { supabase, ksh } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";

const STATUS_STYLE = {
  pending:   "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  confirmed: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  delivered: "bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#a0a0a0]",
};

export default function MyOrders() {
  const { dark, toggle } = useTheme();
  const [phone, setPhone]     = useState("");
  const [orders, setOrders]   = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLookup(e) {
    e.preventDefault();
    const p = phone.trim();
    if (!p) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("buyer_phone", p)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
      <nav className="bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#2a2a2a] sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Soko Yangu</Link>
          <button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "☀" : "☽"}
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">My Orders</h1>
        <p className="text-gray-500 dark:text-[#a0a0a0] text-sm mt-1 mb-6">
          Enter the phone number you used at checkout to track your orders.
        </p>

        <form onSubmit={handleLookup} className="flex gap-2 mb-8">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07xx xxx xxx"
            className="flex-1 px-4 py-3 border border-gray-200 dark:border-[#2a2a2a] rounded-xl bg-white dark:bg-[#141414] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white dark:bg-white dark:text-black px-6 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {loading ? "…" : "Find"}
          </button>
        </form>

        {orders !== null && (
          orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-[#a0a0a0]">
              <div className="text-5xl mb-3">📦</div>
              <p className="font-semibold">No orders found for that number</p>
              <p className="text-sm mt-1">Double-check the phone number you entered at checkout.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const qty = o.quantity || 1;
                return (
                  <div key={o.id} className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white">{o.product_title}{qty > 1 ? ` ×${qty}` : ""}</p>
                        <p className="text-gray-900 dark:text-white font-black mt-0.5">{ksh(o.product_price * qty)}</p>
                        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">📍 {o.delivery_location}</p>
                        <p className="text-xs text-gray-400 dark:text-[#555] mt-1">{new Date(o.created_at).toLocaleString("en-KE")}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${STATUS_STYLE[o.status] || "bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-[#a0a0a0]"}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        <p className="text-center mt-10">
          <Link href="/" className="text-sm text-gray-400 dark:text-[#555] hover:text-gray-600 dark:hover:text-[#a0a0a0] transition-colors">← Back to shop</Link>
        </p>
      </div>
    </div>
  );
}
