import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase, ksh, NO_IMAGE } from "../lib/supabase";
import { useCart } from "../lib/CartContext";

const AVATAR_COLORS = [
  ["bg-emerald-100", "text-emerald-700"],
  ["bg-blue-100",    "text-blue-700"],
  ["bg-purple-100",  "text-purple-700"],
  ["bg-amber-100",   "text-amber-700"],
  ["bg-rose-100",    "text-rose-700"],
  ["bg-cyan-100",    "text-cyan-700"],
];

function CartDrawer({ open, onClose, sellers }) {
  const { items, remove, updateQty, clear, total, count } = useCart();
  const [step,        setStep]        = useState("items");
  const [form,        setForm]        = useState({ name: "", phone: "", location: "" });
  const [busy,        setBusy]        = useState(false);
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
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "items" && (
            items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 pb-16">
                <div className="text-6xl mb-4">🛒</div>
                <p className="font-semibold">Your cart is empty</p>
                <p className="text-sm mt-1">Browse products and tap + Cart</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start bg-gray-50 rounded-2xl p-3">
                    <img
                      src={item.image_url || NO_IMAGE}
                      alt={item.title}
                      className="w-16 h-16 rounded-xl object-cover bg-gray-200 flex-shrink-0"
                      onError={(e) => { e.target.src = NO_IMAGE; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">{item.title}</p>
                      <p className="text-emerald-600 font-bold text-sm mt-1">{ksh(item.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 font-bold flex items-center justify-center hover:bg-gray-100">−</button>
                        <span className="text-sm font-semibold w-5 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 font-bold flex items-center justify-center hover:bg-gray-100">+</button>
                      </div>
                    </div>
                    <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-400 text-xl leading-none mt-1 flex-shrink-0">×</button>
                  </div>
                ))}
              </div>
            )
          )}

          {step === "form" && (
            <form id="cart-checkout" onSubmit={handleCheckout} className="space-y-4">
              <div className="bg-emerald-50 rounded-2xl p-4 mb-2">
                <p className="text-sm font-semibold text-emerald-800">{count} item{count !== 1 ? "s" : ""} · {ksh(total)}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Pay cash on delivery</p>
              </div>
              {[
                { key: "name",     label: "Your Name",         placeholder: "e.g. John Kamau",       type: "text" },
                { key: "phone",    label: "Phone / WhatsApp",  placeholder: "07xx xxx xxx",           type: "tel"  },
                { key: "location", label: "Delivery Location", placeholder: "e.g. Syokimau Phase 3", type: "text" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
              ))}
            </form>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-gray-900">Orders placed!</h3>
              <p className="text-gray-500 text-sm mt-2 max-w-xs">Sellers will contact you at <strong>{form.phone}</strong> to arrange delivery.</p>
              {vendorLinks.length > 0 && (
                <div className="w-full mt-7 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notify your vendors</p>
                  {vendorLinks.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors w-full">
                      <span className="text-lg">📲</span>
                      <span>WhatsApp {l.name}</span>
                    </a>
                  ))}
                  <p className="text-xs text-gray-400">Tap to open WhatsApp and send your order details to each vendor.</p>
                </div>
              )}
              <button onClick={onClose} className="mt-8 text-emerald-600 font-bold text-sm hover:underline">← Continue Shopping</button>
            </div>
          )}
        </div>

        {step === "items" && items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-sm text-gray-500">{count} item{count !== 1 ? "s" : ""}</span>
              <span className="font-black text-lg text-gray-900">{ksh(total)}</span>
            </div>
            <button onClick={() => setStep("form")} className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-emerald-700 transition-colors">
              Checkout →
            </button>
          </div>
        )}
        {step === "form" && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-2">
            <button form="cart-checkout" type="submit" disabled={busy}
              className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {busy ? "Placing orders…" : `Confirm · ${ksh(total)}`}
            </button>
            <button onClick={() => setStep("items")} className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">← Back to cart</button>
          </div>
        )}
      </div>
    </>
  );
}

export default function Home() {
  const { add, count } = useCart();
  const [products,     setProducts]     = useState([]);
  const [sellers,      setSellers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [selectedShop, setSelectedShop] = useState(null);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [flashId,      setFlashId]      = useState(null);
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
    return matchesShop && matchesSearch;
  });

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
    <div className="min-h-screen bg-gray-50">
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} sellers={sellers} />

      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-black text-emerald-600 tracking-tight flex-shrink-0">
            Soko Yangu
          </Link>
          <div className="hidden sm:flex flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-full text-sm bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/seller/login" className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-emerald-600 transition-colors">
              Sell on Soko →
            </Link>
            <button onClick={() => setCartOpen(true)} className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <span className="text-xl">🛒</span>
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tight">Your Local Marketplace</h1>
          <p className="text-emerald-100 mb-7 text-base">Order from shops near you · Pay cash on delivery</p>
          <div className="sm:hidden">
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl text-gray-900 text-base focus:outline-none shadow-lg"
            />
          </div>
          <div className="hidden sm:flex justify-center gap-3 mt-1">
            {["🛍️ Browse Products", "💵 Pay on Delivery", "📲 WhatsApp Support"].map((t) => (
              <span key={t} className="text-xs bg-white/15 px-3 py-1.5 rounded-full font-medium">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8" ref={productsRef}>
        {shops.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedShop(null)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                !selectedShop ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
              }`}
            >
              All Products
            </button>
            {shops.map((s) => (
              <button
                key={s.id}
                onClick={() => selectShop(s.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                  selectedShop === s.id ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                }`}
              >
                {s.business_name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black text-gray-900">{activeShopName || "Browse Products"}</h2>
            {!loading && (
              <p className="text-sm text-gray-400 mt-0.5">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}{activeShopName ? " in this shop" : ""}
              </p>
            )}
          </div>
          {count > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
            >
              🛒 Cart ({count})
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-5 bg-gray-100 rounded-full w-1/2" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-8 bg-gray-100 rounded-xl flex-1" />
                    <div className="h-8 bg-gray-100 rounded-xl flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <div className="text-6xl mb-4">🔍</div>
            <p className="font-semibold text-lg text-gray-500">{search ? `No results for "${search}"` : "No products yet"}</p>
            {search && <p className="text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const isFlash = flashId === p.id;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col group">
                  <Link href={`/product/${p.id}`} className="block aspect-square overflow-hidden bg-gray-50">
                    <img
                      src={p.image_url || NO_IMAGE}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.src = NO_IMAGE; }}
                    />
                  </Link>
                  <div className="p-3 flex flex-col flex-1">
                    <Link href={`/product/${p.id}`}>
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 hover:text-emerald-600 transition-colors">
                        {p.title}
                      </h3>
                    </Link>
                    <p className="text-emerald-600 font-black text-base mt-1.5">{ksh(p.price)}</p>
                    {p.seller_name && <p className="text-xs text-gray-400 mt-0.5 truncate">by {p.seller_name}</p>}
                    <div className="flex gap-1.5 mt-auto pt-3">
                      <button
                        onClick={(e) => handleAddToCart(p, e)}
                        className={`flex-1 text-xs font-bold py-2 rounded-xl border-2 transition-all duration-200 ${
                          isFlash ? "bg-emerald-600 text-white border-emerald-600 scale-95" : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {isFlash ? "Added ✓" : "+ Cart"}
                      </button>
                      <Link
                        href={`/product/${p.id}`}
                        className="flex-1 text-xs font-bold py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-center"
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

        {!loading && shops.length > 0 && (
          <div className="mt-20">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-gray-900">Browse Shops</h2>
              <p className="text-gray-500 text-sm mt-1">Find vendors you trust and explore everything they sell</p>
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
                      isActive ? "border-emerald-500 bg-emerald-50/60 shadow-md" : "border-gray-100 bg-white hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0 ${bg} ${textCol}`}>
                        {(s.business_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{s.business_name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{s.productCount} product{s.productCount !== 1 ? "s" : ""}</p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${isActive ? "text-emerald-600" : "text-gray-300"}`}>
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

      <footer className="border-t border-gray-100 text-center text-xs text-gray-400 py-10 mt-10">
        <p className="font-bold text-gray-500 mb-1">Soko Yangu</p>
        <p>Kenya&apos;s simple marketplace · Cash on Delivery</p>
      </footer>
    </div>
  );
}
