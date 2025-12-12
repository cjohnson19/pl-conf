import { submissionApi } from "./api";

export function setupNextjsSite(
  eventLink: sst.Linkable<{ events: Record<string, unknown> }>
) {
  new sst.aws.Nextjs("PLConf", {
    link: [eventLink, submissionApi],
    domain:
      $app.stage === "production"
        ? {
            name: "pl-conferences.com",
            redirects: ["www.pl-conferences.com"],
          }
        : undefined,
    environment: {
      NODE_ENV: "production",
    },
  });
}
