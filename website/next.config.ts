import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* Compression */
  compress: true,

  /* Image optimization */
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },

  /* Security headers */
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
