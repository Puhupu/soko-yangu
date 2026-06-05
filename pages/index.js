import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, ksh, NO_IMAGE } from "../lib/supabase";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, []);

  const q = search.toLowerCase();
  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.seller_name || "").toLowerCase().includes(q)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-green-600">🛍️ Soko Yangu</Link>
          <Link href="/seller/login" className="text-sm font-medium text-gray-600 hover:text-green-600">
            Sell on Soko →
          </Link>
        </div>
      </nav>

      <div className="bg-green-600 text-white py-10 px-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Kenya&apos;s Simple Marketplace</h1>
        <p className="text-green-100 mb-6 text-sm sm:text-base">Browse products · Order online · Pay on delivery</p>
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-3 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300"
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading products…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            {products.length === 0 ? "No products listed yet. Check back soon!" : "No products match your search."}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`}>
                <div className="bg-white rounded-xl border hover:shadow-md transition-shadow overflow-hidden cursor-pointer h-full">
                  <img
                    src={p.image_url || NO_IMAGE}
                    alt={p.title}
                    className="w-full h-40 object-cover bg-gray-100"
                    onError={(e) => { e.target.src = NO_IMAGE; }}
                  />
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{p.title}</h3>
                    <p className="text-green-600 font-bold mt-1">{ksh(p.price)}</p>
                    {p.seller_name && <p className="text-xs text-gray-400 mt-1 truncate">by {p.seller_name}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-gray-400 py-8">
        Soko Yangu · Cash on Delivery across Kenya
      </footer>
    </div>
  );
}
