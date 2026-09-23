import { getSession } from '@/server/session';
import { getWorkspace } from '@/server/workspace';
import { CountingFrame } from '@/components/counting/CountingFrame';
import { WorkspaceProvider } from '@/components/counting/WorkspaceProvider';

export default async function CountingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) return children;
  const workspace = await getWorkspace();
  return (
    <WorkspaceProvider workspace={workspace.ok ? workspace.data : null}>
      <CountingFrame>{children}</CountingFrame>
    </WorkspaceProvider>
  );
}
