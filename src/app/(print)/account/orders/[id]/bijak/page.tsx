import { WebsiteOrderDocument } from '@/components/shop/WebsiteOrderDocument';

export default async function ShopBijakPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WebsiteOrderDocument id={id} kind="bijak" backHref="/account" backLabel="بازگشت به حساب" />;
}