"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ChatSidebar from "@/components/ChatSidebar";
import ProductCard from "@/components/ProductCard";

type Product = {
  productid?: number;
  productname: string;
  productbrand: string;
  gender: string;
  price: number;
  primarycolor: string;
  description: string;
};

const STOP_WORDS = new Set(["show", "me", "the", "a", "an", "for", "under", "below", "above", "over", "with", "and", "or", "in", "of", "to", "is", "are", "all", "that", "this", "please", "can", "you", "i", "want", "need", "some", "my", "your", "get", "find", "have", "any", "it", "do", "does", "not", "but", "up", "down", "out", "off", "on", "no", "just", "more", "less", "than", "between", "price", "products", "shoes", "shoe", "footwear"]);

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState("All");
  const [gender, setGender] = useState("All");
  const [sort, setSort] = useState("Default");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Product[]>("/products")
      .then((res) => setProducts(res.data))
      .catch(() => setError("Could not connect to backend. Make sure the server is running."));
  }, []);

  useEffect(() => {
    let result = [...products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();

      const tokens = q.split(/\s+/);
      const hasPriceDigits = tokens.some((t) => /^\d[\d,]*\d$/.test(t.replace(/,/g, "")));
      const hasPriceKeyword = /\b(under|below|above|over|between|within|less|more|greater)\b/.test(q);
      const hasPriceQualifier = hasPriceKeyword && hasPriceDigits;

      if (!hasPriceQualifier) {
        const words = q.split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
        if (words.length > 0) {
          result = result.filter((p) => {
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
      }

      for (const token of tokens) {
        const cleaned = token.replace(/,/g, "");
        if (/^\d+$/.test(cleaned)) {
          const price = parseInt(cleaned, 10);
          if (!isNaN(price) && price > 0) {
            if (/under|below|less than|within/.test(q)) {
              result = result.filter((p) => Number(p.price) <= price);
            } else if (/above|over|more than|greater than/.test(q)) {
              result = result.filter((p) => Number(p.price) >= price);
            }
          }
          break;
        }
      }
    }

    if (brand !== "All") {
      result = result.filter((p) => p.productbrand === brand);
    }

    if (gender !== "All") {
      result = result.filter((p) => p.gender === gender);
    }

    if (sort === "Low") {
      result = result.sort((a, b) => a.price - b.price);
    } else if (sort === "High") {
      result = result.sort((a, b) => b.price - a.price);
    }

    setFilteredProducts(result);
  }, [products, searchQuery, brand, gender, sort]);

  const brands = Array.from(new Set(products.map((p) => p.productbrand))).sort();
  const genders = Array.from(new Set(products.map((p) => p.gender))).sort();

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

          {error && (
            <div className="bg-[rgba(255,255,255,0.05)] border border-[#555] text-[#ccc] text-sm rounded-lg p-4 mb-6 text-center">
              &#x26a0;&#xfe0f; {error}
            </div>
          )}

          {!error && filteredProducts.length === 0 ? (
            <p className="text-[#666] text-center py-12">No products match your filters.</p>
          ) : !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((p, i) => (
                <ProductCard key={p.productid ?? i} product={p} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
