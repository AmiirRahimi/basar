'use client';

import { cn } from '@/ui';

export type ClothColorChoice = {
  id: string;
  name: string;
  hex: string;
};

export function ClothColorPicker({
  colors,
  value,
  onChange,
  label = 'رنگ',
}: {
  colors: ClothColorChoice[];
  value?: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  if (colors.length < 2) return null;
  const selected = colors.find((color) => color.id === value) || colors[0];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-shop-ink/50">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          {colors.map((color) => {
            const active = color.id === selected?.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onChange(color.id)}
                aria-label={color.name}
                aria-pressed={active}
                className="group relative"
              >
                <span
                  className={cn(
                    'block h-8 w-8 rounded-full border shadow-sm transition',
                    active ? 'border-shop-ink ring-2 ring-shop-saffron ring-offset-2' : 'border-black/15 hover:scale-105',
                  )}
                  style={{ backgroundColor: color.hex }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-shop-ink px-2 py-1 text-[11px] text-shop-bone opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  {color.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {selected ? <p className="mt-2 text-sm font-medium text-shop-ink">{selected.name}</p> : null}
    </div>
  );
}
