import { catalogProducts } from "@/data/catalog";
import type { Product } from "@/types/product.types";

export type ProductType = "top" | "bottom" | "other";

export function getProductType(title: string): ProductType {
  const normalizedTitle = title.toLocaleLowerCase();

  if (/\b(jeans|shorts|trousers|pants)\b/.test(normalizedTitle)) {
    return "bottom";
  }

  if (/\b(t-shirt|tee|shirt|polo|hoodie|sweater)\b/.test(normalizedTitle)) {
    return "top";
  }

  return "other";
}

export function getPersonalizedRecommendations(
  recentlyViewedIds: number[],
  cartProductIds: number[],
  limit = 4
): Product[] {
  const signalIds = [...recentlyViewedIds, ...cartProductIds].filter(
    (id, index, ids) => ids.indexOf(id) === index
  );

  if (signalIds.length === 0) {
    return [];
  }

  const signals = signalIds
    .map((id) => catalogProducts.find((product) => product.id === id))
    .filter((product): product is Product => product !== undefined);
  const excludedIds = new Set(signalIds);

  return catalogProducts
    .filter((product) => !excludedIds.has(product.id))
    .map((product) => {
      const productType = getProductType(product.title);
      const affinity = signals.reduce((score, signal) => {
        const signalType = getProductType(signal.title);

        if (productType === "other" || signalType === "other") {
          return score;
        }

        if (productType !== signalType) {
          return score + 3;
        }

        return score + 1;
      }, 0);

      return {
        product,
        score: affinity + product.rating / 5,
      };
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.product.rating - first.product.rating ||
        first.product.id - second.product.id
    )
    .slice(0, limit)
    .map(({ product }) => product);
}

export function getStylingRecommendations(productId: number, limit = 3): Product[] {
  const currentProduct = catalogProducts.find((product) => product.id === productId);

  if (!currentProduct) {
    return [];
  }

  const currentType = getProductType(currentProduct.title);

  if (currentType === "other") {
    return [];
  }

  return catalogProducts
    .filter(
      (product) =>
        product.id !== productId && getProductType(product.title) !== currentType
    )
    .sort(
      (first, second) =>
        second.rating - first.rating || first.id - second.id
    )
    .slice(0, limit);
}
