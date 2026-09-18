# FrontWing - PostgreSQL Database Backup & Disaster Recovery Runbook

This document details automated backup schedules, disaster recovery procedures, and cross-platform restore protocols for the FrontWing PostgreSQL telemetry and user database.

---

## 1. Backup Strategy Overview

FrontWing stores both static reference data (circuits, teams, 2026 driver rosters) and dynamic operational data (31,000+ authentic FastF1 laps, sector times, telemetry metadata, user investigations, multi-turn debriefs, and conversation threads).

| Component | Target Frequency | Retention Period | Format |
| :--- | :--- | :--- | :--- |
| **Telemetry & Race Data** | Daily (post-session) | 30 days | Compressed SQL Dump (`.sql.gz`) |
| **User Conversations & Threads** | Hourly / Continuous | 90 days | Point-in-time recovery (WAL) / Daily dump |
| **Pre-Deployment Snapshot** | Prior to any migration | Indefinite | Snapshot SQL Dump |

---

## 2. Docker / Local Container Backup Protocol

### Manual Backup Command
To execute an immediate, consistent backup of the running PostgreSQL container:

```bash
# Standard Plaintext Dump
docker exec frontwing-postgres pg_dump -U postgres -d frontwing > backup_frontwing_$(date +%Y%m%d_%H%M%S).sql

# Production Compressed Gzip Dump (Recommended)
docker exec frontwing-postgres pg_dump -U postgres -d frontwing | gzip > backup_frontwing_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Automated Backup Script (`scripts/backup_db.sh`)
```bash
#!/bin/bash
set -eo pipefail

BACKUP_DIR="/var/backups/frontwing"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/frontwing_db_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[Backup] Starting PostgreSQL backup for frontwing..."
docker exec frontwing-postgres pg_dump -U postgres -d frontwing | gzip -9 > "$FILENAME"

# Retain backups for 14 days, delete older files
find "$BACKUP_DIR" -type f -name "frontwing_db_*.sql.gz" -mtime +14 -delete

echo "[Backup] Backup complete: $FILENAME ($(du -h "$FILENAME" | cut -f1))"
```

### Cron Schedule (Linux / Production Host)
To run the backup daily at 03:00 UTC:
```cron
0 3 * * * /bin/bash /opt/frontwing/scripts/backup_db.sh >> /var/log/frontwing_backup.log 2>&1
```

---

## 3. Disaster Recovery & Restore Procedure

### Step 1: Prepare Database Target
Ensure PostgreSQL is active and create a clean database target:
```bash
# Drop existing connections and database (CAUTION: Destructive)
docker exec -i frontwing-postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'frontwing' AND pid <> pg_backend_pid();"
docker exec -i frontwing-postgres psql -U postgres -c "DROP DATABASE IF EXISTS frontwing;"
docker exec -i frontwing-postgres psql -U postgres -c "CREATE DATABASE frontwing;"
```

### Step 2: Restore from Backup
```bash
# From Plaintext SQL
docker exec -i frontwing-postgres psql -U postgres -d frontwing < backup_frontwing.sql

# From Gzipped Backup
gunzip -c backup_frontwing.sql.gz | docker exec -i frontwing-postgres psql -U postgres -d frontwing
```

### Step 3: Run Post-Restore Verification
```bash
# Verify row counts
docker exec frontwing-postgres psql -U postgres -d frontwing -c "
  SELECT 'sessions' AS table_name, count(*) FROM sessions
  UNION ALL
  SELECT 'laps', count(*) FROM laps
  UNION ALL
  SELECT 'investigations', count(*) FROM investigations
  UNION ALL
  SELECT 'conversations', count(*) FROM conversations;
"
```

---

## 4. Cloud Platform Backup Strategies

- **AWS RDS / Aurora**:
  - Enable **Automated Backups** with a 7 to 35-day retention window.
  - Enable **Point-in-Time Recovery (PITR)** to restore down to the second of a failed operation.
  - Prior to running database schema migrations, trigger a manual RDS snapshot (`aws rds create-db-snapshot`).

- **GCP Cloud SQL**:
  - Configure automated daily backups with binary logging enabled for point-in-time recovery.
  - Export regular SQL dumps to a versioned Cloud Storage bucket (`gs://frontwing-backups/`).

- **Fly.io / Render / Railway**:
  - If using managed PostgreSQL, enable built-in automated daily backups.
  - For volume-backed self-hosted containers, configure an S3-compatible sync daemon (e.g. `wal-g` or `litestream` / `pgbackrest`) streaming WAL segments to Wasabi, AWS S3, or Cloudflare R2.
