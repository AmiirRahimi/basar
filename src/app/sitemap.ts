import type { MetadataRoute } from 'next';
import { getCatalog, getPublicKinds } from '@/actions/shop';
import { collectionsForSeo } from '@/lib/catalog';
import { collectionSlugs } from '@/lib/collection-slug';
import { absoluteUrl, siteOrigin } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const [products, kinds] = await Promise.all([getCatalog(), getPublicKinds()]);
  const collections = collectionsForSeo(products, kinds);
  const { byId } = collectionSlugs(collections);

  const staticPaths = ['/', '/catalog', '/about', '/contact', '/counting'];
  const now = new Date();

  return [
    ...staticPaths.map((path) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: path === '/' || path === '/counting' ? 1 : 0.8,
    })),
    ...collections.map((collection) => ({
      url: `${origin}/c/${encodeURIComponent(byId.get(collection.id) || collection.id)}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/product/${product.id}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
