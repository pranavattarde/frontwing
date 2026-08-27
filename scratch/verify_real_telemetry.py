import sys
import os
import json
import argparse

sys.path.insert(0, os.path.abspath("ai_services"))

from app.core.db import execute_query
from app.ingestion.fastf1_collector import FastF1Collector

def verify_session(year: int, gp: str, session_type: str = "R"):
    print("=" * 70)
    print(f"VERIFYING REAL TELEMETRY INGESTION: {year} {gp} [{session_type}]")
    print("=" * 70)
    print(f"--- 1. Calling FastF1Collector().load_session({year}, '{gp}', '{session_type}') ---")
    
    collector = FastF1Collector()
    status_dict = collector.load_session(year, gp, session_type)
    
    print("\n--- 2. Returned status dict ---")
    print(json.dumps(status_dict, indent=2))
    
    session_id = status_dict.get("session_id")
    if not session_id or status_dict.get("status") == "error":
        print(f"\n[!] Session load failed or returned error: {status_dict.get('message')}")
        return False, status_dict

    print(f"\n--- 3. Querying telemetry_metadata for session_id: '{session_id}' ---")
    count_res = execute_query(
        "SELECT count(*) as row_count FROM telemetry_metadata WHERE session_id = %s",
        (session_id,),
        fetch=True
    )
    row_count = count_res[0]["row_count"] if count_res else 0
    print(f"telemetry_metadata row count for session '{session_id}': {row_count}")

    print("\n--- 4. Loading one storage_path JSON file ---")
    sample_res = execute_query(
        "SELECT storage_path, driver_id, lap_number FROM telemetry_metadata WHERE session_id = %s AND storage_path IS NOT NULL LIMIT 1",
        (session_id,),
        fetch=True
    )

    if not sample_res or not sample_res[0].get("storage_path"):
        print(f"[!] No storage_path found in telemetry_metadata for session '{session_id}'.")
        return False, status_dict

    row = sample_res[0]
    storage_path = row["storage_path"]
    print(f"Found storage_path for driver={row.get('driver_id')}, lap={row.get('lap_number')}: {storage_path}")

    if not os.path.exists(storage_path):
        print(f"[!] Storage file does NOT exist on disk: {storage_path}")
        return False, status_dict

    with open(storage_path, "r", encoding="utf-8") as f:
        telemetry_data = json.load(f)

    print(f"Telemetry data length (points count): {len(telemetry_data)}")
    print("First 3 telemetry points:")
    print(json.dumps(telemetry_data[:3], indent=2))

    has_distance = len(telemetry_data) > 0 and "distanceM" in telemetry_data[0]
    print(f"\nReal distanceM field present: {has_distance}")
    return True, status_dict

def main():
    parser = argparse.ArgumentParser(description="Verify real telemetry ingestion for F1 sessions.")
    parser.add_argument("--year", type=int, default=None, help="Year of the session")
    parser.add_argument("--gp", type=str, default=None, help="GP name of the session")
    parser.add_argument("--session", type=str, default="R", help="Session type (R, Q, FP1, etc.)")
    args = parser.parse_args()

    if args.year and args.gp:
        verify_session(args.year, args.gp, args.session)
    else:
        # Run the two target sessions requested
        print("\n>>> Running Verification for (2023, 'Monaco', 'R') and (2022, 'Silverstone', 'R') <<<\n")
        verify_session(2023, "Monaco", "R")
        print("\n\n")
        verify_session(2022, "Silverstone", "R")

if __name__ == "__main__":
    main()
