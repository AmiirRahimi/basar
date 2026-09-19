import { CountingShell } from '@/components/counting/CountingShell';
import { ShareLinksBoard } from '@/components/counting/ShareLinksBoard';
import { listClothes } from '@/actions/crud';
import { listProductShares } from '@/actions/share';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import type { ProductShare } from '@/lib/types';

export default async function SharesPage() {
  const [clothesRes, sharesRes] = await Promise.all([listClothes(), listProductShares()]);
  guardSession(clothesRes, sharesRes);
  const clothes = Array.isArray(clothesRes.data) ? clothesRes.data : [];
  const shares = (Array.isArray(sharesRes.data) ? sharesRes.data : []) as ProductShare[];

  return (
    <CountingShell
      title="لینک محصول"
      description="با اشتراک فعال لینک بسازید و در طرح‌های بالاتر همان لینک را با پیامک بفرستید."
      error={errorMessage(clothesRes) || errorMessage(sharesRes)}
    >
      <ShareLinksBoard clothes={clothes} shares={shares} />
    </CountingShell>
  );
}
