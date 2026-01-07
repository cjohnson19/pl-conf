# PL Conferences

A web application that tracks programming language conferences and workshops.

## Adding Conferences

You can add conference information in two ways:

### Via the web form

Visit the website and click "Submit Event" to use the form interface.

### Via YAML files

1. Navigate to the appropriate year directory under `data/` (e.g., `data/2025/`)
2. Create or edit a YAML file named after the conference abbreviation (e.g., `icfp.yaml`)
3. Use the following structure:

```yaml
name: Full Conference Name
abbreviation: CONF
type: conference # or workshop
location: City, Country
date:
  start: 2025-01-15
  end: 2025-01-20
url: https://conference-website.com
importantDateUrl: https://conference-website.com/dates
importantDates:
  abstract: 2024-09-01
  paper: 2024-09-15
  # Optional dates:
  conditional-acceptance: 2024-10-10
  rebuttal: 2024-10-15
  notification: 2024-11-01
  camera-ready: 2024-12-01
  revisions: 2024-10-19
```

Dates can be set to "TBD" if not yet announced. The `lastUpdated` field is automatically managed by the system based on git history.

## Data Updates

Conference data is checked daily by an automated process that:

1. Fetches the latest information from conference websites
2. Compares with existing data
3. Sends email notifications to me (cjohnson19) about any changes

Changes are reviewed manually, and I hope to update the pages quickly. I am
thinking about sending out emails if people want to subscribe to certain events,
but I don't want to do this too quickly. I would feel very bad if I filled up
someone's inbox too much.

## Development

This project uses a monorepo structure:

- `app/` - Next.js frontend application
- `packages/core/` - Shared Zod schemas and utilities
- `packages/functions/` - Lambda functions for form submission, drift detection,
  and iCal file creating
- `data/` - YAML files containing conference information
- `generated/` - Auto-generated event data (do not edit directly)
- `scripts/` - Build and deployment scripts

### Prerequisites

- Node.js 22+
- pnpm

### Running locally

```bash
# Install dependencies
pnpm install

# Build the core package
pnpm --filter @pl-conf/core run build

# Start the development server
pnpm run dev
```

The development server will start at `http://localhost:3000`.

### Project structure

Event data is stored in YAML files under `data/{year}/`. When you run `pnpm run dev` or `pnpm run build`, the `scripts/generate-events.ts` script automatically:

1. Reads all YAML files from `data/`
2. Validates them against the Zod schema in `packages/core`
3. Generates `generated/events.ts` and `generated/events.json`

### Available scripts

- `pnpm run dev` - Start Next.js development server
- `pnpm run build` - Build the Next.js static site
- `pnpm run generate` - Regenerate event data from YAML files
- `pnpm run lint` - Run ESLint

## License

This project is open source and available under the MIT License.
