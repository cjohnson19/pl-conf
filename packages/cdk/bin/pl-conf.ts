#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PlConfStack } from "../lib/pl-conf-stack";
import { PlConfExperimentStack } from "../lib/pl-conf-experiment-stack";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") || "production";
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};

if (stage === "experiment") {
  const submissionApiUrl = app.node.tryGetContext("submissionApiUrl");
  new PlConfExperimentStack(app, `PlConf-${stage}`, {
    submissionApiUrl,
    env,
  });
} else {
  const notificationEmail = app.node.tryGetContext("notificationEmail");
  const domainName = app.node.tryGetContext("domainName");

  if (!notificationEmail) {
    throw new Error(
      "notificationEmail context is required. Use: cdk deploy -c notificationEmail=your@email.com"
    );
  }

  new PlConfStack(app, `PlConf-${stage}`, {
    stage,
    notificationEmail,
    domainName,
    env,
    crossRegionReferences: true,
  });
}
