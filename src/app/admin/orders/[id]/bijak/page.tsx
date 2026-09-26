import { WebsiteOrderDocument } from '@/components/shop/WebsiteOrderDocument';

export default async function AdminWebsiteBijakPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <WebsiteOrderDocument
      id={id}
      kind="bijak"
      backHref="/admin/orders"
      backLabel="بازگشت به سفارش‌های وب‌سایت"
    />
  );
}
