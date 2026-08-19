/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Tắt Image Optimization để tránh bị giới hạn 5000 ảnh/tháng trên Vercel Hobby
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ebhzwojpnmrwimkfqsbk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
