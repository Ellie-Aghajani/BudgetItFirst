#!/usr/bin/env bash
# Deletes the local kind cluster and everything in it, including the
# Mongo and RabbitMQ data volumes.
set -euo pipefail

CLUSTER=budget

if kind get clusters | grep -qx "$CLUSTER"; then
  kind delete cluster --name "$CLUSTER"
else
  echo "Cluster '$CLUSTER' does not exist"
fi
