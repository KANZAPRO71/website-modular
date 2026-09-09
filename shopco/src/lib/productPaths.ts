import type { Product } from '@/types/product.types';

export function productSlug(title: string): string {
  return title.split(' ').join('-');
}

export function getProductPath(product: Pick<Product, 'id' | 'title'>): string {
  return `/shop/product/${product.id}/${productSlug(product.title)}`;
}

export function highlightProductCard(productId: number | string, durationMs = 3200): void {
  const card = document.querySelector<HTMLElement>(`[data-product-id="${productId}"]`);

  if (!card) {
    return;
  }

  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.setAttribute('data-duplex-highlight', 'true');

  window.setTimeout(() => {
    card.removeAttribute('data-duplex-highlight');
  }, durationMs);
}
