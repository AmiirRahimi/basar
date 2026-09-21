export function siteOrigin() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  return raw.replace(/\/$/, '') || 'http://localhost:3010';
}

export function absoluteUrl(path = '/') {
  const origin = siteOrigin();
  if (!path || path === '/') return origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
