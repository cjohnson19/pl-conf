#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PlConfStack } from "../lib/pl-conf-stack";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") || "production";
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};

const notificationEmail = app.node.tryGetContext("notificationEmail");
const domainName = app.node.tryGetContext("domainName");
const submissionApiUrl = app.node.tryGetContext("submissionApiUrl");

if (!notificationEmail) {
  throw new Error(
    "notificationEmail context is required. Use: cdk deploy -c notificationEmail=your@email.com"
  );
}

new PlConfStack(app, `PlConf-${stage}`, {
  stage,
  notificationEmail,
  domainName,
  submissionApiUrl,
  env,
  crossRegionReferences: true,
});
