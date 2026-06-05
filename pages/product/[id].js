import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, ksh, NO_IMAGE } from "../../lib/supabase";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", location: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

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
    const { error } = await supabase.from("orders").insert({
      product_id: product.id,
      product_title: product.title,
      product_price: product.price,
      seller_id: product.seller_id,
      buyer_name: form.name.trim(),
      buyer_phone: form.phone.trim(),
      delivery_location: form.location.trim(),
      status: "pending",
    });
    setSubmitting(false);
    if (error) { setError("Could not place order. Please try again."); return; }
    setSuccess(true);
    window.scrollTo(0, 0);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-3">
      <p>Product not found.</p>
      <Link href="/" className="text-green-600 font-medium">← Back to shop</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/" className="text-green-600 font-bold text-xl">🛍️ Soko Yangu</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/" className="text-sm text-gray-500 hover:text-green-600">← Back to shop</Link>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mt-4">
          <img
            src={product.image_url || NO_IMAGE}
            alt={product.title}
            className="w-full h-64 object-cover bg-gray-100"
            onError={(e) => { e.target.src = NO_IMAGE; }}
          />
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
            <p className="text-3xl font-bold text-green-600 mt-2">{ksh(product.price)}</p>
            {product.seller_name && <p className="text-sm text-gray-500 mt-1">Sold by {product.seller_name}</p>}
            {product.description && <p className="text-gray-600 mt-4 leading-relaxed whitespace-pre-line">{product.description}</p>}
            <div className="mt-4 inline-block bg-green-50 text-green-700 text-sm px-3 py-1 rounded-full font-medium">
              💵 Cash on Delivery
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm mt-6 p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-gray-900">Order placed!</h2>
              <p className="text-gray-500 mt-2">
                The seller will contact you at <strong>{form.phone}</strong> to arrange delivery.
              </p>
              <p className="text-green-600 font-semibold mt-2">You&apos;ll pay {ksh(product.price)} on delivery.</p>
              <Link href="/" className="mt-6 inline-block bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700">
                Continue Shopping
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-4">📦 Place Your Order</h2>
              {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
              <form onSubmit={handleOrder} className="space-y-4">
                <Field label="Your Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. John Kamau" />
                <Field label="Phone Number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="07xx xxx xxx" type="tel" />
                <Field label="Delivery Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="e.g. Westlands, Nairobi" />
                <button type="submit" disabled={submitting}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500" />
    </div>
  );
}
