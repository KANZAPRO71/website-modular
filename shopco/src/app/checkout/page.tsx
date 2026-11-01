"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/redux";
import { clearCart } from "@/lib/features/carts/cartsSlice";
import { formatPrice, getSalePrice } from "@/lib/formatPrice";
import { saveDemoOrder } from "@/lib/demoOrders";
import type { DemoOrder } from "@/types/order.types";
import {
  getProductInventory,
  isProductSizeAvailable,
} from "@/data/inventory";

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { cart, totalPrice, adjustedTotalPrice } = useAppSelector((state) => state.carts);
  const [errorMessage, setErrorMessage] = useState("");

  const items = cart?.items ?? [];
  const discount = Math.max(0, totalPrice - adjustedTotalPrice);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (items.length === 0) {
      setErrorMessage("Your cart is empty. Add a product before checking out.");
      return;
    }

    const quantitiesByProduct = new Map<number, number>();
    for (const item of items) {
      quantitiesByProduct.set(
        item.id,
        (quantitiesByProduct.get(item.id) ?? 0) + item.quantity
      );
    }

    const hasUnavailableItem = items.some((item) => {
      const inventory = getProductInventory(item.id);
      return (
        !inventory ||
        !isProductSizeAvailable(item.id, item.attributes[0] ?? "") ||
        (quantitiesByProduct.get(item.id) ?? 0) > inventory.stock
      );
    });

    if (hasUnavailableItem) {
      setErrorMessage(
        "Some cart items exceed the catalog's listed stock. Update your cart before continuing."
      );
      return;
    }

    const order: DemoOrder = {
      id: `DEMO-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      items: items.map((item) => ({ ...item, attributes: [...item.attributes] })),
      subtotal: totalPrice,
      discount,
      total: adjustedTotalPrice,
      paymentMethod: "cash-on-delivery-demo",
      status: "pending-demo",
    };

    try {
      saveDemoOrder(order);
    } catch (error) {
      console.error("[Checkout] Unable to save demo order", error);
      setErrorMessage("We could not save this demo order in this browser. Your cart has not been cleared.");
      return;
    }

    dispatch(clearCart());
    router.push(`/order-confirmation?orderId=${encodeURIComponent(order.id)}`);
  };

  if (items.length === 0) {
    return (
      <main className="min-h-[55vh] px-4 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-black/10 p-8 text-center">
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-black/60">Add products before starting checkout.</p>
          <Link href="/shop" className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-sm text-white">
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-20">
      <div className="mx-auto max-w-frame px-4 xl:px-0">
        <hr className="mb-5 h-px border-t-black/10 sm:mb-6" />
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-black/50">
          <Link href="/cart" className="hover:text-black">Cart</Link>
          <span className="mx-2">/</span>
          <span className="text-black">Checkout</span>
        </nav>

        <h1 className="mb-3 text-3xl font-bold">Checkout</h1>
        <p className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Demo checkout only: listed stock is a static catalog snapshot, not live inventory. No payment or shipping is arranged. The order summary is saved only in this browser; contact details are not requested or stored.
        </p>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-black/10 p-5 md:p-7">
            <section>
              <h2 className="mb-3 text-xl font-semibold">Delivery details</h2>
              <p className="text-sm text-black/60">
                Address collection and shipping are unavailable until a secure order service is connected.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold">Payment</h2>
              <div className="rounded-xl border border-black/10 p-4">
                <p className="font-medium">Cash on delivery (demo)</p>
                <p className="mt-1 text-sm text-black/60">This selection is a placeholder; no real order or payment is sent to a store.</p>
              </div>
            </section>

            {errorMessage ? (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
            ) : null}

            <button type="submit" className="w-full rounded-full bg-black px-6 py-4 font-medium text-white hover:bg-black/85">
              Place demo order · {formatPrice(adjustedTotalPrice)}
            </button>
            <p className="text-center text-xs text-black/50">No payment card or personal details are requested on this demo checkout.</p>
          </form>

          <aside className="h-fit rounded-2xl border border-black/10 p-5 md:p-6">
            <h2 className="mb-5 text-xl font-bold">Order summary</h2>
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={`${item.id}-${item.attributes.join("-")}`} className="flex justify-between gap-4 text-sm">
                  <span>{item.name} × {item.quantity}<span className="block text-xs text-black/50">Size {item.attributes[0]}</span></span>
                  <span className="shrink-0">{formatPrice(getSalePrice(item) * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <hr className="my-5 border-black/10" />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{formatPrice(totalPrice)}</dd></div>
              <div className="flex justify-between"><dt className="text-black/60">Discount</dt><dd className="text-red-600">−{formatPrice(discount)}</dd></div>
              <div className="flex justify-between"><dt className="text-black/60">Delivery</dt><dd>Free (demo)</dd></div>
              <div className="flex justify-between border-t border-black/10 pt-3 text-base font-bold"><dt>Total</dt><dd>{formatPrice(adjustedTotalPrice)}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}
