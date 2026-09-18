import { getCatalog } from '@/actions/shop';
import { HomeLanding } from '@/components/shop/HomeLanding';

export default async function HomePage() {
  const products = await getCatalog();
  return <HomeLanding products={products} />;
}
