"use client";

import Link from "next/link";
import ProductCard from "@/components/common/ProductCard";
import { catalogProducts } from "@/data/catalog";
import { useAppSelector } from "@/lib/hooks/redux";

export default function WishlistPage() {
  const productIds = useAppSelector((state) => state.wishlist.productIds);
  const products = catalogProducts.filter((product) => productIds.includes(product.id));

  return (
    <main className="min-h-[55vh] pb-20">
      <div className="max-w-frame mx-auto px-4 xl:px-0">
        <hr className="h-[1px] border-t-black/10 mb-5 sm:mb-6" />
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-black/50">
          <Link href="/" className="hover:text-black">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-black">Wishlist</span>
        </nav>
        <h1 className="mb-6 text-3xl font-bold">My wishlist</h1>
        {products.length ? (
          <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} data={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/10 py-16 text-center">
            <p className="text-lg font-medium">Your wishlist is empty</p>
            <p className="mt-2 text-sm text-black/60">
              Save products you like and find them here later.
            </p>
            <Link href="/shop" className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-sm text-white">
              Explore products
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
