export const PHOTOROOM_MODELS = [
  { value: 'avery', label: 'Avery' },
  { value: 'sam', label: 'Sam' },
  { value: 'taylor', label: 'Taylor' },
  { value: 'kendall', label: 'Kendall' },
  { value: 'jordan', label: 'Jordan' },
  { value: 'casey', label: 'Casey' },
  { value: 'maya', label: 'Maya' },
  { value: 'reece', label: 'Reece' },
  { value: 'lena', label: 'Lena' },
  { value: 'julia', label: 'Julia' },
  { value: 'jackson', label: 'Jackson' },
  { value: 'sophia', label: 'Sophia' },
  { value: 'emma', label: 'Emma' },
  { value: 'ava', label: 'Ava' },
  { value: 'zoe', label: 'Zoe' },
  { value: 'fiona', label: 'Fiona' },
] as const;

export const PHOTOROOM_SCENES = [
  { value: 'studio', label: 'استودیو' },
  { value: 'concretestudio', label: 'استودیو بتنی' },
  { value: 'coloredstudio', label: 'استودیو رنگی' },
  { value: 'street', label: 'خیابان' },
  { value: 'cafe', label: 'کافه' },
  { value: 'library', label: 'کتابخانه' },
  { value: 'bedroom', label: 'اتاق' },
  { value: 'beach', label: 'ساحل' },
  { value: 'sunset', label: 'غروب' },
  { value: 'goldenlight', label: 'نور طلایی' },
  { value: 'businessdistrict', label: 'مرکز شهر' },
  { value: 'random', label: 'تصادفی' },
] as const;

export const PHOTOROOM_POSES = [
  { value: 'standing', label: 'ایستاده' },
  { value: '34turn', label: 'سه‌رخ' },
  { value: 'walkingforward', label: 'گام به جلو' },
  { value: 'handinpocket', label: 'دست در جیب' },
  { value: 'crossedarms', label: 'دست به سینه' },
  { value: 'back', label: 'پشت' },
  { value: 'overtheshoulder', label: 'از روی شانه' },
  { value: 'seated', label: 'نشسته' },
  { value: 'adjustingclothing', label: 'تنظیم لباس' },
  { value: 'powerstance', label: 'ایست قدرتی' },
  { value: 'random', label: 'تصادفی' },
] as const;

export const MAX_VIRTUAL_MODEL_IMAGES = 5;

export type PhotoroomVirtualOptions = {
  model?: string;
  scene?: string;
  pose?: string;
  prompt?: string;
};

export function allowedPreset(list: readonly { value: string }[], value: string, fallback: string) {
  const next = String(value || '').trim();
  return list.some((row) => row.value === next) ? next : fallback;
}

export function replaceSelectedImages(images: string[], selected: string[], resultUrl: string) {
  const set = new Set(selected.filter(Boolean));
  const first = images.findIndex((url) => set.has(url));
  const kept = images.filter((url) => !set.has(url));
  const at = first < 0 ? kept.length : Math.min(first, kept.length);
  kept.splice(at, 0, resultUrl);
  return kept.filter((url, index, list) => url && list.indexOf(url) === index);
}
