/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 1080, 1920],
    imageSizes: [256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ebhzwojpnmrwimkfqsbk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/webp'],
  },
};

export default nextConfig;
