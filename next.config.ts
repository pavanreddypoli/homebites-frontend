/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "ynovjxkwvyhjdrksjecy.supabase.co",
      }
    ],
  },
  // Bundle markdown files for routes that read them with fs.readFile at runtime.
  // Without this, Vercel's build tracer omits docs/ and the pages 500 in production.
  outputFileTracingIncludes: {
    "/become-a-chef":    ["./docs/legal/10-chef-requirements-guide.md"],
    "/help/cottage-food": ["./docs/help/cottage-food-explained.md"],
  },
};

module.exports = nextConfig;
