/// <reference lib="dom" />
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import puppeteer, { type Browser } from "puppeteer";

const URL = process.env.PROFILE_URL ?? "http://localhost:4321";
const OUT_DIR = process.env.PROFILE_OUT ?? join(process.cwd(), "tmp");
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? "8");
const QUIESCENCE_MS = 4000;

type Seed = {
  name: "EMPTY" | "STARRED" | "STARRED_SESSION";
  local?: Record<string, unknown>;
  session?: Record<string, unknown>;
};

const SEEDS: Seed[] = [
  { name: "EMPTY" },
  {
    name: "STARRED",
    local: {
      userPrefsV2: {
        eventPrefs: {
          "POPL-2026": { favorite: true },
          "PLDI-2026": { favorite: true },
          "ICFP-2026": { favorite: true },
        },
        display: { introHeroDismissed: true },
      },
    },
  },
  {
    name: "STARRED_SESSION",
    local: {
      userPrefsV2: {
        eventPrefs: {
          "POPL-2026": { favorite: true },
          "PLDI-2026": { favorite: true },
          "ICFP-2026": { favorite: true },
        },
        display: { introHeroDismissed: true },
      },
    },
    session: {
      view: "starred",
      collapsedDateGroups: ["2026/06/01"],
    },
  },
];

type PerfEntry = {
  type: string;
  startTime: number;
  duration: number;
  name?: string;
  attribution?: Array<{
    name?: string;
    containerType?: string;
    containerName?: string;
    containerId?: string;
    containerSrc?: string;
  }>;
  size?: number;
  element?: {
    tagName: string;
    dataEventKey: string | null;
    className: string;
    textPreview: string;
  } | null;
  url?: string;
  loadTime?: number;
  renderTime?: number;
};

type ScenarioResult = {
  seed: string;
  fcp: number | null;
  lcp: { time: number; entry: PerfEntry } | null;
  allLcpEntries: PerfEntry[];
  longTasks: PerfEntry[];
  layoutShifts: PerfEntry[];
  paintEntries: PerfEntry[];
  cpuProfilePath: string;
  prefsLoadedAt: number | null;
  firstEventListRenderAt: number | null;
  heroAppearedAt: number | null;
  totalNav: number;
};

async function runScenario(
  browser: Browser,
  seed: Seed
): Promise<ScenarioResult> {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 414, height: 896, isMobile: true });

  // Seed storage BEFORE any page script runs.
  if (seed.local || seed.session) {
    await page.evaluateOnNewDocument((s: Seed) => {
      try {
        if (s.local) {
          for (const [k, v] of Object.entries(s.local)) {
            localStorage.setItem(
              k,
              typeof v === "string" ? v : JSON.stringify(v)
            );
          }
        }
        if (s.session) {
          for (const [k, v] of Object.entries(s.session)) {
            sessionStorage.setItem(
              k,
              typeof v === "string" ? v : JSON.stringify(v)
            );
          }
        }
      } catch {}
    }, seed);
  }

  // Set up observers BEFORE navigation so buffered entries are captured.
  await page.evaluateOnNewDocument(() => {
    const w = window as unknown as {
      __PERF__: {
        fcp: number | null;
        lcpEntries: unknown[];
        longTasks: unknown[];
        layoutShifts: unknown[];
        paintEntries: unknown[];
        marks: Record<string, number>;
      };
    };
    w.__PERF__ = {
      fcp: null,
      lcpEntries: [],
      longTasks: [],
      layoutShifts: [],
      paintEntries: [],
      marks: {},
    };

    const lcpObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const entry = e as PerformanceEntry & {
          size?: number;
          element?: Element | null;
          renderTime?: number;
          loadTime?: number;
          url?: string;
        };
        const el = entry.element ?? null;
        w.__PERF__.lcpEntries.push({
          type: "largest-contentful-paint",
          startTime: entry.startTime,
          duration: entry.duration,
          size: entry.size,
          renderTime: entry.renderTime,
          loadTime: entry.loadTime,
          url: entry.url,
          element: el
            ? {
                tagName: el.tagName,
                dataEventKey: el.getAttribute("data-event-key"),
                className:
                  (el as Element & { className?: string }).className ?? "",
                textPreview: (el.textContent ?? "").slice(0, 80),
              }
            : null,
        });
      }
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });

    const paintObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        w.__PERF__.paintEntries.push({
          type: e.entryType,
          name: e.name,
          startTime: e.startTime,
          duration: e.duration,
        });
        if (e.name === "first-contentful-paint") w.__PERF__.fcp = e.startTime;
      }
    });
    paintObs.observe({ type: "paint", buffered: true });

    const ltObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const lt = e as PerformanceEntry & {
          attribution?: Array<{
            name?: string;
            containerType?: string;
            containerName?: string;
            containerId?: string;
            containerSrc?: string;
          }>;
        };
        w.__PERF__.longTasks.push({
          type: "longtask",
          startTime: lt.startTime,
          duration: lt.duration,
          attribution: (lt.attribution ?? []).map((a) => ({
            name: a.name,
            containerType: a.containerType,
            containerName: a.containerName,
            containerId: a.containerId,
            containerSrc: a.containerSrc,
          })),
        });
      }
    });
    ltObs.observe({ type: "longtask", buffered: true });

    const lsObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const ls = e as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
        };
        w.__PERF__.layoutShifts.push({
          type: "layout-shift",
          startTime: ls.startTime,
          duration: ls.duration,
          name: String(ls.value ?? 0),
        });
      }
    });
    lsObs.observe({ type: "layout-shift", buffered: true });

    // Sentinel observers via MutationObserver on settle-relevant markers.
    const mark = (name: string) => {
      if (w.__PERF__.marks[name] == null) {
        w.__PERF__.marks[name] = performance.now();
      }
    };

    const start = performance.now();
    void start;

    const heroObserver = new MutationObserver(() => {
      if (document.querySelector('[data-hero-slot="intro"]')) {
        mark("introHeroAppeared");
      }
      const heroes = document.querySelectorAll("section");
      for (const s of Array.from(heroes)) {
        if (s.textContent?.includes("Your next deadline")) {
          mark("deadlineHeroAppeared");
          break;
        }
        if (s.textContent?.includes("Up next")) {
          mark("upNextHeroAppeared");
          break;
        }
      }
      if (document.querySelector("[data-event-key]")) {
        mark("firstEventRowRendered");
      }
    });
    heroObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });

  const client = await page.target().createCDPSession();
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
  await client.send("Profiler.enable");
  await client.send("Profiler.setSamplingInterval", { interval: 200 });
  await client.send("Profiler.start");

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: "load", timeout: 60000 });
  // Wait for the page to fully settle.
  await new Promise((resolve) => setTimeout(resolve, QUIESCENCE_MS));
  const totalNav = Date.now() - t0;

  const { profile } = (await client.send("Profiler.stop")) as {
    profile: unknown;
  };

  const cpuProfilePath = join(
    OUT_DIR,
    `lcp-${seed.name.toLowerCase()}.cpuprofile`
  );
  await writeFile(cpuProfilePath, JSON.stringify(profile));

  const perf = (await page.evaluate(() => (window as any).__PERF__)) as {
    fcp: number | null;
    lcpEntries: PerfEntry[];
    longTasks: PerfEntry[];
    layoutShifts: PerfEntry[];
    paintEntries: PerfEntry[];
    marks: Record<string, number>;
  };

  await context.close();

  const lcp =
    perf.lcpEntries.length > 0
      ? perf.lcpEntries[perf.lcpEntries.length - 1]
      : null;

  return {
    seed: seed.name,
    fcp: perf.fcp,
    lcp: lcp ? { time: lcp.startTime, entry: lcp } : null,
    allLcpEntries: perf.lcpEntries,
    longTasks: perf.longTasks,
    layoutShifts: perf.layoutShifts,
    paintEntries: perf.paintEntries,
    cpuProfilePath,
    prefsLoadedAt: perf.marks.prefsLoaded ?? null,
    firstEventListRenderAt: perf.marks.firstEventRowRendered ?? null,
    heroAppearedAt:
      perf.marks.deadlineHeroAppeared ??
      perf.marks.upNextHeroAppeared ??
      perf.marks.introHeroAppeared ??
      null,
    totalNav,
  };
}

void (async () => {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results: ScenarioResult[] = [];
  for (const seed of SEEDS) {
    process.stdout.write(`Running ${seed.name}... `);
    const r = await runScenario(browser, seed);
    process.stdout.write(`done (LCP ${r.lcp?.time.toFixed(0) ?? "?"} ms)\n`);
    results.push(r);
  }
  await browser.close();

  await writeFile(
    join(OUT_DIR, "lcp-profile.json"),
    JSON.stringify(results, null, 2)
  );

  // Render summary markdown.
  const lines: string[] = [];
  lines.push("# LCP Profile — Phase 1\n");
  lines.push(
    `CPU throttle: ${CPU_THROTTLE}x · Viewport: 414×896 (mobile) · ${QUIESCENCE_MS}ms quiescence wait\n`
  );
  lines.push("");
  lines.push(
    "| Scenario | FCP (ms) | LCP (ms) | LCP element | LCP size | First row (ms) | Hero (ms) | LongTasks total (ms) | LongTasks count |"
  );
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    const ltTotal = r.longTasks.reduce((a, b) => a + b.duration, 0);
    const lcpElement = r.lcp?.entry?.element
      ? `${r.lcp.entry.element.tagName}${
          r.lcp.entry.element.dataEventKey
            ? `[data-event-key=${r.lcp.entry.element.dataEventKey}]`
            : ""
        } "${r.lcp.entry.element.textPreview.replace(/\s+/g, " ")}"`
      : "—";
    lines.push(
      `| ${r.seed} | ${r.fcp?.toFixed(0) ?? "?"} | ${
        r.lcp?.time.toFixed(0) ?? "?"
      } | ${lcpElement} | ${r.lcp?.entry?.size ?? "?"} | ${
        r.firstEventListRenderAt?.toFixed(0) ?? "?"
      } | ${r.heroAppearedAt?.toFixed(0) ?? "?"} | ${ltTotal.toFixed(0)} | ${
        r.longTasks.length
      } |`
    );
  }
  lines.push("");
  lines.push("## Per-scenario LCP candidate evolution\n");
  for (const r of results) {
    lines.push(`### ${r.seed}`);
    lines.push("");
    lines.push(`- FCP: \`${r.fcp?.toFixed(1) ?? "?"} ms\``);
    lines.push(`- LCP: \`${r.lcp?.time.toFixed(1) ?? "?"} ms\``);
    if (r.lcp?.entry?.element) {
      const el = r.lcp.entry.element;
      lines.push(
        `- LCP element: \`<${el.tagName.toLowerCase()}${
          el.dataEventKey ? ` data-event-key="${el.dataEventKey}"` : ""
        }>\` text="${el.textPreview.replace(/\s+/g, " ").trim()}"`
      );
      lines.push(`- LCP size: ${r.lcp.entry.size}`);
    }
    lines.push(
      `- First [data-event-key] DOM at: ${
        r.firstEventListRenderAt?.toFixed(1) ?? "?"
      } ms`
    );
    lines.push(
      `- Hero first appeared at: ${r.heroAppearedAt?.toFixed(1) ?? "?"} ms`
    );
    lines.push(
      `- LongTasks: ${r.longTasks.length} (total ${r.longTasks
        .reduce((a, b) => a + b.duration, 0)
        .toFixed(0)} ms)`
    );
    if (r.longTasks.length > 0) {
      const top = [...r.longTasks]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);
      lines.push("- Top 5 longTask spans:");
      for (const t of top) {
        lines.push(
          `  - ${t.duration.toFixed(0)} ms starting at ${t.startTime.toFixed(
            0
          )} ms`
        );
      }
    }
    lines.push(
      `- CLS contributions: ${r.layoutShifts.length} entries, sum ${r.layoutShifts
        .reduce((a, b) => a + Number(b.name ?? "0"), 0)
        .toFixed(4)}`
    );
    lines.push("");
  }
  await writeFile(join(OUT_DIR, "lcp-profile.md"), lines.join("\n"));
  process.stdout.write(
    `\nWrote ${join(OUT_DIR, "lcp-profile.md")} and ${SEEDS.length} cpuprofile(s)\n`
  );
})();
