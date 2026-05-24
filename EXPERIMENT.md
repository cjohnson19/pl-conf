# SSR Experiment

This branch (`ssr`) deploys the Next.js site as a server-rendered application
on AWS, separate from the production static-export stack. Goal: measure SSR's
impact on slow clients without touching production or `pl-conferences.com`.

## What gets deployed

- **CloudFormation stack:** `PlConf-experiment` (separate from `PlConf-dev` /
  `PlConf-production`)
- **ECS Express Mode service** (Fargate, 1024 CPU / 2048 MB, x86_64) running
  the Next.js standalone server on port 3000. Express Mode auto-provisions an
  ALB with HTTPS and an AWS-managed domain.
- **CloudFront distribution** in front of the Express service, using the
  auto-generated `*.cloudfront.net` domain (no Route 53, no ACM customisation).
- **ECR image** uploaded by CDK's `DockerImageAsset` to the bootstrap assets
  repo (`cdk-hnb659fds-container-assets-*`).
- **CloudWatch log group** with 1-week retention.

No Route 53 records, no `pl-conferences.com` DNS, no submission Lambda
(submission form is non-functional unless `SUBMISSION_API_URL` is supplied).
The drift detection Lambda from the prod stack is not included.

## Spinning it up

```sh
pnpm install
# Optional: point the submission form at the prod stack's API
export SUBMISSION_API_URL=https://<prod-api-id>.execute-api.us-east-1.amazonaws.com/
pnpm run deploy:experiment
```

The deploy script will:

1. Regenerate `packages/data/generated/events.ts` (the Docker build cannot do
   this itself because `.git` is excluded from the build context, and
   `lastUpdated` needs `git log`).
2. Run `cdk deploy` with `-c stage=experiment`. CDK's `DockerImageAsset`
   builds the image (using `Dockerfile` at repo root, platform linux/amd64)
   and pushes to ECR.
3. Print the CloudFront URL on success.

First deploy takes 15-20 minutes (CloudFront distribution provisioning is the
slow step). Subsequent deploys are faster if the Docker layers are cached.

## Tearing it down

```sh
pnpm run destroy:experiment
```

This runs `cdk destroy -c stage=experiment --force`. CloudFront takes 15-20
minutes to disable and delete. Everything in the stack is created with
`RemovalPolicy.DESTROY`, so no orphans inside the stack.

### What does NOT get deleted by `cdk destroy`

- **ECR image** in the CDK bootstrap assets repo
  (`cdk-hnb659fds-container-assets-<account>-<region>`). Images accumulate
  across deploys. Optional cleanup:

  ```sh
  REGION=us-east-1
  ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
  REPO="cdk-hnb659fds-container-assets-${ACCOUNT}-${REGION}"
  # List images, then delete old ones manually, or set a lifecycle policy.
  aws ecr describe-images --repository-name "$REPO"
  ```

- **CDK bootstrap stack** (`CDKToolkit`) — leave it; it's shared with all
  other CDK deploys in this account/region.

## Cost estimate

Per month, near-zero traffic, us-east-1:

| Component                                                  | Approx.     |
| ---------------------------------------------------------- | ----------- |
| Fargate task (1024 CPU / 2048 MB, x86_64, on-demand, 24/7) | ~$36        |
| Express Mode ALB (shared, idle)                            | ~$16        |
| CloudFront (free tier covers experiment traffic)           | $0          |
| CloudWatch Logs (1-week retention, low volume)             | <$1         |
| **Total**                                                  | **~$50/mo** |

If left running, this is roughly $1.65/day. Destroy the stack when you're not
actively measuring.

## Branch-specific differences from `main`

- `packages/web/next.config.ts`: `output: "standalone"` (was `"export"`).
- `Dockerfile` and `.dockerignore` at repo root.
- `packages/cdk/lib/pl-conf-experiment-stack.ts` (new).
- `packages/cdk/bin/pl-conf.ts`: routes `stage=experiment` to the new stack.
- `scripts/deploy-experiment.ts` (new).
- `package.json`: `deploy:experiment` and `destroy:experiment` scripts.
