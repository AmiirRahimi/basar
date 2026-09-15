'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '../lib/cn';

export type ThemeMode = 'light' | 'dark';

export type ThemeSwitcherProps = {
  /** Current resolved theme */
  theme?: ThemeMode | string | null;
  onChange: (theme: ThemeMode) => void;
  /** Avoid hydration mismatch — disable until client theme is known */
  mounted?: boolean;
  className?: string;
  lightLabel?: string;
  darkLabel?: string;
};

/**
 * Pure theme toggle — host app wires next-themes (or any store) via props.
 */
export function ThemeSwitcher({
  theme,
  onChange,
  mounted = true,
  className,
  lightLabel = 'Light mode',
  darkLabel = 'Dark mode',
}: ThemeSwitcherProps) {
  const isDark = mounted && theme === 'dark';
  const label = isDark ? lightLabel : darkLabel;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!mounted}
      onClick={() => onChange(isDark ? 'light' : 'dark')}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/60 bg-white/80 text-gray-500 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-gray-300 hover:bg-white hover:text-gray-700 hover:shadow-md dark:border-gray-700/40 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-white/[0.08] dark:hover:text-gray-200',
        className
      )}
    >
      <Sun
        className={cn(
          'h-[18px] w-[18px] transition-all duration-200',
          isDark ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
        )}
      />
      <Moon
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-200',
          isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
        )}
      />
    </button>
  );
}

export default ThemeSwitcher;
