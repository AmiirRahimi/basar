import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalog, getPublicKinds } from '@/actions/shop';
import { ProductCard } from '@/components/shop/ProductCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { ShopButton } from '@/components/shop/ShopUi';
import { collectionsForSeo } from '@/lib/catalog';
import { collectionSlugs } from '@/lib/collection-slug';
import { faNumber } from '@/lib/format';
import { shopOrganizationLd } from '@/lib/json-ld';
import { pageShare } from '@/lib/share-meta';
import { absoluteUrl } from '@/lib/site';

type Params = { slug: string };

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

function decodeSlug(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateStaticParams() {
  const [products, kinds] = await Promise.all([getCatalog(), getPublicKinds()]);
  const { byId } = collectionSlugs(collectionsForSeo(products, kinds));
  return [...byId.values()].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug: raw } = await params;
  const slug = decodeSlug(raw);
  const [products, kinds] = await Promise.all([getCatalog(), getPublicKinds()]);
  const collections = collectionsForSeo(products, kinds);
  const found = collectionSlugs(collections).bySlug.get(slug);
  if (!found) return { title: 'مجموعه پیدا نشد' };
  const title = `${found.name} عمده | جین پوش`;
  const description = `خرید عمده ${found.name} از حجره جین پوش در بازار بزرگ تهران. سفارش با بسته، موجودی روز حجره.`;
  const url = absoluteUrl(`/c/${encodeURIComponent(slug)}`);
  const image = collections.find((row) => row.id === found.id)?.image;
  return pageShare({ title, description, url, image });
}

export default async function CollectionPage({ params }: { params: Promise<Params> }) {
  const { slug: raw } = await params;
  const slug = decodeSlug(raw);
  const [products, kinds] = await Promise.all([getCatalog(), getPublicKinds()]);
  const collections = collectionsForSeo(products, kinds);
  const found = collectionSlugs(collections).bySlug.get(slug);
  if (!found) notFound();

  const items = products.filter((product) => product.categoryId === found.id || product.category === found.name);
  const url = absoluteUrl(`/c/${encodeURIComponent(slug)}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 lg:px-6 lg:py-12">
      <JsonLd
        data={[
          shopOrganizationLd(),
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${found.name} عمده`,
            description: `فروش عمده ${found.name} از جین پوش، بازار بزرگ تهران`,
            url,
            isPartOf: { '@type': 'WebSite', name: 'جین پوش', url: absoluteUrl('/') },
          },
        ]}
      />
      <p className="text-[11px] tracking-[0.28em] text-shop-saffron">عمده از بازار بزرگ</p>
      <h1 className="mt-2 text-2xl font-semibold text-shop-ink sm:text-3xl md:text-4xl">{found.name} عمده</h1>
      <p className="mt-3 max-w-2xl text-sm leading-8 text-shop-ink/65 sm:text-base">
        {found.name} را از حجره جین پوش در بازار آهنگران عمده بخر. سفارش با بسته است، نه عدد تکی. {faNumber(items.length)} مدل
        آماده است.
      </p>
      <div className="mt-8">
        {items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-shop-ink/15 px-6 py-20 text-center text-shop-ink/50">
            الان مدلی از این نوع در ویترین نیست.
          </p>
        )}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <ShopButton href="/catalog">همه محصولات</ShopButton>
        <ShopButton href="/" variant="outline">
          خانه جین پوش
        </ShopButton>
      </div>
    </div>
  );
}
