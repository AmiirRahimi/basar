import Jimp from 'jimp';
import { imageEditStyleById, type ImageEditStyleId } from '@/lib/image-tokens';

const OUT_SIZE = 1024;
const THRESHOLD = 92;

type RGB = { r: number; g: number; b: number; a?: number };

function toRgb(color: number): RGB {
  const { r, g, b, a } = Jimp.intToRGBA(color);
  return { r, g, b, a };
}

function dist(a: RGB, b: RGB) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function sampleCorners(image: Jimp) {
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const points = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), 0],
    [Math.floor(w / 2), h - 1],
    [0, Math.floor(h / 2)],
    [w - 1, Math.floor(h / 2)],
  ];
  const colors = points.map(([x, y]) => toRgb(image.getPixelColor(x, y)));
  return {
    r: Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length),
    g: Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length),
    b: Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length),
  };
}

function hasUsefulAlpha(image: Jimp) {
  const { data } = image.bitmap;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) transparent += 1;
    if (transparent > 40) return true;
  }
  return false;
}

function removeBackground(image: Jimp) {
  if (hasUsefulAlpha(image)) return;
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const bg = sampleCorners(image);
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (seen[idx]) return;
    const pixel = toRgb(image.getPixelColor(x, y));
    if (dist(pixel, bg) > THRESHOLD) return;
    seen[idx] = 1;
    queue.push(idx);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  while (queue.length) {
    const idx = queue.pop() as number;
    const x = idx % width;
    const y = Math.floor(idx / width);
    image.setPixelColor(Jimp.rgbaToInt(0, 0, 0, 0), x, y);
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

function productBounds(image: Jimp) {
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  image.scan(0, 0, width, height, (x, y) => {
    const { a } = Jimp.intToRGBA(image.getPixelColor(x, y));
    if (a < 12) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  if (maxX <= minX || maxY <= minY) {
    return { x: 0, y: 0, w: width, h: height };
  }
  const pad = Math.round(Math.max(width, height) * 0.02);
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  return {
    x,
    y,
    w: Math.min(width - x, maxX - minX + 1 + pad * 2),
    h: Math.min(height - y, maxY - minY + 1 + pad * 2),
  };
}

async function editWithOpenAI(png: Buffer, prompt: string) {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) return null;
  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('image', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'product.png');
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const row = body.data?.[0];
  if (row?.b64_json) return Buffer.from(row.b64_json, 'base64');
  if (row?.url) {
    const img = await fetch(row.url);
    if (!img.ok) return null;
    return Buffer.from(await img.arrayBuffer());
  }
  return null;
}

export async function renderProductEdit(source: Buffer, styleId: ImageEditStyleId) {
  const style = imageEditStyleById(styleId);
  if (!style) throw new Error('جلوه نامعتبر است');
  const image = await Jimp.read(source);
  image.background(0x00000000);
  const png = await image.getBufferAsync(Jimp.MIME_PNG);
  const ai = await editWithOpenAI(png, style.prompt);
  if (ai) {
    const out = await Jimp.read(ai);
    out.cover(OUT_SIZE, OUT_SIZE);
    return out.quality(90).getBufferAsync(Jimp.MIME_JPEG);
  }

  removeBackground(image);
  const box = productBounds(image);
  const product = image.clone().crop(box.x, box.y, box.w, box.h);
  const fill = style.id === 'square-packshot' ? 0.84 : 0.78;
  product.scaleToFit(Math.round(OUT_SIZE * fill), Math.round(OUT_SIZE * fill));
  if (style.id === 'hero-light') {
    product.contrast(0.08).brightness(0.05);
  }
  const canvas = await new Jimp(
    OUT_SIZE,
    OUT_SIZE,
    Jimp.rgbaToInt(style.background.r, style.background.g, style.background.b, 255),
  );
  const x = Math.round((OUT_SIZE - product.bitmap.width) / 2);
  const y = Math.round((OUT_SIZE - product.bitmap.height) / 2);
  canvas.composite(product, x, y, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1, opacityDest: 1 });
  return canvas.quality(90).getBufferAsync(Jimp.MIME_JPEG);
}
