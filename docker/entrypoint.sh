#!/bin/sh
set -e
# Fargate injects HOSTNAME=<task ENI hostname> into the container env, which
# overrides the Dockerfile ENV — and Next binds to $HOSTNAME. Pin it back to
# loopback here so node always sits behind nginx instead of listening on the
# ENI (nginx would 502 with "connection refused" on 127.0.0.1:3001).
export HOSTNAME=127.0.0.1
# nginx daemonizes and is reparented to tini; node stays tini's direct child
# so SIGTERM reaches Next's cleanup handler (server.close() drains in-flight
# requests). By SIGTERM time the ALB has already deregistered the task, so
# nginx needs no graceful stop of its own.
nginx -c /app/nginx.conf
exec node packages/web/server.js
