import { CountingShell } from '@/components/counting/CountingShell';
import { listChecks, listInvoices } from '@/actions/crud';
import { clothOptions, personOptions } from '@/actions/options';
import { InvoiceCrud } from '@/components/counting/InvoiceCrud';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import type { Check } from '@/lib/types';

export default async function InvoicesPage() {
  const [res, people, clothes, checks] = await Promise.all([
    listInvoices(),
    personOptions(),
    clothOptions(),
    listChecks(1, 200),
  ]);
  guardSession(res);
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="فاکتور" description="بعد از ثبت فاکتور می‌توانید نقد، چک، هر دو، تخفیف و نسیه دفتر را مشخص کنید" error={errorMessage(res)}>
      <InvoiceCrud
        invoices={rows}
        people={people}
        clothes={clothes}
        checks={Array.isArray(checks.data) ? (checks.data as Check[]) : []}
      />
    </CountingShell>
  );
}
