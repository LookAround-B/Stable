// This file configures the project to be a Next.js project with TypeScript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
  // Handle rewrites for static files
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/uploads/:path*',
          destination: '/uploads/:path*',
        },
      ],
    }
  },
  // Add security headers for static content only (not API)
  async headers() {
    return [
      {
        source: '/:path((?!api).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
