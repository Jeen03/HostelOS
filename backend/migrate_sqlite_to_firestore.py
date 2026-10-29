"""
HostelOS Migration Utility: SQLite -> Google Cloud Firestore
Reads all records from hostelos.db and batch-uploads them into Firestore collections.
Run with:
    python migrate_sqlite_to_firestore.py
"""

import os
import sqlite3
import firebase_db

def migrate():
    db = firebase_db.get_firestore_client()
    if not db:
        print("\n[!] Cannot connect to Google Cloud Firestore.")
        print(f"Please ensure '{firebase_db.SERVICE_ACCOUNT_PATH}' exists and contains valid Firebase credentials.")
        print("See 'serviceAccountKey.json.template' for expected format.\n")
        return

    sqlite_path = os.path.join(os.path.dirname(__file__), "hostelos.db")
    if not os.path.exists(sqlite_path):
        print(f"[!] SQLite database not found at '{sqlite_path}'.")
        return

    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    tables = [
        ("rooms", "room_id"),
        ("users", "id"),
        ("leave_requests", "leave_id"),
        ("qr_tokens", "token_id"),
        ("movement_records", "record_id"),
        ("complaints", "complaint_id"),
        ("safety_assets", "asset_id"),
        ("kitchen_inventory", "item_id"),
        ("meal_consumption", "meal_id"),
        ("account_transactions", "txn_id"),
        ("payments", "payment_id"),
        ("bookings", "booking_id"),
        ("sos_incidents", "incident_id"),
        ("audit_logs", "log_id")
    ]

    project_id = getattr(firebase_db._firebase_app, "project_id", "Unknown") if firebase_db._firebase_app else "Unknown"
    print(f"\n[+] Starting migration from SQLite ({sqlite_path}) to Firestore ({project_id})...\n")

    for table_name, pk_col in tables:
        try:
            c.execute(f"SELECT * FROM {table_name}")
            rows = [dict(r) for r in c.fetchall()]
            if not rows:
                print(f" - Table '{table_name}': 0 records (skipped)")
                continue

            # Batch write to Firestore (max 500 per batch)
            batch = db.batch()
            count = 0
            for r in rows:
                doc_id = str(r[pk_col])
                doc_ref = db.collection(table_name).document(doc_id)
                batch.set(doc_ref, r)
                count += 1
                if count % 400 == 0:
                    batch.commit()
                    batch = db.batch()

            batch.commit()
            print(f" [OK] Migrated '{table_name}': {len(rows)} records uploaded to collection '{table_name}'.")
        except Exception as e:
            print(f" [!] Error migrating table '{table_name}': {e}")

    conn.close()
    print("\n[OK] Migration to Google Cloud Firestore completed successfully!\n")

if __name__ == "__main__":
    migrate()
