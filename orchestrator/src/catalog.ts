export interface CatalogEntry {
  id: string;
  name: string;
  slug: string;
  sizes: string[];
  stock: number;
  price: number;
  aliases: string[];
  spokenName: string;
  material: string;
  colors: string;
  fit: string;
}

function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function slugify(title: string): string {
  return title.split(' ').join('-');
}

export const CATALOG: CatalogEntry[] = [
  {
    id: '1',
    name: 'Kaos Detail Tape',
    slug: slugify('Kaos Detail Tape'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 18,
    price: 120_000,
    aliases: ['kaos tape', 't-shirt tape'],
    spokenName: 'kaos tape',
    material: '100% katun combed, adem dan breathable',
    colors: 'Off-white dengan detail tape di bahu',
    fit: 'Regular fit, true to size',
  },
  {
    id: '2',
    name: 'Jeans Skinny Fit',
    slug: slugify('Jeans Skinny Fit'),
    sizes: ['M', 'L', 'XL'],
    stock: 6,
    price: 260_000,
    aliases: ['celana jeans', 'jeans skinny'],
    spokenName: 'celana jeans',
    material: 'Denim stretch 98% katun, 2% elastane',
    colors: 'Biru indigo',
    fit: 'Skinny fit, stretch nyaman',
  },
  {
    id: '3',
    name: 'Kemeja Kotak Kotak',
    slug: slugify('Kemeja Kotak Kotak'),
    sizes: ['S', 'M'],
    stock: 0,
    price: 180_000,
    aliases: ['kemeja kotak', 'checkered shirt'],
    spokenName: 'kemeja kotak',
    material: 'Katun premium, ringan',
    colors: 'Motif kotak biru-putih',
    fit: 'Regular fit',
  },
  {
    id: '4',
    name: 'Kaos Stripe Lengan',
    slug: slugify('Kaos Stripe Lengan'),
    sizes: ['S', 'M', 'L'],
    stock: 11,
    price: 160_000,
    aliases: ['kaos stripe', 'striped t-shirt'],
    spokenName: 'kaos stripe',
    material: 'Katun 100%, jahitan rapi',
    colors: 'Putih dengan stripe navy',
    fit: 'Relaxed fit',
  },
  {
    id: '5',
    name: 'Kemeja Flanel Garis',
    slug: slugify('Kemeja Flanel Garis'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 22,
    price: 232_000,
    aliases: ['kemeja flanel', 'flannel shirt'],
    spokenName: 'kemeja flanel',
    material: 'Flanel katun tebal, hangat tapi tidak gerah',
    colors: 'Garis merah-hitam',
    fit: 'Regular fit, cocok layering',
  },
  {
    id: '6',
    name: 'Kaos Graphic Courage',
    slug: slugify('Kaos Graphic Courage'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 14,
    price: 145_000,
    aliases: ['hoodie', 'hoodie biru', 'kaos graphic'],
    spokenName: 'hoodie graphic',
    material: 'Fleece cotton blend, lembut di dalam',
    colors: 'Abu-abu dengan print graphic',
    fit: 'Unisex relaxed fit',
  },
  {
    id: '7',
    name: 'Celana Pendek Bermuda',
    slug: slugify('Celana Pendek Bermuda'),
    sizes: ['M', 'L', 'XL'],
    stock: 9,
    price: 80_000,
    aliases: ['celana pendek', 'bermuda'],
    spokenName: 'celana pendek',
    material: 'Katun twill ringan, cepat kering',
    colors: 'Khaki dan hitam',
    fit: 'Loose fit bermuda, nyaman gerak',
  },
  {
    id: '8',
    name: 'Jeans Hitam Faded',
    slug: slugify('Jeans Hitam Faded'),
    sizes: ['30', '32', '34'],
    stock: 7,
    price: 210_000,
    aliases: ['celana hitam', 'jeans hitam', 'jeans faded'],
    spokenName: 'celana hitam',
    material: 'Denim stretch hitam faded wash',
    colors: 'Hitam faded',
    fit: 'Slim straight, ukuran nomor pinggang 30-34',
  },
  {
    id: '12',
    name: 'Polo Contrast Trim',
    slug: slugify('Polo Contrast Trim'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 10,
    price: 242_000,
    aliases: ['polo contrast', 'polo'],
    spokenName: 'polo',
    material: 'Pique cotton premium',
    colors: 'Navy dengan trim kontras putih',
    fit: 'Regular fit, smart casual',
  },
  {
    id: '13',
    name: 'Kaos Gradient Graphic',
    slug: slugify('Kaos Gradient Graphic'),
    sizes: ['S', 'M', 'L'],
    stock: 15,
    price: 145_000,
    aliases: ['kaos gradient', 'gradient tee'],
    spokenName: 'kaos gradient',
    material: '100% katun ringan, print gradient tahan luntur',
    colors: 'Gradient biru-ungu',
    fit: 'Regular fit',
  },
  {
    id: '14',
    name: 'Polo Tipping Detail',
    slug: slugify('Polo Tipping Detail'),
    sizes: ['M', 'L', 'XL'],
    stock: 8,
    price: 180_000,
    aliases: ['polo tipping'],
    spokenName: 'polo tipping',
    material: 'Katun pique halus',
    colors: 'Putih dengan tipping hitam di kerah',
    fit: 'Regular fit',
  },
  {
    id: '15',
    name: 'Kaos Hitam Stripe',
    slug: slugify('Kaos Hitam Stripe'),
    sizes: ['S', 'M'],
    stock: 5,
    price: 150_000,
    aliases: ['kaos hitam stripe'],
    spokenName: 'kaos hitam stripe',
    material: 'Katun combed premium',
    colors: 'Hitam dengan stripe putih halus',
    fit: 'Slim fit',
  },
];

export function buildProductDetailLines(productId: string | null | undefined): string[] {
  const item = lookupCatalog(productId);

  if (!item) {
    return [];
  }

  return [
    `- bahan: ${item.material}`,
    `- warna: ${item.colors}`,
    `- fit/potongan: ${item.fit}`,
  ];
}

export function lookupCatalog(productId: string | null | undefined): CatalogEntry | null {
  if (!productId) {
    return null;
  }

  return CATALOG.find((item) => item.id === productId) ?? null;
}

export function findCatalogIdsWithSize(size: string): string[] {
  const normalized = size.trim().toUpperCase();

  return CATALOG.filter(
    (item) => item.stock > 0 && item.sizes.map((entry) => entry.toUpperCase()).includes(normalized),
  ).map((item) => item.id);
}

export function buildCatalogPromptLines(): string[] {
  return CATALOG.map(
    (item) =>
      `- id ${item.id}: ${item.spokenName} / ${item.name} (${formatIdr(item.price)}, stok ${item.stock}, ukuran ${item.sizes.join('/')})`,
  );
}

export function productPath(id: string, slug: string): string {
  return `/shop/product/${id}/${slug}`;
}
