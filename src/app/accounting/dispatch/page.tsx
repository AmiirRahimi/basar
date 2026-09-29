import { AccountingShell } from '@/components/accounting/AccountingShell';
import { WarehouseDesk, type WarehouseDeskInvoice } from '@/components/accounting/WarehouseDesk';
import { getWarehouseDesk } from '@/actions/crud';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function DispatchPage() {
  const res = await getWarehouseDesk();
  guardSession(res);
  return (
    <AccountingShell
      title="خروج از انبار"
      description="لباس‌های فاکتورهای باز. وقتی هر بسته از انبار خارج شد علامت بزنید؛ اگر همه قلم‌ها خارج شوند وضعیت فاکتور می‌شود «خارج از انبار»."
      error={errorMessage(res)}
    >
      <WarehouseDesk invoices={(Array.isArray(res.data) ? res.data : []) as WarehouseDeskInvoice[]} />
    </AccountingShell>
  );
}
