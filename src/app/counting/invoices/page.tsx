import { CountingShell } from '@/components/counting/CountingShell';
import { listInvoices } from '@/actions/crud';
import { InvoiceWorkspace } from '@/components/counting/InvoiceWorkspace';

export default async function InvoicesPage() {
  const res = await listInvoices();
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="فاکتور" description={res.ok ? 'پیش‌نویس، اقلام سبد و ارسال' : res.message}>
      <InvoiceWorkspace invoices={rows} />
    </CountingShell>
  );
}
