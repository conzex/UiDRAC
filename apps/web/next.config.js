/** @type {import('next').NextConfig} */
const apiUpstream =
  process.env.API_UPSTREAM ||
  process.env.INTERNAL_API_URL ||
  'http://127.0.0.1:4000';

const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@idrac/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn-icons-png.flaticon.com', pathname: '/**' },
    ],
  },
  async rewrites() {
    const base = apiUpstream.replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${base}/api/:path*` }];
  },
};
module.exports = nextConfig;
