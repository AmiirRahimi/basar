'use server';

import { canWriteResource } from '@/lib/roles';
import { MAX_CLOTH_IMAGES } from '@/lib/shop-cart';
import {
  extensionForMime,
  isAllowedImageMime,
  MAX_UPLOAD_BYTES,
  saveClothImage,
} from '@/server/image-store';
import { fail, ok, type ActionResult } from '@/server/result';
import { withWorkspace } from '@/server/workspace';

export async function uploadClothImages(formData: FormData): Promise<ActionResult<{ urls: string[] }>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error;

  const writable = canWriteResource(
    access.session.storeRole || 'owner',
    'cloth',
    access.session.isPlatformAdmin,
    access.session.subscriptionActive !== false,
  );
  if (!writable) return fail('دسترسی ثبت تصویر ندارید', 403);

  const remaining = Math.max(0, Math.min(MAX_CLOTH_IMAGES, Number(formData.get('remaining') || MAX_CLOTH_IMAGES)));
  if (!remaining) return fail(`حداکثر ${MAX_CLOTH_IMAGES} تصویر برای هر لباس مجاز است`);

  const files = formData
    .getAll('files')
    .filter((item): item is File => typeof File !== 'undefined' && item instanceof File && item.size > 0);

  if (!files.length) return fail('فایل تصویری انتخاب نشده است');

  const selected = files.slice(0, remaining);
  const urls: string[] = [];

  for (const file of selected) {
    const mime = String(file.type || '').toLowerCase();
    if (!isAllowedImageMime(mime)) {
      return fail('فقط فایل‌های JPG، PNG، WEBP و GIF مجاز هستند');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail('حجم هر تصویر حداکثر ۸ مگابایت است');
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return fail('حجم هر تصویر حداکثر ۸ مگابایت است');
    }
    const url = await saveClothImage(buffer, extensionForMime(mime));
    urls.push(url);
  }

  return ok({ urls }, `${urls.length} تصویر بارگذاری شد`);
}
