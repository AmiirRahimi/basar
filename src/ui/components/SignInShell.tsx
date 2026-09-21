'use client';

import type { CSSProperties, ReactNode } from 'react';
import { PiSparkle } from 'react-icons/pi';
import { cn } from '../lib/cn';

export type SignInShellProps = {
  children: ReactNode;
  logo?: ReactNode;
  logoSrc?: string;
  logoAlt?: string;
  logoHref?: string;
  brandName: string;
  brandTagline: string;
  welcomeBadge: string;
  title: string;
  subtitle: string;
  headerActions?: ReactNode;
  heroPanel?: ReactNode;
  mobileHero?: ReactNode;
  defaultHero?: {
    line: string;
    body?: string;
    pills?: { icon: ReactNode; label: string }[];
    footer?: ReactNode;
  };
  className?: string;
  cardClassName?: string;
  welcomeBadgeClassName?: string;
};

const gridPatternStyle: CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
};

export function SignInShell({
  children,
  logo,
  logoSrc,
  logoAlt = 'TelC',
  logoHref,
  brandName,
  brandTagline,
  welcomeBadge,
  title,
  subtitle,
  headerActions,
  heroPanel,
  mobileHero,
  defaultHero,
  className,
  cardClassName,
  welcomeBadgeClassName = 'bg-primary/10 text-primary-dark dark:bg-primary/15 dark:text-primary',
}: SignInShellProps) {
  const logoNode =
    logo ??
    (logoSrc ? (
      <img
        src={logoSrc}
        alt={logoAlt}
        width={44}
        height={44}
        className="h-11 w-11 object-contain"
      />
    ) : null);

  const brandBlock = (
    <div className="inline-flex items-center gap-3">
      {logoNode}
      <div className="hidden sm:block">
        <p className="text-sm font-semibold text-white">{brandName}</p>
        <p className="text-xs text-white/50">{brandTagline}</p>
      </div>
    </div>
  );

  return (
    <div className={cn('relative min-h-screen overflow-hidden bg-[#0b1220]', className)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={gridPatternStyle} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col xl:flex-row">
        {heroPanel ?? (defaultHero ? <DefaultHeroPanel hero={defaultHero} /> : null)}

        <div className="flex flex-1 flex-col">
          {mobileHero ??
            (defaultHero ? (
              <div className="relative overflow-hidden px-6 pb-2 pt-6 xl:hidden">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="min-h-[3rem] text-lg font-semibold leading-snug text-white">
                    {defaultHero.line}
                  </p>
                </div>
              </div>
            ) : null)}

          <header className="flex items-center justify-between px-6 py-5 lg:px-10">
            {logoHref ? <a href={logoHref}>{brandBlock}</a> : brandBlock}
            {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
          </header>

          <div className="flex flex-1 items-center justify-center px-6 pb-10 pt-2 lg:px-10">
            <div className="w-full max-w-md">
              <div
                className={cn(
                  'rounded-3xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/30 sm:p-10 dark:border-gray-700/60 dark:bg-gray-900',
                  cardClassName
                )}
              >
                <div className="mb-8">
                  <div
                    className={cn(
                      'mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                      welcomeBadgeClassName
                    )}
                  >
                    <PiSparkle className="h-3.5 w-3.5" />
                    {welcomeBadge}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                    {title}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{subtitle}</p>
                </div>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DefaultHeroPanel({
  hero,
}: {
  hero: NonNullable<SignInShellProps['defaultHero']>;
}) {
  return (
    <aside className="relative hidden min-h-screen w-full overflow-hidden xl:block xl:w-[52%]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#1a1520] to-primary/40" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 40%, rgb(var(--primary-default) / 0.28), transparent 45%), radial-gradient(circle at 80% 20%, rgb(var(--blue-default) / 0.16), transparent 40%)',
        }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between px-12 py-14 2xl:px-16 2xl:py-16">
        <div>
          <h2 className="min-h-[7.5rem] text-3xl font-bold leading-tight text-white 2xl:min-h-[8.5rem] 2xl:text-4xl">
            {hero.line}
          </h2>
          {hero.body ? (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">{hero.body}</p>
          ) : null}
          {hero.pills?.length ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {hero.pills.map(({ icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm"
                >
                  <span className="text-primary">{icon}</span>
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {hero.footer ?? (
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} TelC International Telecommunication
          </p>
        )}
      </div>
    </aside>
  );
}