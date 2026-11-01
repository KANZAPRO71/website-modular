export interface CatalogEntry {
  id: string;
  name: string;
  slug: string;
  sizes: string[];
  stock: number;
  price: number;
  discountPercent?: number;
  salePrice?: number;
  rating: number;
  aliases: string[];
  spokenName: string;
  material: string;
  colors: string;
  fit: string;
  sellingHook: string;
  stylingPair: string;
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
    rating: 4.5,
    aliases: ['kaos tape', 't-shirt tape', 'tape-detail t-shirt'],
    spokenName: 'tape-detail T-shirt',
    material: '100% combed cotton, ultra-breathable and soft against the skin',
    colors: 'Off-white with signature contrast tape detail on the shoulder',
    fit: 'Regular fit, true to size with a clean modern silhouette',
    sellingHook:
      'Rated 4.5 stars — designers and customers love the elevated shoulder-tape accent that upgrades an everyday tee into a statement piece.',
    stylingPair:
      'Pairs effortlessly with Faded Skinny Jeans (ID 8, $210) or Loose Fit Bermuda Shorts (ID 7, $80).',
  },
  {
    id: '2',
    name: 'Skinny Fit Jeans',
    slug: slugify('Skinny Fit Jeans'),
    sizes: ['M', 'L', 'XL'],
    stock: 6,
    price: 260,
    discountPercent: 20,
    salePrice: 208,
    rating: 3.5,
    aliases: ['celana jeans', 'jeans skinny', 'skinny jeans'],
    spokenName: 'skinny jeans',
    material: 'Stretch denim with 98% cotton and 2% elastane for all-day flexibility',
    colors: 'Classic indigo blue wash',
    fit: 'Form-flattering stretch skinny fit that moves with you without feeling stiff',
    sellingHook:
      'Currently 20% off ($208 instead of $260, saving $52) and down to our last 6 pairs in stock.',
    stylingPair:
      'Looks sharp with the T-shirt with Tape Details (ID 1, $120) or Vertical Striped Shirt (ID 5, $186 on sale).',
  },
  {
    id: '3',
    name: 'Checkered Shirt',
    slug: slugify('Checkered Shirt'),
    sizes: ['S', 'M'],
    stock: 0,
    price: 180,
    rating: 4.5,
    aliases: ['kemeja kotak', 'checkered shirt'],
    spokenName: 'checkered shirt',
    material: 'Lightweight premium breathable cotton',
    colors: 'Crisp blue and white check pattern',
    fit: 'Tailored regular fit',
    sellingHook:
      'So popular it completely sold out — immediately pivot customers to our 5.0-star Vertical Striped Shirt (ID 5, on sale at 20% off).',
    stylingPair: 'Recommend Vertical Striped Shirt (ID 5) as the upgrade alternative.',
  },
  {
    id: '4',
    name: 'Sleeve Striped T-shirt',
    slug: slugify('Sleeve Striped T-shirt'),
    sizes: ['S', 'M', 'L'],
    stock: 11,
    price: 160,
    discountPercent: 30,
    salePrice: 112,
    rating: 4.5,
    aliases: ['kaos stripe', 'striped t-shirt'],
    spokenName: 'striped-sleeve T-shirt',
    material: '100% ring-spun cotton with reinforced neat stitching',
    colors: 'Crisp white with sporty navy sleeve stripes',
    fit: 'Relaxed athletic-inspired fit',
    sellingHook:
      'Massive 30% discount right now ($112 down from $160 — $48 off) with a 4.5-star customer rating.',
    stylingPair:
      'Great weekend combo with Loose Fit Bermuda Shorts (ID 7, $80) or Skinny Fit Jeans (ID 2).',
  },
  {
    id: '5',
    name: 'Vertical Striped Shirt',
    slug: slugify('Vertical Striped Shirt'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 22,
    price: 232,
    discountPercent: 20,
    salePrice: 186,
    rating: 5.0,
    aliases: ['kemeja flanel', 'flannel shirt', 'vertical striped shirt'],
    spokenName: 'vertical striped shirt',
    material: 'Brushed cotton flannel that stays breathable and comfortable for solo wear or layering',
    colors: 'Bold red and black vertical stripes that visually elongate the torso',
    fit: 'Versatile regular fit, ideal worn buttoned up or open over a tee',
    sellingHook:
      'Our #1 Top-Selling shirt with a perfect 5.0-star rating, currently 20% off ($186 instead of $232).',
    stylingPair:
      'Layer it open over the T-shirt with Tape Details (ID 1) and Faded Skinny Jeans (ID 8).',
  },
  {
    id: '6',
    name: 'Courage Graphic T-shirt',
    slug: slugify('Courage Graphic T-shirt'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 14,
    price: 145,
    rating: 4.0,
    aliases: ['kaos graphic courage', 'courage graphic tee'],
    spokenName: 'Courage Graphic T-shirt',
    material: 'Heavyweight cotton-blend jersey with an ultra-soft brushed inner finish',
    colors: 'Charcoal gray with a bold street-ready Courage graphic print',
    fit: 'Unisex relaxed streetwear fit',
    sellingHook:
      'A Top-Selling streetwear favorite with a plush interior feel and high-definition print that never cracks.',
    stylingPair:
      'Matches perfectly with Faded Skinny Jeans (ID 8, $210) for an instant streetwear look.',
  },
  {
    id: '7',
    name: 'Loose Fit Bermuda Shorts',
    slug: slugify('Loose Fit Bermuda Shorts'),
    sizes: ['M', 'L', 'XL'],
    stock: 9,
    price: 80,
    rating: 3.0,
    aliases: ['celana pendek', 'bermuda', 'bermuda shorts'],
    spokenName: 'Bermuda shorts',
    material: 'Lightweight, quick-drying breathable cotton twill',
    colors: 'Versatile khaki and black tones',
    fit: 'Breezy loose fit engineered for maximum comfort and movement',
    sellingHook:
      'Our best-value warm-weather essential at just $80 — effortless comfort for travel, errands, or lounging.',
    stylingPair:
      'Pair with the Black Striped T-shirt (ID 15, $105 on sale) or Polo with Tipping Details (ID 14, $180).',
  },
  {
    id: '8',
    name: 'Faded Skinny Jeans',
    slug: slugify('Faded Skinny Jeans'),
    sizes: ['30', '32', '34'],
    stock: 7,
    price: 210,
    rating: 4.5,
    aliases: ['celana hitam', 'jeans hitam', 'jeans faded', 'faded skinny jeans'],
    spokenName: 'faded skinny jeans',
    material: 'Premium stretch denim with an artisanal faded black vintage wash',
    colors: 'Charcoal faded black',
    fit: 'Sleek slim-straight silhouette in precision waist sizes 30, 32, and 34',
    sellingHook:
      'A 4.5-star Top Seller with only 7 pairs left — the vintage black wash goes with literally every shirt in your closet.',
    stylingPair:
      'Looks killer with the Courage Graphic T-shirt (ID 6, $145) or Polo with Contrast Trim (ID 12).',
  },
  {
    id: '12',
    name: 'Polo with Contrast Trim',
    slug: slugify('Polo with Contrast Trim'),
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 10,
    price: 242,
    discountPercent: 20,
    salePrice: 194,
    rating: 4.0,
    aliases: ['polo contrast', 'polo'],
    spokenName: 'contrast-trim polo',
    material: 'Breathable honeycomb piqué cotton that holds its collar shape all day',
    colors: 'Deep navy with crisp white contrast trim',
    fit: 'Tailored smart-casual regular fit',
    sellingHook:
      'Currently 20% off ($194 down from $242, saving $48) — gives you a polished country-club look with t-shirt comfort.',
    stylingPair:
      'Pair with Loose Fit Bermuda Shorts (ID 7, $80) or Skinny Fit Jeans (ID 2).',
  },
  {
    id: '13',
    name: 'Gradient Graphic T-shirt',
    slug: slugify('Gradient Graphic T-shirt'),
    sizes: ['S', 'M', 'L'],
    stock: 15,
    price: 145,
    rating: 3.5,
    aliases: ['kaos gradient', 'gradient tee'],
    spokenName: 'gradient graphic T-shirt',
    material: 'Lightweight 100% combed cotton with fade-resistant artwork',
    colors: 'Eye-catching blue-to-purple gradient print',
    fit: 'Modern regular fit',
    sellingHook:
      'Designed for standout visual appeal — customers love how vibrant the gradient colors stay wash after wash.',
    stylingPair: 'Balances nicely with neutral Faded Skinny Jeans (ID 8, $210).',
  },
  {
    id: '14',
    name: 'Polo with Tipping Details',
    slug: slugify('Polo with Tipping Details'),
    sizes: ['M', 'L', 'XL'],
    stock: 8,
    price: 180,
    rating: 4.5,
    aliases: ['polo tipping'],
    spokenName: 'polo with tipping details',
    material: 'Ultra-soft double-mercerized piqué cotton',
    colors: 'Clean white with sharp black tipping along the collar and cuffs',
    fit: 'Refined regular fit for date nights or smart-casual Fridays',
    sellingHook:
      'Rated 4.5 stars with only 8 units left — the monochrome collar tipping gives an instant designer look.',
    stylingPair:
      'Wear it with Faded Skinny Jeans (ID 8, $210) for a sharp monochrome outfit.',
  },
  {
    id: '15',
    name: 'Black Striped T-shirt',
    slug: slugify('Black Striped T-shirt'),
    sizes: ['S', 'M'],
    stock: 5,
    price: 150,
    discountPercent: 30,
    salePrice: 105,
    rating: 5.0,
    aliases: ['kaos hitam stripe', 'black striped T-shirt'],
    spokenName: 'black striped T-shirt',
    material: 'Luxury-grade combed cotton with featherlight breathability',
    colors: 'Jet black with clean vertical-inspired subtle white stripes',
    fit: 'Athletic slim fit that accentuates the shoulders',
    sellingHook:
      'Perfect 5.0-star rating, huge 30% discount ($105 instead of $150), and only 5 pieces left in stock!',
    stylingPair:
      'Pairs effortlessly with Faded Skinny Jeans (ID 8) or Loose Fit Bermuda Shorts (ID 7).',
  },
];

export function buildProductDetailLines(productId: string | null | undefined): string[] {
  const item = lookupCatalog(productId);

  if (!item) {
    return [];
  }

  const priceLine =
    item.discountPercent && item.salePrice
      ? `- Price & Promo: On sale for ${formatPrice(item.salePrice)} (${item.discountPercent}% OFF original ${formatPrice(item.price)} — customer saves ${formatPrice(item.price - item.salePrice)}!)`
      : `- Price: ${formatPrice(item.price)} (Plus 20% off available for first-time sign-ups on the top banner)`;

  return [
    priceLine,
    `- Customer Rating: ${item.rating}/5.0 stars`,
    `- Material & Feel: ${item.material}`,
    `- Color & Design: ${item.colors}`,
    `- Fit & Cut: ${item.fit}`,
    `- Why Customers Buy (Selling Hook): ${item.sellingHook}`,
    `- Stylist Outfit Pairing (Cross-Sell): ${item.stylingPair}`,
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
  return CATALOG.map((item) => {
    const pricing =
      item.discountPercent && item.salePrice
        ? `${formatPrice(item.salePrice)} [${item.discountPercent}% OFF from ${formatPrice(item.price)}]`
        : formatPrice(item.price);
    return `- ID ${item.id}: ${item.spokenName} / ${item.name} (${pricing}, ${item.rating}★, stock ${item.stock}, sizes ${item.sizes.join('/')})`;
  });
}

export function productPath(id: string, slug: string): string {
  return `/shop/product/${id}/${slug}`;
}
