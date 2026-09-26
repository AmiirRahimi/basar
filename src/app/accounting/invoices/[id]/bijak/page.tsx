import Link from 'next/link';
import { getResource } from '@/actions/crud';
import { InvoiceDocument } from '@/components/accounting/InvoiceDocument';
import type { Invoice } from '@/lib/types';

export default async function InvoiceBijakPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceRes = await getResource<Invoice>('invoice', id);
  const invoice = invoiceRes.data;

  if (!invoiceRes.ok || !invoice) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center" dir="rtl">
        <p className="mb-4">{invoiceRes.message || 'فاکتور پیدا نشد'}</p>
        <Link href="/accounting/invoices" className="text-primary">
          بازگشت به فاکتورها
        </Link>
      </div>
    );
  }

  return <InvoiceDocument kind="bijak" invoice={invoice} />;
}
