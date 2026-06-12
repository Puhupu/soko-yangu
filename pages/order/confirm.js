import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase, ksh } from "../../lib/supabase";
import { useTheme } from "../../lib/ThemeContext";

export default function OrderConfirm() {
  const router = useRouter();
  const { id } = router.query;
  const { dark, toggle } = useTheme();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setOrder(data);
        setLoading(false);
      });
  }, [id]);

  if (loading || !id) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
      <div className="text-gray-400 dark:text-[#a0a0a0]">Loadingâ¦</div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#0a0a0a]">
      <div className="text-5xl">ð</div>
      <p className="text-gray-500 dark:text-[#a0a0a0] font-medium">Order not found.</p>
      <Link href="/" className="text-gray-900 dark:text-white font-bold hover:underline">â Back to shop</Link>
    </div>
  );

  const shortId = String(order.id).split("-")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-200">
      {/* Nav */}
      <nav className="bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#2a2a2a] sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            Soko Yangu
          </Link>
          <button
            onClick={toggle}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 dark:text-[#a0a0a0] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "â" : "â½"}
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-8 shadow-sm text-center">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4 text-4xl">
            ð
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Order Confirmed!</h1>
          <p className="text-sm text-gray-400 dark:text-[#555] mt-1 font-mono tracking-wider">
            #{shortId}
          </p>

          {/* Order details */}
          <div className="mt-8 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl p-5 text-left space-y-3 border border-gray-100 dark:border-[#2a2a2a]">
            <p className="text-xs font-bold text-gray-400 dark:text-[#555] uppercase tracking-wider mb-4">Order Details</p>
            <Row label="Product"  value={order.product_title} />
            <Row label="Price"    value={ksh(order.product_price)} />
            <div className="border-t border-gray-200 dark:border-[#2a2a2a] my-1" />
            <Row label="Buyer"    value={order.buyer_name} />
            <Row label="Phone"    value={order.buyer_phone} />
            <Row label="Delivery" value={order.delivery_location} />
            <div className="border-t border-gray-200 dark:border-[#2a2a2a] my-1" />
            <Row label="Payment"  value="Cash on Delivery" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-[#a0a0a0]">Status</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold">
                â³ Pending
              </span>
            </div>
          </div>

          {/* Next step message */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-[#2a2a2a] text-left">
            <p className="text-sm font-bold text-gray-700 dark:text-[#a0a0a0] mb-1">ð² What happens next?</p>
            <p className="text-sm text-gray-500 dark:text-[#555] leading-relaxed">
              The seller will call or WhatsApp you at{" "}
              <strong className="text-gray-900 dark:text-white">{order.buyer_phone}</strong>{" "}
              to confirm your order and arrange delivery. Keep your phone nearby!
            </p>
          </div>

          {/* CTA */}
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white dark:bg-white dark:text-black px-7 py-3.5 rounded-2xl font-bold hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors w-full sm:w-auto"
            >
              â Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-gray-500 dark:text-[#a0a0a0] flex-shrink-0">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-white text-right">{value}</span>
    </div>
  );
}
