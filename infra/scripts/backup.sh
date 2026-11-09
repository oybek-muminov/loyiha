#!/usr/bin/env bash
#
# Kunlik PostgreSQL backup: pg_dump -> gzip -> Cloudflare R2.
# Cron: 0 3 * * * /opt/univeracademy/infra/scripts/backup.sh >> /var/log/backup.log 2>&1
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-/opt/univeracademy/infra/docker-compose.prod.yml}"
POSTGRES_USER="${POSTGRES_USER:?POSTGRES_USER is required}"
POSTGRES_DB="${POSTGRES_DB:?POSTGRES_DB is required}"
R2_BUCKET="${R2_BUCKET:?R2_BUCKET is required}"
R2_ACCOUNT_ID="${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
KEEP_DAYS="${KEEP_DAYS:-30}"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="/tmp/univer-${STAMP}.sql.gz"

echo "[$(date -Is)] backup started"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FILE"

aws s3 cp "$FILE" "s3://${R2_BUCKET}/backups/db/${STAMP}.sql.gz" \
  --endpoint-url "$R2_ENDPOINT"

rm -f "$FILE"

CUTOFF="$(date -d "${KEEP_DAYS} days ago" +%Y-%m-%d)"

aws s3 ls "s3://${R2_BUCKET}/backups/db/" --endpoint-url "$R2_ENDPOINT" \
  | awk -v cutoff="$CUTOFF" '$1 < cutoff { print $4 }' \
  | while read -r name; do
      [ -n "$name" ] || continue
      aws s3 rm "s3://${R2_BUCKET}/backups/db/${name}" --endpoint-url "$R2_ENDPOINT"
    done

echo "[$(date -Is)] backup finished"
