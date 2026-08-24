import fs from "node:fs";
import path from "node:path";

// next build's standalone output ships server.js without the static/public
// assets — copy them next to the server so /_next/static/* and /public files
// resolve. Mirrors the layout the ECS image deploys. The dist dir is
// parameterized because the test fixture build uses .next-test.
export function assembleStandalone(webDir: string, distDirName: string) {
  const distDir = path.join(webDir, distDirName);
  const standaloneWeb = path.join(distDir, "standalone", "packages", "web");
  const staticDest = path.join(standaloneWeb, distDirName, "static");
  const publicDest = path.join(standaloneWeb, "public");

  fs.rmSync(staticDest, { recursive: true, force: true });
  fs.rmSync(publicDest, { recursive: true, force: true });
  fs.cpSync(path.join(distDir, "static"), staticDest, { recursive: true });
  fs.cpSync(path.join(webDir, "public"), publicDest, { recursive: true });
}
