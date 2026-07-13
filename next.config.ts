import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

import { canonicalHostRedirects } from './src/lib/canonicalRedirect'
import { normalizeMediaHost, SECURITY_SOURCE, securityHeaders } from './src/lib/securityHeaders'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // §12 前台安全响应头 / 务实 CSP(逻辑在 src/lib/securityHeaders,便于单测)。
  async headers() {
    return [
      {
        source: SECURITY_SOURCE,
        headers: securityHeaders({
          isDev: process.env.NODE_ENV === 'development',
          mediaHost: normalizeMediaHost(process.env.NEXT_PUBLIC_MEDIA_HOST),
        }),
      },
    ]
  },
  // §12 主域名归一:www ↔ apex 308 到 NEXT_PUBLIC_SERVER_URL 指定的主域名(单一来源,构建期读 env)。
  async redirects() {
    return canonicalHostRedirects(process.env.NEXT_PUBLIC_SERVER_URL)
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
