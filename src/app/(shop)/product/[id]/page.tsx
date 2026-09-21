import type { Metadata } from 'next';
import { getCatalog, getCatalogProduct } from '@/actions/shop';
import { JsonLd } from '@/components/seo/JsonLd';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductPackForm } from '@/components/shop/ProductPackForm';
import { SaleCountdown } from '@/components/shop/SaleCountdown';
import { collectionsFromCatalog } from '@/lib/catalog';
import { collectionPath } from '@/lib/collection-slug';
import { faNumber, toman } from '@/lib/format';
import { packLabelFa } from '@/lib/packs';
import { pageShare } from '@/lib/share-meta';
import { absoluteUrl } from '@/lib/site';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getCatalogProduct(id);
  if (!product) return { title: 'محصول پیدا نشد' };
  const title = `${product.name} عمده | جین پوش`;
  const description = `خرید عمده ${product.name} از حجره جین پوش در بازار بزرگ تهران. سفارش با بسته.`;
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
          brand: { '@type': 'Brand', name: 'جین پوش' },
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
        <ProductGallery images={product.images} name={product.name} />
        <div className="space-y-6">
          <div>
            <p className="text-xs tracking-[0.22em] text-shop-ink/45">
              <Link href={categoryHref} className="hover:text-shop-saffron">
                {product.category} عمده
              </Link>
              {' · '}کد {product.code}
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-shop-ink sm:text-4xl">{product.name} عمده</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.newCollection ? (
                <span className="rounded-full bg-shop-saffron px-3 py-1 text-xs font-medium text-shop-ink">کالکشن جدید</span>
              ) : null}
              {product.onSale && product.discountPercent ? (
                <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-medium text-white">
                  حراج {faNumber(product.discountPercent)}٪
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-shop-ink/65">{product.description}</p>
          </div>
          <div>
            {product.onSale && product.listPrice && product.listPrice > product.wholesalePrice ? (
              <p className="text-base text-shop-ink/40 line-through">{toman(product.listPrice)}</p>
            ) : null}
            <p className="text-3xl text-shop-saffron">{toman(product.wholesalePrice)}</p>
            {product.saleEndsAt ? (
              <div className="mt-3">
                <SaleCountdown endsAt={product.saleEndsAt} />
              </div>
            ) : null}
          </div>
          <ul className="grid gap-2 text-sm text-shop-ink/70">
            <li>{packLabelFa(product.packSize)}</li>
            {product.size ? <li>سایز: {product.size}</li> : null}
            {product.color ? <li>رنگ: {product.color}</li> : null}
            {product.style ? <li>مدل: {product.style}</li> : null}
          </ul>
          <div className="rounded-[1.6rem] border border-shop-ink/10 bg-shop-paper p-5">
            <ProductPackForm product={product} />
          </div>
        </div>
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
