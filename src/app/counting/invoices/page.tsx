import { CountingShell } from '@/components/counting/CountingShell';
import { listInvoices } from '@/actions/crud';
import { clothOptions, personOptions } from '@/actions/options';
import { InvoiceCrud } from '@/components/counting/InvoiceCrud';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function InvoicesPage() {
  const [res, people, clothes] = await Promise.all([listInvoices(), personOptions(), clothOptions()]);
  guardSession(res);
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="فاکتور" error={errorMessage(res)}>
      <InvoiceCrud invoices={rows} people={people} clothes={clothes} />
    </CountingShell>
  );
}
