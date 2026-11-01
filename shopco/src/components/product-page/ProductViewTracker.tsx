"use client";

import { recordProductView } from "@/lib/features/browsing/browsingSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";

export default function ProductViewTracker({
  productId,
}: {
  productId: number;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(recordProductView(productId));
  }, [dispatch, productId]);

  return null;
}
