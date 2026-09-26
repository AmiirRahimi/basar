import { redirect } from 'next/navigation';
import { firstAdminHref } from '@/lib/admin-permissions';
import { getSession } from '@/server/session';
import { getWorkspace } from '@/server/workspace';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { WorkspaceProvider } from '@/components/counting/WorkspaceProvider';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/counting/login');
  const workspace = await getWorkspace();
  if (!workspace.ok || !workspace.data?.adminPermissions?.length) {
    redirect(workspace.ok ? '/counting/dashboard' : '/counting/login');
  }
  if (!firstAdminHref(workspace.data.adminPermissions)) redirect('/counting/dashboard');
  return (
    <WorkspaceProvider workspace={workspace.data}>
      <AdminFrame>{children}</AdminFrame>
    </WorkspaceProvider>
  );
}
