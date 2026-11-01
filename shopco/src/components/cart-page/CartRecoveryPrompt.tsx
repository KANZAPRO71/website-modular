"use client";

import { dismissCartRecovery, markCartUpdated } from "@/lib/features/carts/cartsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/redux";
import Link from "next/link";
import { useEffect, useState } from "react";

const RECOVERY_DELAY_MS = 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;

export default function CartRecoveryPrompt() {
  const dispatch = useAppDispatch();
  const { cart, lastUpdatedAt, recoveryDismissedAt } = useAppSelector(
    (state) => state.carts
  );
  const [now, setNow] = useState(0);
  const hasItems = Boolean(cart?.items.length);

  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    updateTime();
    const intervalId = window.setInterval(updateTime, CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (hasItems && lastUpdatedAt === null) {
      dispatch(markCartUpdated(Date.now()));
    }
  }, [dispatch, hasItems, lastUpdatedAt]);

  const isRecoveryDue =
    hasItems &&
    lastUpdatedAt !== null &&
    now >= lastUpdatedAt + RECOVERY_DELAY_MS &&
    recoveryDismissedAt !== lastUpdatedAt;

  if (!isRecoveryDue) {
    return null;
  }

  return (
    <aside
      aria-label="Cart reminder"
      className="fixed bottom-4 right-4 z-[80] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-black/10 bg-white p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-black">Your cart is waiting</p>
          <p className="mt-1 text-sm text-black/60">
            Your saved items are still here whenever you are ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dispatch(dismissCartRecovery())}
          aria-label="Dismiss cart reminder"
          className="rounded-full px-2 py-1 text-sm text-black/50 hover:bg-black/5"
        >
          Close
        </button>
      </div>
      <Link
        href="/cart"
        className="mt-3 inline-flex rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Return to cart
      </Link>
    </aside>
  );
}
