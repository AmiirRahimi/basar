'use client';

import { createContext, useContext, useEffect, useRef, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Plus } from 'lucide-react';
import { IconButton, HintPopover } from '@/ui';

const PageActionContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);
const PageActionNodeContext = createContext<ReactNode>(null);

type PageMetaApi = {
  setTitle: (title: string | null) => void;
  setDescription: (description: string | null) => void;
  setHasTabs: (value: boolean) => void;
};

const PageMetaContext = createContext<PageMetaApi | null>(null);

export function PageMetaProvider({
  children,
  api,
}: {
  children: ReactNode;
  api: PageMetaApi;
}) {
  return <PageMetaContext.Provider value={api}>{children}</PageMetaContext.Provider>;
}

export function usePageMeta({
  title,
  description,
  hasTabs = false,
}: {
  title?: string | null;
  description?: string | null;
  hasTabs?: boolean;
}) {
  const api = useContext(PageMetaContext);

  useEffect(() => {
    if (!api) return;
    api.setTitle(title || null);
    api.setDescription(description || null);
    api.setHasTabs(hasTabs);
    return () => {
      api.setTitle(null);
      api.setDescription(null);
      api.setHasTabs(false);
    };
  }, [api, description, hasTabs, title]);
}

export function AddPlusButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <HintPopover content={label} placement="bottom">
      <span className="inline-flex shrink-0">
        <IconButton
          type="button"
          variant="primary"
          rounded="full"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          <Plus className="h-4 w-4" />
        </IconButton>
      </span>
    </HintPopover>
  );
}

export function PageActionProvider({
  children,
  onAction,
  action,
}: {
  children: ReactNode;
  onAction: Dispatch<SetStateAction<ReactNode>>;
  action?: ReactNode;
}) {
  return (
    <PageActionContext.Provider value={onAction}>
      <PageActionNodeContext.Provider value={action ?? null}>{children}</PageActionNodeContext.Provider>
    </PageActionContext.Provider>
  );
}

export function PageActionOutlet() {
  return useContext(PageActionNodeContext);
}

export function usePageAddButton({
  label,
  onClick,
  enabled,
}: {
  label: string;
  onClick: () => void;
  enabled: boolean;
}) {
  const setAction = useContext(PageActionContext);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    if (!setAction) return;
    if (!enabled) {
      setAction(null);
      return;
    }
    setAction(<AddPlusButton label={label} onClick={() => onClickRef.current()} />);
    return () => setAction(null);
  }, [enabled, label, setAction]);
}
