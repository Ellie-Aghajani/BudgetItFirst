#!/usr/bin/env bash
# Creates a local kind cluster and deploys RabbitMQ, MongoDB and the
# notification service. Safe to run again: every step is idempotent.
# Usage: scripts/kind-up.sh   (needs docker, kind, kubectl and a root .env)
set -euo pipefail

CLUSTER=budget
NAMESPACE=budget
IMAGE=notification-service:dev
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

# Every kubectl call names the kind cluster, so this script can never touch
# another cluster, whatever your current kubectl context is.
k() { kubectl --context "kind-$CLUSTER" "$@"; }

for tool in docker kind kubectl; do
  command -v "$tool" >/dev/null || { echo "Missing tool: $tool" >&2; exit 1; }
done
[[ -f "$ENV_FILE" ]] || { echo "Missing .env: run 'cp .env.example .env' and edit it" >&2; exit 1; }
for key in RABBITMQ_USER RABBITMQ_PASSWORD DEV_USER_ID; do
  grep -q "^$key=." "$ENV_FILE" || { echo "Set $key in .env" >&2; exit 1; }
done

if kind get clusters | grep -qx "$CLUSTER"; then
  echo "Cluster '$CLUSTER' already exists"
else
  kind create cluster --name "$CLUSTER"
fi

echo "Building $IMAGE"
docker build -t "$IMAGE" "$ROOT/services/notification-service"
# The cluster's nodes are containers with their own image store, so the image
# has to be copied in. Without this the pod fails with ErrImagePull.
kind load docker-image "$IMAGE" --name "$CLUSTER"

k apply -f "$ROOT/k8s/namespace.yaml"
# The Secret is made from .env and never written to disk or git.
# --dry-run + apply makes it an update when the Secret already exists.
k create secret generic notification-secrets \
  --namespace "$NAMESPACE" \
  --from-env-file="$ENV_FILE" \
  --dry-run=client -o yaml | k apply -f -

existed=false
k get deployment notification-service -n "$NAMESPACE" >/dev/null 2>&1 && existed=true
k apply -k "$ROOT/k8s"
# Same tag ("dev") as before, so apply sees no change: restart to pick up the new image.
if [[ "$existed" == true ]]; then
  k rollout restart deployment/notification-service -n "$NAMESPACE"
fi

k rollout status statefulset/mongo -n "$NAMESPACE" --timeout=180s
k rollout status statefulset/rabbitmq -n "$NAMESPACE" --timeout=180s
k rollout status deployment/notification-service -n "$NAMESPACE" --timeout=180s

cat <<EOF

Ready. In separate terminals:
  kubectl --context kind-$CLUSTER -n $NAMESPACE port-forward svc/notification-service 8081:8080
  kubectl --context kind-$CLUSTER -n $NAMESPACE port-forward svc/rabbitmq 5672:5672 15672:15672
Then: curl -s -H 'Authorization: Bearer x' localhost:8081/notifications
EOF
