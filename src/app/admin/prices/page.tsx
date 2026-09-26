import { MarketPricesBoard } from '@/components/admin/MarketPricesBoard';
import { AccountingShell } from '@/components/accounting/AccountingShell';
import { getAdminMarketPrices } from '@/actions/market-prices';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import type { AdminMarketPrices } from '@/lib/market-prices';

export default async function AdminPricesPage() {
  const res = await getAdminMarketPrices();
  guardSession(res);
  const prices = (res.ok ? res.data : null) as AdminMarketPrices | null;
  return (
    <AccountingShell
      title="قیمت‌ها"
      description="یک بخش برای قیمت ارز از API و یک بخش برای قیمت‌های ثابت. هر دو روی نوار متحرک بالای منوی حسابداری دیده می‌شوند."
      error={errorMessage(res)}
    >
      {prices ? <MarketPricesBoard prices={prices} /> : <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>}
    </AccountingShell>
  );
}
