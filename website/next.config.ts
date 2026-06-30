import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compress: true,
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff'        },
          { key: 'X-Frame-Options',            value: 'DENY'           },
          { key: 'X-XSS-Protection',           value: '1; mode=block'  },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/(.*)\\.(svg|ico|png|jpg|jpeg|webp|avif|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
