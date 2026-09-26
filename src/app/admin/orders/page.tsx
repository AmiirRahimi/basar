import { AccountingShell } from '@/components/accounting/AccountingShell';
import { WebsiteOrdersBoard } from '@/components/admin/WebsiteOrdersBoard';
import { getWebsiteOrderBoard } from '@/actions/admin';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import type { WebsiteOrderBoard } from '@/lib/website-orders';

export default async function WebsiteOrdersPage() {
  const res = await getWebsiteOrderBoard();
  guardSession(res);
  return (
    <AccountingShell
      title="سفارش‌های وب‌سایت"
      description="فروش وب‌سایت، پرداخت‌ها، خرید هر کاربر و وضعیت سفارش. فقط سوپریوزر این صفحه را می‌بیند."
      error={errorMessage(res)}
    >
      {res.ok && res.data ? (
        <WebsiteOrdersBoard board={res.data as WebsiteOrderBoard} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </AccountingShell>
  );
}
