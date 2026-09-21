import {
  allowedPreset,
  PHOTOROOM_MODELS,
  PHOTOROOM_POSES,
  PHOTOROOM_SCENES,
  type PhotoroomVirtualOptions,
} from '@/lib/photoroom';
import type { ImageEditStyleId } from '@/lib/image-tokens';

const EDIT_URL = 'https://image-api.photoroom.com/v2/edit';

export function photoroomApiKey() {
  const raw = (process.env.PHOTOROOM_API_KEY || '').trim();
  if (!raw) return '';
  const sandbox = String(process.env.PHOTOROOM_SANDBOX || 'true').toLowerCase() !== 'false';
  if (sandbox && !raw.startsWith('sandbox_')) return `sandbox_${raw}`;
  if (!sandbox && raw.startsWith('sandbox_')) return raw.slice('sandbox_'.length);
  return raw;
}

function mimeOf(buffer: Buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

function fileName(buffer: Buffer, base: string) {
  const mime = mimeOf(buffer);
  if (mime === 'image/png') return `${base}.png`;
  if (mime === 'image/webp') return `${base}.webp`;
  return `${base}.jpg`;
}

function appendFile(form: FormData, field: string, buffer: Buffer, base: string) {
  const mime = mimeOf(buffer);
  form.append(field, new Blob([new Uint8Array(buffer)], { type: mime }), fileName(buffer, base));
}

async function postEdit(form: FormData) {
  const key = photoroomApiKey();
  if (!key) throw new Error('کلید Photoroom تنظیم نشده است');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(EDIT_URL, {
      method: 'POST',
      headers: { 'x-api-key': key, Accept: 'image/png,image/jpeg,application/json' },
      body: form,
      signal: controller.signal,
    });
    const type = String(res.headers.get('content-type') || '');
    if (!res.ok) {
      let detail = '';
      if (type.includes('json')) {
        const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        detail = String(body?.message || body?.error || '');
      } else {
        detail = (await res.text().catch(() => '')).slice(0, 180);
      }
      throw new Error(detail || 'ساخت تصویر Photoroom ناموفق بود');
    }
    if (type.includes('json')) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message || 'پاسخ تصویر از Photoroom نیامد');
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error('تصویر خالی برگشت');
    return { buffer: buf, ext: type.includes('png') ? 'png' : 'jpg' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('زمان ساخت تصویر تمام شد. دوباره تلاش کنید');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const STUDIO_FIELDS: Record<ImageEditStyleId, Record<string, string>> = {
  'white-studio': {
    removeBackground: 'true',
    'background.color': 'FFFFFF',
    padding: '0.12',
    'shadow.mode': 'ai.soft',
  },
  'soft-gray': {
    removeBackground: 'true',
    'background.color': 'EEF0F3',
    padding: '0.12',
    'shadow.mode': 'ai.soft',
  },
  'hero-light': {
    removeBackground: 'true',
    'background.color': 'FAFAFC',
    padding: '0.1',
    'shadow.mode': 'ai.soft',
  },
  'square-packshot': {
    removeBackground: 'true',
    'background.color': 'FFFFFF',
    padding: '0.08',
    'shadow.mode': 'ai.soft',
  },
};

export async function photoroomStudioEdit(source: Buffer, styleId: ImageEditStyleId) {
  const fields = STUDIO_FIELDS[styleId];
  if (!fields || !photoroomApiKey()) return null;
  const form = new FormData();
  appendFile(form, 'imageFile', source, 'product');
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return postEdit(form);
}

export async function photoroomVirtualModel(main: Buffer, extras: Buffer[], options: PhotoroomVirtualOptions = {}) {
  if (!photoroomApiKey()) throw new Error('کلید Photoroom تنظیم نشده است');
  const form = new FormData();
  appendFile(form, 'imageFile', main, 'product');
  form.append('removeBackground', 'false');
  form.append('referenceBox', 'originalImage');
  form.append('virtualModel.mode', 'ai.auto');
  form.append('virtualModel.model.preset.name', allowedPreset(PHOTOROOM_MODELS, options.model || '', 'avery'));
  form.append('virtualModel.scene.preset.name', allowedPreset(PHOTOROOM_SCENES, options.scene || '', 'studio'));
  form.append('virtualModel.pose', allowedPreset(PHOTOROOM_POSES, options.pose || '', 'standing'));
  form.append('virtualModel.size', 'PORTRAIT_HD_3_2');
  const prompt = String(options.prompt || '').trim().slice(0, 200);
  if (prompt) form.append('virtualModel.prompt', prompt);
  extras.slice(0, 4).forEach((buffer, index) => {
    appendFile(form, `virtualModel.additionalProductImages[${index}].imageFile`, buffer, `angle-${index + 1}`);
  });
  return postEdit(form);
}
