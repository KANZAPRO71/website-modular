export interface ProductInventory {
  stock: number;
  sizes: string[];
}

export const productInventory: Record<number, ProductInventory> = {
  1: { stock: 18, sizes: ["S", "M", "L", "XL"] },
  2: { stock: 6, sizes: ["M", "L", "XL"] },
  3: { stock: 0, sizes: ["S", "M"] },
  4: { stock: 11, sizes: ["S", "M", "L"] },
  5: { stock: 22, sizes: ["S", "M", "L", "XL"] },
  6: { stock: 14, sizes: ["S", "M", "L", "XL"] },
  7: { stock: 9, sizes: ["M", "L", "XL"] },
  8: { stock: 7, sizes: ["30", "32", "34"] },
  12: { stock: 10, sizes: ["S", "M", "L", "XL"] },
  13: { stock: 15, sizes: ["S", "M", "L"] },
  14: { stock: 8, sizes: ["M", "L", "XL"] },
  15: { stock: 5, sizes: ["S", "M"] },
};

const SIZE_LABELS: Record<string, string> = {
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "X-Large",
};

export function normalizeInventorySize(size: string): string {
  const normalized = size.trim().toLocaleUpperCase();
  const aliases: Record<string, string> = {
    SMALL: "S",
    MEDIUM: "M",
    LARGE: "L",
    "X-LARGE": "XL",
    "X LARGE": "XL",
    "EXTRA LARGE": "XL",
  };

  return aliases[normalized] ?? normalized;
}

export function getInventorySizeLabel(size: string): string {
  const normalized = normalizeInventorySize(size);
  return SIZE_LABELS[normalized] ?? normalized;
}

export function getProductInventory(productId: number): ProductInventory | null {
  return productInventory[productId] ?? null;
}

export function isProductSizeAvailable(productId: number, size: string): boolean {
  const inventory = getProductInventory(productId);
  if (!inventory || inventory.stock <= 0) {
    return false;
  }

  const requestedSize = normalizeInventorySize(size);
  return inventory.sizes.some(
    (availableSize) => normalizeInventorySize(availableSize) === requestedSize
  );
}
