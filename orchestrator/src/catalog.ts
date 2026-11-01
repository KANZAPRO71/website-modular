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

function formatPrice(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

function slugify(title: string): string {
  return title.split(' ').join('-');
}

export const CATALOG: CatalogEntry[] = [
  {
    id: '1',
    name: 'T-shirt with Tape Details',
    slug: slugify('T-shirt with Tape Details'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 18,
    price: 120,
    aliases: ['kaos tape', 't-shirt tape', 'tape-detail t-shirt'],
    spokenName: 'tape-detail T-shirt',
    material: '100% combed cotton, cool and breathable',
    colors: 'Off-white with tape detail on the shoulder',
    fit: 'Regular fit, true to size',
  },
  {
    id: '2',
    name: 'Skinny Fit Jeans',
    slug: slugify('Skinny Fit Jeans'),
    sizes: ['M', 'L', 'XL'],
    stock: 6,
    price: 260,
    aliases: ['celana jeans', 'jeans skinny', 'skinny jeans'],
    spokenName: 'skinny jeans',
    material: 'Stretch denim with 98% cotton and 2% elastane',
    colors: 'Indigo blue',
    fit: 'Comfortable stretch skinny fit',
  },
  {
    id: '3',
    name: 'Checkered Shirt',
    slug: slugify('Checkered Shirt'),
    sizes: ['S', 'M'],
    stock: 0,
    price: 180,
    aliases: ['kemeja kotak', 'checkered shirt'],
    spokenName: 'checkered shirt',
    material: 'Lightweight premium cotton',
    colors: 'Blue and white check pattern',
    fit: 'Regular fit',
  },
  {
    id: '4',
    name: 'Sleeve Striped T-shirt',
    slug: slugify('Sleeve Striped T-shirt'),
    sizes: ['S', 'M', 'L'],
    stock: 11,
    price: 160,
    aliases: ['kaos stripe', 'striped t-shirt'],
    spokenName: 'striped-sleeve T-shirt',
    material: '100% cotton with neat stitching',
    colors: 'White with navy stripes',
    fit: 'Relaxed fit',
  },
  {
    id: '5',
    name: 'Vertical Striped Shirt',
    slug: slugify('Vertical Striped Shirt'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 22,
    price: 232,
    aliases: ['kemeja flanel', 'flannel shirt', 'vertical striped shirt'],
    spokenName: 'vertical striped shirt',
    material: 'Warm cotton flannel that is comfortable for layering',
    colors: 'Red and black vertical stripes',
    fit: 'Regular fit, ideal for layering',
  },
  {
    id: '6',
    name: 'Courage Graphic T-shirt',
    slug: slugify('Courage Graphic T-shirt'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 14,
    price: 145,
    aliases: ['kaos graphic courage', 'courage graphic tee'],
    spokenName: 'Courage Graphic T-shirt',
    material: 'Cotton-blend fleece with a soft inner finish',
    colors: 'Gray with a graphic print',
    fit: 'Unisex relaxed fit',
  },
  {
    id: '7',
    name: 'Loose Fit Bermuda Shorts',
    slug: slugify('Loose Fit Bermuda Shorts'),
    sizes: ['M', 'L', 'XL'],
    stock: 9,
    price: 80,
    aliases: ['celana pendek', 'bermuda', 'bermuda shorts'],
    spokenName: 'Bermuda shorts',
    material: 'Lightweight, quick-drying cotton twill',
    colors: 'Khaki and black',
    fit: 'Loose fit for comfortable movement',
  },
  {
    id: '8',
    name: 'Faded Skinny Jeans',
    slug: slugify('Faded Skinny Jeans'),
    sizes: ['30', '32', '34'],
    stock: 7,
    price: 210,
    aliases: ['celana hitam', 'jeans hitam', 'jeans faded', 'faded skinny jeans'],
    spokenName: 'faded skinny jeans',
    material: 'Stretch denim with a faded black wash',
    colors: 'Faded black',
    fit: 'Slim straight fit with numbered waist sizes 30–34',
  },
  {
    id: '12',
    name: 'Polo with Contrast Trim',
    slug: slugify('Polo with Contrast Trim'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 10,
    price: 242,
    aliases: ['polo contrast', 'polo'],
    spokenName: 'contrast-trim polo',
    material: 'Premium piqué cotton',
    colors: 'Navy with contrasting white trim',
    fit: 'Regular fit, smart casual',
  },
  {
    id: '13',
    name: 'Gradient Graphic T-shirt',
    slug: slugify('Gradient Graphic T-shirt'),
    sizes: ['S', 'M', 'L'],
    stock: 15,
    price: 145,
    aliases: ['kaos gradient', 'gradient tee'],
    spokenName: 'gradient graphic T-shirt',
    material: 'Lightweight 100% cotton with a fade-resistant gradient print',
    colors: 'Blue-to-purple gradient',
    fit: 'Regular fit',
  },
  {
    id: '14',
    name: 'Polo with Tipping Details',
    slug: slugify('Polo with Tipping Details'),
    sizes: ['M', 'L', 'XL'],
    stock: 8,
    price: 180,
    aliases: ['polo tipping'],
    spokenName: 'polo with tipping details',
    material: 'Soft piqué cotton',
    colors: 'White with black tipping on the collar',
    fit: 'Regular fit',
  },
  {
    id: '15',
    name: 'Black Striped T-shirt',
    slug: slugify('Black Striped T-shirt'),
    sizes: ['S', 'M'],
    stock: 5,
    price: 150,
    aliases: ['kaos hitam stripe', 'black striped T-shirt'],
    spokenName: 'black striped T-shirt',
    material: 'Premium combed cotton',
    colors: 'Black with subtle white stripes',
    fit: 'Slim fit',
  },
];

export function buildProductDetailLines(productId: string | null | undefined): string[] {
  const item = lookupCatalog(productId);

  if (!item) {
    return [];
  }

  return [
    `- Material: ${item.material}`,
    `- Color: ${item.colors}`,
    `- Fit: ${item.fit}`,
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
      `- ID ${item.id}: ${item.spokenName} / ${item.name} (${formatPrice(item.price)}, stock ${item.stock}, sizes ${item.sizes.join('/')})`,
  );
}

export function productPath(id: string, slug: string): string {
  return `/shop/product/${id}/${slug}`;
}
