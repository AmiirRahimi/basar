import type { Metadata } from 'next';
import { getCatalog, getCatalogProduct } from '@/actions/shop';
import { JsonLd } from '@/components/seo/JsonLd';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductColorStage } from '@/components/shop/ProductColorStage';
import { collectionsFromCatalog } from '@/lib/catalog';
import { collectionPath } from '@/lib/collection-slug';
import { pageShare } from '@/lib/share-meta';
import { absoluteUrl } from '@/lib/site';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getCatalogProduct(id);
  if (!product) return { title: 'محصول پیدا نشد' };
  const title = `${product.name} عمده | باسار`;
  const description = `خرید عمده ${product.name} از حجره باسار در بازار بزرگ تهران. سفارش با بسته.`;
  const url = absoluteUrl(`/product/${product.id}`);
  return pageShare({ title, description, url, image: product.image });
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getCatalogProduct(id);
  if (!product) notFound();
  const catalog = await getCatalog();
  const related = catalog.filter((row) => row.id !== product.id && row.categoryId === product.categoryId).slice(0, 3);
  const collections = collectionsFromCatalog(catalog);
  const categoryHref =
    product.categoryId && product.category
      ? collectionPath(product.category, product.categoryId, collections)
      : '/catalog';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 lg:px-6 lg:py-12">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description,
          image: product.images,
          sku: product.code,
          brand: { '@type': 'Brand', name: 'باسار' },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'IRR',
            price: product.wholesalePrice,
            availability: product.count > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: absoluteUrl(`/product/${product.id}`),
          },
        }}
      />
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <ProductColorStage product={product} categoryHref={categoryHref} />
      </div>
      {related.length ? (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-semibold">مدل‌های هم‌نوع</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
