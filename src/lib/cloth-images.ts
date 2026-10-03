import { MAX_CLOTH_IMAGES, parseImageList } from './shop-cart';

export const MAX_CLOTH_ORIGINALS = MAX_CLOTH_IMAGES;
export const MAX_AI_VARIANTS_PER_ORIGINAL = 12;

export type ClothImageGenerated = {
  id: string;
  url: string;
  styleId: string;
  shown: boolean;
  createdAt: string;
};

export type ClothImageGroup = {
  id: string;
  originalUrl: string;
  originalShown: boolean;
  generated: ClothImageGenerated[];
};

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function encodeClothImageLibrary(library: ClothImageGroup[]) {
  return JSON.stringify(library);
}

export function parseClothImageLibrary(value: unknown): ClothImageGroup[] {
  if (Array.isArray(value)) return normalizeClothImageLibrary(value, []);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return normalizeClothImageLibrary(parsed, []);
  } catch {
    return [];
  }
}

export function normalizeClothImageLibrary(
  library: unknown,
  fallbackImages: unknown = [],
): ClothImageGroup[] {
  if (Array.isArray(library) && library.length) {
    return library
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const item = row as Record<string, unknown>;
        const originalUrl = String(item.originalUrl || '').trim();
        if (!originalUrl) return null;
        const generated = Array.isArray(item.generated)
          ? item.generated
              .map((gen) => {
                if (!gen || typeof gen !== 'object') return null;
                const g = gen as Record<string, unknown>;
                const url = String(g.url || '').trim();
                if (!url) return null;
                return {
                  id: String(g.id || newId()),
                  url,
                  styleId: String(g.styleId || 'ai'),
                  shown: Boolean(g.shown),
                  createdAt: String(g.createdAt || new Date().toISOString()),
                } satisfies ClothImageGenerated;
              })
              .filter(Boolean) as ClothImageGenerated[]
          : [];
        return {
          id: String(item.id || newId()),
          originalUrl,
          originalShown: item.originalShown !== false,
          generated: generated.slice(0, MAX_AI_VARIANTS_PER_ORIGINAL),
        } satisfies ClothImageGroup;
      })
      .filter(Boolean) as ClothImageGroup[];
  }

  return parseImageList(fallbackImages).slice(0, MAX_CLOTH_ORIGINALS).map((url) => ({
    id: newId(),
    originalUrl: url,
    originalShown: true,
    generated: [],
  }));
}

export function shownUrlsFromLibrary(library: ClothImageGroup[]) {
  const urls: string[] = [];
  for (const group of library) {
    if (group.originalShown) urls.push(group.originalUrl);
    for (const gen of group.generated) {
      if (gen.shown) urls.push(gen.url);
    }
  }
  return [...new Set(urls.filter(Boolean))].slice(0, MAX_CLOTH_IMAGES);
}

export function countShownInLibrary(library: ClothImageGroup[]) {
  return shownUrlsFromLibrary(library).length;
}

export function allLibraryUrls(library: ClothImageGroup[]) {
  const urls: string[] = [];
  for (const group of library) {
    urls.push(group.originalUrl);
    for (const gen of group.generated) urls.push(gen.url);
  }
  return [...new Set(urls.filter(Boolean))];
}

export function libraryHasUrl(library: ClothImageGroup[], url: string) {
  const target = String(url || '').trim();
  return allLibraryUrls(library).includes(target);
}

export function findGroupByUrl(library: ClothImageGroup[], url: string) {
  const target = String(url || '').trim();
  return (
    library.find(
      (group) =>
        group.originalUrl === target || group.generated.some((gen) => gen.url === target),
    ) || null
  );
}

export function addOriginalToLibrary(library: ClothImageGroup[], url: string): ClothImageGroup[] {
  const nextUrl = String(url || '').trim();
  if (!nextUrl) return library;
  if (library.some((group) => group.originalUrl === nextUrl)) return library;
  if (library.length >= MAX_CLOTH_ORIGINALS) return library;
  const shownCount = countShownInLibrary(library);
  return [
    ...library,
    {
      id: newId(),
      originalUrl: nextUrl,
      originalShown: shownCount < MAX_CLOTH_IMAGES,
      generated: [],
    },
  ];
}

export function removeGroupFromLibrary(library: ClothImageGroup[], groupId: string) {
  return library.filter((group) => group.id !== groupId);
}

export function removeGeneratedFromLibrary(
  library: ClothImageGroup[],
  groupId: string,
  generatedId: string,
) {
  return library.map((group) => {
    if (group.id !== groupId) return group;
    return {
      ...group,
      generated: group.generated.filter((gen) => gen.id !== generatedId),
    };
  });
}

export function replaceOriginalInLibrary(library: ClothImageGroup[], groupId: string, url: string) {
  const nextUrl = String(url || '').trim();
  if (!nextUrl) return library;
  return library.map((group) =>
    group.id === groupId ? { ...group, originalUrl: nextUrl, generated: [] } : group,
  );
}

export function toggleShownInLibrary(
  library: ClothImageGroup[],
  target: { groupId: string; kind: 'original' | 'generated'; generatedId?: string },
): { library: ClothImageGroup[]; error?: string } {
  const group = library.find((row) => row.id === target.groupId);
  if (!group) return { library };

  let willShow = false;
  if (target.kind === 'original') willShow = !group.originalShown;
  else {
    const gen = group.generated.find((row) => row.id === target.generatedId);
    if (!gen) return { library };
    willShow = !gen.shown;
  }

  if (willShow && countShownInLibrary(library) >= MAX_CLOTH_IMAGES) {
    return {
      library,
      error: `حداکثر ${MAX_CLOTH_IMAGES} تصویر می‌تواند در محصول نمایش داده شود`,
    };
  }

  return {
    library: library.map((row) => {
      if (row.id !== target.groupId) return row;
      if (target.kind === 'original') return { ...row, originalShown: !row.originalShown };
      return {
        ...row,
        generated: row.generated.map((gen) =>
          gen.id === target.generatedId ? { ...gen, shown: !gen.shown } : gen,
        ),
      };
    }),
  };
}

/** Prefer keeping `preferUrl` visible when the shown cap is exceeded. */
export function enforceShownLimit(library: ClothImageGroup[], preferUrl?: string) {
  const prefer = String(preferUrl || '').trim();
  const shown = shownUrlsFromLibrary(library);
  if (shown.length <= MAX_CLOTH_IMAGES) return library;

  const keep = new Set<string>();
  if (prefer && shown.includes(prefer)) keep.add(prefer);
  for (const url of shown) {
    if (keep.size >= MAX_CLOTH_IMAGES) break;
    keep.add(url);
  }

  return library.map((group) => ({
    ...group,
    originalShown: Boolean(group.originalShown && keep.has(group.originalUrl)),
    generated: group.generated.map((gen) => ({
      ...gen,
      shown: Boolean(gen.shown && keep.has(gen.url)),
    })),
  }));
}

export function addGeneratedToLibrary(
  library: ClothImageGroup[],
  sourceUrl: string,
  resultUrl: string,
  styleId: string,
): ClothImageGroup[] {
  const source = String(sourceUrl || '').trim();
  const result = String(resultUrl || '').trim();
  if (!source || !result) return library;

  let group = findGroupByUrl(library, source);
  let next = library;

  if (!group) {
    next = addOriginalToLibrary(library, source);
    group = findGroupByUrl(next, source);
  }
  if (!group) return library;

  if (group.generated.some((gen) => gen.url === result)) {
    // Re-show an existing result if the user generated again.
    next = next.map((row) =>
      row.id !== group!.id
        ? row
        : {
            ...row,
            generated: row.generated.map((gen) =>
              gen.url === result ? { ...gen, shown: true } : gen,
            ),
          },
    );
    return enforceShownLimit(next, result);
  }

  const generated: ClothImageGenerated = {
    id: newId(),
    url: result,
    styleId: String(styleId || 'ai'),
    shown: true,
    createdAt: new Date().toISOString(),
  };

  next = next.map((row) => {
    if (row.id !== group!.id) return row;
    return {
      ...row,
      generated: [generated, ...row.generated].slice(0, MAX_AI_VARIANTS_PER_ORIGINAL),
    };
  });
  return enforceShownLimit(next, result);
}

export function aiStyleLabel(styleId?: string) {
  const id = String(styleId || '');
  if (id === 'virtual-model') return 'عکس با مدل';
  if (id === 'white-studio') return 'پس‌زمینه سفید';
  if (id === 'soft-gray') return 'استودیو خاکستری';
  if (id === 'hero-light') return 'نور استودیو';
  if (id === 'square-packshot') return 'کاتالوگ مربعی';
  return 'هوش مصنوعی';
}
