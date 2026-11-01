'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { catalogProducts } from '@/data/catalog';
import { getProductPath, highlightProductCard } from '@/lib/productPaths';
import { useDuplexWidget } from '@/duplex-widget/components/duplex-widget/DuplexWidgetProvider';
import { getProductInventory } from '@/data/inventory';

export function DuplexNavigationBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const { switchToProduct } = useDuplexWidget();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{
        productId: string;
        productName?: string;
        slug?: string;
        view?: string;
      }>).detail;

      const productId = Number(detail.productId);
      const product = catalogProducts.find((item) => item.id === productId);

      if (!product) {
        console.warn('[DuplexWidget] NAVIGATE_TO_PRODUCT unknown product', detail.productId);
        return;
      }

      const inventory = getProductInventory(product.id);
      switchToProduct({
        productId: String(product.id),
        productName: product.title,
        stockStatus: inventory?.stock
          ? `${inventory.stock} in stock`
          : 'Out of stock',
      });

      const slug = detail.slug ?? getProductPath(product);
      const onCatalog = pathname === '/shop';
      const openDetail = detail.view === 'detail' || (!onCatalog && detail.view !== 'catalog');

      if (openDetail) {
        router.push(slug);
        return;
      }

      highlightProductCard(product.id);
    };

    window.addEventListener('duplex:navigate-product', handler);
    return () => window.removeEventListener('duplex:navigate-product', handler);
  }, [pathname, router, switchToProduct]);

  return null;
}

export function dispatchDuplexNavigate(payload: Record<string, unknown>): void {
  window.dispatchEvent(
    new CustomEvent('duplex:navigate-product', {
      detail: payload,
    }),
  );
}
