/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the runtime image small (see Dockerfile.web).
  output: "standalone",
  reactStrictMode: true,
  // The canvas owns its own paint loop; React must not retain large pixel buffers.
  experimental: {
    optimizePackageImports: ["lucide-react", "cmdk"],
  },
};

export default nextConfig;
