# PL Conferences

A web application that tracks programming language conferences and workshops.

## Features

- Search conferences and workshops by name
- Filter events by year, type (conference/workshop), and submission status
- Sort events by various criteria including date and name
- Mark events as favorites for easy tracking
- Hide events you're not interested in
- Export events to calendar (ICS format)
- Toggle between dark and light themes
- Submit new conference information via form
- Daily automated checks for updated conference information
- Email notifications when conference details change

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

This project uses SST with a monorepo structure:

- `app/` - Next.js frontend application
- `packages/core/` - Shared Zod schemas and utilities
- `packages/functions/` - Lambda functions for form submissions and drift detection
- `data/` - YAML files containing conference information

### Prerequisites

- Node.js and pnpm
- AWS credentials configured
- SST CLI (`npm install -g sst`)

### Running locally

```bash
# Install dependencies
pnpm install

# Start development environment
npx sst dev
```

## Configuration

The application uses SST secrets for sensitive configuration:

- `NotificationEmail` - Email address for notifications (both submissions and drift alerts)

Set secrets using:

```bash
npx sst secret set NotificationEmail "your-email@example.com"
```

## License

This project is open source and available under the MIT License.
