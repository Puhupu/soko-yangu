import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, ksh, NO_IMAGE } from "../../lib/supabase";
import { useCart } from "../../lib/CartContext";

export default function ProductPage() {
  const router     = useRouter();
  const { id }     = router.query;
  const { add, count } = useCart();
  const [product,    setProduct]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [form,       setForm]       = useState({ name: "", phone: "", location: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState("");
  const [vendorWA,   setVendorWA]   = useState(null);
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
    const { error: insertErr } = await supabase.from("orders").insert({
      product_id:        product.id,
      product_title:     product.title,
      product_price:     product.price,
      seller_id:         product.seller_id,
      buyer_name:        form.name.trim(),
      buyer_phone:       form.phone.trim(),
      delivery_location: form.location.trim(),
      status:            "pending",
    });
    if (insertErr) {
      setSubmitting(false);
      setError("Could not place order. Please try again.");
      return;
    }

    const { data: sp } = await supabase
      .from("seller_profiles")
      .select("phone, business_name")
      .eq("id", product.seller_id)
      .single();

    if (sp?.phone) {
      const phone = "254" + String(sp.phone).replace(/\D/g, "").replace(/^0/, "");
      const msg   = encodeURIComponent(
        `🛍️ New Order — Soko Yangu\n\nProduct: ${product.title}\nPrice: ${ksh(product.price)}\n\nBuyer: ${form.name.trim()}\nPhone: ${form.phone.trim()}\nLocation: ${form.location.trim()}`
      );
      setVendorWA({ url: `https://wa.me/${phone}?text=${msg}`, name: sp.business_name });
    }

    setSubmitting(false);
    setSuccess(true);
    window.scrollTo(0, 0);
  }

  function handleAddToCart() {
    add(product);
    setCartFlash(true);
    setTimeout(() => setCartFlash(false), 1400);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-3">
      <div className="text-5xl">🔍</div>
      <p className="font-medium">Product not found.</p>
      <Link href="/" className="text-emerald-600 font-semibold hover:underline">← Back to shop</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-emerald-600 tracking-tight">Soko Yangu</Link>
          <Link href="/" className="relative">
            <span className="text-xl">🛒</span>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center leading-none">
                {count}
              </span>
            )}
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/" className="text-sm text-gray-500 hover:text-emerald-600 font-medium transition-colors">← Back to shop</Link>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mt-4 border border-gray-100">
          <img
            src={product.image_url || NO_IMAGE}
            alt={product.title}
            className="w-full h-72 object-cover bg-gray-100"
            onError={(e) => { e.target.src = NO_IMAGE; }}
          />
          <div className="p-6">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{product.title}</h1>
            <p className="text-3xl font-black text-emerald-600 mt-2">{ksh(product.price)}</p>
            {product.seller_name && (
              <p className="text-sm text-gray-500 mt-1">Sold by <span className="font-semibold">{product.seller_name}</span></p>
            )}
            {product.description && (
              <p className="text-gray-600 mt-4 leading-relaxed whitespace-pre-line">{product.description}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-sm px-3 py-1.5 rounded-full font-semibold border border-emerald-100">
                💵 Cash on Delivery
              </span>
              <button
                onClick={handleAddToCart}
                className={`inline-flex items-center text-sm px-4 py-1.5 rounded-full font-bold border-2 transition-all duration-200 ${
                  cartFlash ? "bg-emerald-600 text-white border-emerald-600 scale-95" : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                {cartFlash ? "Added to Cart ✓" : "+ Add to Cart"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm mt-6 p-6 border border-gray-100">
          {success ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-black text-gray-900">Order placed!</h2>
              <p className="text-gray-500 mt-2">
                The seller will contact you at <strong>{form.phone}</strong> to arrange delivery.
              </p>
              <p className="text-emerald-600 font-bold mt-2">You&apos;ll pay {ksh(product.price)} on delivery.</p>

              {vendorWA && (
                <div className="mt-7">
                  <p className="text-sm text-gray-500 mb-3">Send the order details to the vendor now:</p>
                  <a
                    href={vendorWA.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <span className="text-lg">📲</span>
                    WhatsApp {vendorWA.name}
                  </a>
                  <p className="text-xs text-gray-400 mt-2">Opens WhatsApp with your order details pre-filled</p>
                </div>
              )}

              <Link href="/" className="mt-7 inline-block bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                Continue Shopping →
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black text-gray-900 mb-5">📦 Place Your Order</h2>
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
              )}
              <form onSubmit={handleOrder} className="space-y-4">
                <Field label="Your Name"         value={form.name}     onChange={(v) => setForm({ ...form, name: v })}     placeholder="e.g. John Kamau" />
                <Field label="Phone / WhatsApp"  value={form.phone}    onChange={(v) => setForm({ ...form, phone: v })}    placeholder="07xx xxx xxx" type="tel" />
                <Field label="Delivery Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="e.g. Syokimau, Phase 3" />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-black text-base hover:bg-emerald-700 disabled:opacity-50 transition-colors mt-2"
                >
                  {submitting ? "Placing order…" : `Order Now · ${ksh(product.price)}`}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
      />
    </div>
  );
}
