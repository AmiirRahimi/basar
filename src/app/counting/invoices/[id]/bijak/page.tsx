import Link from 'next/link';
import { getSessionUser } from '@/actions/auth';
import { getResource } from '@/actions/crud';
import { InvoiceBijakView, type BijakSender } from '@/components/counting/InvoiceBijakView';
import type { Invoice } from '@/lib/types';

export default async function InvoiceBijakPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoiceRes, userRes] = await Promise.all([getResource<Invoice>('invoice', id), getSessionUser()]);
  const invoice = invoiceRes.data;

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

  const user = userRes.ok && userRes.data ? (userRes.data as BijakSender) : null;

  return <InvoiceBijakView invoice={invoice} sender={user} />;
}
