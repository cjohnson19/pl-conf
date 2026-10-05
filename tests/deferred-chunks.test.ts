import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFERRED_CHUNK_ATTR,
  DEFERRED_CHUNK_SUB_FILTER,
  deferChunkScripts,
  deferredChunksLoaderScript,
} from "@/lib/deferred-chunks";

const nginxConf = fs.readFileSync(
  path.resolve(import.meta.dirname, "../docker/nginx.conf"),
  "utf8"
);

describe("deferred hydration chunks", () => {
  it("nginx applies exactly the substitution the loader expects", () => {
    const { search, replace } = DEFERRED_CHUNK_SUB_FILTER;
    expect(nginxConf).toContain(`sub_filter '${search}' '${replace}';`);
    expect(nginxConf).toContain("sub_filter_once off;");
  });

  it("marks every chunk script inert and leaves other scripts alone", () => {
    const html =
      '<head><script src="/_next/static/chunks/a.js" async=""></script>' +
      '<script src="/_next/static/chunks/b.js" noModule=""></script>' +
      '<script src="/_next/static/x/_buildManifest.js"></script>' +
      "<script>inline()</script></head>";
    const out = deferChunkScripts(html);
    expect(out.match(new RegExp(DEFERRED_CHUNK_ATTR, "g"))).toHaveLength(2);
    expect(out).toContain(
      `<script type="text/plain" ${DEFERRED_CHUNK_ATTR} src="/_next/static/chunks/a.js" async="">`
    );
    expect(out).toContain('<script src="/_next/static/x/_buildManifest.js">');
    expect(out).toContain("<script>inline()</script>");
  });

  it("keeps the loader free of nginx variable syntax", () => {
    expect(deferredChunksLoaderScript).not.toContain("$");
    expect(deferredChunksLoaderScript).toContain(
      `script[${DEFERRED_CHUNK_ATTR}]`
    );
  });
});
