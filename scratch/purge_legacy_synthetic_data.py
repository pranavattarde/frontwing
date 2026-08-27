"""
scratch/purge_legacy_synthetic_data.py

Purges legacy synthetic telemetry files and database records created prior to
the deletion of _populate_synthetic_session() in Session 003.

Rules:
1. Programmatically detects synthetic telemetry by checking for the absence of
   the 'distanceM' field in the first point of the cached JSON file.
2. Deletes telemetry_metadata rows and corresponding cache JSON files on disk.
3. Deletes synthetic session/laps/stints/race_results records for purely synthetic
   sessions to prevent find_existing_session_id() from masking real FastF1 data.
4. PROTECTED: Never modifies or deletes 2024 British GP (2024_silverstone_gp_race / 2024_british_gp_race).
5. Supports --dry-run (default) and --execute flags.
"""

import sys
import os
import json
import argparse
from glob import glob

sys.path.insert(0, os.path.abspath("ai_services"))

from app.core.db import execute_query

PROTECTED_SESSIONS = {"2024_british_gp_race", "2024_silverstone_gp_race"}

def is_synthetic_file(file_path: str) -> bool:
    """Returns True if file does not exist, is invalid JSON, or lacks 'distanceM' in point 0."""
    if not os.path.exists(file_path):
        return True
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, list) or len(data) == 0:
                return True
            return "distanceM" not in data[0]
    except Exception:
        return True

def run_purge(dry_run: bool = True):
    print("=" * 70)
    print(f"LEGACY SYNTHETIC DATA PURGE {'[DRY-RUN MODE - NO CHANGES]' if dry_run else '[EXECUTE MODE]'}")
    print("=" * 70)

    # 1. Query all telemetry_metadata records from PostgreSQL
    meta_rows = execute_query(
        "SELECT id, session_id, driver_id, lap_number, storage_path FROM telemetry_metadata",
        fetch=True
    ) or []
    
    print(f"Total telemetry_metadata rows in PostgreSQL: {len(meta_rows)}")

    # 2. Classify telemetry_metadata rows by session
    session_telemetry_stats = {}
    for r in meta_rows:
        sid = r["session_id"]
        if sid not in session_telemetry_stats:
            session_telemetry_stats[sid] = {
                "total_rows": 0,
                "synthetic_rows": [],
                "real_rows": [],
                "missing_file_rows": []
            }
        
        session_telemetry_stats[sid]["total_rows"] += 1
        spath = r["storage_path"]

        if sid in PROTECTED_SESSIONS:
            session_telemetry_stats[sid]["real_rows"].append(r["id"])
            continue

        if not spath or not os.path.exists(spath):
            session_telemetry_stats[sid]["missing_file_rows"].append(r["id"])
            session_telemetry_stats[sid]["synthetic_rows"].append(r["id"])
        elif is_synthetic_file(spath):
            session_telemetry_stats[sid]["synthetic_rows"].append(r["id"])
        else:
            session_telemetry_stats[sid]["real_rows"].append(r["id"])

    # 3. Classify sessions
    pure_synthetic_sessions = []
    mixed_sessions = []
    real_sessions = []

    for sid, stats in session_telemetry_stats.items():
        if sid in PROTECTED_SESSIONS:
            real_sessions.append(sid)
        elif len(stats["real_rows"]) == 0 and len(stats["synthetic_rows"]) > 0:
            pure_synthetic_sessions.append(sid)
        elif len(stats["synthetic_rows"]) > 0 and len(stats["real_rows"]) > 0:
            mixed_sessions.append(sid)
        else:
            real_sessions.append(sid)

    # Also check sessions table for any pure 2026/synthetic sessions that might not have telemetry_metadata
    all_db_sessions = execute_query("SELECT id FROM sessions", fetch=True) or []
    for s in all_db_sessions:
        sid = s["id"]
        if sid not in session_telemetry_stats and sid.startswith("2026_"):
            pure_synthetic_sessions.append(sid)

    pure_synthetic_sessions = sorted(list(set(pure_synthetic_sessions)))

    print("\n--- Telemetry Metadata Breakdown by Session ---")
    for sid, stats in sorted(session_telemetry_stats.items()):
        status_label = "PROTECTED (REAL)" if sid in PROTECTED_SESSIONS else (
            "PURE SYNTHETIC (TO PURGE)" if sid in pure_synthetic_sessions else (
                "MIXED (PURGE FAKE ROWS ONLY)" if sid in mixed_sessions else "REAL"
            )
        )
        print(f"  [{status_label}] {sid}:")
        print(f"     Total rows: {stats['total_rows']} | Synthetic/Missing: {len(stats['synthetic_rows'])} | Real: {len(stats['real_rows'])}")

    # 4. Scan disk cache files for synthetic files
    cache_dir = os.path.join("ai_services", "cache", "telemetry")
    files_on_disk = glob(os.path.join(cache_dir, "*.json"))
    files_to_delete = []

    for fpath in files_on_disk:
        fname = os.path.basename(fpath)
        # Protect 2024 British GP files
        if any(p in fname for p in PROTECTED_SESSIONS):
            continue
        if is_synthetic_file(fpath):
            files_to_delete.append(fpath)
        else:
            # If the file belongs to a pure synthetic session that is being purged entirely
            for psid in pure_synthetic_sessions:
                if fname.startswith(psid):
                    files_to_delete.append(fpath)
                    break

    files_to_delete = sorted(list(set(files_to_delete)))

    print(f"\n--- Disk Cache Scan ({cache_dir}) ---")
    print(f"  Total JSON files on disk: {len(files_on_disk)}")
    print(f"  Synthetic / legacy files marked for deletion: {len(files_to_delete)}")
    print(f"  Verified real files preserved: {len(files_on_disk) - len(files_to_delete)}")

    # 5. Determine Database Records to Purge
    total_telemetry_rows_to_delete = 0
    total_laps_to_delete = 0
    total_stints_to_delete = 0
    total_results_to_delete = 0
    total_weather_to_delete = 0
    sessions_to_delete = []

    for sid in pure_synthetic_sessions:
        sessions_to_delete.append(sid)
        cnt_tel = len(session_telemetry_stats.get(sid, {}).get("synthetic_rows", []))
        total_telemetry_rows_to_delete += cnt_tel

        l_cnt = (execute_query("SELECT count(*) as cnt FROM laps WHERE session_id = %s", (sid,), fetch=True) or [{'cnt': 0}])[0]['cnt']
        st_cnt = (execute_query("SELECT count(*) as cnt FROM stints WHERE session_id = %s", (sid,), fetch=True) or [{'cnt': 0}])[0]['cnt']
        r_cnt = (execute_query("SELECT count(*) as cnt FROM race_results WHERE session_id = %s", (sid,), fetch=True) or [{'cnt': 0}])[0]['cnt']
        w_cnt = (execute_query("SELECT count(*) as cnt FROM weather WHERE session_id = %s", (sid,), fetch=True) or [{'cnt': 0}])[0]['cnt']

        total_laps_to_delete += l_cnt
        total_stints_to_delete += st_cnt
        total_results_to_delete += r_cnt
        total_weather_to_delete += w_cnt

    # Mixed sessions: delete individual telemetry_metadata rows
    individual_row_ids_to_delete = []
    for sid in mixed_sessions:
        bad_ids = session_telemetry_stats[sid]["synthetic_rows"]
        individual_row_ids_to_delete.extend(bad_ids)
        total_telemetry_rows_to_delete += len(bad_ids)

    print("\n--- Summary of Actions ---")
    print(f"  Sessions to completely purge from DB (sessions + cascaded laps/stints/results): {len(sessions_to_delete)}")
    for sid in sessions_to_delete:
        print(f"    - {sid}")
    print(f"  Mixed sessions with only bad telemetry_metadata rows purged: {len(mixed_sessions)}")
    for sid in mixed_sessions:
        print(f"    - {sid} ({len(session_telemetry_stats[sid]['synthetic_rows'])} synthetic rows to delete)")
    print(f"  Total telemetry_metadata rows to delete: {total_telemetry_rows_to_delete}")
    print(f"  Total laps rows to cascade delete: {total_laps_to_delete}")
    print(f"  Total stints rows to cascade delete: {total_stints_to_delete}")
    print(f"  Total race_results rows to cascade delete: {total_results_to_delete}")
    print(f"  Total weather rows to cascade delete: {total_weather_to_delete}")
    print(f"  Total files to delete on disk: {len(files_to_delete)}")
    print(f"  Protected sessions untouched: {sorted(list(PROTECTED_SESSIONS))}")

    # 6. Execute if not dry_run
    if not dry_run:
        print("\n>>> EXECUTING PURGE...")

        # 6a. Delete files on disk
        deleted_files_count = 0
        for fpath in files_to_delete:
            try:
                os.remove(fpath)
                deleted_files_count += 1
            except Exception as e:
                print(f"    [!] Error deleting file {fpath}: {e}")
        print(f"  [OK] Successfully deleted {deleted_files_count} disk cache files.")

        # 6b. Delete pure synthetic sessions (cascades all related rows)
        for sid in sessions_to_delete:
            execute_query("DELETE FROM sessions WHERE id = %s", (sid,))
            print(f"  [OK] Deleted session from DB: {sid}")

        # 6c. Delete individual bad telemetry_metadata rows for mixed sessions
        if individual_row_ids_to_delete:
            execute_query(
                "DELETE FROM telemetry_metadata WHERE id = ANY(%s)",
                (individual_row_ids_to_delete,)
            )
            print(f"  [OK] Deleted {len(individual_row_ids_to_delete)} specific telemetry_metadata rows in mixed sessions.")

        print("\n[SUCCESS] Purge execution completed.")
    else:
        print("\n[DRY-RUN COMPLETE] No files or database rows were deleted.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Purge legacy synthetic F1 data")
    parser.add_argument("--execute", action="store_true", help="Perform actual deletion (default is dry-run)")
    args = parser.parse_args()

    run_purge(dry_run=not args.execute)
