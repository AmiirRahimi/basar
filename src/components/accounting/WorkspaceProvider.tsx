'use client';

import { createContext, useContext, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Workspace } from '@/lib/types';
import { switchWorkspace } from '@/actions/workspace';

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: Workspace | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const synced = useRef(false);

  useEffect(() => {
    if (!workspace?.contextChanged || !workspace.activeBrandId || !workspace.activeStoreId || synced.current) return;
    synced.current = true;
    start(async () => {
      await switchWorkspace({ brandId: workspace.activeBrandId, storeId: workspace.activeStoreId });
      router.refresh();
    });
  }, [workspace?.contextChanged, workspace?.activeBrandId, workspace?.activeStoreId, router]);

  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
