/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Allow cross-origin requests from the mobile device during demo
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Permissions-Policy", value: "camera=*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
