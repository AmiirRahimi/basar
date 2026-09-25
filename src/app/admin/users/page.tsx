import { CountingShell } from '@/components/counting/CountingShell';
import { AdminPanel, type AdminOverview } from '@/components/counting/AdminPanel';
import { getAdminOverview } from '@/actions/admin';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function UsersPage() {
  const res = await getAdminOverview();
  guardSession(res);
  return (
    <CountingShell title="کاربران و اشتراک" error={errorMessage(res)}>
      {res.ok && res.data ? (
        <AdminPanel overview={res.data as AdminOverview} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </CountingShell>
  );
}
