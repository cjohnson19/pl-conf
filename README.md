# PL Conferences

A web application that tracks programming language conferences and workshops,
providing a centralized place to find information about upcoming events in the
PL community.

## Features

The application includes the following features:

- Search conferences and workshops by name
- Filter events by year, type (conference/workshop), and submission status
- Sort events by various criteria including date and name
- Mark events as favorites for easy tracking
- Hide events you're not interested in
- Export events to calendar (ICS format)
- Toggle between dark and light themes
- Daily automated checks for updated conference information
- Email notifications when conference details change

## Contributing

To add or update conference information:

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
  # all important dates are optional
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

Conference data is checked daily by an automated Lambda function that:

1. Fetches the latest information from conference websites
2. Compares with existing data
3. Sends email notifications about any changes

I review these changes daily at noon central time and manually verify dates are
unchanged. If you have any ideas as to how we can automate this away I'd love to
hear about it :).

## License

This project is open source and available under the MIT License.
