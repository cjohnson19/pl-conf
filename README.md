# PL Conferences

A web application that tracks programming language conferences and workshops.

## Adding Conferences

You can add conference information in two ways:

### Via the web form

Visit the website and click "Submit Event" to use the form interface.

### Via YAML files

1. Navigate to the appropriate year directory under `packages/data/yaml/` (e.g., `packages/data/yaml/2026/`).
2. Create or edit a YAML file named after the conference abbreviation (e.g., `icfp.yaml`).
3. Use the following structure:

```yaml
name: Full Conference Name
abbreviation: CONF
type: conference # or workshop, symposium
location: City, Country
date:
  start: 2026-01-15
  end: 2026-01-20
url: https://conference-website.com
importantDateUrl: https://conference-website.com/dates
importantDates:
  abstract: 2025-09-01
  paper: 2025-09-15
  # Optional dates:
  conditional-acceptance: 2025-10-10
  rebuttal: 2025-10-15
  notification: 2025-11-01
  camera-ready: 2025-12-01
  revisions: 2025-10-19
```

Conferences with multiple submission rounds use a `rounds:` array instead of flat `importantDates` — see existing files for examples. Dates can be set to `TBD` if not yet announced. The `lastUpdated` field is automatically managed from git history.

## Data Updates

Conference data is checked daily by an automated process that:

1. Fetches the latest information from conference websites
2. Compares with existing data
3. Sends email notifications to me (cjohnson19) about any changes

Changes are reviewed manually, and I hope to update the pages quickly.

## Development

This project is a pnpm monorepo. All packages live under `packages/`:

- `packages/web/` — Next.js 16 frontend (static export to `packages/web/out/`)
- `packages/core/` — Shared Zod schemas, date utilities, iCal generation
- `packages/data/` — Conference YAML source and the generator that produces `generated/events.{ts,json}`
- `packages/functions/` — AWS Lambda functions (form submission, drift detection)
- `packages/cdk/` — AWS CDK infrastructure

### Prerequisites

- Node.js 22+
- pnpm 11+

### Running locally

```bash
pnpm install
pnpm run dev
```

The development server starts at `http://localhost:3000`. `pnpm run dev` regenerates event data from YAML first, then runs the Next.js dev server.

### Available scripts

| Script                   | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `pnpm run dev`           | Generate events, then start Next.js dev server                     |
| `pnpm run build`         | Generate events, then build the static site to `packages/web/out/` |
| `pnpm run build:lambdas` | Generate events, then bundle Lambda functions                      |
| `pnpm run build:all`     | Generate once, then build both the site and Lambdas                |
| `pnpm run generate`      | Regenerate `packages/data/generated/events.ts` from YAML           |
| `pnpm run typecheck`     | Run `tsc --noEmit` across all packages                             |
| `pnpm run lint`          | Run Biome (lint + format check) across the repo                    |
| `pnpm run format`        | Apply Biome formatting fixes in place                              |
| `pnpm run test`          | Run vitest (schema, AOE, countdown, and Puppeteer e2e tests)       |
| `pnpm run deploy`        | Deploy via `scripts/deploy.ts <notification-email>`                |

### Code quality

- Biome handles linting and formatting for JS/TS/JSON/CSS; Prettier handles YAML/Markdown/HTML.
- Pre-commit runs `lint-staged` (auto-fixes staged files via Biome + Prettier) plus a full `typecheck` and `lint`.

## License

This project is open source and available under the MIT License.
