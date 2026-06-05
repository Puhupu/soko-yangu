import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, ADMIN_EMAIL, ksh, NO_IMAGE } from "../../lib/supabase";

const EMPTY = { title: "", description: "", price: "", image_url: "" };
const STATUS_STYLE = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
};

export default function SellerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/seller/login"); return; }
      if (session.user.email === ADMIN_EMAIL) { router.push("/admin/dashboard"); return; }
      setUser(session.user);
      loadProfile(session.user.id);
      loadData(session.user.id);
    });
  }, []);

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
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) {
      setError("Image upload failed. Make sure the 'product-images' storage bucket exists and is public — or paste an image URL below instead.");
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
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      image_url: form.image_url,
      seller_id: user.id,
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

  function startEdit(p) {
    setForm({ title: p.title, description: p.description || "", price: p.price, image_url: p.image_url || "" });
    setEditing(p.id); setShowForm(true); setError("");
    window.scrollTo(0, 0);
  }

  function cancelForm() { setForm(EMPTY); setEditing(null); setShowForm(false); setError(""); }

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-green-600">🛍️ Soko Yangu</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{profile?.business_name || user.email}</span>
            <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
              className="text-sm text-gray-500 hover:text-red-600">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Seller Dashboard</h1>
        <p className="text-gray-500 text-sm mb-6">{profile?.business_name || "Your Shop"}</p>

        <div className="flex gap-2 mb-6">
          <TabBtn active={tab === "products"} onClick={() => setTab("products")}>📦 Products ({products.length})</TabBtn>
          <TabBtn active={tab === "orders"} onClick={() => setTab("orders")} badge={pendingCount}>📋 Orders ({orders.length})</TabBtn>
        </div>

        {tab === "products" && (
          <div>
            {!showForm && (
              <button onClick={() => setShowForm(true)}
                className="mb-6 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">
                + Add New Product
              </button>
            )}

            {showForm && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h2 className="text-lg font-bold mb-4">{editing ? "Edit Product" : "Add New Product"}</h2>
                {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
                <form onSubmit={handleSave} className="space-y-4">
                  <Field label="Product Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g. Fresh Avocados (1kg)" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                      placeholder="Describe your product…"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 resize-none" />
                  </div>
                  <Field label="Price (KSh) *" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="500" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                    <input type="file" accept="image/*" onChange={handleImageUpload}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                    {uploading && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
                    <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      placeholder="…or paste an image URL"
                      className="w-full mt-2 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500" />
                    {form.image_url && <img src={form.image_url} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-lg border" onError={(e) => { e.target.style.display = "none"; }} />}
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={saving}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
                      {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
                    </button>
                    <button type="button" onClick={cancelForm}
                      className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {products.length === 0 ? (
              <Empty>No products yet. Add your first one!</Empty>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl border overflow-hidden">
                    <img src={p.image_url || NO_IMAGE} alt={p.title} className="w-full h-36 object-cover bg-gray-100" onError={(e) => { e.target.src = NO_IMAGE; }} />
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900">{p.title}</h3>
                      <p className="text-green-600 font-bold mt-1">{ksh(p.price)}</p>
                      {p.description && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{p.description}</p>}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => startEdit(p)} className="flex-1 text-sm bg-gray-100 text-gray-700 py-1.5 rounded-lg hover:bg-gray-200">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="flex-1 text-sm bg-red-50 text-red-600 py-1.5 rounded-lg hover:bg-red-100">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold text-gray-900">{o.product_title}</p>
                      <p className="text-green-600 font-bold">{ksh(o.product_price)}</p>
                      <p className="text-sm text-gray-600 mt-2">👤 {o.buyer_name} · 📞 {o.buyer_phone}</p>
                      <p className="text-sm text-gray-600">📍 {o.delivery_location}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(o.created_at).toLocaleString("en-KE")}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[o.status]}`}>{o.status}</span>
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

function TabBtn({ active, onClick, children, badge }) {
  return (
    <button onClick={onClick}
      className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"}`}>
      {children}
      {badge > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">{badge}</span>}
    </button>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500" />
    </div>
  );
}

function Empty({ children }) {
  return <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border">{children}</div>;
}
