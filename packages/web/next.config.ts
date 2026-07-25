import type { NextConfig } from "next";

const isTestFixture = process.env.PL_CONF_TEST_FIXTURE === "1";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: isTestFixture ? ".next-test" : ".next",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // Written once by `prebuild` and only change on redeploy, but they are
        // fetched on every .ics download and polled by subscribed calendar
        // clients. Without this they inherit `max-age=0` and revalidate to the
        // origin every time.
        source: "/ical/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
      "date-fns",
    ],
  },
};

export default nextConfig;
