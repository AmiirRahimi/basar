import { tickerItems } from '@/lib/market-prices';
import { AccountingFrame } from '@/components/accounting/AccountingFrame';
import { WorkspaceProvider } from '@/components/accounting/WorkspaceProvider';
import { readPublicMarketPrices } from '@/server/market-prices';
import { getSession } from '@/server/session';
import { getWorkspace } from '@/server/workspace';

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return children;
  const [workspace, prices] = await Promise.all([getWorkspace(), readPublicMarketPrices()]);
  return (
    <WorkspaceProvider workspace={workspace.ok ? workspace.data : null}>
      <AccountingFrame prices={tickerItems(prices)}>{children}</AccountingFrame>
    </WorkspaceProvider>
  );
}
