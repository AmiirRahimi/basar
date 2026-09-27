import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { tickerItems } from '@/lib/market-prices';
import { AccountingFrame } from '@/components/accounting/AccountingFrame';
import { UnsubscribedAccounting } from '@/components/accounting/UnsubscribedAccounting';
import { WorkspaceProvider } from '@/components/accounting/WorkspaceProvider';
import { readPublicMarketPrices } from '@/server/market-prices';
import { getSession } from '@/server/session';
import { getWorkspace } from '@/server/workspace';

function canUseAccountingWithoutPlan(pathname: string) {
  return pathname === '/accounting/subscribe' || pathname.startsWith('/accounting/invite/');
}

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return children;
  const workspace = await getWorkspace();
  const data = workspace.ok ? workspace.data : null;
  if (data && !data.hasSubscription) {
    const pathname = (await headers()).get('x-pathname') || '';
    if (pathname && !canUseAccountingWithoutPlan(pathname)) redirect('/accounting/subscribe');
    return (
      <WorkspaceProvider workspace={data}>
        {pathname ? children : <UnsubscribedAccounting>{children}</UnsubscribedAccounting>}
      </WorkspaceProvider>
    );
  }
  const prices = await readPublicMarketPrices();
  return (
    <WorkspaceProvider workspace={data}>
      <AccountingFrame prices={tickerItems(prices)} tickerVisible={prices.tickerVisible}>
        {children}
      </AccountingFrame>
    </WorkspaceProvider>
  );
}
