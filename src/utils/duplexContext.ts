import type { ProductContext } from '../types/duplex';

const STORE_NAME = 'SHOP.CO';

function pageLabelFromPath(pathname: string): string {
  if (pathname.startsWith('/shop/product')) {
    return 'Product detail page';
  }
  if (pathname === '/shop' || pathname.startsWith('/shop?')) {
    return 'Shop / catalog page';
  }
  if (pathname === '/cart') {
    return 'Shopping cart';
  }
  return 'SHOP.CO Home';
}

export function enrichProductContext(
  product?: ProductContext | null,
): ProductContext {
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname : '/';

  return {
    storeName: STORE_NAME,
    pagePath: pathname,
    pageLabel: pageLabelFromPath(pathname),
    productId: product?.productId ?? '',
    productName: product?.productName ?? '',
    stockStatus: product?.stockStatus,
  };
}
