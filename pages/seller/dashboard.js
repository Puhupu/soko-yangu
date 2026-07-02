import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, ADMIN_EMAIL, ksh, NO_IMAGE } from "../../lib/supabase";
import { useTheme } from "../../lib/ThemeContext";

const CATEGORIES = ["Groceries", "Produce", "Beverages", "Household", "Food & Snacks", "Services", "Other"];
const EMPTY = { title: "", description: "", price: "", image_url: "", category: "Other" };
const STATUS_STYLE = {
  pending:   "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  confirmed: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  delivered: "bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#a0a0a0]",
};

export default function SellerDashboard() {
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const [user,      setUser]      = useState(null);
  const [profile,   setProfile]   = useState(null);
  const [tab,       setTab]       = useState("overview");
  const [products,  setProducts]  = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [form,      setForm]      = useState(EMPTY);
  const [editing,   setEditing]   = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [newOrder,  setNewOrder]  = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/seller/login"); return; }
      if (session.user.email === ADMIN_EMAIL) { router.push("/admin/dashboard"); return; }
      setUser(session.user);
      loadProfile(session.user.id);
      loadData(session.user.id);
      subscribeRealtime(session.user.id);
    });
  }, []);

  function subscribeRealtime(uid) {
    supabase
      .channel("seller-orders-" + uid)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        if (payload.new.seller_id !== uid) return;
        setOrders((prev) => [payload.new, ...prev]);
        setNewOrder(payload.new);
        setTimeout(() => setNewOrder(null), 6000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        if (payload.new.seller_id !== uid) return;
        setOrders((prev) => prev.map((o) => o.id === payload.new.id ? payload.new : o));
      })
      .subscribe();
  }

  async function loadProfile(uid) {
    const { data } = await supabase.from("seller_profiles").select("*").eq("id", uid).single();
    if (data) setProfile(data);
  }

  async function loadData(uid) {
    const [pr, or] = await Promise.all([
      supabase.from("products").select("*").eq("seller_id", uid).order("created_at", { ascending: false }),
      supabase.from("orders").select("*").eq("seller_id", uid).order("created_at", { ascending: false }),
    ]);
    if (pr.data) setProducts(pr.data);
    if (or.data) setOrders(or.data);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const ext  = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { data, error: upErr } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (upErr) {
      setError("Image upload failed. Check that the 'product-images' bucket exists and is public — or paste an image URL below.");
    } else {
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(data.path);
      setForm((f) => ({ ...f, image_url: pub.publicUrl }));
    }
    setUploading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.price) { setError("Title and price are required."); return; }
    setSaving(true);
    setError("");
    const payload = {
      title:       form.title.trim(),
      description: form.description.trim(),
      price:       Number(form.price),
      image_url:   form.image_url,
      category:    form.category || "Other",
      seller_id:   user.id,
      seller_name: profile?.business_name || user.email,
    };
    const res = editing
      ? await supabase.from("products").update(payload).eq("id", editing)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (res.error) { setError("Could not save product: " + res.error.message); return; }
    setForm(EMPTY); setEditing(null); setShowForm(false);
    loadData(user.id);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts((ps) => ps.filter((p) => p.id !== id));
  }

  async function toggleActive(p) {
    const next = p.is_active === false;
    await supabase.from("products").update({ is_active: next }).eq("id", p.id);
    setProducts((ps) => ps.map((x) => x.id === p.id ? { ...x, is_active: next } : x));
  }

  function startEdit(p) {
    setForm({ title: p.title, description: p.description || "", price: p.price, image_url: p.image_url || "", category: p.category || "Other" });
    setEditing(p.id); setShowForm(true); setError("");
    window.scrollTo(0, 0);
  }

  function cancelForm() { setForm(EMPTY); setEditing(null); setShowForm(false); setError(""); }

  // Analytics
  const lineTotal       = (o) => o.product_price * (o.quantity || 1);
  const totalRevenue    = orders.reduce((s, o) => s + lineTotal(o), 0);
  const deliveredRev    = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + lineTotal(o), 0);
  const pendingOrders   = orders.filter((o) => o.status === "pending");
  const confirmedOrders = orders.filter((o) => o.status === "confirmed");
  const productCounts   = {};
  orders.forEach((o) => {
    if (o.product_title) productCounts[o.product_title] = (productCounts[o.product_title] || 0) + 1;
  });
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { icon: "💰", label: "Total Revenue",   value: ksh(totalRevenue),    sub: `${ksh(deliveredRev)} delivered` },
    { icon: "📋", label: "Total Orders",    value: orders.length,         sub: `${confirmedOrders.length} confirmed` },
    { icon: "⏳", label: "Pending Orders",  value: pendingOrders.length,  sub: "need your attention", alert: pendingOrders.length > 0 },
    { icon: "📦", label: "Products Listed", value: products.length,       sub: topProduct ? `Top: ${topProduct[0]}` : "Add products to start selling" },
  ];

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
      <div className="text-gray-400 dark:text-[#a0a0a0]">Loading…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* New order toast */}
      {newOrder && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-white text-white dark:text-black px-5 py-4 rounded-2xl shadow-2xl max-w-xs animate-bounce">
          <p className="font-bold text-base">🛍️ New Order!</p>
          <p className="text-sm opacity-70 mt-1">{newOrder.product_title} — {newOrder.buyer_name}</p>
          <button onClick={() => setNewOrder(null)} className="absolute top-2 right-3 opacity-50 hover:opacity-100 text-lg transition-opacity">×</button>
        </div>
      )}

      {/* Nav */}
      <nav className="bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#2a2a2a] sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Soko Yangu</Link>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors text-base"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? "☀" : "☽"}
            </button>
            <span className="text-sm text-gray-500 dark:text-[#a0a0a0] hidden sm:block font-medium">{profile?.business_name || user.email}</span>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
              className="text-sm text-gray-400 dark:text-[#a0a0a0] hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{profile?.business_name || "Your Shop"}</h1>
          <p className="text-gray-400 dark:text-[#a0a0a0] text-sm mt-0.5">Seller Dashboard</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-7 flex-wrap">
          <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>📊 Overview</TabBtn>
          <TabBtn active={tab === "products"} onClick={() => setTab("products")}>📦 Products ({products.length})</TabBtn>
          <TabBtn active={tab === "orders"}   onClick={() => setTab("orders")}   badge={pendingOrders.length}>
            📋 Orders ({orders.length})
          </TabBtn>
        </div>

        {/* ── Overview tab ── */}
        {tab === "overview" && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((s) => (
                <div key={s.label} className={`bg-white dark:bg-[#141414] rounded-2xl p-5 border-2 ${
                  s.alert ? "border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/30" : "border-gray-100 dark:border-[#2a2a2a]"
                }`}>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={`text-2xl font-black ${s.alert ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>{s.value}</div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-[#a0a0a0] mt-1">{s.label}</div>
                  <div className="text-xs text-gray-400 dark:text-[#555] mt-0.5 truncate">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Recent orders preview */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-gray-900 dark:text-white">Recent Orders</h2>
                <button onClick={() => setTab("orders")} className="text-sm text-gray-900 dark:text-white font-semibold hover:underline">View all →</button>
              </div>
              {orders.length === 0 ? (
                <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] text-center py-12 text-gray-400 dark:text-[#a0a0a0]">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="font-medium">No orders yet</p>
                  <p className="text-sm mt-1">Share your shop link to start getting orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((o) => (
                    <OrderCard key={o.id} order={o} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Products tab ── */}
        {tab === "products" && (
          <div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="mb-6 bg-gray-900 text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
              >
                + Add New Product
              </button>
            )}

            {showForm && (
              <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm p-6 mb-6">
                <h2 className="text-lg font-black text-gray-900 dark:text-white mb-5">{editing ? "Edit Product" : "Add New Product"}</h2>
                {error && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
                )}
                <form onSubmit={handleSave} className="space-y-4">
                  <Field label="Product Title *"  value={form.title}       onChange={(v) => setForm({ ...form, title: v })}       placeholder="e.g. Fresh Avocados (1kg)" />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-[#a0a0a0] mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      placeholder="Describe your product…"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-[#2a2a2a] rounded-xl bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] focus:outline-none focus:border-gray-900 dark:focus:border-white resize-none text-sm transition-colors"
                    />
                  </div>
                  <Field label="Price (KSh) *" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="500" />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-[#a0a0a0] mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-[#2a2a2a] rounded-xl bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-[#a0a0a0] mb-1">Product Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full text-sm text-gray-500 dark:text-[#a0a0a0] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-100 dark:file:bg-[#1a1a1a] file:text-gray-700 dark:file:text-white file:font-semibold hover:file:bg-gray-200 dark:hover:file:bg-[#2a2a2a]"
                    />
                    {uploading && <p className="text-xs text-gray-400 dark:text-[#a0a0a0] mt-1">Uploading…</p>}
                    <input
                      type="text"
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      placeholder="…or paste an image URL"
                      className="w-full mt-2 px-4 py-2.5 border border-gray-200 dark:border-[#2a2a2a] rounded-xl bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] text-sm focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors"
                    />
                    {form.image_url && (
                      <img
                        src={form.image_url}
                        alt="Preview"
                        className="mt-2 h-24 w-24 object-cover rounded-xl border border-gray-100 dark:border-[#2a2a2a]"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    )}
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={saving}
                      className="bg-gray-900 text-white dark:bg-white dark:text-black px-6 py-2.5 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">
                      {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
                    </button>
                    <button type="button" onClick={cancelForm}
                      className="bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#a0a0a0] px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {products.length === 0 ? (
              <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] text-center py-16 text-gray-400 dark:text-[#a0a0a0]">
                <div className="text-5xl mb-3">📦</div>
                <p className="font-semibold">No products yet</p>
                <p className="text-sm mt-1">Add your first product to start selling</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => {
                  const hidden = p.is_active === false;
                  return (
                  <div key={p.id} className={`bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] overflow-hidden hover:shadow-md transition-shadow ${hidden ? "opacity-60" : ""}`}>
                    <div className="relative">
                      <img src={p.image_url || NO_IMAGE} alt={p.title} className="w-full aspect-square object-cover bg-gray-100 dark:bg-[#1a1a1a]" onError={(e) => { e.target.src = NO_IMAGE; }} />
                      {hidden && (
                        <span className="absolute top-2 left-2 bg-gray-900/80 text-white text-xs font-bold px-2.5 py-1 rounded-full">Hidden</span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">{p.title}</h3>
                      <p className="text-gray-900 dark:text-white font-black text-lg mt-1">{ksh(p.price)}</p>
                      {p.description && <p className="text-gray-500 dark:text-[#a0a0a0] text-xs mt-1.5 line-clamp-2">{p.description}</p>}
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => startEdit(p)} className="flex-1 text-sm bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#a0a0a0] py-2 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors">Edit</button>
                        <button onClick={() => toggleActive(p)} className="flex-1 text-sm bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#a0a0a0] py-2 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors">{hidden ? "Show" : "Hide"}</button>
                        <button onClick={() => handleDelete(p.id)} className="flex-1 text-sm bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 py-2 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">Delete</button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Orders tab ── */}
        {tab === "orders" && (
          <div>
            {orders.length === 0 ? (
              <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] text-center py-16 text-gray-400 dark:text-[#a0a0a0]">
                <div className="text-5xl mb-3">📋</div>
                <p className="font-semibold">No orders yet</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-5 flex-wrap">
                  {[
                    { key: "all",       label: `All (${orders.length})` },
                    { key: "pending",   label: `Pending (${pendingOrders.length})` },
                    { key: "confirmed", label: `Confirmed (${confirmedOrders.length})` },
                    { key: "delivered", label: `Delivered (${orders.filter((o) => o.status === "delivered").length})` },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setOrderFilter(f.key)}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                        orderFilter === f.key
                          ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white"
                          : "bg-white dark:bg-[#141414] text-gray-600 dark:text-[#a0a0a0] border-gray-200 dark:border-[#2a2a2a] hover:border-gray-400 dark:hover:border-[#555]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {(() => {
                  const shown = orderFilter === "all" ? orders : orders.filter((o) => o.status === orderFilter);
                  return shown.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 dark:text-[#a0a0a0]">
                      <p className="font-medium">No {orderFilter} orders</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shown.map((o) => <OrderCard key={o.id} order={o} />)}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order: o }) {
  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900 dark:text-white">{o.product_title}{o.quantity > 1 ? ` ×${o.quantity}` : ""}</p>
            <p className="text-gray-900 dark:text-white font-black">{ksh(o.product_price * (o.quantity || 1))}</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#a0a0a0] mt-1.5">👤 {o.buyer_name} · 📞 {o.buyer_phone}</p>
          <p className="text-sm text-gray-600 dark:text-[#a0a0a0]">📍 {o.delivery_location}</p>
          <p className="text-xs text-gray-400 dark:text-[#555] mt-1">{new Date(o.created_at).toLocaleString("en-KE")}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${
          STATUS_STYLE[o.status] || "bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-[#a0a0a0]"
        }`}>
          {o.status}
        </span>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all ${
        active
          ? "bg-gray-900 text-white dark:bg-white dark:text-black shadow-sm"
          : "bg-white dark:bg-[#141414] text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a]"
      }`}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
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
