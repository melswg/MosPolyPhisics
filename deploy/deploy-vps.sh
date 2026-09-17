#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/hermes/MosPolyPhisics}"
SERVICE_NAME="${SERVICE_NAME:-mosphysics.service}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:9090/api/health}"

"${APP_DIR}/.venv/bin/pip" install --disable-pip-version-check -r "${APP_DIR}/requirements.txt"
systemctl restart "${SERVICE_NAME}"

for attempt in 1 2 3 4 5 6; do
    if curl --fail --silent --show-error "${HEALTH_URL}" >/dev/null; then
        echo "Deployment health check passed"
        exit 0
    fi
    sleep 2
done

systemctl status "${SERVICE_NAME}" --no-pager
exit 1
