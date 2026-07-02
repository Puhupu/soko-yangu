import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, ksh, NO_IMAGE } from "../../lib/supabase";
import { useCart } from "../../lib/CartContext";
import { useTheme } from "../../lib/ThemeContext";

export default function ProductPage() {
  const router     = useRouter();
  const { id }     = router.query;
  const { add, count } = useCart();
  const { dark, toggle } = useTheme();
  const [product,    setProduct]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [qty,        setQty]        = useState(1);
  const [form,       setForm]       = useState({ name: "", phone: "", location: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [cartFlash,  setCartFlash]  = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*").eq("id", id).single().then(({ data }) => {
      setProduct(data);
      setLoading(false);
    });
  }, [id]);

  async function handleOrder(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.location.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { data: inserted, error: insertErr } = await supabase
      .from("orders")
      .insert({
        product_id:        product.id,
        product_title:     product.title,
        product_price:     product.price,
        seller_id:         product.seller_id,
        quantity:          qty,
        buyer_name:        form.name.trim(),
        buyer_phone:       form.phone.trim(),
        delivery_location: form.location.trim(),
        status:            "pending",
      })
      .select()
      .single();

    if (insertErr) {
      setSubmitting(false);
      setError("Could not place order. Please try again.");
      return;
    }

    setSubmitting(false);
    // Redirect to the confirmation page, which offers a reliable
    // "Notify seller on WhatsApp" button (auto-popups get blocked by browsers).
    router.push(`/order/confirm?id=${inserted.id}`);
  }

  function handleAddToCart() {
    add(product, qty);
    setCartFlash(true);
    setTimeout(() => setCartFlash(false), 1400);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
      <div className="text-gray-400 dark:text-[#a0a0a0]">Loading…</div>
    </div>
  );
  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-3 bg-white dark:bg-[#0a0a0a]">
      <div className="text-5xl">🔍</div>
      <p className="font-medium text-gray-500 dark:text-[#a0a0a0]">Product not found.</p>
      <Link href="/" className="text-gray-900 dark:text-white font-semibold hover:underline">← Back to shop</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Nav */}
      <nav className="bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#2a2a2a] sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Soko Yangu</Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors text-base"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? "☀" : "☽"}
            </button>
            <Link href="/" className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors">
              <span className="text-xl">🛒</span>
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-white font-medium transition-colors group"
        >
          <span className="w-7 h-7 rounded-full border border-gray-200 dark:border-[#2a2a2a] flex items-center justify-center group-hover:border-gray-400 dark:group-hover:border-[#555] transition-colors text-xs">
            ←
          </span>
          Back
        </button>

        {/* Product card */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl overflow-hidden shadow-sm mt-4 border border-gray-100 dark:border-[#2a2a2a]">
          <img
            src={product.image_url || NO_IMAGE}
            alt={product.title}
            className="w-full h-72 object-cover bg-gray-100 dark:bg-[#1a1a1a]"
            onError={(e) => { e.target.src = NO_IMAGE; }}
          />
          <div className="p-6">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{product.title}</h1>
            <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">{ksh(product.price)}</p>
            {product.seller_name && (
              <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mt-1">Sold by <span className="font-semibold">{product.seller_name}</span></p>
            )}
            {product.description && (
              <p className="text-gray-600 dark:text-[#a0a0a0] mt-4 leading-relaxed whitespace-pre-line">{product.description}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex items-center bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#a0a0a0] text-sm px-3 py-1.5 rounded-full font-semibold border border-gray-200 dark:border-[#2a2a2a]">
                💵 Cash on Delivery
              </span>
              <button
                onClick={handleAddToCart}
                className={`inline-flex items-center text-sm px-4 py-1.5 rounded-full font-bold border-2 transition-all duration-200 ${
                  cartFlash
                    ? "bg-gray-900 text-white border-gray-900 scale-95 dark:bg-white dark:text-black dark:border-white"
                    : "border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                }`}
              >
                {cartFlash ? "Added to Cart ✓" : "+ Add to Cart"}
              </button>
            </div>
          </div>
        </div>

        {/* Order form */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl shadow-sm mt-6 p-6 border border-gray-100 dark:border-[#2a2a2a]">
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-5">📦 Place Your Order</h2>
          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
          )}
          <form onSubmit={handleOrder} className="space-y-4">
            {/* Quantity selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-[#a0a0a0] mb-1">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-[#a0a0a0] font-bold text-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  −
                </button>
                <span className="text-lg font-black text-gray-900 dark:text-white w-8 text-center">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-[#a0a0a0] font-bold text-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <Field label="Your Name"         value={form.name}     onChange={(v) => setForm({ ...form, name: v })}     placeholder="e.g. John Kamau" />
            <Field label="Phone / WhatsApp"  value={form.phone}    onChange={(v) => setForm({ ...form, phone: v })}    placeholder="07xx xxx xxx" type="tel" />
            <Field label="Delivery Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="e.g. Syokimau, Phase 3" />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gray-900 text-white dark:bg-white dark:text-black py-3.5 rounded-2xl font-black text-base hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors mt-2"
            >
              {submitting ? "Placing order…" : `Order Now · ${ksh(product.price * qty)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
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
