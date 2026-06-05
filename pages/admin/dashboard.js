import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, ADMIN_EMAIL, ksh } from "../../lib/supabase";

const STATUSES = ["pending", "confirmed", "delivered"];
const STATUS_STYLE = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push("/admin"); return; }
      setAuthed(true);
      init();
    });
  }, []);

  async function init() {
    const [or, se] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("seller_profiles").select("*").order("created_at", { ascending: false }),
    ]);
    if (or.data) setOrders(or.data);
    if (se.data) setSellers(se.data);
    setLoading(false);

    supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => [payload.new, ...prev]);
        setNewCount((n) => n + 1);
        try { new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==").play(); } catch (e) {}
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? payload.new : o)));
      })
      .subscribe();
  }

  async function updateStatus(id, status) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await supabase.from("orders").update({ status }).eq("id", id);
  }

  if (!authed || loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const stats = [
    { label: "Total Orders", value: orders.length, icon: "📋" },
    { label: "Pending", value: orders.filter((o) => o.status === "pending").length, icon: "⏳" },
    { label: "Delivered", value: orders.filter((o) => o.status === "delivered").length, icon: "✅" },
    { label: "Sellers", value: sellers.length, icon: "🏪" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-green-400 font-bold">🛍️ Soko Yangu</Link>
            <span className="text-gray-600">›</span><span className="font-medium">Admin</span>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
            className="text-sm text-gray-400 hover:text-white">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border p-4">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => { setTab("orders"); setNewCount(0); }}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "orders" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"}`}>
            📋 All Orders
            {newCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center animate-bounce">{newCount}</span>}
          </button>
          <button onClick={() => setTab("sellers")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "sellers" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"}`}>
            🏪 Sellers ({sellers.length})
          </button>
        </div>

        {newCount > 0 && tab !== "orders" && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg mb-4">
            🔔 {newCount} new order{newCount > 1 ? "s" : ""} just came in! Check the Orders tab.
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              orders.map((o) => {
                const waPhone = "254" + String(o.buyer_phone).replace(/\D/g, "").replace(/^0/, "");
                return (
                  <div key={o.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{o.product_title}</p>
                          <p className="text-green-600 font-bold">{ksh(o.product_price)}</p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">👤 {o.buyer_name} · 📞 {o.buyer_phone}</p>
                        <p className="text-sm text-gray-600">📍 {o.delivery_location}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(o.created_at).toLocaleString("en-KE")}</p>
                        <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
                          className="inline-block text-xs text-green-600 hover:text-green-700 font-medium mt-1">
                          📲 WhatsApp buyer
                        </a>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                        <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-gray-900">
                          {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "sellers" && (
          <div className="space-y-3">
            {sellers.length === 0 ? (
              <Empty>No sellers registered yet.</Empty>
            ) : (
              sellers.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {(s.business_name || s.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.business_name}</p>
                    <p className="text-sm text-gray-500">{s.email}</p>
                    <p className="text-xs text-gray-400">Joined {new Date(s.created_at).toLocaleDateString("en-KE")}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ children }) {
  return <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border">{children}</div>;
}
