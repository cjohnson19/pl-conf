import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const dynamoSend = vi.fn();
const sesSend = vi.fn();

vi.mock("@aws-sdk/client-dynamodb", () => {
  class Command {
    constructor(public input: Record<string, unknown>) {}
  }
  return {
    DynamoDBClient: class {
      send = dynamoSend;
    },
    GetItemCommand: class extends Command {},
    PutItemCommand: class extends Command {},
    UpdateItemCommand: class extends Command {},
    DeleteItemCommand: class extends Command {},
    ConditionalCheckFailedException: class extends Error {},
  };
});

vi.mock("@aws-sdk/client-sesv2", () => {
  class Command {
    constructor(public input: Record<string, unknown>) {}
  }
  return {
    SESv2Client: class {
      send = sesSend;
    },
    SendEmailCommand: class extends Command {},
  };
});

process.env.RATE_LIMIT_TABLE_NAME = "test-table";
process.env.SUBMISSION_EMAIL_SENDER = "sender@example.com";
process.env.NOTIFICATION_EMAIL = "notify@example.com";

type Handler = (event: {
  body: string;
  headers: Record<string, string | undefined>;
  requestContext: { http: { sourceIp: string } };
}) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;
// The mock's zero-arg class; typed loosely so the real SDK type (whose
// constructor takes options) also satisfies it.
let ConditionalCheckFailedException: new (...args: never[]) => Error;

beforeAll(async () => {
  ({ ConditionalCheckFailedException } = await import(
    "@aws-sdk/client-dynamodb"
  ));
  ({ handler } = await import("./index"));
});

const request = (body: string) => ({
  body,
  headers: {},
  requestContext: { http: { sourceIp: "192.0.2.1" } },
});

const dynamoCalls = () =>
  dynamoSend.mock.calls.map(([cmd]) => ({
    kind: cmd.constructor.name as string,
    input: cmd.input as Record<string, unknown>,
  }));

beforeEach(() => {
  dynamoSend.mockReset();
  sesSend.mockReset();
  dynamoSend.mockResolvedValue({ Attributes: { count: { N: "1" } } });
  sesSend.mockResolvedValue({});
});

describe("submission handler", () => {
  it("rejects an invalid body without consuming rate-limit quota", async () => {
    const malformed = await handler(request("not json"));
    expect(malformed.statusCode).toBe(400);

    const invalid = await handler(request(JSON.stringify({ url: 12 })));
    expect(invalid.statusCode).toBe(400);

    expect(dynamoSend).not.toHaveBeenCalled();
    expect(sesSend).not.toHaveBeenCalled();
  });

  it("enforces the rate limit with a single conditional write", async () => {
    const res = await handler(
      request(JSON.stringify({ url: "https://x.dev" }))
    );
    expect(res.statusCode).toBe(200);
    const rateLimitWrites = dynamoCalls().filter(
      (c) => c.kind === "UpdateItemCommand"
    );
    expect(rateLimitWrites).toHaveLength(1);
    expect(rateLimitWrites[0].input.ConditionExpression).toBeDefined();
  });

  it("rejects a duplicate URL without sending email", async () => {
    dynamoSend.mockImplementation((cmd: { constructor: { name: string } }) => {
      if (cmd.constructor.name === "PutItemCommand") {
        return Promise.reject(new ConditionalCheckFailedException());
      }
      return Promise.resolve({ Attributes: { count: { N: "1" } } });
    });
    const res = await handler(
      request(JSON.stringify({ url: "https://x.dev" }))
    );
    expect(res.statusCode).toBe(409);
    expect(sesSend).not.toHaveBeenCalled();
  });

  it("frees the duplicate claim and reports failure when the email doesn't send", async () => {
    sesSend.mockRejectedValue(new Error("ses down"));
    const res = await handler(
      request(JSON.stringify({ url: "https://x.dev" }))
    );
    // The submitter must not be told it worked, and the URL must not be locked
    // out for 24h — the claim written before the send has to be rolled back.
    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    expect(
      dynamoCalls().filter((c) => c.kind === "DeleteItemCommand")
    ).toHaveLength(1);
  });
});
