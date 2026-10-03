import type { ImageEditStyleId } from './image-tokens';

/** Illustrative sample looks for each studio style (not the user's product). */
export const STUDIO_STYLE_SAMPLES: Record<
  ImageEditStyleId,
  { url: string; caption: string }
> = {
  'white-studio': {
    url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80',
    caption: 'پس‌زمینه سفید خالص فروشگاهی',
  },
  'soft-gray': {
    url: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=800&q=80',
    caption: 'استودیو خاکستری با سایه نرم',
  },
  'hero-light': {
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
    caption: 'نور حرفه‌ای برای کاور',
  },
  'square-packshot': {
    url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
    caption: 'کادر مربعی کاتالوگ',
  },
};

/** Scene look samples for virtual model settings. */
export const MODEL_SCENE_SAMPLES: Record<string, string> = {
  studio:
    'https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=900&q=80',
  concretestudio:
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
  coloredstudio:
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=900&q=80',
  street:
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
  cafe: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
  library:
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
  bedroom:
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
  beach:
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
  sunset:
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=900&q=80',
  goldenlight:
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80',
  businessdistrict:
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
  random:
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80',
};

/** Soft portrait cues for model presets (illustrative). */
export const MODEL_PRESET_SAMPLES: Record<string, string> = {
  avery: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  sam: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  taylor: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80',
  kendall: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  jordan: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  casey: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
  maya: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
  reece: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  lena: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80',
  julia: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80',
  jackson: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  sophia: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  emma: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
  ava: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
  zoe: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80',
  fiona: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
};

export function modelSceneSample(scene: string) {
  return MODEL_SCENE_SAMPLES[scene] || MODEL_SCENE_SAMPLES.studio;
}

export function modelPresetSample(model: string) {
  return MODEL_PRESET_SAMPLES[model] || MODEL_PRESET_SAMPLES.avery;
}

export function studioStyleSample(styleId: string) {
  return STUDIO_STYLE_SAMPLES[styleId as ImageEditStyleId] || STUDIO_STYLE_SAMPLES['white-studio'];
}
