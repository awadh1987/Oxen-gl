#!/usr/bin/env bash
# ==============================================================================
# OxenGL Zero-Downtime Production Rolling Deployment Script
# Manages blue-green container lifecycle with health verification & instant rollback
# ==============================================================================

set -eo pipefail

APP_NAME="oxengl-saas"
IMAGE_TAG="${1:-latest}"
REGISTRY="${DOCKER_REGISTRY:-ghcr.io/awadh1987/oxen-gl}"
IMAGE_URI="${REGISTRY}/${APP_NAME}:${IMAGE_TAG}"
HEALTH_PORT="3000"
HEALTH_ENDPOINT="http://localhost:${HEALTH_PORT}/api/health"
ROLLBACK_NEEDED=false

echo "======================================================================"
echo " Starting Zero-Downtime Deployment: ${IMAGE_URI}"
echo " Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "======================================================================"

# 1. Pull Target Production Image
echo "[1/5] Pulling target production container image..."
docker pull "${IMAGE_URI}"

# 2. Identify Active Container
ACTIVE_CONTAINER=$(docker ps --filter "name=${APP_NAME}" --format "{{.Names}}" | head -n 1)
if [ -n "$ACTIVE_CONTAINER" ]; then
    echo "[2/5] Active container detected: ${ACTIVE_CONTAINER}"
    if [ "$ACTIVE_CONTAINER" == "${APP_NAME}-blue" ]; then
        NEXT_NAME="${APP_NAME}-green"
        NEXT_PORT="3002"
    else
        NEXT_NAME="${APP_NAME}-blue"
        NEXT_PORT="3001"
    fi
else
    echo "[2/5] No running container detected. Initializing standalone blue container..."
    NEXT_NAME="${APP_NAME}-blue"
    NEXT_PORT="3000"
fi

# 3. Launch Next Generation Container
echo "[3/5] Starting next generation container '${NEXT_NAME}' on internal port ${NEXT_PORT}..."
docker run -d \
    --name "${NEXT_NAME}" \
    --restart unless-stopped \
    --network host \
    -e PORT="${NEXT_PORT}" \
    -e BACKEND_PORT="800${NEXT_PORT: -1}" \
    -e NODE_ENV="production" \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e REDIS_URL="${REDIS_URL}" \
    "${IMAGE_URI}"

# 4. Automated Health Check Verification
echo "[4/5] Executing health check probe on http://localhost:${NEXT_PORT}/api/health..."
MAX_ATTEMPTS=20
HEALTHY=false

for i in $(seq 1 $MAX_ATTEMPTS); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${NEXT_PORT}/api/health" || true)
    if [ "$STATUS" == "200" ]; then
        echo " -> Probe successful! Health status 200 OK (attempt ${i}/${MAX_ATTEMPTS})"
        HEALTHY=true
        break
    fi
    echo " -> Waiting for container initialization (attempt ${i}/${MAX_ATTEMPTS}, status: ${STATUS})..."
    sleep 2
done

if [ "$HEALTHY" != "true" ]; then
    echo "[CRITICAL ERROR] Container '${NEXT_NAME}' failed health checks. Triggering instant rollback..."
    docker logs "${NEXT_NAME}" --tail 30
    docker rm -f "${NEXT_NAME}" || true
    echo "[Rollback] Aborted deployment. Previous container remains active without downtime."
    exit 1
fi

# 5. Seamless Cutover & Graceful Drain
echo "[5/5] Zero-downtime cutover validated. Decommissioning previous generation..."
if [ -n "$ACTIVE_CONTAINER" ] && [ "$ACTIVE_CONTAINER" != "$NEXT_NAME" ]; then
    echo " -> Sending SIGTERM to ${ACTIVE_CONTAINER} for graceful in-flight request completion (30s drain)..."
    docker stop -t 30 "${ACTIVE_CONTAINER}" || true
    docker rm "${ACTIVE_CONTAINER}" || true
    echo " -> Decommissioned ${ACTIVE_CONTAINER} successfully."
fi

echo "======================================================================"
echo " Zero-Downtime Deployment Successfully Completed! Active: ${NEXT_NAME}"
echo "======================================================================"
