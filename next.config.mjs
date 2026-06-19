/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the runtime image small (see Dockerfile.web).
  output: "standalone",
  reactStrictMode: true,
  // Hide the dev-tools badge — it sits bottom-left, over our help button.
  devIndicators: false,
  // better-sqlite3 is a native module — never bundle it for the client.
  serverExternalPackages: ["better-sqlite3"],
  // The canvas owns its own paint loop; React must not retain large pixel buffers.
  experimental: {
    optimizePackageImports: ["lucide-react", "cmdk"],
  },
};

export default nextConfig;
