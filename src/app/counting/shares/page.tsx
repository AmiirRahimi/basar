import { CountingShell } from '@/components/counting/CountingShell';
import { ShareLinksBoard } from '@/components/counting/ShareLinksBoard';
import { listClothes, listPeople } from '@/actions/crud';
import { listProductShares } from '@/actions/share';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { personIsCustomer } from '@/lib/constants';
import type { ProductShare } from '@/lib/types';

export default async function SharesPage() {
  const [clothesRes, sharesRes, peopleRes] = await Promise.all([listClothes(), listProductShares(), listPeople()]);
  guardSession(clothesRes, sharesRes, peopleRes);
  const clothes = Array.isArray(clothesRes.data) ? clothesRes.data : [];
  const shares = (Array.isArray(sharesRes.data) ? sharesRes.data : []) as ProductShare[];
  const customers = (Array.isArray(peopleRes.data) ? peopleRes.data : []).filter((row: Record<string, any>) =>
    personIsCustomer(row.role),
  );

  return (
    <CountingShell
      title="لینک محصول"
      description="با اشتراک فعال لینک بسازید و در طرح‌های بالاتر همان لینک را با پیامک بفرستید."
      error={errorMessage(clothesRes) || errorMessage(sharesRes) || errorMessage(peopleRes)}
    >
      <ShareLinksBoard clothes={clothes} shares={shares} customers={customers} />
    </CountingShell>
  );
}
