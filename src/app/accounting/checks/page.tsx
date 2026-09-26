import { AccountingShell } from '@/components/accounting/AccountingShell';
import { listChecks } from '@/actions/crud';
import { personOptions } from '@/actions/options';
import { ChecksCrud } from '@/components/accounting/ChecksCrud';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import type { Check } from '@/lib/types';

export default async function ChecksPage() {
  const [res, people] = await Promise.all([listChecks(1, 200), personOptions()]);
  guardSession(res);
  const rows = Array.isArray(res.data) ? (res.data as Check[]) : [];
  return (
    <AccountingShell
      title="چک"
      description="دریافت از مشتری یا پرداخت به شخص، واگذاری چک دریافتی، و ثبت پاس‌شده یا برگشتی"
      error={errorMessage(res)}
    >
      <ChecksCrud checks={rows} people={people} />
    </AccountingShell>
  );
}
