import { CountingShell } from '@/components/counting/CountingShell';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { type AdminOverview } from '@/components/counting/AdminPanel';
import { type UsageReport } from '@/components/counting/AdminUsageBoard';
import { getAdminOverview, getWebsiteOrderBoard } from '@/actions/admin';
import { getAdminUsageReport } from '@/actions/admin-usage';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import type { WebsiteOrderBoard } from '@/lib/website-orders';

export default async function AdminDashboardPage() {
  const [overview, usage, website] = await Promise.all([
    getAdminOverview(),
    getAdminUsageReport(),
    getWebsiteOrderBoard(),
  ]);
  guardSession(overview, usage, website);
  return (
    <CountingShell
      title="داشبورد ادمین"
      description="ورود کاربران، پیام‌های بی‌پاسخ، سود اشتراک و فروش وب‌سایت."
      error={errorMessage(overview) || errorMessage(usage) || errorMessage(website)}
    >
      {overview.ok && overview.data && usage.ok && usage.data ? (
        <AdminDashboard
          overview={overview.data as AdminOverview}
          usage={usage.data as UsageReport}
          website={website.ok ? (website.data as WebsiteOrderBoard) : null}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {overview.message || usage.message || 'به این بخش دسترسی ندارید.'}
        </p>
      )}
    </CountingShell>
  );
}
