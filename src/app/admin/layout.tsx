import { redirect } from 'next/navigation';
import { firstAdminHref } from '@/lib/admin-permissions';
import { getSession } from '@/server/session';
import { getWorkspace } from '@/server/workspace';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { WorkspaceProvider } from '@/components/accounting/WorkspaceProvider';
import { tickerItems } from '@/lib/market-prices';
import { readPublicMarketPrices } from '@/server/market-prices';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/accounting/login');
  const [workspace, prices] = await Promise.all([getWorkspace(), readPublicMarketPrices()]);
  if (!workspace.ok || !workspace.data?.adminPermissions?.length) {
    redirect(workspace.ok ? '/accounting/dashboard' : '/accounting/login');
  }
  if (!firstAdminHref(workspace.data.adminPermissions)) redirect('/accounting/dashboard');
  return (
    <WorkspaceProvider workspace={workspace.data}>
      <AdminFrame prices={tickerItems(prices)} tickerVisible={prices.tickerVisible}>
        {children}
      </AdminFrame>
    </WorkspaceProvider>
  );
}
