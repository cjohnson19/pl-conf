export const webpageBucket = new sst.aws.Bucket("WebpageBucket", {
  versioning: true,
});

export const submissionsBucket = new sst.aws.Bucket("SubmissionsBucket", {
  versioning: true,
});

export const rateLimitTable = new sst.aws.Dynamo("RateLimitTable", {
  fields: {
    id: "string",
  },
  primaryIndex: { hashKey: "id" },
  ttl: "ttl",
});
