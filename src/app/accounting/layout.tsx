import { getSession } from '@/server/session';
import { getWorkspace } from '@/server/workspace';
import { AccountingFrame } from '@/components/accounting/AccountingFrame';
import { WorkspaceProvider } from '@/components/accounting/WorkspaceProvider';

export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return children;
  const workspace = await getWorkspace();
  return (
    <WorkspaceProvider workspace={workspace.ok ? workspace.data : null}>
      <AccountingFrame>{children}</AccountingFrame>
    </WorkspaceProvider>
  );
}
