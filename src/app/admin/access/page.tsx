import { AdminAccessBoard, type AdminAccessAccount, type AdminAccessGrant } from '@/components/admin/AdminAccessBoard';
import { CountingShell } from '@/components/counting/CountingShell';
import { getAdminPanelAccess } from '@/actions/admin';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function AdminAccessPage() {
  const res = await getAdminPanelAccess();
  guardSession(res);
  const data = (res.ok ? res.data : null) as { accounts?: AdminAccessAccount[]; grants?: AdminAccessGrant[] } | null;
  return (
    <CountingShell
      title="دسترسی پنل ادمین"
      description="سوپریوزر از اینجا مشخص می‌کند چه کسی کدام بخش پنل ادمین را ببیند. این فهرست جدا از دسترسی همکاران فروشگاه و برند است."
      error={errorMessage(res)}
    >
      {data ? (
        <AdminAccessBoard accounts={data.accounts || []} grants={data.grants || []} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </CountingShell>
  );
}
