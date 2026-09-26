import { WebsiteOrderDocument } from '@/components/shop/WebsiteOrderDocument';

export default async function ShopInvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WebsiteOrderDocument id={id} kind="print" backHref="/account" backLabel="بازگشت به حساب" />;
}
