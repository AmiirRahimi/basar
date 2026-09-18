'use client';

import { createContext, useContext, useEffect, useRef, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Plus } from 'lucide-react';
import { IconButton } from '@/ui';

const PageActionContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);

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
    <IconButton
      type="button"
      variant="primary"
      rounded="full"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Plus className="h-4 w-4" />
    </IconButton>
  );
}

export function PageActionProvider({
  children,
  onAction,
}: {
  children: ReactNode;
  onAction: Dispatch<SetStateAction<ReactNode>>;
}) {
  return <PageActionContext.Provider value={onAction}>{children}</PageActionContext.Provider>;
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
