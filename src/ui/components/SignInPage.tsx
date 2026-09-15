'use client';

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Avatar } from 'rizzui';
import { PiHeadset, PiChartLineUp } from 'react-icons/pi';
import { SignInShell } from './SignInShell';
import { SignInForm, type SignInFormLabels } from './SignInForm';
import { TextType } from './TextType';
import {
  setToken,
  getRememberedLogin,
  saveRememberedLogin,
  clearRememberedLogin,
} from '../lib/telc-auth';
import { useUser } from '../lib/telc-auth';

export type SignInPageProps = {
  signInUrl: string;
  tokenName?: string;
  redirectTo?: string;
  onLoginSuccess?: (result?: {
    accessToken: string;
    refreshToken?: string;
    username: string;
  }) => void | Promise<void>;
  requirePassword?: boolean;
  headerActions?: ReactNode;
  defaultHero?: {
    line: string;
    body?: string;
    pills?: { icon: ReactNode; label: string }[];
    footer?: ReactNode;
  };
  logoSrc?: string;
  logoAlt?: string;
  logoHref?: string;
  brandName?: string;
  brandTagline?: string;
  welcomeBadge?: string;
  title?: string;
  subtitle?: string;
  welcomeBadgeClassName?: string;
  heroImage?: string;
  typingLines?: string[];
  featurePills?: { icon: ElementType; label: string }[];
  customerImages?: string[];
  copyright?: string;
  labels?: Partial<SignInFormLabels>;
};

const defaultLabels: SignInFormLabels = {
  username: 'Username',
  usernameRequired: 'Username is required',
  password: 'Password',
  passwordPlaceholder: 'Enter your password',
  passwordRequired: 'Password is required',
  rememberMe: 'Remember me',
  signIn: 'Sign in',
  invalidCredentials: 'Invalid credentials',
};

const defaultTypingLines = [
  'Improved service delivery with TelC Call Center',
  'Real-time monitoring and reporting',
  'Scalable cloud communication',
];

const defaultFeaturePills = [
  { icon: PiHeadset, label: 'Call Center' },
  { icon: PiChartLineUp, label: 'Analytics' },
];

const defaultCustomerImages = [
  '/config-panel/images/customers/asiatech2.png',
  '/config-panel/images/customers/avval4.png',
  '/config-panel/images/customers/download 4.png',
  '/config-panel/images/customers/rightel3.png',
  '/config-panel/images/customers/saipa5.png',
];

export function SignInPage({
  signInUrl,
  tokenName = 'accessToken',
  redirectTo = '/dashboard',
  onLoginSuccess,
  requirePassword = false,
  headerActions,
  defaultHero,
  logoSrc,
  logoAlt = 'TelC',
  logoHref = '/',
  brandName = 'TelC',
  brandTagline = 'Cloud Panel',
  welcomeBadge = 'Welcome',
  title = 'Sign in',
  subtitle = 'Configuration and operations',
  welcomeBadgeClassName,
  heroImage,
  typingLines = defaultTypingLines,
  featurePills = defaultFeaturePills,
  customerImages = defaultCustomerImages,
  copyright = `© ${new Date().getFullYear()} TelC International Telecommunication`,
  labels: labelsProp,
}: SignInPageProps) {
  const router = useRouter();
  const [initialUsername, setInitialUsername] = useState('');
  const [initialRememberMe, setInitialRememberMe] = useState(false);
  const { fetchUserDetail } = useUser();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { username, rememberMe } = getRememberedLogin();
    if (username) setInitialUsername(username);
    setInitialRememberMe(rememberMe);
  }, []);

  const formLabels = useMemo<SignInFormLabels>(
    () => ({ ...defaultLabels, ...labelsProp }),
    [labelsProp]
  );

  const handleRememberMeChange = (next: boolean) => {
    if (!next) clearRememberedLogin();
  };

  const handleSubmit = async ({
    username,
    password,
    rememberMe,
  }: {
    username: string;
    password: string;
    rememberMe: boolean;
  }) => {
    try {
      const res = await fetch(signInUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { username, password } }),
      });
      const data = await res.json().catch(() => null);

      const token = data?.payload?.[tokenName] ?? data?.[tokenName];
      if (!res.ok || !token) {
        return { ok: false as const };
      }

      const refreshToken = data?.payload?.refreshToken ?? data?.refreshToken;
      setToken(token, refreshToken, rememberMe);

      if (rememberMe) saveRememberedLogin(username.trim());
      else clearRememberedLogin();

      if (typeof window !== 'undefined') {
        localStorage.setItem(tokenName, token);
        if (refreshToken) {
          localStorage.setItem(`${tokenName}Refresh`, refreshToken);
        }
      }

      try {
        await fetchUserDetail();
      } catch {
      }

      await onLoginSuccess?.({ accessToken: token, refreshToken, username });
      router.replace(redirectTo);
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  };

  const heroPanel = (
    <aside className="relative hidden min-h-screen w-full overflow-hidden xl:block xl:w-[52%]">
      {heroImage ? (
        <Image
          fill
          priority
          src={heroImage}
          alt="Hero"
          className="object-cover"
          sizes="52vw"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220]/90 via-[#0b1220]/50 to-primary/40" />
      <div className="relative z-10 flex h-full flex-col justify-between px-12 py-14 2xl:px-16 2xl:py-16">
        <div>
          <TextType
            as="h2"
            text={typingLines}
            typingSpeed={42}
            deletingSpeed={22}
            pauseDuration={2200}
            showCursor
            cursorCharacter="|"
            cursorClassName="text-[#FDAE17] font-light"
            className="min-h-[7.5rem] text-3xl font-bold leading-tight text-white 2xl:min-h-[8.5rem] 2xl:text-4xl 2xl:leading-tight"
            loop
          />
          {featurePills.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {featurePills.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-[#FDAE17]" />
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {customerImages.map((src) => (
                <Avatar
                  key={src}
                  src={src}
                  name="customer"
                  className="h-10 w-10 ring-2 ring-white/20"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-white/80">Up to 100 customers</p>
          </div>
          <p className="text-xs text-white/40">{copyright}</p>
        </div>
      </div>
    </aside>
  );

  const mobileHero = (
    <div className="relative overflow-hidden px-6 pb-2 pt-6 xl:hidden">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <TextType
          as="p"
          text={typingLines}
          typingSpeed={45}
          deletingSpeed={24}
          pauseDuration={2000}
          showCursor
          cursorCharacter="|"
          cursorClassName="text-[#FDAE17]"
          className="min-h-[4.5rem] text-lg font-semibold leading-snug text-white"
          loop
        />
      </div>
    </div>
  );

  return (
    <SignInShell
      logoSrc={logoSrc}
      logoAlt={logoAlt}
      logoHref={logoHref}
      brandName={brandName}
      brandTagline={brandTagline}
      welcomeBadge={welcomeBadge}
      title={title}
      subtitle={subtitle}
      welcomeBadgeClassName={welcomeBadgeClassName}
      headerActions={headerActions}
      defaultHero={defaultHero}
      heroPanel={defaultHero ? undefined : heroPanel}
      mobileHero={defaultHero ? undefined : mobileHero}
    >
      <SignInForm
        labels={formLabels}
        onSubmit={handleSubmit}
        initialUsername={initialUsername}
        initialRememberMe={initialRememberMe}
        requirePassword={requirePassword}
        onRememberMeChange={handleRememberMeChange}
      />
    </SignInShell>
  );
}
