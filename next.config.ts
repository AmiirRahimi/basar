import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Cloth image uploads (up to 8 MB each) go through Server Actions on the same page.
      bodySizeLimit: '32mb',
    },
  },
  // No ESLint config in this repo; don't block the production build on a lint pass.
  eslint: { ignoreDuringBuilds: true },
  // Full `tsc` OOMs on Vercel (mongoose + large TS graph). Typecheck locally with `npm run typecheck`.
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['jimp', 'argon2'],
  // Keep argon2 native binaries in the Vercel serverless bundle.
  outputFileTracingIncludes: {
    '/*': ['./node_modules/argon2/prebuilds/**/*'],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'dpioaivrbfistssbxokr.supabase.co' },
    ],
  },
  async redirects() {
    return [
      { source: '/counting', destination: '/accounting', permanent: false },
      { source: '/counting/:path*', destination: '/accounting/:path*', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https: data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.googletagmanager.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
