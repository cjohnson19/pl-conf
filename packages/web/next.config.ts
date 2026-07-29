import type { NextConfig } from "next";

const isTestFixture = process.env.PL_CONF_TEST_FIXTURE === "1";

const nextConfig: NextConfig = {
  output: "standalone",
  // Compression lives in the nginx layer in front of the container
  // (docker/nginx.conf), which buffers each response and compresses it
  // whole. Next's built-in compress gzips per streamed chunk — ~6x worse on
  // the wire (234KB vs 36KB for the archive flight payload). Local
  // `pnpm run start` therefore serves identity responses; that's fine on
  // localhost. (Distinct from the reverted 2026-07 attempt that expected
  // CloudFront to compress — CloudFront never compresses chunked responses.)
  compress: false,
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
            // Past 60s CloudFront serves stale instantly and refreshes in the
            // background, so a visitor at least once an hour keeps the edge
            // warm and only the first request after a quiet spell sees stale
            // content. The window is capped at an hour because view
            // membership, grouping, and counts are frozen at render time —
            // only header countdowns tick client-side — and AoE rollovers
            // (12:00 UTC) must not show hours-stale grouping to the morning's
            // first visitor. Deploys invalidate /*, so data edits are never
            // held back. stale-if-error is a different trade: during an
            // origin outage, day-old content beats an error page. The CDK
            // HtmlCachePolicy maxTtl must cover s-maxage + the stale windows
            // (CloudFront clamps them to maxTtl).
            value:
              "public, s-maxage=60, stale-while-revalidate=3600, stale-if-error=86400",
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
    // Inline the (single, ~7KB brotli) Tailwind stylesheet into the document
    // instead of a render-blocking <link> — first paint no longer waits a
    // network round trip for CSS. Repeat views refetch it inside the HTML,
    // but the HTML is edge-cached and small, so that trade is cheap.
    inlineCss: true,
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
