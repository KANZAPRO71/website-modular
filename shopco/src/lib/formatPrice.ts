import { Product } from "@/types/product.types";

export function formatPrice(amount: number): string {
  return `$${amount}`;
}

export function getSalePrice(product: Pick<Product, "price" | "discount">): number {
  if (product.discount.percentage > 0) {
    return Math.round(
      product.price - (product.price * product.discount.percentage) / 100
    );
  }
  if (product.discount.amount > 0) {
    return product.price - product.discount.amount;
  }
  return product.price;
}

export function hasDiscount(product: Pick<Product, "discount">): boolean {
  return product.discount.percentage > 0 || product.discount.amount > 0;
}
