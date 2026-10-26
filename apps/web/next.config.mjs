/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Dossier de build surchargeable : permet une 2e instance de test (ex. port 3001) sans conflit avec .next
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
