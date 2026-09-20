'use client';

import { FieldLabel, cn } from '@/ui';
import { PERSON_ROLES, normalizePersonRoles } from '@/lib/constants';

const ROLE_STYLES: Record<string, { idle: string; active: string }> = {
  '1': {
    idle: 'border-sky-200/80 bg-sky-50/50 text-sky-800 hover:border-sky-300 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200',
    active:
      'border-sky-400 bg-sky-100 text-sky-900 shadow-sm ring-2 ring-sky-400/30 dark:border-sky-500 dark:bg-sky-900/50 dark:text-sky-50',
  },
  '2': {
    idle: 'border-violet-200/80 bg-violet-50/50 text-violet-800 hover:border-violet-300 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200',
    active:
      'border-violet-400 bg-violet-100 text-violet-900 shadow-sm ring-2 ring-violet-400/30 dark:border-violet-500 dark:bg-violet-900/50 dark:text-violet-50',
  },
  '3': {
    idle: 'border-amber-200/80 bg-amber-50/50 text-amber-800 hover:border-amber-300 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
    active:
      'border-amber-400 bg-amber-100 text-amber-900 shadow-sm ring-2 ring-amber-400/30 dark:border-amber-500 dark:bg-amber-900/50 dark:text-amber-50',
  },
  '4': {
    idle: 'border-emerald-200/80 bg-emerald-50/50 text-emerald-800 hover:border-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200',
    active:
      'border-emerald-400 bg-emerald-100 text-emerald-900 shadow-sm ring-2 ring-emerald-400/30 dark:border-emerald-500 dark:bg-emerald-900/50 dark:text-emerald-50',
  },
  '5': {
    idle: 'border-cyan-200/80 bg-cyan-50/50 text-cyan-800 hover:border-cyan-300 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-200',
    active:
      'border-cyan-400 bg-cyan-100 text-cyan-900 shadow-sm ring-2 ring-cyan-400/30 dark:border-cyan-500 dark:bg-cyan-900/50 dark:text-cyan-50',
  },
};

const FALLBACK = {
  idle: 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200',
  active:
    'border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20 dark:border-primary dark:bg-primary/20',
};

export function PersonRolePicker({
  label = 'نقش',
  value,
  onChange,
  error,
  required,
}: {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}) {
  const selected = normalizePersonRoles(value);
  const roles = Object.entries(PERSON_ROLES);

  function toggle(role: string) {
    const next = selected.includes(role)
      ? selected.filter((item) => item !== role)
      : [...selected, role];
    onChange(next.join(','));
  }

  return (
    <div className="grid gap-1.5">
      <FieldLabel>
        {label}
        {required ? ' *' : ''}
      </FieldLabel>
      <p className="text-xs text-gray-500">می‌توانید چند نقش را هم‌زمان انتخاب کنید.</p>
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        role="group"
        aria-label={typeof label === 'string' ? label : 'نقش'}
      >
        {roles.map(([key, roleLabel]) => {
          const isOn = selected.includes(key);
          const styles = ROLE_STYLES[key] || FALLBACK;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(key)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                isOn ? styles.active : styles.idle,
              )}
            >
              {roleLabel}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-red-500 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

export function PersonRoleFilter({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
}) {
  const total = Object.values(counts || {}).reduce((sum, n) => sum + n, 0);
  const items: { value: string; label: string }[] = [
    { value: '', label: 'همه' },
    ...Object.entries(PERSON_ROLES).map(([roleValue, label]) => ({ value: roleValue, label })),
  ];

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="فیلتر نقش">
      {items.map((item) => {
        const selected = value === item.value;
        const count = item.value === '' ? total : counts?.[item.value] || 0;
        return (
          <button
            key={item.value || 'all'}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition',
              selected
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
            )}
          >
            {item.label}
            {counts ? <span className="mr-1 opacity-70">({count})</span> : null}
          </button>
        );
      })}
    </div>
  );
}
