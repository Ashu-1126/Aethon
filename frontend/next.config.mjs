/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    turbopack: {
      root: "D:/Games/Aethon/frontend"
    }
  }
};
export default nextConfig;
