import { CountingShell } from '@/components/counting/CountingShell';
import { AdminUsageBoard, type UsageReport } from '@/components/counting/AdminUsageBoard';
import { getAdminUsageReport } from '@/actions/admin-usage';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function AdminUsagePage() {
  const res = await getAdminUsageReport();
  guardSession(res);
  return (
    <CountingShell
      title="اشتراک و توکن"
      description="وضعیت اشتراک‌ها و توکن ساخت تصویر: خرید، مصرف، مانده و درآمد هر ماه."
      error={errorMessage(res)}
    >
      {res.ok && res.data ? (
        <AdminUsageBoard report={res.data as UsageReport} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </CountingShell>
  );
}
