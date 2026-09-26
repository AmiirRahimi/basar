import Link from 'next/link';
import { getInvoiceCart, getResource } from '@/actions/crud';
import { InvoiceDocument } from '@/components/counting/InvoiceDocument';
import type { CartLine, Invoice } from '@/lib/types';

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoiceRes, cartRes] = await Promise.all([getResource<Invoice>('invoice', id), getInvoiceCart(id)]);
  const invoice = invoiceRes.data;
  const lines = Array.isArray(cartRes.data) ? (cartRes.data as CartLine[]) : [];

  if (!invoiceRes.ok || !invoice) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center" dir="rtl">
        <p className="mb-4">{invoiceRes.message || 'فاکتور پیدا نشد'}</p>
        <Link href="/counting/invoices" className="text-primary">
          بازگشت به فاکتورها
        </Link>
      </div>
    );
  }

  return <InvoiceDocument kind="print" invoice={invoice} lines={lines} />;
}
