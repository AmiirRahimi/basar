import { CountingShell } from '@/components/counting/CountingShell';
import { StorefrontOrdersPanel } from '@/components/counting/StorefrontOrdersPanel';
import { getStorefrontOrderBoard } from '@/actions/shop';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { faNumber } from '@/lib/format';
import { GATEWAY_FEE_PERCENT } from '@/lib/storefront';
import type { StorefrontOrderBoard } from '@/lib/types';

export default async function StorefrontAdminPage() {
  const res = await getStorefrontOrderBoard();
  guardSession(res);
  return (
    <CountingShell
      title="سفارش‌های ویترین"
      description={`پرداخت از درگاه باسار است. از هر سفارش ${faNumber(GATEWAY_FEE_PERCENT)}٪ سهم پلتفرم است و باقی باید به فروشنده پرداخت شود.`}
      error={errorMessage(res)}
    >
      {res.ok && res.data ? (
        <StorefrontOrdersPanel board={res.data as StorefrontOrderBoard} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </CountingShell>
  );
}
