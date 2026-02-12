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
}

module.exports = nextConfig
