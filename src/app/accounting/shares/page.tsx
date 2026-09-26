import { AccountingShell } from '@/components/accounting/AccountingShell';
import { SellerStorefrontOrders } from '@/components/accounting/SellerStorefrontOrders';
import { ShareLinksBoard } from '@/components/accounting/ShareLinksBoard';
import { listClothes, listPeople } from '@/actions/crud';
import { listProductShares } from '@/actions/share';
import { getSellerStorefrontOrders } from '@/actions/shop';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { personIsCustomer } from '@/lib/constants';
import { GATEWAY_FEE_PERCENT } from '@/lib/storefront';
import type { ProductShare, StorefrontOrderBoard } from '@/lib/types';

export default async function SharesPage() {
  const [clothesRes, sharesRes, peopleRes, ordersRes] = await Promise.all([
    listClothes(),
    listProductShares(),
    listPeople(),
    getSellerStorefrontOrders(),
  ]);
  guardSession(clothesRes, sharesRes, peopleRes, ordersRes);
  const clothes = Array.isArray(clothesRes.data) ? clothesRes.data : [];
  const shares = (Array.isArray(sharesRes.data) ? sharesRes.data : []) as ProductShare[];
  const customers = (Array.isArray(peopleRes.data) ? peopleRes.data : []).filter((row: Record<string, any>) =>
    personIsCustomer(row.role),
  );
  const board = (ordersRes.ok && ordersRes.data ? ordersRes.data : null) as StorefrontOrderBoard | null;

  return (
    <AccountingShell
      title="لینک محصول"
      description="برای مشتری لینک اختصاصی بسازید تا مدل‌ها را ببیند و بخرد."
      error={errorMessage(clothesRes) || errorMessage(sharesRes) || errorMessage(peopleRes) || errorMessage(ordersRes)}
    >
      <ShareLinksBoard
        clothes={clothes}
        shares={shares}
        customers={customers}
        extra={
          <SellerStorefrontOrders
            shares={shares}
            board={
              board || {
                orders: [],
                totals: { total: 0, platformFee: 0, sellerPayout: 0, pendingPayout: 0, paidPayout: 0, count: 0 },
                feePercent: GATEWAY_FEE_PERCENT,
                isPlatformAdmin: false,
              }
            }
          />
        }
      />
    </AccountingShell>
  );
}
