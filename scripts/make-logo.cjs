const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const SRC = path.join(
  process.env.USERPROFILE,
  '.cursor/projects/c-Users-TelC-Tech-Downloads-projects-basar-next/assets/c__Users_TelC_Tech_AppData_Roaming_Cursor_User_workspaceStorage_355e78a853b9df9d1116bca0f95e14d3_images_image-4f7ebe45-7923-4336-b187-8cc723328d38.png',
);
const PUBLIC = path.join(process.cwd(), 'public', 'brand');
const APP = path.join(process.cwd(), 'src', 'app');

function isBackground(r, g, b) {
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (luma > 205) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const gold = r > 110 && g > 70 && r + 8 >= g && g > b + 15 && sat > 0.22;
  return !gold;
}

async function knockOut(img) {
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    this.bitmap.data[idx + 3] = isBackground(r, g, b) ? 0 : 255;
  });
  return img;
}

function contentBox(img, pad = 12) {
  const { width, height, data } = img.bitmap;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function markBox(img) {
  const { width, height, data } = img.bitmap;
  const topBand = Math.floor(height * 0.45);
  const topCols = new Array(width).fill(0);
  for (let x = 0; x < width; x++) {
    let n = 0;
    for (let y = 0; y < topBand; y++) {
      if (data[(y * width + x) * 4 + 3] > 20) n += 1;
    }
    topCols[x] = n / topBand;
  }
  let right = width - 1;
  while (right > 0 && topCols[right] < 0.05) right -= 1;
  let x = right;
  while (x > 0 && topCols[x] >= 0.04) x -= 1;
  while (x < right && topCols[x] < 0.05) x += 1;
  const pad = 4;
  x = Math.max(0, x - pad);
  return { x, y: 0, w: width - x, h: height };
}

async function squarePad(img, size) {
  const box = contentBox(img, 4);
  const cropped = img.clone().crop(box.x, box.y, box.w, box.h);
  const side = Math.max(cropped.bitmap.width, cropped.bitmap.height);
  const canvas = new Jimp(side, side, 0x00000000);
  const dx = Math.floor((side - cropped.bitmap.width) / 2);
  const dy = Math.floor((side - cropped.bitmap.height) / 2);
  canvas.composite(cropped, dx, dy);
  canvas.resize(size, size);
  return canvas;
}

async function write(img, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await img.writeAsync(dest);
  console.log('wrote', dest, img.bitmap.width, 'x', img.bitmap.height);
}

async function main() {
  if (!fs.existsSync(SRC)) {
    throw new Error(`source logo not found: ${SRC}`);
  }
  fs.mkdirSync(PUBLIC, { recursive: true });
  const img = await Jimp.read(SRC);
  await knockOut(img);
  const box = contentBox(img, 18);
  const full = img.clone().crop(box.x, box.y, box.w, box.h);
  await write(full, path.join(PUBLIC, 'logo.png'));

  const word = full.clone();
  const maxW = 900;
  if (word.bitmap.width > maxW) word.resize(maxW, Jimp.AUTO);
  await write(word, path.join(PUBLIC, 'logo-wide.png'));

  const markRegion = markBox(full);
  const markRaw = full.clone().crop(markRegion.x, markRegion.y, markRegion.w, markRegion.h);
  const mark = await squarePad(markRaw, 512);
  await write(mark, path.join(PUBLIC, 'logo-mark.png'));

  await write(mark.clone(), path.join(PUBLIC, 'icon-512.png'));
  await write(mark.clone().resize(192, 192), path.join(PUBLIC, 'icon-192.png'));
  await write(mark.clone().resize(192, 192), path.join(APP, 'icon.png'));
  await write(mark.clone().resize(180, 180), path.join(APP, 'apple-icon.png'));
  await write(mark.clone().resize(32, 32), path.join(PUBLIC, 'favicon.png'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
