#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { PlConfStack } from "../lib/pl-conf-stack";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") || "production";
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
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
  crossRegionReferences: true,
});
