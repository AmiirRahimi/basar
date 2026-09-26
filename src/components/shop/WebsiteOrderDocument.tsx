import Link from 'next/link';
import { InvoiceBijakView } from '@/components/counting/InvoiceBijakView';
import { InvoicePrintView } from '@/components/counting/InvoicePrintView';
import type { CartLine, Invoice } from '@/lib/types';
import { getWebsiteInvoiceDocument } from '@/server/website-orders';

export async function WebsiteOrderDocument({
  id,
  kind,
  backHref,
  backLabel,
}: {
  id: string;
  kind: 'print' | 'bijak';
  backHref: string;
  backLabel: string;
}) {
  const res = await getWebsiteInvoiceDocument(id);
  const data = res.ok && res.data ? (res.data as { invoice: Invoice; lines: CartLine[] }) : null;
  if (!data) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center" dir="rtl">
        <p className="mb-4">{res.message || 'سفارش پیدا نشد'}</p>
        <Link href={backHref} className="text-primary">
          {backLabel}
        </Link>
      </div>
    );
  }

  const root = backHref.startsWith('/admin') ? `/admin/orders/${id}` : `/account/orders/${id}`;
  if (kind === 'bijak') {
    return <InvoiceBijakView invoice={data.invoice} backHref={`${root}/print`} invoiceHref={`${root}/print`} />;
  }
  return (
    <InvoicePrintView
      invoice={data.invoice}
      lines={data.lines}
      backHref={backHref}
      backLabel={backLabel}
      bijakHref={`${root}/bijak`}
    />
  );
}
