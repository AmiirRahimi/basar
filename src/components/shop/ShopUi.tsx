import Link from 'next/link';
import { cn } from '@/ui/lib/cn';

const variants = {
  saffron:
    'bg-shop-saffron text-shop-ink shadow-sm shadow-shop-saffron/20 hover:bg-[#edb12c] active:translate-y-px',
  ink: 'bg-shop-ink text-shop-bone hover:bg-shop-mill active:translate-y-px',
  outline:
    'border border-shop-ink/15 bg-shop-paper/80 text-shop-ink hover:border-shop-saffron/50 hover:bg-shop-paper',
  ghost: 'text-shop-ink/80 hover:bg-shop-ink/5 hover:text-shop-ink',
};

export function ShopButton({
  href,
  children,
  variant = 'saffron',
  className,
  type = 'button',
  disabled,
  onClick,
}: {
  href?: string;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function ShopField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs tracking-[0.18em] text-shop-ink/55">{label}</span>
      {children}
    </label>
  );
}

export const shopInputClass =
  'w-full rounded-xl border border-shop-ink/12 bg-shop-paper px-3 py-2.5 text-sm text-shop-ink outline-none transition placeholder:text-shop-ink/35 focus:border-shop-saffron/70 focus:ring-2 focus:ring-shop-saffron/20';
