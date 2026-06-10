import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, ADMIN_EMAIL, ksh } from "../../lib/supabase";

const STATUSES = ["pending", "confirmed", "delivered"];
const STATUS_STYLE = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [authed,     setAuthed]     = useState(false);
  const [tab,        setTab]        = useState("orders");
  const [orders,     setOrders]     = useState([]);
  const [sellers,    setSellers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [newCount,   setNewCount]   = useState(0);
  const [riderModal, setRiderModal] = useState(null);
  const [riderForm,  setRiderForm]  = useState({ name: "", phone: "" });

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
        setOrders((prev) => prev.map((o) => o.id === payload.new.id ? payload.new : o));
      })
      .subscribe();
  }

  async function updateStatus(id, status) {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    await supabase.from("orders").update({ status }).eq("id", id);
  }

  function openRiderModal(order) {
    setRiderModal(order);
    setRiderForm({ name: order.rider_name || "", phone: order.rider_phone || "" });
  }

  async function sendRiderWA(e) {
    e.preventDefault();
    if (!riderForm.name.trim() || !riderForm.phone.trim()) return;
    await supabase.from("orders").update({ rider_name: riderForm.name.trim(), rider_phone: riderForm.phone.trim() }).eq("id", riderModal.id);
    setOrders((prev) => prev.map((o) => o.id === riderModal.id ? { ...o, rider_name: riderForm.name.trim(), rider_phone: riderForm.phone.trim() } : o));
    const buyerPhone = "254" + String(riderModal.buyer_phone).replace(/\D/g, "").replace(/^0/, "");
    const msg = encodeURIComponent(
      `📦 Your order from Soko Yangu is on the way!\n\nProduct: ${riderModal.product_title}\n\nYour rider: ${riderForm.name.trim()}\nRider's phone: ${riderForm.phone.trim()}\n\nPay ${ksh(riderModal.product_price)} on delivery. 💵`
    );
    window.open(`https://wa.me/${buyerPhone}?text=${msg}`, "_blank");
    setRiderModal(null);
  }

  if (!authed || loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  const stats = [
    { label: "Total Orders", value: orders.length,                                         icon: "📋", color: "border-gray-700" },
    { label: "Pending",      value: orders.filter((o) => o.status === "pending").length,   icon: "⏳", color: "border-amber-700/50 bg-amber-900/20" },
    { label: "Delivered",    value: orders.filter((o) => o.status === "delivered").length, icon: "✅", color: "border-emerald-700/50 bg-emerald-900/20" },
    { label: "Sellers",      value: sellers.length,                                        icon: "🏪", color: "border-gray-700" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {riderModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-black text-lg text-gray-900 mb-1">Send Tracking WhatsApp</h3>
            <p className="text-sm text-gray-500 mb-5">
              Buyer: <strong>{riderModal.buyer_name}</strong> · {riderModal.buyer_phone}
            </p>
            <form onSubmit={sendRiderWA} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rider Name</label>
                <input
                  type="text"
                  value={riderForm.name}
                  onChange={(e) => setRiderForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. John Mwangi"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rider Phone</label>
                <input
                  type="tel"
                  value={riderForm.phone}
                  onChange={(e) => setRiderForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="07xx xxx xxx"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
                  📲 Send WhatsApp to Buyer
                </button>
                <button type="button" onClick={() => setRiderModal(null)} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-emerald-400 font-black text-xl tracking-tight">Soko Yangu</Link>
            <span className="text-gray-700 mx-1">›</span>
            <span className="text-gray-400 font-semibold text-sm">Admin</span>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
            className="text-sm text-gray-500 hover:text-white transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className={`bg-gray-800 rounded-2xl border p-5 ${s.color}`}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-3xl font-black text-white">{s.value}</div>
              <div className="text-xs font-semibold text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab("orders"); setNewCount(0); }}
            className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === "orders" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"}`}
          >
            📋 All Orders
            {newCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center animate-bounce">
                {newCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("sellers")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === "sellers" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"}`}
          >
            🏪 Sellers ({sellers.length})
          </button>
        </div>

        {newCount > 0 && tab !== "orders" && (
          <div className="bg-emerald-900/50 border border-emerald-700 text-emerald-300 text-sm px-4 py-3 rounded-xl mb-4 font-medium">
            🔔 {newCount} new order{newCount > 1 ? "s" : ""} just came in!
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              orders.map((o) => {
                const buyerWAPhone  = "254" + String(o.buyer_phone).replace(/\D/g, "").replace(/^0/, "");
                const seller        = sellers.find((s) => s.id === o.seller_id);
                const vendorWAPhone = seller?.phone ? "254" + String(seller.phone).replace(/\D/g, "").replace(/^0/, "") : null;
                const vendorMsg     = vendorWAPhone
                  ? encodeURIComponent(`🛍️ New Order — Soko Yangu\n\nProduct: ${o.product_title}\nPrice: ${ksh(o.product_price)}\n\nBuyer: ${o.buyer_name}\nPhone: ${o.buyer_phone}\nLocation: ${o.delivery_location}`)
                  : null;

                return (
                  <div key={o.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white">{o.product_title}</p>
                          <p className="text-emerald-400 font-black">{ksh(o.product_price)}</p>
                        </div>
                        <p className="text-sm text-gray-400 mt-1.5">👤 {o.buyer_name} · 📞 {o.buyer_phone}</p>
                        <p className="text-sm text-gray-400">📍 {o.delivery_location}</p>
                        <p className="text-xs text-gray-600 mt-1">{new Date(o.created_at).toLocaleString("en-KE")}</p>
                        {seller && <p className="text-xs text-gray-500 mt-0.5">Shop: {seller.business_name}</p>}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <a href={`https://wa.me/${buyerWAPhone}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-800 px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-800 transition-colors">
                            📲 WA Buyer
                          </a>
                          {vendorWAPhone && (
                            <a href={`https://wa.me/${vendorWAPhone}?text=${vendorMsg}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-blue-900/60 text-blue-400 border border-blue-800 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-800 transition-colors">
                              📲 WA Vendor
                            </a>
                          )}
                          <button onClick={() => openRiderModal(o)}
                            className="text-xs bg-amber-900/60 text-amber-400 border border-amber-800 px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-800 transition-colors">
                            🛵 Send Tracking
                          </button>
                        </div>
                        {o.rider_name && (
                          <p className="text-xs text-gray-500 mt-2">Rider: {o.rider_name} · {o.rider_phone}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="text-xs border border-gray-600 bg-gray-700 text-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
                        >
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
                <div key={s.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center font-black text-lg flex-shrink-0">
                    {(s.business_name || s.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{s.business_name}</p>
                    <p className="text-sm text-gray-400">{s.email}</p>
                    {s.phone && <p className="text-xs text-gray-500 mt-0.5">📱 {s.phone}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">Joined {new Date(s.created_at).toLocaleDateString("en-KE")}</p>
                  </div>
                  <div className="text-sm text-gray-500 font-medium flex-shrink-0">
                    {orders.filter((o) => o.seller_id === s.id).length} orders
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
  return (
    <div className="text-center py-16 text-gray-500 bg-gray-800 rounded-2xl border border-gray-700">
      {children}
    </div>
  );
}
