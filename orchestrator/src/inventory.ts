import { CATALOG, lookupCatalog } from './catalog.js';
import type { InventoryItem } from './types.js';

export const INVENTORY: Record<string, InventoryItem> = Object.fromEntries(
  CATALOG.map((item) => [
    item.id,
    {
      name: item.name,
      stock: item.stock,
      sizes: item.sizes,
      price: item.price,
    },
  ]),
);

export function lookupInventory(productId: string | null | undefined): InventoryItem {
  const entry = lookupCatalog(productId);

  if (entry) {
    return {
      name: entry.name,
      stock: entry.stock,
      sizes: entry.sizes,
      price: entry.price,
    };
  }

  if (!productId) {
    return { name: 'Produk Butik DEVI', stock: 5, sizes: ['M', 'L'] };
  }

  return { name: `Produk #${productId}`, stock: 3, sizes: ['M', 'L'] };
}
