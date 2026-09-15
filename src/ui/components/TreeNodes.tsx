'use client';

import type { ReactNode } from 'react';
import { Folder, FileText } from 'lucide-react';
import { StyledTreeItem } from './StyledTreeItem';
import { cn } from '../lib/cn';

export type UiTreeNode = {
  id: string;
  name: string;
  children: UiTreeNode[];
  data?: unknown;
};

export type TreeNodesProps = {
  nodes: UiTreeNode[];
  renderActions?: (node: UiTreeNode) => ReactNode;
  folderIcon?: ReactNode;
  fileIcon?: ReactNode;
};

function DefaultFolderIcon() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
      <Folder className="h-3.5 w-3.5 text-primary" />
    </div>
  );
}

function DefaultFileIcon() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-white/[0.04]">
      <FileText className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
    </div>
  );
}

export function TreeNodes({
  nodes,
  renderActions,
  folderIcon,
  fileIcon,
}: TreeNodesProps) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        return (
          <StyledTreeItem
            key={node.id}
            itemId={node.id}
            label={
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {hasChildren ? folderIcon ?? <DefaultFolderIcon /> : fileIcon ?? <DefaultFileIcon />}
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm',
                      hasChildren
                        ? 'font-medium text-gray-900 dark:text-gray-100'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {node.name}
                  </span>
                </div>
                {renderActions?.(node)}
              </div>
            }
          >
            {node.children.length > 0 ? (
              <TreeNodes
                nodes={node.children}
                renderActions={renderActions}
                folderIcon={folderIcon}
                fileIcon={fileIcon}
              />
            ) : null}
          </StyledTreeItem>
        );
      })}
    </>
  );
}

/** Convenience helper matching the previous cloud-panel `renderTree` API. */
export function renderTree(
  nodes: UiTreeNode[],
  options?: Omit<TreeNodesProps, 'nodes'>
) {
  return (
    <TreeNodes
      nodes={nodes}
      renderActions={options?.renderActions}
      folderIcon={options?.folderIcon}
      fileIcon={options?.fileIcon}
    />
  );
}
