"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/formatPrice";
import { readDemoOrders } from "@/lib/demoOrders";
import type { DemoOrder } from "@/types/order.types";

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    try {
      const orderId = new URLSearchParams(window.location.search).get("orderId");
      if (!orderId) return;
      setOrder(readDemoOrders().find((savedOrder) => savedOrder.id === orderId) ?? null);
    } catch (error) {
      console.error("[Checkout] Unable to read saved demo order", error);
      setErrorMessage("We could not read saved demo order data from this browser.");
    }
  }, []);

  return (
    <main className="min-h-[55vh] px-4 py-16">
      <section className="mx-auto max-w-xl rounded-2xl border border-black/10 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-black/50">Demo order</p>
        <h1 className="mt-3 text-3xl font-bold">{order ? "Order recorded" : "Order not found"}</h1>
        {errorMessage ? <p role="alert" className="mt-4 text-sm text-red-700">{errorMessage}</p> : null}
        {order ? (
          <div className="mt-6 rounded-xl bg-[#F7F7F7] p-5 text-left text-sm">
            <p><span className="text-black/60">Reference:</span> {order.id}</p>
            <p className="mt-2"><span className="text-black/60">Status:</span> Pending (demo only)</p>
            <p className="mt-2"><span className="text-black/60">Total:</span> {formatPrice(order.total)}</p>
            <p className="mt-3 text-xs text-black/60">
              This record exists only in this browser. No payment, shipping, or store notification was created.
            </p>
          </div>
        ) : !errorMessage ? (
          <p className="mt-3 text-sm text-black/60">This order may have been created in another browser or cleared from local storage.</p>
        ) : null}
        <Link href="/shop" className="mt-7 inline-flex rounded-full bg-black px-5 py-3 text-sm text-white">
          Continue shopping
        </Link>
      </section>
    </main>
  );
}
