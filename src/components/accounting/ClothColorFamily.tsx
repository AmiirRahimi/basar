'use client';

import { swatchFor } from '@/lib/cloth-colors';
import { displayName } from '@/lib/format';
import type { FieldOption } from '@/lib/types';
import { cn } from '@/ui';

type ClothRow = Record<string, any>;

function colorOf(row: ClothRow, colors: FieldOption[]) {
  const color = row._color as { _id?: string; name?: string; hex?: string } | string | undefined;
  const id = color && typeof color === 'object' ? String(color._id || '') : String(color || '');
  const option = colors.find((item) => item.value === id);
  const name = option?.label || (color && typeof color === 'object' ? String(color.name || '') : '');
  return { id, name: name || 'بدون رنگ', hex: swatchFor(name, option?.hex || (color && typeof color === 'object' ? color.hex : '')) };
}

function clothLabel(row: ClothRow) {
  return [row.code ? `کد ${row.code}` : '', displayName(row._type), displayName(row._style)].filter((part) => part && part !== '—').join(' · ');
}

export function ClothColorFamily({
  colors,
  value,
  clothes,
  currentId,
  modelGroup,
  modelJoin,
  onColor,
  onGroup,
  onJoin,
  onClear,
}: {
  colors: FieldOption[];
  value: string;
  clothes: ClothRow[];
  currentId?: string;
  modelGroup: string;
  modelJoin: string;
  onColor: (id: string) => void;
  onGroup: (id: string) => void;
  onJoin: (clothId: string) => void;
  onClear: () => void;
}) {
  const selected = colors.find((color) => color.value === value);
  const others = clothes.filter((row) => String(row._id) !== String(currentId || ''));
  const groups = new Map<string, ClothRow[]>();
  for (const row of others) {
    const key = String(row.modelGroup || '');
    if (!key) continue;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  const singles = others.filter((row) => !row.modelGroup);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <p className="text-sm font-medium text-gray-800">رنگ این لباس</p>
        <p className="mt-1 text-xs leading-6 text-gray-500">
          یکی را از تخته‌رنگ انتخاب کنید.
          {selected ? <span className="text-gray-800"> انتخاب: {selected.label}</span> : null}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {colors.map((color) => {
            const hex = swatchFor(color.label, color.hex);
            const active = color.value === value;
            return (
              <button
                key={color.value}
                type="button"
                title={color.label}
                aria-label={color.label}
                aria-pressed={active}
                onClick={() => onColor(color.value)}
                className="group relative"
              >
                <span
                  className={cn(
                    'block h-8 w-8 rounded-full border shadow-sm',
                    active ? 'border-gray-900 ring-2 ring-amber-400 ring-offset-2' : 'border-black/10',
                  )}
                  style={{ backgroundColor: hex }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[11px] text-white group-hover:block">
                  {color.label}
                </span>
              </button>
            );
          })}
        </div>
        {!colors.length ? <p className="mt-2 text-sm text-gray-500">اول مدیر باید رنگ‌ها را در لیست کمکی بسازد.</p> : null}
      </div>

      <div className="border-t border-gray-100 pt-4 lg:border-s lg:border-t-0 lg:ps-4 lg:pt-0">
        <p className="text-sm font-medium text-gray-800">گروه مدل</p>
        <p className="mt-1 text-xs leading-6 text-gray-500">رنگ مشترک است. گروه، لباس‌های هم‌مدل را به هم وصل می‌کند.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs',
              !modelGroup && !modelJoin ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700',
            )}
          >
            تنها
          </button>
          <button
            type="button"
            onClick={() => onGroup(globalThis.crypto.randomUUID())}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700"
          >
            گروه جدید
          </button>
        </div>
        {modelGroup && !groups.has(modelGroup) ? (
          <p className="mt-2 text-xs text-teal-800">گروه تازه ساخته شد. لباس بعدی را به همین گروه وصل کنید.</p>
        ) : null}

        {groups.size ? (
          <div className="mt-3 grid gap-2">
            {[...groups.entries()].map(([id, members]) => {
              const active = modelGroup === id && !modelJoin;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onGroup(id)}
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-right',
                    active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-800',
                  )}
                >
                  <p className="text-sm font-medium">{clothLabel(members[0]) || 'گروه مدل'}</p>
                  <p className={cn('mt-1 text-xs', active ? 'text-white/70' : 'text-gray-500')}>{members.length} لباس در این گروه</p>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {members.map((row) => {
                      const color = colorOf(row, colors);
                      return (
                        <span
                          key={String(row._id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]',
                            active ? 'bg-white/10' : 'bg-gray-50 text-gray-700',
                          )}
                        >
                          <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                          {color.name}
                        </span>
                      );
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {singles.length ? (
          <div className="mt-3">
            <p className="text-xs text-gray-500">یا این لباس را به یک لباس تنها وصل کنید تا گروه ساخته شود.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {singles.map((row) => {
                const color = colorOf(row, colors);
                const active = modelJoin === String(row._id);
                return (
                  <button
                    key={String(row._id)}
                    type="button"
                    onClick={() => onJoin(String(row._id))}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs',
                      active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700',
                    )}
                  >
                    <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                    {clothLabel(row) || color.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
