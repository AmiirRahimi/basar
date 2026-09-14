import { CountingShell } from '@/components/counting/CountingShell';
import { listInvoices } from '@/actions/crud';
import { clothOptions, personOptions } from '@/actions/options';
import { InvoiceCrud } from '@/components/counting/InvoiceCrud';

export default async function InvoicesPage() {
  const [res, people, clothes] = await Promise.all([listInvoices(), personOptions(), clothOptions()]);
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="فاکتور" description={res.ok ? undefined : res.message}>
      <InvoiceCrud invoices={rows} people={people} clothes={clothes} />
    </CountingShell>
  );
}
