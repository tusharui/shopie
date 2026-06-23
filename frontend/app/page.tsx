"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ChatSidebar from "@/components/ChatSidebar";
import ProductCard from "@/components/ProductCard";

type Product = {
  productname: string;
  productbrand: string;
  gender: string;
  price: number;
  primarycolor: string;
  description: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState("All");
  const [gender, setGender] = useState("All");
  const [sort, setSort] = useState("Default");
  const [searchQuery, setSearchQuery] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Product[]>("/products")
      .then((res) => setProducts(res.data))
      .catch(() => setError("Could not connect to backend. Make sure the server is running."));
  }, []);

  const brands = Array.from(new Set(products.map((p) => p.productbrand))).sort();
  const genders = Array.from(new Set(products.map((p) => p.gender))).sort();

  const STOP_WORDS = new Set(["show", "me", "the", "a", "an", "for", "under", "below", "above", "over", "with", "and", "or", "in", "of", "to", "is", "are", "all", "that", "this", "please", "can", "you", "i", "want", "need", "some", "my", "your", "get", "find", "have", "any", "it", "do", "does", "not", "but", "up", "down", "out", "off", "on", "no", "just", "more", "less", "than", "between", "price", "products"]);
  const COLORS = new Set(["black", "white", "blue", "red", "green", "grey", "gray", "pink", "purple", "orange", "brown", "beige", "cream", "navy", "coral", "olive", "multi"]);
  const BRANDS = new Set(["nike", "adidas", "puma", "reebok", "asics", "converse", "vans", "new balance", "on running", "salomon", "decathlon"]);

  let filtered = products;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const words = q.split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
    if (words.length > 0) {
      filtered = filtered.filter((p) => {
        const name = p.productname.toLowerCase();
        const brand = p.productbrand.toLowerCase();
        const desc = p.description.toLowerCase();
        const color = p.primarycolor.toLowerCase();
        const gender = p.gender.toLowerCase();
        return words.some(
          (w) => name.includes(w) || brand.includes(w) || desc.includes(w) || color.includes(w) || gender.includes(w)
        );
      });
    }

    const nums = q.match(/\d[\d,]*\d/g);
    if (nums) {
      const prices = nums.map((n) => parseInt(n.replace(/,/g, ""), 10));
      if (/under|below|less than|within/.test(q) && prices.length > 0) {
        filtered = filtered.filter((p) => p.price <= prices[0]);
      } else if (/above|over|more than|greater than/.test(q) && prices.length > 0) {
        filtered = filtered.filter((p) => p.price >= prices[0]);
      } else if (/between/.test(q) && prices.length >= 2) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        filtered = filtered.filter((p) => p.price >= min && p.price <= max);
      }
    }
  }

  if (brand !== "All") {
    filtered = filtered.filter((p) => p.productbrand === brand);
  }

  if (gender !== "All") {
    filtered = filtered.filter((p) => p.gender === gender);
  }

  if (sort === "Low") {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (sort === "High") {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  }

  const FilterSelect = ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#111] border border-[#444] text-white text-sm rounded-lg p-2.5 outline-none focus:border-white transition-colors w-full sm:w-auto"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "All" ? `All` : o}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <ChatSidebar onSearch={setSearchQuery} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-white tracking-tight">
            &#x1f6d2; Product Catalog
          </h1>
          <p className="text-sm text-[#777] mb-6">Browse and filter our collection</p>

          <hr className="border-[#222] mb-6" />

          {searchQuery && (
            <div className="flex items-center gap-2 mb-4 text-sm text-[#aaa]">
              <span>Searching: <b className="text-white">{searchQuery}</b></span>
              <button
                onClick={() => setSearchQuery("")}
                className="px-2 py-0.5 text-xs border border-[#555] rounded hover:bg-[#222] transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-8">
            <FilterSelect
              value={brand}
              onChange={setBrand}
              options={["All", ...brands]}
            />
            <FilterSelect
              value={gender}
              onChange={setGender}
              options={["All", ...genders]}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-[#111] border border-[#444] text-white text-sm rounded-lg p-2.5 outline-none focus:border-white transition-colors w-full sm:w-auto"
            >
              <option value="Default">Default</option>
              <option value="Low">Price: Low to High</option>
              <option value="High">Price: High to Low</option>
            </select>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-[rgba(255,255,255,0.05)] border border-[#555] text-[#ccc] text-sm rounded-lg p-4 mb-6 text-center">
              &#x26a0;&#xfe0f; {error}
            </div>
          )}

          {/* Products Grid */}
          {!error && filtered.length === 0 ? (
            <p className="text-[#666] text-center py-12">No products match your filters.</p>
          ) : !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((p, i) => (
                <ProductCard key={i} product={p} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
