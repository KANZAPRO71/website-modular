"use client";

import ProductListSec from "@/components/common/ProductListSec";
import { useAppSelector } from "@/lib/hooks/redux";
import { getPersonalizedRecommendations } from "@/lib/recommendations";
import { useMemo } from "react";

export default function PersonalizedRecommendations() {
  const recentlyViewedIds = useAppSelector((state) => state.browsing.productIds);
  const cartItems = useAppSelector((state) => state.carts.cart?.items);
  const cartProductIds = useMemo(
    () => cartItems?.map((item) => item.id) ?? [],
    [cartItems]
  );
  const recommendations = useMemo(
    () => getPersonalizedRecommendations(recentlyViewedIds, cartProductIds),
    [cartProductIds, recentlyViewedIds]
  );

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <ProductListSec
      title="PICKED FOR YOU"
      data={recommendations}
    />
  );
}
