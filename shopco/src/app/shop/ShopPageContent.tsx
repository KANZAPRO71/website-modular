"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { catalogProducts } from "@/data/catalog";
import ProductCard from "@/components/common/ProductCard";
import { formatPrice } from "@/lib/formatPrice";

type SortOrder = "popular" | "price-low" | "price-high";

const PAGE_SIZE = 9;
const MAX_CATALOG_PRICE =
  Math.ceil(Math.max(...catalogProducts.map((product) => product.price)) / 50) * 50;

function getDiscountedPrice(price: number, discount: { amount: number; percentage: number }) {
  if (discount.percentage > 0) {
    return Math.round(price - (price * discount.percentage) / 100);
  }
  return Math.max(0, price - discount.amount);
}

export default function ShopPageContent() {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("popular");
  const [maxPrice, setMaxPrice] = useState(MAX_CATALOG_PRICE);
  const [minimumRating, setMinimumRating] = useState(0);
  const [saleOnly, setSaleOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [normalizedQuery, setNormalizedQuery] = useState("");

  useEffect(() => {
    const searchQuery = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(searchQuery);
    setNormalizedQuery(searchQuery.trim().toLocaleLowerCase());
  }, []);

  const products = useMemo(() => {
    const filtered = catalogProducts.filter((product) => {
      const matchesQuery = product.title.toLocaleLowerCase().includes(normalizedQuery);
      const matchesPrice = getDiscountedPrice(product.price, product.discount) <= maxPrice;
      const matchesRating = product.rating >= minimumRating;
      const matchesSale = !saleOnly || product.discount.percentage > 0 || product.discount.amount > 0;
      return matchesQuery && matchesPrice && matchesRating && matchesSale;
    });

    return filtered.sort((first, second) => {
      if (sortOrder === "price-low") return first.price - second.price;
      if (sortOrder === "price-high") return second.price - first.price;
      return second.rating - first.rating || first.id - second.id;
    });
  }, [maxPrice, minimumRating, normalizedQuery, saleOnly, sortOrder]);

  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const visibleProducts = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstProduct = products.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastProduct = Math.min(page * PAGE_SIZE, products.length);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const queryString = params.toString();
    window.location.assign(`/shop${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <main className="pb-20">
      <div className="max-w-frame mx-auto px-4 xl:px-0">
        <hr className="h-[1px] border-t-black/10 mb-5 sm:mb-6" />
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-black/50">
          <Link href="/" className="hover:text-black">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-black">Shop</span>
        </nav>

        <div className="mb-6 flex flex-col gap-4">
          <div>
            <h1 className="font-bold text-2xl md:text-[32px]">Shop all products</h1>
            <p className="mt-1 text-sm text-black/60">
              Showing {firstProduct}–{lastProduct} of {products.length} products
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <form onSubmit={handleSearch} role="search" className="flex gap-2">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="min-w-0 rounded-full border border-black/15 px-4 py-2 text-sm outline-none focus:border-black sm:w-64"
              />
              <button type="submit" className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white">
                Search
              </button>
            </form>
            <label className="flex items-center gap-2 text-sm">
              <span>Sort by</span>
              <select
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value as SortOrder);
                  setPage(1);
                }}
                className="rounded-full border border-black/15 bg-white px-3 py-2"
              >
                <option value="popular">Top rated</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mb-6 grid gap-4 rounded-2xl border border-black/10 p-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm">
            <span className="flex justify-between">
              <span>Maximum price</span>
              <span className="font-medium">{formatPrice(maxPrice)}</span>
            </span>
            <input
              type="range"
              min={50}
              max={MAX_CATALOG_PRICE}
              step={10}
              value={maxPrice}
              onChange={(event) => {
                setMaxPrice(Number(event.target.value));
                setPage(1);
              }}
              aria-label="Maximum product price"
              className="accent-black"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span>Minimum rating</span>
            <select
              value={minimumRating}
              onChange={(event) => {
                setMinimumRating(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-full border border-black/15 bg-white px-3 py-2"
            >
              <option value={0}>Any rating</option>
              <option value={3}>3 stars and up</option>
              <option value={4}>4 stars and up</option>
              <option value={4.5}>4.5 stars and up</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={saleOnly}
              onChange={(event) => {
                setSaleOnly(event.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 accent-black"
            />
            On sale only
          </label>
        </div>

        {visibleProducts.length ? (
          <div className="grid w-full grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:gap-5">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} data={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/10 py-16 text-center">
            <h2 className="text-xl font-semibold">No products found</h2>
            <p className="mt-2 text-sm text-black/60">
              Try a different name or clear your search.
            </p>
            <Link href="/shop" className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-sm text-white">
              Browse all products
            </Link>
          </div>
        )}

        {pageCount > 1 ? (
          <nav aria-label="Product pages" className="mt-8 flex items-center justify-between border-t border-black/10 pt-5">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-full border border-black/15 px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-black/60">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={page === pageCount}
              className="rounded-full border border-black/15 px-4 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        ) : null}
      </div>
    </main>
  );
}
