import { WebsiteOrderDocument } from '@/components/shop/WebsiteOrderDocument';

export default async function AdminWebsiteInvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <WebsiteOrderDocument
      id={id}
      kind="print"
      backHref="/admin/orders"
      backLabel="بازگشت به سفارش‌های وب‌سایت"
    />
  );
}
