// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "pl-conf",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const { loadEvents } = await import("./infra/events");
    const events = await loadEvents();

    const eventLink = new sst.Linkable("EventList", {
      properties: { events },
    });

    await import("./infra/storage");

    await import("./infra/api");

    // Set up drift detection production, only operates in production.
    const { setupDriftDetection } = await import("./infra/drift");
    setupDriftDetection(eventLink);

    const { setupNextjsSite } = await import("./infra/web");
    setupNextjsSite(eventLink);
  },
  console: {
    autodeploy: {
      target(event) {
        if (
          event.type === "branch" &&
          event.branch === "main" &&
          event.action === "pushed"
        ) {
          return {
            stage: "production",
          };
        }
        if (event.type === "pull_request") {
          return {
            stage: `pr-${event.number}`,
          };
        }
      },
    },
  },
});
