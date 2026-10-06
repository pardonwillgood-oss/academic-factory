/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // pdf-parse (pdf.js) must not be bundled by webpack/turbopack on the server.
  serverExternalPackages: ['pdf-parse'],
}

export default nextConfig
