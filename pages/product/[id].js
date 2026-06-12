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
  const [form,       setForm]       = useState({ name: "", phone: "", location: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState("");
  const [vendorWA,   setVendorWA]   = useState(null); // {url, name} after order success
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

    // Fetch seller profile to build vendor WA link
    const { data: sp } = await supabase
      .from("seller_profiles")
      .select("phone, business_name")
      .eq("id", product.seller_id)
      .single();

    if (sp?.phone) {
      const phone = "254" + String(sp.phone).replace(/\D/g, "").replace(/^0/, "");
      const msg   = encodeURIComponent(
        `ðï¸ New Order â Soko Yangu\n\nProduct: ${product.title}\nPrice: ${ksh(product.price)}\n\nBuyer: ${form.name.trim()}\nPhone: ${form.phone.trim()}\nLocation: ${form.location.trim()}`
      );
      const waUrl = `https://wa.me/${phone}?text=${msg}`;
      setVendorWA({ url: waUrl, name: sp.business_name });
      // Auto-open WhatsApp to notify vendor (Item 6)
      window.open(waUrl, "_blank");
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
      <div className="text-gray-400 dark:text-[#a0a0a0]">Loadingâ¦</div>
    </div>
  );
  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-3 bg-white dark:bg-[#0a0a0a]">
      <div className="text-5xl">ð</div>
      <p className="font-medium text-gray-500 dark:text-[#a0a0a0]">Product not found.</p>
      <Link href="/" className="text-gray-900 dark:text-white font-semibold hover:underline">â Back to shop</Link>
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
              {dark ? "â" : "â½"}
            </button>
            <Link href="/" className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors">
              <span className="text-xl">ð</span>
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
        <Link href="/" className="text-sm text-gray-500 dark:text-[#a0a0a0] hover:text-gray-900 dark:hover:text-white font-medium transition-colors">
          â Back to shop
        </Link>

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
                ðµ Cash on Delivery
              </span>
              <button
                onClick={handleAddToCart}
                className={`inline-flex items-center text-sm px-4 py-1.5 rounded-full font-bold border-2 transition-all duration-200 ${
                  cartFlash
                    ? "bg-gray-900 text-white border-gray-900 scale-95 dark:bg-white dark:text-black dark:border-white"
                    : "border-gray-300 dark:border-[#2a2a2a] text-gray-700 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                }`}
              >
                {cartFlash ? "Added to Cart â" : "+ Add to Cart"}
              </button>
            </div>
          </div>
        </div>

        {/* Order form / success */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl shadow-sm mt-6 p-6 border border-gray-100 dark:border-[#2a2a2a]">
          {success ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">ð</div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Order placed!</h2>
              <p className="text-gray-500 dark:text-[#a0a0a0] mt-2">
                The seller will contact you at <strong className="text-gray-900 dark:text-white">{form.phone}</strong> to arrange delivery.
              </p>
              <p className="text-gray-900 dark:text-white font-bold mt-2">You&apos;ll pay {ksh(product.price)} on delivery.</p>

              {vendorWA && (
                <div className="mt-7">
                  <p className="text-sm text-gray-500 dark:text-[#a0a0a0] mb-3">WhatsApp opened automatically. Tap below if it didn&apos;t open:</p>
                  <a
                    href={vendorWA.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-gray-900 text-white dark:bg-white dark:text-black px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors shadow-sm"
                  >
                    <span className="text-lg">ð²</span>
                    WhatsApp {vendorWA.name}
                  </a>
                </div>
              )}

              <Link href="/" className="mt-7 inline-block bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#a0a0a0] px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors">
                Continue Shopping â
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-5">ð¦ Place Your Order</h2>
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
                  className="w-full bg-gray-900 text-white dark:bg-white dark:text-black py-3.5 rounded-2xl font-black text-base hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors mt-2"
                >
                  {submitting ? "Placing orderâ¦" : `Order Now Â· ${ksh(product.price)}`}
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
