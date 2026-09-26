import { useWorkspace } from './WorkspaceProvider';

export function useWritable() {
  const workspace = useWorkspace();
  if (!workspace) return false;
  if (workspace.isPlatformAdmin || workspace.isSuperuser) return true;
  if (workspace.subscriptionActive === false) return false;
  if (workspace.accessSource === 'team') {
    return (workspace.permissions || []).some((id) => id.endsWith('.write'));
  }
  return true;
}
