export type ImageEditStyleId = 'white-studio' | 'soft-gray' | 'hero-light' | 'square-packshot';

export type ImageTokenPack = {
  id: string;
  name: string;
  blurb: string;
  tokens: number;
  price: number;
  highlight?: boolean;
};

export type ImageEditStyle = {
  id: ImageEditStyleId;
  name: string;
  blurb: string;
  tokenCost: number;
  background: { r: number; g: number; b: number };
  prompt: string;
};

/** List price of one edit token, used to show savings on larger packs. */
export const IMAGE_TOKEN_LIST_PRICE = 1_500;
/** One token is always one image edit. */
export const IMAGE_EDIT_TOKEN_COST = 1;

export const IMAGE_TOKEN_PACKS: ImageTokenPack[] = [
  {
    id: 'pack-30',
    name: 'شروع',
    blurb: 'برای چند محصول اول فروشگاه',
    tokens: 30,
    price: 45_000,
  },
  {
    id: 'pack-100',
    name: 'استودیو',
    blurb: 'به‌صرفه‌ترین انتخاب برای کاتالوگ فروشگاه',
    tokens: 100,
    price: 119_000,
    highlight: true,
  },
  {
    id: 'pack-200',
    name: 'حرفه‌ای',
    blurb: 'برای برندهایی که تصویر زیاد می‌سازند',
    tokens: 200,
    price: 199_000,
  },
];

export const IMAGE_EDIT_STYLES: ImageEditStyle[] = [
  {
    id: 'white-studio',
    name: 'پس‌زمینه سفید',
    blurb: 'حذف پس‌زمینه و قرار دادن محصول روی سفید خالص فروشگاهی',
    tokenCost: 1,
    background: { r: 255, g: 255, b: 255 },
    prompt: [
      'Professional e-commerce product photograph of this exact garment.',
      'Completely remove the original background and any clutter, floor, wall, hangers that are not part of the product, and color casts.',
      'Place the identical product on a seamless pure white cyclorama (#FFFFFF).',
      'Keep true fabric color, texture, stitching, labels, silhouette, and proportions. Do not redesign, restyle, or invent extra garments.',
      'Center the product, leave a small even margin, square 1:1 composition.',
      'Only a very soft natural contact shadow under the hem. No props, no models, no text, no watermark.',
      'Photorealistic, sharp, catalog quality.',
    ].join(' '),
  },
  {
    id: 'soft-gray',
    name: 'استودیو خاکستری',
    blurb: 'پس‌زمینه خاکستری روشن با سایه نرم، مناسب عمده‌فروشی',
    tokenCost: 1,
    background: { r: 238, g: 240, b: 243 },
    prompt: [
      'Professional apparel catalog photo of this exact product.',
      'Remove the original background. Place the same garment on a seamless light gray studio sweep (#EEF0F3) with a gentle top-to-bottom gradient.',
      'Soft diffused lighting and a faint contact shadow. Preserve true color and fabric detail.',
      'Square 1:1, centered, no props, no text, photorealistic marketplace quality.',
    ].join(' '),
  },
  {
    id: 'hero-light',
    name: 'نور استودیو',
    blurb: 'نورپردازی حرفه‌ای، رنگ واقعی پارچه، عکس کاور فروشگاه',
    tokenCost: 1,
    background: { r: 250, g: 250, b: 252 },
    prompt: [
      'Premium apparel hero shot of this exact garment.',
      'Keep the product identical. Relight with studio lighting: soft key from upper left, gentle fill, subtle rim to separate from background.',
      'Seamless off-white cyclorama. Enhance fabric texture and true color without oversaturating. Reduce messy wrinkles and color casts.',
      'Remove background clutter. Square 1:1 e-commerce hero, centered, no text, no watermark, photorealistic.',
    ].join(' '),
  },
  {
    id: 'square-packshot',
    name: 'عکس مربعی کاتالوگ',
    blurb: 'کادر ۱×۱ بازار؛ محصول وسط و حدود ۸۰٪ کادر را می‌گیرد',
    tokenCost: 1,
    background: { r: 255, g: 255, b: 255 },
    prompt: [
      'Marketplace packshot of this exact product.',
      'Recenter and crop to a clean 1:1 frame. The product occupies about 80% of the frame, fully visible, not cut off.',
      'Seamless white background. Straighten if slightly tilted. Remove background, hangers that hide the product, and any watermark or text.',
      'Keep true colors and silhouette. Photorealistic catalog quality.',
    ].join(' '),
  },
];

export function imageTokenPackById(id?: string | null) {
  return IMAGE_TOKEN_PACKS.find((pack) => pack.id === id) || null;
}

export function imageEditStyleById(id?: string | null) {
  return IMAGE_EDIT_STYLES.find((style) => style.id === id) || null;
}

export function tokenUnitPrice(pack: ImageTokenPack) {
  return Math.round(pack.price / pack.tokens);
}

export function tokenSavePercent(pack: ImageTokenPack) {
  const full = pack.tokens * IMAGE_TOKEN_LIST_PRICE;
  if (full <= pack.price) return 0;
  return Math.round((1 - pack.price / full) * 100);
}
