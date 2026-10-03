export type ImageEditStyleId = 'white-studio' | 'soft-gray' | 'hero-light' | 'square-packshot';

export type ImageEditStyle = {
  id: ImageEditStyleId;
  name: string;
  blurb: string;
  tokenCost: number;
  background: { r: number; g: number; b: number };
  prompt: string;
};

/** One token always edits exactly one image. */
export const IMAGE_EDIT_TOKEN_COST = 1;

/** Price of one edit token in toman (۵ هزار تومان). */
export const IMAGE_TOKEN_UNIT_PRICE = 5_000;

/** Snap points on the buy slider. */
export const IMAGE_TOKEN_AMOUNTS = [5, 20, 50, 100, 300, 500] as const;

export type ImageTokenAmount = (typeof IMAGE_TOKEN_AMOUNTS)[number];

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

export function imageEditStyleById(id?: string | null) {
  return IMAGE_EDIT_STYLES.find((style) => style.id === id) || null;
}

export function isImageTokenAmount(value: unknown): value is ImageTokenAmount {
  const n = Number(value);
  return IMAGE_TOKEN_AMOUNTS.includes(n as ImageTokenAmount);
}

export function normalizeImageTokenAmount(value: unknown): ImageTokenAmount | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return isImageTokenAmount(n) ? (n as ImageTokenAmount) : null;
}

export function imageTokenPrice(tokens: number) {
  return Math.max(0, Math.round(Number(tokens) || 0) * IMAGE_TOKEN_UNIT_PRICE);
}

/** Stored on purchase rows / payment snapshots (`qty-100`). */
export function imageTokenPackId(tokens: number) {
  return `qty-${Math.round(Number(tokens) || 0)}`;
}

export function imageTokenAmountFromPackId(packId?: string | null) {
  const match = String(packId || '').match(/^qty-(\d+)$/);
  if (!match) return null;
  return normalizeImageTokenAmount(match[1]);
}

export function imageTokenPurchaseLabel(packId?: string | null, tokens?: number) {
  const qty = Number(tokens) || imageTokenAmountFromPackId(packId) || 0;
  if (qty > 0) return `${qty} توکن`;
  return packId || 'توکن تصویر';
}
