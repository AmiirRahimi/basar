import { useWorkspace } from './WorkspaceProvider';

export function useWritable() {
  const workspace = useWorkspace();
  if (!workspace) return false;
  if (workspace.isPlatformAdmin) return true;
  return workspace.subscriptionActive !== false;
}
