/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // pdf-parse (pdf.js) uses worker/canvas code that must stay external on Vercel.
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
}

export default nextConfig
