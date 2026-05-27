import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const distDir =
  process.env.PL_CONF_TEST_FIXTURE === "1" ? ".next-test" : ".next";
const WEB_DIR = join(__dirname, "..");
const NEXT_DIR = join(WEB_DIR, distDir);

const ROUTE_MANIFESTS = [
  join(NEXT_DIR, "routes-manifest.json"),
  join(
    NEXT_DIR,
    "standalone",
    "packages",
    "web",
    distDir,
    "routes-manifest.json"
  ),
];

const PAGE_REFERENCE_MANIFEST = join(
  NEXT_DIR,
  "server",
  "app",
  "page_client-reference-manifest.js"
);

type HeaderRule = {
  source: string;
  headers: { key: string; value: string }[];
  regex: string;
};

type RoutesManifest = { headers?: HeaderRule[] };

function readPageCssChunks(): string[] {
  const text = readFileSync(PAGE_REFERENCE_MANIFEST, "utf8");
  const matches = text.matchAll(/"(static\/chunks\/[^"]+\.css)"/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

function buildLinkValue(chunks: string[]): string {
  return chunks
    .map((path) => `</_next/${path}>; rel=preload; as=style`)
    .join(", ");
}

function patchManifest(file: string, linkValue: string): boolean {
  const text = readFileSync(file, "utf8");
  const manifest = JSON.parse(text) as RoutesManifest;
  const rule = manifest.headers?.find((h) => h.source === "/");
  if (!rule) {
    console.error(`inject-css-preload: no "/" header rule in ${file}`);
    return false;
  }
  const existing = rule.headers.find((h) => h.key === "Link");
  if (existing) {
    if (existing.value === linkValue) return false;
    existing.value = linkValue;
  } else {
    rule.headers.push({ key: "Link", value: linkValue });
  }
  writeFileSync(file, JSON.stringify(manifest, null, 2));
  return true;
}

const chunks = readPageCssChunks();
if (chunks.length === 0) {
  console.error("inject-css-preload: no CSS chunks found for home page");
  process.exit(1);
}

const linkValue = buildLinkValue(chunks);
const patched = ROUTE_MANIFESTS.map((file) => patchManifest(file, linkValue));
const changedCount = patched.filter(Boolean).length;
console.log(
  `inject-css-preload: ${changedCount}/${ROUTE_MANIFESTS.length} routes-manifest.json updated with Link preload for ${chunks.length} CSS chunk(s)`
);
