import type { ProductContext } from '../types/duplex';

const STORE_NAME = 'Butik DEVI';

function pageLabelFromPath(pathname: string): string {
  if (pathname.startsWith('/shop/product')) {
    return 'Halaman detail produk';
  }
  if (pathname === '/shop' || pathname.startsWith('/shop?')) {
    return 'Halaman toko / katalog';
  }
  if (pathname === '/cart') {
    return 'Keranjang belanja';
  }
  return 'Beranda Butik DEVI';
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
