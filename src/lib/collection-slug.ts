export function faSlug(value: string) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export type NamedCollection = { id: string; name: string };

export function collectionSlugs(collections: NamedCollection[]) {
  const byId = new Map<string, string>();
  const bySlug = new Map<string, NamedCollection>();
  const used = new Set<string>();

  for (const collection of collections) {
    let slug = faSlug(collection.name) || 'collection';
    if (used.has(slug)) slug = `${slug}-${collection.id.slice(-6)}`;
    used.add(slug);
    byId.set(collection.id, slug);
    bySlug.set(slug, collection);
  }

  return { byId, bySlug };
}

export function collectionPath(name: string, id: string, collections: NamedCollection[]) {
  const { byId } = collectionSlugs(collections);
  const slug = byId.get(id) || faSlug(name) || id;
  return `/c/${encodeURIComponent(slug)}`;
}
