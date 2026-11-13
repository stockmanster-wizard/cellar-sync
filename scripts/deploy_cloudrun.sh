#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="gen-lang-client-0902441755"
REGION="us-east1"
SERVICE="cellarsync-ai"
BUCKET="gs://run-sources-gen-lang-client-0902441755-us-east1/services/cellarsync-ai"

GCLOUD_BIN="gcloud"
if ! command -v gcloud >/dev/null 2>&1 && [ -x "$HOME/google-cloud-sdk/bin/gcloud" ]; then
  GCLOUD_BIN="$HOME/google-cloud-sdk/bin/gcloud"
fi

echo "==> Running type check, audit suite, and production build..."
npm run lint
npm test
npm run build

STAGE_DIR=$(mktemp -d)
trap 'rm -rf "$STAGE_DIR"' EXIT

if [ "$(uname -s)" = "Linux" ]; then
  cp -R dist src public server.ts server.js package.json firebase-applet-config.json node_modules "$STAGE_DIR/"
else
  # On macOS, preserve Linux x86_64 node_modules from the current Cloud Run source archive
  CURRENT_TAR=$("$GCLOUD_BIN" run services describe "$SERVICE" --region="$REGION" --project="$PROJECT_ID" --format="value(spec.template.metadata.annotations['run.googleapis.com/sources'])" | python3 -c "import sys, json; print(json.load(sys.stdin)['app-container'].split('#')[0])")
  "$GCLOUD_BIN" storage cp "$CURRENT_TAR" "$STAGE_DIR/base.tar.gz" --quiet
  tar -zxf "$STAGE_DIR/base.tar.gz" -C "$STAGE_DIR"
  rm -rf "$STAGE_DIR/base.tar.gz" "$STAGE_DIR/dist" "$STAGE_DIR/src" "$STAGE_DIR/.aistudio"
  cp -R dist src public server.ts server.js package.json firebase-applet-config.json "$STAGE_DIR/"
fi

TS=$(date +%s)
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
TAR_NAME="${TS}-${SHA}.tar.gz"
tar -czf "$STAGE_DIR/$TAR_NAME" -C "$STAGE_DIR" .

echo "==> Uploading release bundle ${TAR_NAME} to ${BUCKET}..."
"$GCLOUD_BIN" storage cp "$STAGE_DIR/$TAR_NAME" "${BUCKET}/${TAR_NAME}" --quiet

echo "==> Updating Cloud Run service ${SERVICE} (${REGION})..."
"$GCLOUD_BIN" run services describe "$SERVICE" --region="$REGION" --project="$PROJECT_ID" --format=export > "$STAGE_DIR/service.yaml"
python3 -c '
import sys, re
path, bucket, tar_name = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    text = f.read()
text = re.sub(
    r"gs://run-sources-gen-lang-client-0902441755-us-east1/services/cellarsync-ai/[^\"]+",
    f"{bucket}/{tar_name}",
    text
)
with open(path, "w") as f:
    f.write(text)
' "$STAGE_DIR/service.yaml" "$BUCKET" "$TAR_NAME"

"$GCLOUD_BIN" run services replace "$STAGE_DIR/service.yaml" --region="$REGION" --project="$PROJECT_ID" --quiet
echo "==> Live deployment complete: https://cellarsync-ai.ai.studio/"
