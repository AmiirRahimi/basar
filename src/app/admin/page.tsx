import { CountingShell } from '@/components/counting/CountingShell';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { type AdminOverview } from '@/components/counting/AdminPanel';
import { type UsageReport } from '@/components/counting/AdminUsageBoard';
import { getAdminOverview } from '@/actions/admin';
import { getAdminUsageReport } from '@/actions/admin-usage';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function AdminDashboardPage() {
  const [overview, usage] = await Promise.all([getAdminOverview(), getAdminUsageReport()]);
  guardSession(overview, usage);
  return (
    <CountingShell
      title="داشبورد ادمین"
      description="ورود کاربران، پیام‌های بی‌پاسخ و سود اشتراک و توکن تصویر."
      error={errorMessage(overview) || errorMessage(usage)}
    >
      {overview.ok && overview.data && usage.ok && usage.data ? (
        <AdminDashboard overview={overview.data as AdminOverview} usage={usage.data as UsageReport} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {overview.message || usage.message || 'به این بخش دسترسی ندارید.'}
        </p>
      )}
    </CountingShell>
  );
}
