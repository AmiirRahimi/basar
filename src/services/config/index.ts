export const AUTH_ENDPOINTS = {
  LOGIN: 'uaa/api/public/auth/login',
  REFRESH: 'uaa/api/public/auth/refresh-token',
  USER_DETAIL: 'uaa/api/public/auth/detail',
} as const;

export type TelcServicesConfig = {
  /** API base URL, e.g. https://api.telc.ir/ */
  apiBaseUrl: string;
  /** Optional IVR/API host used for refresh-token */
  apiBaseUrlIvr?: string;
  /**
   * Shared cookie domain for SSO across apps (e.g. `.telc.ir`).
   * Leave unset for host-only cookies (local/dev).
   */
  cookieDomain?: string;
  /** AES secret used to encrypt tokens in cookies */
  secretKey?: string;
  endpoints?: Partial<typeof AUTH_ENDPOINTS>;
};

const GLOBAL_CONFIG_KEY = '__TELC_SERVICES_CONFIG__';

const DEFAULT_CONFIG: TelcServicesConfig = {
  apiBaseUrl: '',
  secretKey: 'defaultSecretKey',
  endpoints: { ...AUTH_ENDPOINTS },
};

type GlobalWithTelcConfig = typeof globalThis & {
  [GLOBAL_CONFIG_KEY]?: TelcServicesConfig;
};

/** One config store shared across @telc/services/auth and @telc/services/react bundles. */
function getConfigStore(): TelcServicesConfig {
  const globalRef = globalThis as GlobalWithTelcConfig;
  if (!globalRef[GLOBAL_CONFIG_KEY]) {
    globalRef[GLOBAL_CONFIG_KEY] = {
      ...DEFAULT_CONFIG,
      endpoints: { ...AUTH_ENDPOINTS },
    };
  }
  return globalRef[GLOBAL_CONFIG_KEY]!;
}

export function configureTelcServices(next: Partial<TelcServicesConfig>) {
  const current = getConfigStore();
  Object.assign(current, next, {
    endpoints: {
      ...AUTH_ENDPOINTS,
      ...current.endpoints,
      ...next.endpoints,
    },
  });
}

export function getTelcServicesConfig(): TelcServicesConfig {
  return getConfigStore();
}

export function getApiBaseUrl(): string {
  return (getConfigStore().apiBaseUrl || '').replace(/\/+$/, '');
}

export function getApiBaseUrlIvr(): string {
  const cfg = getConfigStore();
  return (cfg.apiBaseUrlIvr || cfg.apiBaseUrl || '').replace(/\/+$/, '');
}

export function getAuthEndpoint(key: keyof typeof AUTH_ENDPOINTS): string {
  return getConfigStore().endpoints?.[key] ?? AUTH_ENDPOINTS[key];
}
