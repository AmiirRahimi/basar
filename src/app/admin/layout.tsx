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
    if (!workspace.ok) redirect('/accounting/login');
    redirect(workspace.data.hasSubscription ? '/accounting/dashboard' : '/accounting/subscribe');
  }
  if (!firstAdminHref(workspace.data.adminPermissions)) {
    redirect(workspace.data.hasSubscription ? '/accounting/dashboard' : '/accounting/subscribe');
  }
  return (
    <WorkspaceProvider workspace={workspace.data}>
      <AdminFrame
        prices={workspace.data.hasSubscription ? tickerItems(prices) : []}
        tickerVisible={workspace.data.hasSubscription && prices.tickerVisible}
      >
        {children}
      </AdminFrame>
    </WorkspaceProvider>
  );
}
