import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase, ksh, NO_IMAGE } from "../lib/supabase";
import { useCart } from "../lib/CartContext";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/AuthContext";

const CATEGORIES = ["Groceries", "Produce", "Beverages", "Household", "Food & Snacks", "Services", "Other"];

const AVATAR_COLORS = [
  ["bg-zinc-200 dark:bg-zinc-800",     "text-zinc-700 dark:text-zinc-200"],
  ["bg-blue-100 dark:bg-blue-950",     "text-blue-700 dark:text-blue-300"],
  ["bg-violet-100 dark:bg-violet-950", "text-violet-700 dark:text-violet-300"],
  ["bg-amber-100 dark:bg-amber-950",   "text-amber-700 dark:text-amber-300"],
  ["bg-rose-100 dark:bg-rose-950",     "text-rose-700 dark:text-rose-300"],
  ["bg-sky-100 dark:bg-sky-950",       "text-sky-700 dark:text-sky-300"],
];

// ─── Cart Drawer ───────────────────────────────────────────────────────────────
function CartDrawer({ open, onClose, sellers }) {
  const { items, remove, updateQty, clear, total, count } = useCart();
  const [step, setStep]       = useState("items"); // items | form | success
  const [form, setForm]       = useState({ name: "", phone: "", location: "" });
  const [busy, setBusy]       = useState(false);
  const [vendorLinks, setVendorLinks] = useState([]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("items");
        setForm({ name: "", phone: "", location: "" });
        setVendorLinks([]);
      }, 300);
    }
  }, [open]);

  async function handleCheckout(e) {
    e.preventDefault();
    setBusy(true);
    const inserts = items.map((item) => ({
      product_id:        item.id,
      product_title:     item.title,
      product_price:     item.price,
      seller_id:         item.seller_id,
      buyer_name:        form.name.trim(),
      buyer_phone:       form.phone.trim(),
      delivery_location: form.location.trim(),
      status:            "pending",
    }));
    await supabase.from("orders").insert(inserts);

    // Build vendor WhatsApp deep-links (one per seller)
    const sellerIds = [...new Set(items.map((i) => i.seller_id))];
    const links = [];
    for (const sid of sellerIds) {
      const sp = sellers.find((s) => s.id === sid);
      if (!sp?.phone) continue;
      const phone = "254" + String(sp.phone).replace(/\D/g, "").replace(/^0/, "");
      const sellerItems = items.filter((i) => i.seller_id === sid);
      const list = sellerItems.map((i) => `• ${i.title} ×${i.qty} — ${ksh(i.price * i.qty)}`).join("\n");
      const msg  = encodeURIComponent(
        `🛍️ New Order — Soko Yangu\n\n${list}\n\nBuyer: ${form.name.trim()}\nPhone: ${form.phone.trim()}\nLocation: ${form.location.trim()}\nTotal: ${ksh(sellerItems.reduce((s, i) => s + i.price * i.qty, 0))}`
      );
      links.push({ name: sp.business_name, url: `https://wa.me/${phone}?text=${msg}` });
    }
    setVendorLinks(links);
    clear();
    setBusy(false);
    setStep("success");
  }

  const title = step === "success" ? "Order Placed! 🎉" : step === "form" ? "Your Details" : `Cart (${count})`;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white dark:bg-[#0a0a0a] z-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#2a2a2a]">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-400 dark:text-[#a0a0a0] hover:text-gray-600 dark:hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {step === "items" && (
            items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-[#a0a0a0] pb-16">
                <div className="text-6xl mb-4">🛒</div>
                <p className="font-semibold">Your cart is empty</p>
                <p className="text-sm mt-1">Browse products and tap + Cart</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start bg-gray-50 dark:bg-[#141414] rounded-2xl p-3">
                    <img
                      src={item.image_url || NO_IMAGE}
                      alt={item.title}
                      className="w-16 h-16 rounded-xl object-cover bg-gray-200 dark:bg-[#1a1a1a] flex-shrink-0"
                      onError={(e) => { e.target.src = NO_IMAGE; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 leading-snug">{item.title}</p>
                      <p className="text-gray-900 dark:text-white font-bold text-sm mt-1">{ksh(item.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-[#a0a0a0] font-bold flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">−</button>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white w-5 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-[#a0a0a0] font-bold flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">+</button>
                      </div>
                    </div>
                    <button onClick={() => remove(item.id)} className="text-gray-300 dark:text-[#555] hover:text-red-400 text-xl leading-none mt-1 flex-shrink-0 transition-colors">×</button>
                  </div>
                ))}
              </div>
            )
          )}

          {step === "form" && (
            <form id="cart-checkout" onSubmit={handleCheckout} className="space-y-4">
              <div className="bg-gray-50 dark:bg-[#141414] rounded-2xl p-4 mb-2 border border-gray-100 dark:border-[#2a2a2a]">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{count} item{count !== 1 ? "s" : ""} · {ksh(total)}</p>
                <p className="text-xs text-gray-500 dark:text-[#a0a0a0] mt-0.5">Pay cash on delivery</p>
              </div>
              {[
                { key: "name",     label: "Your Name",         placeholder: "e.g. John Kamau",         type: "text" },
                { key: "phone",    label: "Phone / WhatsApp",  placeholder: "07xx xxx xxx",             type: "tel"  },
                { key: "location", label: "Delivery Location", placeholder: "e.g. Syokimau Phase 3",   type: "text" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-[#a0a0a0] mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required
                    className="w-full px-4 py-3 border border-gray-200 dark:border-[#2a2a2a] rounded-xl bg-white dark:bg-[#141414] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] focus:outline-none focus:border-gray-900 dark:focus:border-white text-sm transition-colors"
                  />
                </div>
              ))}
            </form>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Orders placed!</h3>
              <p className="text-gray-500 dark:text-[#a0a0a0] text-sm mt-2 max-w-xs">
                Sellers will contact you at <strong className="text-gray-900 dark:text-white">{form.phone}</strong> to arrange delivery.
              </p>
              {vendorLinks.length > 0 && (
                <div className="w-full mt-7 space-y-3">
                  <p className="text-xs font-bold text-gray-400 dark:text-[#a0a0a0] uppercase tracking-wider">Notify your vendors</p>
                  {vendorLinks.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-gray-100 dark:bg-[#141414] border border-gray-200 dark:border-[#2a2a2a] text-gray-900 dark:text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors w-full">
                      <span className="text-lg">📲</span>
                      <span>WhatsApp {l.name}</span>
                    </a>
                  ))}
                  <p className="text-xs text-gray-400 dark:text-[#a0a0a0]">Tap to open WhatsApp with your order details.</p>
                </div>
              )}
              <button onClick={onClose} className="mt-8 text-gray-500 dark:text-[#a0a0a0] font-bold text-sm hover:underline">
                ← Continue Shopping
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "items" && items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-[#2a2a2a]">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-sm text-gray-500 dark:text-[#a0a0a0]">{count} item{count !== 1 ? "s" : ""}</span>
              <span className="font-black text-lg text-gray-900 dark:text-white">{ksh(total)}</span>
            </div>
            <button onClick={() => setStep("form")} className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors">
              Checkout →
            </button>
          </div>
        )}
        {step === "form" && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-[#2a2a2a] space-y-2">
            <button form="cart-checkout" type="submit" disabled={busy}
              className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-100 disabled:opacity-50 transition-colors">
              {busy ? "Placing orders…" : `Confirm · ${ksh(total)}`}
            </button>
            <button onClick={() => setStep("items")} className="w-full text-sm text-gray-400 dark:text-[#a0a0a0] hover:text-gray-600 dark:hover:text-white py-1 transition-colors">
              ← Back to cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Homepage ─────────────────────────────────────────────────────────────────
export default function Home() {
  const router                  = useRouter();
  const { add, count }          = useCart();
  const { dark, toggle }        = useTheme();
  const { user, signOut }       = useAuth();
  const [products, setProducts] = useState([]);
  const [sellers,  setSellers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selectedShop,   setSelectedShop]   = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [cartOpen,    setCartOpen]    = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flashId,     setFlashId]     = useState(null);
  const productsRef = useRef(null);

  useEffect(() => {
    Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("seller_profiles").select("*").order("business_name"),
    ]).then(([{ data: prods }, { data: sels }]) => {
      setProducts(prods || []);
      setSellers(sels  || []);
      setLoading(false);
    });
  }, []);

  const q = search.toLowerCase();
  const filtered = products.filter((p) => {
    const matchesShop   = !selectedShop || p.seller_id === selectedShop;
    const matchesSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.seller_name  || "").toLowerCase().includes(q);
    const matchesCat    = categoryFilter === "All" || (p.category || "Other") === categoryFilter;
    return matchesShop && matchesSearch && matchesCat;
  });

  // Debounced search logging
  useEffect(() => {
    const trimmed = search.trim().toLowerCase();
    if (trimmed.length < 2) return;
    const resultCount = products.filter((p) =>
      p.title.toLowerCase().includes(trimmed) ||
      (p.description || "").toLowerCase().includes(trimmed) ||
      (p.seller_name  || "").toLowerCase().includes(trimmed)
    ).length;
    const t = setTimeout(() => {
      supabase.from("search_logs").insert({ query: trimmed, result_count: resultCount });
    }, 1500);
    return () => clearTimeout(t);
  }, [search, products]);

  const shops = sellers
    .map((s) => ({ ...s, productCount: products.filter((p) => p.seller_id === s.id).length }))
    .filter((s) => s.productCount > 0);

  function handleAddToCart(p, e) {
    e.preventDefault();
    e.stopPropagation();
    add(p);
    setFlashId(p.id);
    setTimeout(() => setFlashId(null), 1400);
  }

  function selectShop(id) {
    setSelectedShop(id === selectedShop ? null : id);
    productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeShopName = selectedShop ? shops.find((s) => s.id === selectedShop)?.business_name : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} sellers={sellers} />

      {/* Nav */}
      <nav className="bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-[#2a2a2a] sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-full px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
              aria-label="Open menu"
            >
              <span className="w-5 h-0.5 bg-gray-600 dark:bg-[#a0a0a0] rounded-full" />
              <span className="w-5 h-0.5 bg-gray-600 dark:bg-[#a0a0a0] rounded-full" />
              <span className="w-3 h-0.5 bg-gray-600 dark:bg-[#a0a0a0] rounded-full self-start ml-[2px]" />
            </button>
            <Link href="/" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              Soko Yangu
            </Link>
          </div>

          {/* Desktop search */}
          <div className="hidden sm:flex flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-[#2a2a2a] rounded-full text-sm bg-gray-50 dark:bg-[#141414] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors text-base"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? "☀" : "☽"}
            </button>

            {/* Buyer auth — desktop */}
            {user ? (
              <button
                onClick={() => signOut()}
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl text-gray-500 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition-colors"
                title={user.email}
              >
                👤 Sign Out
              </button>
            ) : (
              <Link href="/buyer/login" className="hidden sm:flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl text-gray-500 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition-colors">
                👤 Sign In
              </Link>
            )}

            <Link href="/seller/login" className="hidden sm:flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#a0a0a0] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] hover:text-gray-900 dark:hover:text-white transition-colors">
              🏪 Seller
            </Link>

            <button
              onClick={() => setCartOpen(true)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
            >
              <span className="text-xl">🛒</span>
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-[#0a0a0a] z-50 lg:hidden shadow-2xl border-r border-gray-100 dark:border-[#2a2a2a] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          categoryFilter={categoryFilter}
          setCategoryFilter={(c) => { setCategoryFilter(c); setSidebarOpen(false); }}
          onClose={() => setSidebarOpen(false)}
          user={user}
          signOut={() => { signOut(); setSidebarOpen(false); }}
        />
      </aside>

      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-14 left-0 bottom-0 w-56 bg-white dark:bg-[#0a0a0a] border-r border-gray-100 dark:border-[#2a2a2a] overflow-y-auto z-20">
        <SidebarContent
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          user={user}
          signOut={signOut}
        />
      </aside>

      {/* Page body — offset on desktop for sidebar */}
      <div className="lg:pl-56">

        {/* Mobile search bar */}
        <div className="sm:hidden px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#0a0a0a]">
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2a2a2a] rounded-full text-sm bg-gray-50 dark:bg-[#141414] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#555] focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors"
          />
        </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-8" ref={productsRef}>

        {/* Shop filter pills */}
        {shops.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedShop(null)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                !selectedShop
                  ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white"
                  : "bg-white dark:bg-[#141414] text-gray-600 dark:text-[#a0a0a0] border-gray-200 dark:border-[#2a2a2a] hover:border-gray-400 dark:hover:border-[#555]"
              }`}
            >
              All Products
            </button>
            {shops.map((s) => (
              <button
                key={s.id}
                onClick={() => selectShop(s.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                  selectedShop === s.id
                    ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white"
                    : "bg-white dark:bg-[#141414] text-gray-600 dark:text-[#a0a0a0] border-gray-200 dark:border-[#2a2a2a] hover:border-gray-400 dark:hover:border-[#555]"
                }`}
              >
                {s.business_name}
              </button>
            ))}
          </div>
        )}

        {/* Category filter pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setCategoryFilter("All")}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              categoryFilter === "All"
                ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white"
                : "bg-white dark:bg-[#141414] text-gray-600 dark:text-[#a0a0a0] border-gray-200 dark:border-[#2a2a2a] hover:border-gray-400 dark:hover:border-[#555]"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                categoryFilter === cat
                  ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white"
                  : "bg-white dark:bg-[#141414] text-gray-600 dark:text-[#a0a0a0] border-gray-200 dark:border-[#2a2a2a] hover:border-gray-400 dark:hover:border-[#555]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Section heading + cart CTA */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              {activeShopName || "Browse Products"}
            </h2>
            {!loading && (
              <p className="text-sm text-gray-400 dark:text-[#a0a0a0] mt-0.5">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                {activeShopName ? " in this shop" : ""}
              </p>
            )}
          </div>
          {count > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors shadow-sm"
            >
              🛒 Cart ({count})
            </button>
          )}
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100 dark:bg-[#1a1a1a]" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 dark:bg-[#1a1a1a] rounded-full w-3/4" />
                  <div className="h-5 bg-gray-100 dark:bg-[#1a1a1a] rounded-full w-1/2" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-8 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex-1" />
                    <div className="h-8 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400 dark:text-[#a0a0a0]">
            <div className="text-6xl mb-4">🔍</div>
            <p className="font-semibold text-lg">{search ? `No results for "${search}"` : "No products yet"}</p>
            {search && <p className="text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const isFlash = flashId === p.id;
              return (
                <div key={p.id} className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col group">
                  <Link href={`/product/${p.id}`} className="block aspect-square overflow-hidden bg-gray-50 dark:bg-[#1a1a1a]">
                    <img
                      src={p.image_url || NO_IMAGE}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.src = NO_IMAGE; }}
                    />
                  </Link>
                  <div className="p-3 flex flex-col flex-1">
                    <Link href={`/product/${p.id}`}>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2 hover:text-gray-600 dark:hover:text-[#a0a0a0] transition-colors">
                        {p.title}
                      </h3>
                    </Link>
                    <p className="text-gray-900 dark:text-white font-black text-base mt-1.5">{ksh(p.price)}</p>
                    {p.seller_name && <p className="text-xs text-gray-400 dark:text-[#a0a0a0] mt-0.5 truncate">by {p.seller_name}</p>}
                    <div className="flex gap-1.5 mt-auto pt-3">
                      <button
                        onClick={(e) => handleAddToCart(p, e)}
                        className={`flex-1 text-xs font-bold py-2 rounded-xl border-2 transition-all duration-200 ${
                          isFlash
                            ? "bg-gray-900 text-white border-gray-900 scale-95 dark:bg-white dark:text-black dark:border-white"
                            : "border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                        }`}
                      >
                        {isFlash ? "Added ✓" : "+ Cart"}
                      </button>
                      <Link
                        href={`/product/${p.id}`}
                        className="flex-1 text-xs font-bold py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors text-center"
                      >
                        Order
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Shops section */}
        {!loading && shops.length > 0 && (
          <div className="mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Browse Shops</h2>
              <p className="text-gray-500 dark:text-[#a0a0a0] text-sm mt-1">Find vendors you trust and explore everything they sell</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shops.map((s, i) => {
                const [bg, textCol] = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const isActive = selectedShop === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => selectShop(s.id)}
                    className={`text-left p-5 rounded-2xl border-2 transition-all hover:shadow-md ${
                      isActive
                        ? "border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5 shadow-md"
                        : "border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] hover:border-gray-400 dark:hover:border-[#555]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0 ${bg} ${textCol}`}>
                        {(s.business_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{s.business_name}</p>
                        <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-0.5">{s.productCount} product{s.productCount !== 1 ? "s" : ""}</p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${isActive ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-[#555]"}`}>
                        {isActive ? "Viewing ✓" : "→"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-gray-100 dark:border-[#2a2a2a] text-center text-xs text-gray-400 dark:text-[#a0a0a0] py-10 mt-10">
        <p className="font-bold text-gray-500 dark:text-[#a0a0a0] mb-1">Soko Yangu</p>
        <p>Kenya&apos;s simple marketplace · Cash on Delivery</p>
      </footer>

      </div> {/* end lg:pl-56 */}
    </div>
  );
}

// ─── Sidebar Content ──────────────────────────────────────────────────────────
function SidebarContent({ categoryFilter, setCategoryFilter, onClose, user, signOut }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#2a2a2a]">
        <Link href="/" className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
          Soko Yangu
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-400 text-xl transition-colors"
          >
            ×
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <SideLink href="/" icon="🏠" label="Home" onClick={onClose} />
        <SideLink href="/seller/login" icon="🏪" label="Seller Portal" onClick={onClose} />
        <SideLink href="/seller/dashboard" icon="📋" label="Orders" onClick={onClose} />

        {/* Category filters */}
        <div className="pt-4 pb-1">
          <p className="text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-widest px-3 mb-2">Categories</p>
          <button
            onClick={() => setCategoryFilter("All")}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              categoryFilter === "All"
                ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                : "text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
            }`}
          >
            All Products
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                categoryFilter === cat
                  ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                  : "text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 dark:border-[#2a2a2a] px-3 py-4">
        {user ? (
          <div className="space-y-1">
            <p className="text-xs text-gray-400 dark:text-[#555] px-3 truncate">{user.email}</p>
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/buyer/login"
            onClick={onClose}
            className="block px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
          >
            👤 Sign In
          </Link>
        )}
      </div>
    </div>
  );
}

function SideLink({ href, icon, label, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
