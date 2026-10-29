"""
HostelOS Firebase Firestore Database Layer
Connects to Google Cloud Firestore via firebase-admin SDK.
Provides full CRUD, querying, joins, and automated seeding for all 14 collections.
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH") or os.path.join(BASE_DIR, "serviceAccountKey.json")
RENDER_SECRET_PATH = "/etc/secrets/serviceAccountKey.json"

_firebase_app = None
_firestore_client = None

def get_firestore_client():
    """Initializes and returns the Firestore client if valid credentials exist."""
    global _firebase_app, _firestore_client

    if _firestore_client is not None:
        return _firestore_client

    # 1. Check for raw JSON string in environment variable (Render / Cloud best practice)
    env_json = os.environ.get("FIREBASE_CREDENTIALS_JSON") or os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if env_json:
        try:
            data = json.loads(env_json)
            if data.get("project_id") and data.get("project_id") != "your-firebase-project-id":
                if not firebase_admin._apps:
                    cred = credentials.Certificate(data)
                    _firebase_app = firebase_admin.initialize_app(cred)
                else:
                    _firebase_app = firebase_admin.get_app()
                _firestore_client = firestore.client()
                print(f"[Firebase] Connected to Cloud Firestore from ENV variable (Project: {_firebase_app.project_id})")
                return _firestore_client
        except Exception as e:
            print(f"[Firebase] Error initializing from FIREBASE_CREDENTIALS_JSON: {e}")

    # 2. Check for secret files on disk (Render Secret Files or local file)
    resolved_path = None
    if os.path.exists(SERVICE_ACCOUNT_PATH):
        resolved_path = SERVICE_ACCOUNT_PATH
    elif os.path.exists(RENDER_SECRET_PATH):
        resolved_path = RENDER_SECRET_PATH

    if not resolved_path:
        return None

    try:
        # Check if service account file is not just empty or the placeholder template
        with open(resolved_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if data.get("project_id") == "your-firebase-project-id":
                print(f"[Firebase] Notice: '{resolved_path}' contains placeholder values. Please replace with your actual Firebase project credentials.")
                return None

        if not firebase_admin._apps:
            cred = credentials.Certificate(resolved_path)
            _firebase_app = firebase_admin.initialize_app(cred)
        else:
            _firebase_app = firebase_admin.get_app()

        _firestore_client = firestore.client()
        print(f"[Firebase] Successfully connected to Cloud Firestore (Project: {_firebase_app.project_id})")
        return _firestore_client
    except Exception as e:
        print(f"[Firebase] Initialization error with '{resolved_path}': {e}")
        return None

def is_firestore_ready() -> bool:
    """Returns True if Firestore is connected and ready."""
    return get_firestore_client() is not None

def get_status() -> Dict[str, Any]:
    client = get_firestore_client()
    return {
        "provider": "firestore" if client is not None else "sqlite_fallback",
        "connected": client is not None,
        "credentials_path": SERVICE_ACCOUNT_PATH,
        "credentials_exist": os.path.exists(SERVICE_ACCOUNT_PATH),
        "project_id": getattr(_firebase_app, "project_id", None) if _firebase_app else None
    }


# ==========================================================
# FIRESTORE SEEDING (Auto-seeds clean generic hostel data)
# ==========================================================

def seed_firestore_if_empty():
    db = get_firestore_client()
    if not db:
        return

    users_ref = db.collection("users")
    # Check if users collection already has documents
    docs = list(users_ref.limit(1).stream())
    if docs:
        return

    print("[Firebase] Seeding initial clean dataset to Cloud Firestore...")
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    batch = db.batch()

    # 1. Rooms
    rooms_data = [
        {"room_id": "A-101", "block": "Block A", "floor": 1, "capacity": 2, "room_type": "Double Sharing", "quiet_zone": 1, "fee_per_sem": 25000, "status": "OCCUPIED"},
        {"room_id": "A-102", "block": "Block A", "floor": 1, "capacity": 2, "room_type": "Double Sharing", "quiet_zone": 1, "fee_per_sem": 25000, "status": "OCCUPIED"},
        {"room_id": "A-103", "block": "Block A", "floor": 1, "capacity": 3, "room_type": "Triple Sharing", "quiet_zone": 0, "fee_per_sem": 22000, "status": "AVAILABLE"},
        {"room_id": "A-201", "block": "Block A", "floor": 2, "capacity": 2, "room_type": "Double Sharing", "quiet_zone": 1, "fee_per_sem": 25000, "status": "OCCUPIED"},
        {"room_id": "A-202", "block": "Block A", "floor": 2, "capacity": 2, "room_type": "Double Sharing", "quiet_zone": 0, "fee_per_sem": 25000, "status": "AVAILABLE"},
        {"room_id": "A-203", "block": "Block A", "floor": 2, "capacity": 4, "room_type": "Quad Sharing", "quiet_zone": 0, "fee_per_sem": 18000, "status": "AVAILABLE"},
        {"room_id": "B-101", "block": "Block B", "floor": 1, "capacity": 2, "room_type": "Double Sharing", "quiet_zone": 0, "fee_per_sem": 25000, "status": "OCCUPIED"},
        {"room_id": "B-102", "block": "Block B", "floor": 1, "capacity": 2, "room_type": "Double Sharing", "quiet_zone": 0, "fee_per_sem": 25000, "status": "AVAILABLE"},
        {"room_id": "B-201", "block": "Block B", "floor": 2, "capacity": 2, "room_type": "Double Sharing", "quiet_zone": 1, "fee_per_sem": 25000, "status": "OCCUPIED"},
        {"room_id": "B-202", "block": "Block B", "floor": 2, "capacity": 3, "room_type": "Triple Sharing", "quiet_zone": 0, "fee_per_sem": 22000, "status": "AVAILABLE"},
        {"room_id": "C-101", "block": "Block C", "floor": 1, "capacity": 1, "room_type": "Single Deluxe", "quiet_zone": 1, "fee_per_sem": 32000, "status": "AVAILABLE"},
    ]
    for r in rooms_data:
        ref = db.collection("rooms").document(r["room_id"])
        batch.set(ref, r)

    # 2. Users (7 Roles)
    users_data = [
        {"id": "u_student1", "username": "student", "password": "password123", "name": "Resident Student A", "role": "student", "register_no": "STU-2026-001", "email": "student@hostel.edu", "phone": "+91 98000 00001", "parent_phone": "+91 98000 00011", "room_id": "A-101", "department": "Computer Engineering", "year": 3, "gender": "Male", "presence_status": "IN", "prefers_quiet_zone": 1, "medical_ground_floor_pref": 0},
        {"id": "u_student2", "username": "student2", "password": "password123", "name": "Resident Student B", "role": "student", "register_no": "STU-2026-002", "email": "student2@hostel.edu", "phone": "+91 98000 00002", "parent_phone": "+91 98000 00012", "room_id": "A-101", "department": "Computer Engineering", "year": 3, "gender": "Male", "presence_status": "OUT", "prefers_quiet_zone": 0, "medical_ground_floor_pref": 1},
        {"id": "u_student3", "username": "student3", "password": "password123", "name": "Resident Student C", "role": "student", "register_no": "STU-2026-003", "email": "student3@hostel.edu", "phone": "+91 98000 00003", "parent_phone": "+91 98000 00013", "room_id": "A-102", "department": "Electronics", "year": 2, "gender": "Female", "presence_status": "ON LEAVE", "prefers_quiet_zone": 1, "medical_ground_floor_pref": 0},
        {"id": "u_warden", "username": "warden", "password": "password123", "name": "Hostel Warden", "role": "warden", "register_no": "EMP-WRD-01", "email": "warden@hostel.edu", "phone": "+91 98000 00020", "parent_phone": "", "room_id": "", "department": "Administration", "year": 0, "gender": "Staff", "presence_status": "NA", "prefers_quiet_zone": 0, "medical_ground_floor_pref": 0},
        {"id": "u_security", "username": "security", "password": "password123", "name": "Gate Security Officer", "role": "security", "register_no": "EMP-SEC-01", "email": "security@hostel.edu", "phone": "+91 98000 00030", "parent_phone": "", "room_id": "", "department": "Campus Security", "year": 0, "gender": "Staff", "presence_status": "NA", "prefers_quiet_zone": 0, "medical_ground_floor_pref": 0},
        {"id": "u_admin", "username": "admin", "password": "password123", "name": "Hostel Administrator", "role": "administrator", "register_no": "EMP-ADM-01", "email": "admin@hostel.edu", "phone": "+91 98000 00040", "parent_phone": "", "room_id": "", "department": "Operations", "year": 0, "gender": "Staff", "presence_status": "NA", "prefers_quiet_zone": 0, "medical_ground_floor_pref": 0},
        {"id": "u_mess", "username": "mess", "password": "password123", "name": "Mess Supervisor", "role": "mess", "register_no": "EMP-MSS-01", "email": "mess@hostel.edu", "phone": "+91 98000 00050", "parent_phone": "", "room_id": "", "department": "Catering", "year": 0, "gender": "Staff", "presence_status": "NA", "prefers_quiet_zone": 0, "medical_ground_floor_pref": 0},
        {"id": "u_maint", "username": "maintenance", "password": "password123", "name": "Facility Technician", "role": "maintenance", "register_no": "EMP-MNT-01", "email": "maintenance@hostel.edu", "phone": "+91 98000 00060", "parent_phone": "", "room_id": "", "department": "Facility Engineering", "year": 0, "gender": "Staff", "presence_status": "NA", "prefers_quiet_zone": 0, "medical_ground_floor_pref": 0},
        {"id": "u_parent", "username": "parent", "password": "password123", "name": "Student Guardian", "role": "parent", "register_no": "PAR-2026-001", "email": "guardian@family.org", "phone": "+91 98000 00011", "parent_phone": "", "room_id": "A-101", "department": "Guardian", "year": 0, "gender": "Guardian", "presence_status": "NA", "prefers_quiet_zone": 0, "medical_ground_floor_pref": 0},
    ]
    for u in users_data:
        ref = db.collection("users").document(u["id"])
        batch.set(ref, u)

    # 3. Leave Requests & QR Tokens
    leave_id = "LEV-2026-101"
    token_id = "TKN-PASS-8821"
    leave_data = {
        "leave_id": leave_id,
        "student_id": "u_student2",
        "type": "Holiday Outing",
        "from_time": f"{today_str} 17:00",
        "to_time": f"{today_str} 21:30",
        "destination": "Town Center",
        "reason": "Weekend family visit",
        "approval_status": "APPROVED",
        "warden_id": "u_warden",
        "warden_comment": "Approved. Curfew cutoff applies.",
        "created_at": f"{today_str} 09:30"
    }
    batch.set(db.collection("leave_requests").document(leave_id), leave_data)

    token_data = {
        "token_id": token_id,
        "leave_id": leave_id,
        "student_id": "u_student2",
        "purpose": "Holiday Outing - Town Center",
        "valid_from": f"{today_str} 16:30",
        "expiry": f"{today_str} 22:00",
        "status": "UNUSED",
        "created_at": f"{today_str} 09:35",
        "used_at": None
    }
    batch.set(db.collection("qr_tokens").document(token_id), token_data)

    # Pending Leave
    batch.set(db.collection("leave_requests").document("LEV-2026-102"), {
        "leave_id": "LEV-2026-102",
        "student_id": "u_student1",
        "type": "Late Return",
        "from_time": f"{today_str} 19:30",
        "to_time": f"{today_str} 22:00",
        "destination": "Campus Central Library",
        "reason": "Study group project review",
        "approval_status": "PENDING",
        "warden_id": None,
        "warden_comment": None,
        "created_at": f"{today_str} 14:00"
    })

    # 4. Movement Records
    batch.set(db.collection("movement_records").document("MOV-1001"), {
        "record_id": "MOV-1001",
        "student_id": "u_student2",
        "direction": "EXIT",
        "timestamp": f"{today_str} 17:10",
        "token_id": token_id,
        "gate_name": "Main Gate",
        "verified_by": "u_security",
        "is_exceptional": 1,
        "is_late_flag": 0,
        "verification_status": "ACCEPTED",
        "notes": "Approved exceptional pass verified via scanner."
    })

    # 5. Complaints
    batch.set(db.collection("complaints").document("CMP-201"), {
        "complaint_id": "CMP-201",
        "student_id": "u_student1",
        "room_id": "A-101",
        "title": "Room Ceiling Fan Running Slow",
        "description": "The ceiling fan in A-101 is wobbling and runs at low speed regardless of regulator setting.",
        "category": "Electrical",
        "priority": "Medium",
        "routed_to": "Maintenance - Electrician Wing",
        "status": "IN_PROGRESS",
        "confidence": 0.91,
        "precheck_completed": 1,
        "created_at": f"{today_str} 10:00",
        "assigned_to": "u_maint",
        "resolution_notes": "Technician assigned for capacitor inspection",
        "resolved_at": None
    })

    batch.set(db.collection("complaints").document("CMP-202"), {
        "complaint_id": "CMP-202",
        "student_id": "u_student3",
        "room_id": "A-102",
        "title": "Washbasin Drain Pipe Leak",
        "description": "Drain pipe under washbasin is leaking clean water onto floor.",
        "category": "Plumbing",
        "priority": "High",
        "routed_to": "Maintenance - Plumbing Wing",
        "status": "OPEN",
        "confidence": 0.94,
        "precheck_completed": 1,
        "created_at": f"{today_str} 13:20",
        "assigned_to": None,
        "resolution_notes": None,
        "resolved_at": None
    })

    # 6. Safety Assets
    safety_assets_data = [
        {"asset_id": "AST-FE-A1", "type": "Fire Extinguisher", "block": "Block A", "floor": 1, "location": "Corridor Staircase A", "last_check": "2026-08-01", "next_check_due": "2026-11-01", "status": "OPERATIONAL"},
        {"asset_id": "AST-FE-A2", "type": "Fire Extinguisher", "block": "Block A", "floor": 2, "location": "Central Corridor", "last_check": "2026-06-01", "next_check_due": "2026-09-01", "status": "DUE_FOR_INSPECTION"},
        {"asset_id": "AST-FA-A1", "type": "Fire Alarm Smoke Detector", "block": "Block A", "floor": 1, "location": "Lobby Entrance Ceiling", "last_check": "2026-09-01", "next_check_due": "2026-12-01", "status": "OPERATIONAL"},
        {"asset_id": "AST-FAID-A1", "type": "First-Aid Station", "block": "Block A", "floor": 1, "location": "Warden Office Entrance", "last_check": "2026-10-01", "next_check_due": "2026-11-01", "status": "OPERATIONAL"},
        {"asset_id": "AST-FE-B1", "type": "Fire Extinguisher", "block": "Block B", "floor": 1, "location": "Mess Hall Entrance", "last_check": "2026-05-15", "next_check_due": "2026-08-15", "status": "DUE_FOR_INSPECTION"},
        {"asset_id": "AST-FAID-B1", "type": "First-Aid Station", "block": "Block B", "floor": 1, "location": "Fitness Center Vestibule", "last_check": "2026-10-01", "next_check_due": "2026-11-01", "status": "OPERATIONAL"},
    ]
    for s in safety_assets_data:
        batch.set(db.collection("safety_assets").document(s["asset_id"]), s)

    # 7. Kitchen Inventory
    inventory_data = [
        {"item_id": "INV-01", "name": "Grain Rice", "category": "Provisions", "current_stock": 180.0, "unit": "kg", "daily_burn_rate": 35.0, "reorder_level": 100.0, "lead_time_days": 3, "cost_per_unit": 40.0},
        {"item_id": "INV-02", "name": "Lentils / Dal", "category": "Provisions", "current_stock": 32.0, "unit": "kg", "daily_burn_rate": 12.0, "reorder_level": 40.0, "lead_time_days": 2, "cost_per_unit": 95.0},
        {"item_id": "INV-03", "name": "Cooking Oil", "category": "Provisions", "current_stock": 45.0, "unit": "L", "daily_burn_rate": 8.0, "reorder_level": 30.0, "lead_time_days": 2, "cost_per_unit": 120.0},
        {"item_id": "INV-04", "name": "Wheat Flour", "category": "Provisions", "current_stock": 90.0, "unit": "kg", "daily_burn_rate": 20.0, "reorder_level": 50.0, "lead_time_days": 2, "cost_per_unit": 42.0},
        {"item_id": "INV-05", "name": "Fresh Milk", "category": "Dairy", "current_stock": 16.0, "unit": "L", "daily_burn_rate": 28.0, "reorder_level": 25.0, "lead_time_days": 1, "cost_per_unit": 50.0},
        {"item_id": "INV-06", "name": "Vegetables Mix", "category": "Vegetables", "current_stock": 65.0, "unit": "kg", "daily_burn_rate": 22.0, "reorder_level": 40.0, "lead_time_days": 1, "cost_per_unit": 30.0},
    ]
    for inv in inventory_data:
        batch.set(db.collection("kitchen_inventory").document(inv["item_id"]), inv)

    # 8. Meal Consumption
    for i in range(7, 0, -1):
        dt = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        batch.set(db.collection("meal_consumption").document(f"ML-{i}-BF"), {"meal_id": f"ML-{i}-BF", "date": dt, "meal_type": "Breakfast", "booked_count": 210, "prepared_count": 220, "consumed_count": 208, "wasted_count": 12, "waste_rate": round(12/220, 3)})
        batch.set(db.collection("meal_consumption").document(f"ML-{i}-LN"), {"meal_id": f"ML-{i}-LN", "date": dt, "meal_type": "Lunch", "booked_count": 180, "prepared_count": 190, "consumed_count": 178, "wasted_count": 12, "waste_rate": round(12/190, 3)})
        batch.set(db.collection("meal_consumption").document(f"ML-{i}-DN"), {"meal_id": f"ML-{i}-DN", "date": dt, "meal_type": "Dinner", "booked_count": 220, "prepared_count": 230, "consumed_count": 222, "wasted_count": 8, "waste_rate": round(8/230, 3)})

    # 9. Account Transactions
    txns = [
        {"txn_id": "TXN-101", "category": "Semester Hostel Fee Deposit", "direction": "INCOME", "amount": 750000.0, "date": today_str, "description": "Student semester fee collections", "reference_id": None},
        {"txn_id": "TXN-102", "category": "Amenity & Fitness Subscriptions", "direction": "INCOME", "amount": 45000.0, "date": today_str, "description": "Monthly gym and Wi-Fi subscriptions", "reference_id": None},
        {"txn_id": "TXN-103", "category": "Mess Catering Supplies", "direction": "EXPENSE", "amount": 280000.0, "date": today_str, "description": "Grain and grocery provisioning", "reference_id": None},
        {"txn_id": "TXN-104", "category": "Electricity & Water Utilities", "direction": "EXPENSE", "amount": 95000.0, "date": today_str, "description": "Hostel power and utility bill", "reference_id": None},
        {"txn_id": "TXN-105", "category": "Facility Repairs & Maintenance", "direction": "EXPENSE", "amount": 32000.0, "date": today_str, "description": "Plumbing fixtures and electrical spares", "reference_id": None},
    ]
    for t in txns:
        batch.set(db.collection("account_transactions").document(t["txn_id"]), t)

    # 10. Payments
    payments_data = [
        {"payment_id": "PAY-01", "student_id": "u_student1", "type": "Semester Hostel Rent", "amount": 25000.0, "due_date": "2026-11-15", "status": "PAID", "paid_date": today_str},
        {"payment_id": "PAY-02", "student_id": "u_student2", "type": "Semester Hostel Rent", "amount": 25000.0, "due_date": "2026-11-15", "status": "PAID", "paid_date": today_str},
        {"payment_id": "PAY-03", "student_id": "u_student3", "type": "Semester Hostel Rent", "amount": 25000.0, "due_date": "2026-10-15", "status": "OVERDUE", "paid_date": None},
        {"payment_id": "PAY-04", "student_id": "u_student1", "type": "Fitness Center Monthly Pass", "amount": 500.0, "due_date": "2026-11-01", "status": "PAID", "paid_date": today_str},
    ]
    for p in payments_data:
        batch.set(db.collection("payments").document(p["payment_id"]), p)

    # 11. Bookings
    batch.set(db.collection("bookings").document("BK-01"), {
        "booking_id": "BK-01", "student_id": "u_student1", "resource": "Gymnasium", "date": today_str, "slot": "06:00 - 07:00 AM", "status": "CONFIRMED"
    })

    # 12. SOS Incident
    batch.set(db.collection("sos_incidents").document("SOS-2026-001"), {
        "incident_id": "SOS-2026-001",
        "student_id": "u_student3",
        "location": "Block A - 1st Floor Corridor",
        "description": "Minor slip on wet floor. First aid assistance requested.",
        "status": "Acknowledged",
        "timestamp": f"{today_str} 14:15",
        "acknowledged_by": "u_warden",
        "acknowledged_at": f"{today_str} 14:18",
        "resolved_at": None,
        "resolution_notes": "Warden dispatched first aid kit AST-FAID-A1."
    })

    # 13. Audit Log
    batch.set(db.collection("audit_logs").document("AUD-001"), {
        "log_id": "AUD-001",
        "actor_id": "admin",
        "actor_role": "administrator",
        "action": "FIREBASE_INIT",
        "resource": "Cloud Firestore",
        "timestamp": f"{today_str} 08:00",
        "details": "HostelOS database initialized in Google Cloud Firestore."
    })

    batch.commit()
    print("[Firebase] Initial clean data successfully seeded to Cloud Firestore.")


# ==========================================================
# FIRESTORE DATA ACCESS METHODS
# ==========================================================

def get_user_by_query(query_val: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return None
    val_lower = query_val.strip().lower()

    # In Firestore, we scan or query. Since users count in hostel is hundreds to thousands,
    # stream documents and match case-insensitively on username, email, id, or register_no.
    users = db.collection("users").stream()
    fallback_user = None

    for doc in users:
        u = doc.to_dict()
        u["id"] = doc.id
        u_name = str(u.get("username", "")).lower()
        u_email = str(u.get("email", "")).lower()
        u_id = str(u.get("id", "")).lower()
        u_reg = str(u.get("register_no", "")).lower()
        u_role = str(u.get("role", "")).lower()

        if val_lower in [u_name, u_email, u_id, u_reg]:
            return u
        if val_lower == u_role and not fallback_user:
            fallback_user = u

    return fallback_user

def get_all_users() -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    docs = db.collection("users").stream()
    users = [dict(doc.to_dict(), id=doc.id) for doc in docs]
    users.sort(key=lambda x: (x.get("role", ""), x.get("name", "")))
    return users

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return None
    doc = db.collection("users").document(user_id).get()
    if not doc.exists:
        return None
    u = doc.to_dict()
    u["id"] = doc.id

    if u.get("room_id"):
        r_doc = db.collection("rooms").document(u["room_id"]).get()
        if r_doc.exists:
            u["room_details"] = r_doc.to_dict()
    return u

def get_dashboard_stats() -> Dict[str, Any]:
    db = get_firestore_client()
    if not db:
        return {}

    users = [d.to_dict() for d in db.collection("users").stream()]
    students = [u for u in users if u.get("role") == "student"]
    in_campus = sum(1 for s in students if s.get("presence_status") == "IN")
    out_campus = sum(1 for s in students if s.get("presence_status") == "OUT")
    on_leave = sum(1 for s in students if s.get("presence_status") == "ON LEAVE")

    rooms = [d.to_dict() for d in db.collection("rooms").stream()]
    total_capacity = sum(r.get("capacity", 0) for r in rooms)

    complaints = [d.to_dict() for d in db.collection("complaints").stream()]
    active_complaints = sum(1 for c in complaints if c.get("status") != "RESOLVED")

    emergencies = [d.to_dict() for d in db.collection("sos_incidents").stream()]
    active_emergencies = sum(1 for e in emergencies if e.get("status") != "Resolved")

    leaves = [d.to_dict() for d in db.collection("leave_requests").stream()]
    pending_leaves = sum(1 for l in leaves if l.get("approval_status") == "PENDING")

    txns = [d.to_dict() for d in db.collection("account_transactions").stream()]
    total_income = sum(t.get("amount", 0.0) for t in txns if t.get("direction") == "INCOME")
    total_expense = sum(t.get("amount", 0.0) for t in txns if t.get("direction") == "EXPENSE")

    total_stu = len(students)
    return {
        "total_students": total_stu,
        "presence": {
            "in_campus": in_campus,
            "out_campus": out_campus,
            "on_leave": on_leave
        },
        "rooms": {
            "total_rooms": len(rooms),
            "total_bed_capacity": total_capacity,
            "occupancy_rate": round((total_stu / total_capacity * 100) if total_capacity else 0, 1)
        },
        "operational": {
            "active_complaints": active_complaints,
            "active_emergencies": active_emergencies,
            "pending_leaves": pending_leaves
        },
        "finance": {
            "total_income": total_income,
            "total_expense": total_expense,
            "net_balance": total_income - total_expense
        }
    }

def get_rooms() -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    rooms = [dict(d.to_dict(), room_id=d.id) for d in db.collection("rooms").stream()]
    users = [dict(d.to_dict(), id=d.id) for d in db.collection("users").stream()]

    occupants_map = {}
    for u in users:
        rid = u.get("room_id")
        if rid:
            occupants_map.setdefault(rid, []).append({
                "id": u["id"],
                "name": u.get("name"),
                "register_no": u.get("register_no"),
                "department": u.get("department"),
                "year": u.get("year")
            })

    for r in rooms:
        rid = r.get("room_id")
        occ = occupants_map.get(rid, [])
        r["occupants"] = occ
        r["vacant_beds"] = r.get("capacity", 2) - len(occ)

    rooms.sort(key=lambda x: (x.get("block", ""), x.get("floor", 0), x.get("room_id", "")))
    return rooms

def assign_student_to_room(student_id: str, room_id: str) -> Dict[str, Any]:
    db = get_firestore_client()
    if not db:
        return {"status": "ERROR", "message": "Database disconnected"}

    room_doc = db.collection("rooms").document(room_id).get()
    if not room_doc.exists:
        return {"status": "NOT_FOUND", "message": "Room not found"}

    capacity = room_doc.to_dict().get("capacity", 2)
    # Check current occupants
    occupants = list(db.collection("users").where(filter=FieldFilter("room_id", "==", room_id)).stream())
    if len(occupants) >= capacity:
        return {"status": "FULL", "message": "Room is already at full capacity"}

    db.collection("users").document(student_id).update({"room_id": room_id})
    create_audit_log("admin", "administrator", "ROOM_ASSIGNMENT", f"Room {room_id}", f"Assigned student {student_id} to room {room_id}")
    return {"status": "SUCCESS", "message": f"Student assigned to {room_id}"}

def get_leave_requests(student_id: Optional[str] = None) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []

    users_map = {d.id: d.to_dict() for d in db.collection("users").stream()}
    tokens_map = {d.to_dict().get("leave_id"): d.to_dict() for d in db.collection("qr_tokens").stream()}

    leaves_query = db.collection("leave_requests")
    if student_id:
        leaves_query = leaves_query.where(filter=FieldFilter("student_id", "==", student_id))

    leaves = [dict(d.to_dict(), leave_id=d.id) for d in leaves_query.stream()]

    for l in leaves:
        stu = users_map.get(l.get("student_id"), {})
        l["student_name"] = stu.get("name", "Student")
        l["register_no"] = stu.get("register_no", "")
        l["room_id"] = stu.get("room_id", "")
        l["phone"] = stu.get("phone", "")
        l["parent_phone"] = stu.get("parent_phone", "")
        l["department"] = stu.get("department", "")
        l["qr_token"] = tokens_map.get(l["leave_id"])

    leaves.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return leaves

def create_leave_request(req_data: Dict[str, Any]) -> str:
    db = get_firestore_client()
    leave_id = f"LEV-{datetime.now().strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}"
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M")

    doc_data = {
        "leave_id": leave_id,
        "student_id": req_data["student_id"],
        "type": req_data["type"],
        "from_time": req_data["from_time"],
        "to_time": req_data["to_time"],
        "destination": req_data["destination"],
        "reason": req_data["reason"],
        "approval_status": "PENDING",
        "warden_id": None,
        "warden_comment": None,
        "created_at": created_at
    }
    db.collection("leave_requests").document(leave_id).set(doc_data)
    create_audit_log(req_data["student_id"], "student", "LEAVE_SUBMITTED", leave_id, f"Requested exceptional movement: {req_data['type']}")
    return leave_id

def decide_leave_request(leave_id: str, warden_id: str, decision: str, comment: str) -> Dict[str, Any]:
    db = get_firestore_client()
    doc_ref = db.collection("leave_requests").document(leave_id)
    doc = doc_ref.get()
    if not doc.exists:
        return {"status": "NOT_FOUND"}

    lev_dict = doc.to_dict()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    doc_ref.update({
        "approval_status": decision,
        "warden_id": warden_id,
        "warden_comment": comment
    })

    qr_token_record = None
    if decision == "APPROVED":
        token_id = f"TKN-{lev_dict.get('type', 'OUT')[:3].upper()}-{str(uuid.uuid4())[:8].upper()}"
        valid_from = lev_dict.get("from_time", now_str)
        expiry = lev_dict.get("to_time", now_str)

        qr_token_record = {
            "token_id": token_id,
            "leave_id": leave_id,
            "student_id": lev_dict["student_id"],
            "purpose": f"{lev_dict.get('type')} to {lev_dict.get('destination')}",
            "valid_from": valid_from,
            "expiry": expiry,
            "status": "UNUSED",
            "created_at": now_str,
            "used_at": None
        }
        db.collection("qr_tokens").document(token_id).set(qr_token_record)

    create_audit_log(warden_id, "warden", f"LEAVE_{decision}", leave_id, f"Decision: {decision}. Note: {comment}")
    return {
        "status": "SUCCESS",
        "decision": decision,
        "token": qr_token_record
    }

def verify_gate_qr(token_id: str, gate_name: str, officer_id: str, direction_opt: str) -> Dict[str, Any]:
    db = get_firestore_client()
    now = datetime.now()
    now_str = now.strftime("%Y-%m-%d %H:%M")

    tkn_doc = db.collection("qr_tokens").document(token_id).get()
    if not tkn_doc.exists:
        record_id = str(uuid.uuid4())[:8]
        db.collection("movement_records").document(record_id).set({
            "record_id": record_id, "student_id": "UNKNOWN", "direction": "UNKNOWN",
            "timestamp": now_str, "token_id": token_id, "gate_name": gate_name,
            "verified_by": officer_id, "is_exceptional": 1, "is_late_flag": 0,
            "verification_status": "REJECTED", "notes": "Non-existent or forged token reference."
        })
        return {
            "valid": False,
            "reason_code": "TOKEN_NOT_FOUND",
            "message": "REJECTED: QR token does not exist in server registry. Possible forged code."
        }

    tkn_dict = tkn_doc.to_dict()

    # Check expiry
    try:
        exp_dt = datetime.strptime(tkn_dict["expiry"], "%Y-%m-%d %H:%M")
        is_expired = now > exp_dt
    except Exception:
        is_expired = False

    if is_expired:
        db.collection("qr_tokens").document(token_id).update({"status": "EXPIRED"})
        record_id = str(uuid.uuid4())[:8]
        db.collection("movement_records").document(record_id).set({
            "record_id": record_id, "student_id": tkn_dict.get("student_id", "UNKNOWN"),
            "direction": "DENIED", "timestamp": now_str, "token_id": token_id,
            "gate_name": gate_name, "verified_by": officer_id, "is_exceptional": 1,
            "is_late_flag": 1, "verification_status": "REJECTED",
            "notes": f"Token expired at {tkn_dict.get('expiry')}."
        })
        return {
            "valid": False,
            "reason_code": "TOKEN_EXPIRED",
            "message": f"REJECTED: QR token expired at {tkn_dict.get('expiry')}. Authorization lapsed."
        }

    # Check status
    if tkn_dict.get("status") != "UNUSED":
        record_id = str(uuid.uuid4())[:8]
        db.collection("movement_records").document(record_id).set({
            "record_id": record_id, "student_id": tkn_dict.get("student_id", "UNKNOWN"),
            "direction": "DENIED", "timestamp": now_str, "token_id": token_id,
            "gate_name": gate_name, "verified_by": officer_id, "is_exceptional": 1,
            "is_late_flag": 0, "verification_status": "REJECTED",
            "notes": f"Token already marked as {tkn_dict.get('status')}."
        })
        return {
            "valid": False,
            "reason_code": "TOKEN_ALREADY_USED",
            "message": f"REJECTED: Token has already been used ({tkn_dict.get('status')}). Re-use prohibited."
        }

    # Student check
    stu_doc = db.collection("users").document(tkn_dict["student_id"]).get()
    if not stu_doc.exists:
        return {"valid": False, "reason_code": "STUDENT_NOT_FOUND", "message": "Associated student not found"}

    stu_dict = stu_doc.to_dict()
    current_state = stu_dict.get("presence_status", "IN")

    if direction_opt and direction_opt in ["ENTRY", "EXIT"]:
        direction = direction_opt
    else:
        direction = "EXIT" if current_state == "IN" else "ENTRY"

    new_state = "OUT" if direction == "EXIT" else "IN"

    # Update Token & Student
    db.collection("qr_tokens").document(token_id).update({"status": "USED", "used_at": now_str})
    db.collection("users").document(tkn_dict["student_id"]).update({"presence_status": new_state})

    mov_id = f"MOV-{now.strftime('%H%M%S')}-{str(uuid.uuid4())[:4].upper()}"
    db.collection("movement_records").document(mov_id).set({
        "record_id": mov_id,
        "student_id": stu_dict["id"],
        "direction": direction,
        "timestamp": now_str,
        "token_id": token_id,
        "gate_name": gate_name,
        "verified_by": officer_id,
        "is_exceptional": 1,
        "is_late_flag": 0,
        "verification_status": "ACCEPTED",
        "notes": f"Verified pass for {tkn_dict.get('purpose')}. Presence updated to {new_state}."
    })

    create_audit_log(officer_id, "security", "GATE_QR_VERIFIED", token_id, f"Verified {stu_dict.get('name')} for {direction}. Status: {new_state}")

    return {
        "valid": True,
        "reason_code": "AUTHORIZED",
        "direction": direction,
        "new_presence_status": new_state,
        "student": {
            "name": stu_dict.get("name"),
            "register_no": stu_dict.get("register_no"),
            "room_id": stu_dict.get("room_id"),
            "department": stu_dict.get("department"),
            "phone": stu_dict.get("phone")
        },
        "purpose": tkn_dict.get("purpose"),
        "timestamp": now_str,
        "message": f"ACCESS GRANTED: Exceptional {direction} permitted for {stu_dict.get('name')}."
    }

def get_movement_records(limit: int = 50) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    users_map = {d.id: d.to_dict() for d in db.collection("users").stream()}
    docs = db.collection("movement_records").stream()
    records = []
    for d in docs:
        rec = d.to_dict()
        rec["record_id"] = d.id
        u = users_map.get(rec.get("student_id"), {})
        rec["student_name"] = u.get("name", "Student")
        rec["register_no"] = u.get("register_no", "")
        rec["room_id"] = u.get("room_id", "")
        records.append(rec)

    records.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return records[:limit]

def get_safety_assets() -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    docs = db.collection("safety_assets").stream()
    assets = [dict(d.to_dict(), asset_id=d.id) for d in docs]
    assets.sort(key=lambda x: (x.get("block", ""), x.get("floor", 0), x.get("type", "")))
    return assets

def inspect_safety_asset(asset_id: str, new_status: str) -> Dict[str, Any]:
    db = get_firestore_client()
    now_str = datetime.now().strftime("%Y-%m-%d")
    next_check = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
    db.collection("safety_assets").document(asset_id).update({
        "status": new_status,
        "last_check": now_str,
        "next_check_due": next_check
    })
    return {"status": "SUCCESS", "asset_id": asset_id, "inspection_date": now_str}

def get_sos_incidents() -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    users_map = {d.id: d.to_dict() for d in db.collection("users").stream()}
    docs = db.collection("sos_incidents").stream()
    incidents = []
    for d in docs:
        inc = d.to_dict()
        inc["incident_id"] = d.id
        u = users_map.get(inc.get("student_id"), {})
        inc["student_name"] = u.get("name", "Resident")
        inc["register_no"] = u.get("register_no", "")
        inc["room_id"] = u.get("room_id", "")
        inc["phone"] = u.get("phone", "")
        inc["parent_phone"] = u.get("parent_phone", "")
        incidents.append(inc)

    incidents.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return incidents

def create_sos_incident(student_id: str, location: str, description: str) -> str:
    db = get_firestore_client()
    incident_id = f"SOS-{datetime.now().strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    db.collection("sos_incidents").document(incident_id).set({
        "incident_id": incident_id,
        "student_id": student_id,
        "location": location,
        "description": description,
        "status": "Triggered",
        "timestamp": now_str,
        "acknowledged_by": None,
        "acknowledged_at": None,
        "resolved_at": None,
        "resolution_notes": None
    })
    create_audit_log(student_id, "student", "SOS_TRIGGERED", incident_id, f"Emergency from {location}: {description}")
    return incident_id

def update_sos_status(incident_id: str, new_status: str, officer_id: str, notes: Optional[str] = None) -> bool:
    db = get_firestore_client()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    update_data = {"status": new_status, "resolution_notes": notes}

    if new_status == "Acknowledged":
        update_data["acknowledged_by"] = officer_id
        update_data["acknowledged_at"] = now_str
    elif new_status == "Resolved":
        update_data["resolved_at"] = now_str

    db.collection("sos_incidents").document(incident_id).update(update_data)
    create_audit_log(officer_id, "staff", f"SOS_{new_status.upper()}", incident_id, f"Updated to {new_status}. Notes: {notes}")
    return True

def get_complaints(student_id: Optional[str] = None) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    users_map = {d.id: d.to_dict() for d in db.collection("users").stream()}
    query = db.collection("complaints")
    if student_id:
        query = query.where(filter=FieldFilter("student_id", "==", student_id))

    complaints = []
    for d in query.stream():
        c = d.to_dict()
        c["complaint_id"] = d.id
        u = users_map.get(c.get("student_id"), {})
        c["student_name"] = u.get("name", "Student")
        c["register_no"] = u.get("register_no", "")
        c["phone"] = u.get("phone", "")
        complaints.append(c)

    complaints.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return complaints

def create_complaint(student_id: str, room_id: Optional[str], title: str, description: str, classification: Dict[str, Any], precheck_completed: bool) -> str:
    db = get_firestore_client()
    complaint_id = f"CMP-{datetime.now().strftime('%y%m')}-{str(uuid.uuid4())[:5].upper()}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    # If room_id not provided, fetch from student profile
    if not room_id:
        stu_doc = db.collection("users").document(student_id).get()
        room_id = stu_doc.to_dict().get("room_id", "General") if stu_doc.exists else "General"

    db.collection("complaints").document(complaint_id).set({
        "complaint_id": complaint_id,
        "student_id": student_id,
        "room_id": room_id,
        "title": title,
        "description": description,
        "category": classification["category"],
        "priority": classification["priority"],
        "routed_to": classification["routed_to"],
        "status": "OPEN",
        "confidence": classification["confidence"],
        "precheck_completed": 1 if precheck_completed else 0,
        "created_at": now_str,
        "assigned_to": None,
        "resolution_notes": None,
        "resolved_at": None
    })
    create_audit_log(student_id, "student", "COMPLAINT_REGISTERED", complaint_id, f"AI classified {classification['category']} ({classification['priority']}) -> {classification['routed_to']}")
    return complaint_id

def update_complaint_status(complaint_id: str, new_status: str, assigned_to: Optional[str], notes: Optional[str]) -> bool:
    db = get_firestore_client()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    update_data = {
        "status": new_status,
        "resolution_notes": notes
    }
    if assigned_to:
        update_data["assigned_to"] = assigned_to
    if new_status == "RESOLVED":
        update_data["resolved_at"] = now_str

    db.collection("complaints").document(complaint_id).update(update_data)
    return True

def get_mess_history(limit: int = 21) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    docs = db.collection("meal_consumption").stream()
    meals = [dict(d.to_dict(), meal_id=d.id) for d in docs]
    meals.sort(key=lambda x: (x.get("date", ""), x.get("meal_id", "")), reverse=True)
    return meals[:limit]

def get_kitchen_inventory() -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    docs = db.collection("kitchen_inventory").stream()
    items = [dict(d.to_dict(), item_id=d.id) for d in docs]
    items.sort(key=lambda x: (x.get("category", ""), x.get("name", "")))
    return items

def update_inventory_stock(item_id: str, new_stock: float) -> bool:
    db = get_firestore_client()
    db.collection("kitchen_inventory").document(item_id).update({"current_stock": new_stock})
    return True

def get_finance_overview() -> Dict[str, Any]:
    db = get_firestore_client()
    if not db:
        return {}
    docs = db.collection("account_transactions").stream()
    txns = [dict(d.to_dict(), txn_id=d.id) for d in docs]
    txns.sort(key=lambda x: (x.get("date", ""), x.get("txn_id", "")), reverse=True)

    total_income = sum(t.get("amount", 0.0) for t in txns if t.get("direction") == "INCOME")
    total_expense = sum(t.get("amount", 0.0) for t in txns if t.get("direction") == "EXPENSE")

    # Overdues count
    overdue_docs = list(db.collection("payments").where(filter=FieldFilter("status", "==", "OVERDUE")).stream())

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_balance": total_income - total_expense,
        "overdue_invoices_count": len(overdue_docs),
        "transactions": txns[:50],
        "balance_formula": "Net Balance = Total Income - Total Expenditure"
    }

def create_transaction(category: str, direction: str, amount: float, description: str) -> str:
    db = get_firestore_client()
    txn_id = f"TXN-{str(uuid.uuid4())[:6].upper()}"
    today_str = datetime.now().strftime("%Y-%m-%d")
    db.collection("account_transactions").document(txn_id).set({
        "txn_id": txn_id,
        "category": category,
        "direction": direction,
        "amount": amount,
        "date": today_str,
        "description": description,
        "reference_id": None
    })
    return txn_id

def get_student_dues(student_id: str) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    docs = db.collection("payments").where(filter=FieldFilter("student_id", "==", student_id)).stream()
    payments = [dict(d.to_dict(), payment_id=d.id) for d in docs]
    payments.sort(key=lambda x: x.get("due_date", ""))
    return payments

def pay_student_dues(payment_id: str, student_id: str) -> Optional[float]:
    db = get_firestore_client()
    now_str = datetime.now().strftime("%Y-%m-%d")
    doc_ref = db.collection("payments").document(payment_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None

    p_dict = doc.to_dict()
    amount = p_dict.get("amount", 0.0)
    doc_ref.update({"status": "PAID", "paid_date": now_str})

    # Record in transactions as INCOME
    txn_id = f"TXN-FEE-{str(uuid.uuid4())[:6].upper()}"
    db.collection("account_transactions").document(txn_id).set({
        "txn_id": txn_id,
        "category": f"Fee Payment ({p_dict.get('type')})",
        "direction": "INCOME",
        "amount": amount,
        "date": now_str,
        "description": f"Student {student_id} settled invoice {payment_id}",
        "reference_id": payment_id
    })
    return amount

def get_slot_booking_count(resource: str, date_str: str, slot: str) -> int:
    db = get_firestore_client()
    if not db:
        return 0
    docs = (
        db.collection("bookings")
        .where(filter=FieldFilter("resource", "==", resource))
        .where(filter=FieldFilter("date", "==", date_str))
        .where(filter=FieldFilter("slot", "==", slot))
        .where(filter=FieldFilter("status", "==", "CONFIRMED"))
        .stream()
    )
    return len(list(docs))

def check_student_has_slot(student_id: str, resource: str, date_str: str, slot: str) -> bool:
    db = get_firestore_client()
    if not db:
        return False
    docs = (
        db.collection("bookings")
        .where(filter=FieldFilter("student_id", "==", student_id))
        .where(filter=FieldFilter("resource", "==", resource))
        .where(filter=FieldFilter("date", "==", date_str))
        .where(filter=FieldFilter("slot", "==", slot))
        .stream()
    )
    return len(list(docs)) > 0

def create_booking(student_id: str, resource: str, date_str: str, slot: str) -> str:
    db = get_firestore_client()
    booking_id = f"BK-{str(uuid.uuid4())[:6].upper()}"
    db.collection("bookings").document(booking_id).set({
        "booking_id": booking_id,
        "student_id": student_id,
        "resource": resource,
        "date": date_str,
        "slot": slot,
        "status": "CONFIRMED"
    })
    return booking_id

def get_bookings(student_id: Optional[str] = None) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    if student_id:
        docs = db.collection("bookings").where(filter=FieldFilter("student_id", "==", student_id)).stream()
        bookings = [dict(d.to_dict(), booking_id=d.id) for d in docs]
    else:
        users_map = {d.id: d.to_dict() for d in db.collection("users").stream()}
        docs = db.collection("bookings").stream()
        bookings = []
        for d in docs:
            b = d.to_dict()
            b["booking_id"] = d.id
            u = users_map.get(b.get("student_id"), {})
            b["student_name"] = u.get("name", "Student")
            b["register_no"] = u.get("register_no", "")
            b["room_id"] = u.get("room_id", "")
            bookings.append(b)

    bookings.sort(key=lambda x: (x.get("date", ""), x.get("slot", "")), reverse=True)
    return bookings[:50]

def get_public_showcase() -> Dict[str, Any]:
    db = get_firestore_client()
    if not db:
        return {}

    students_count = len(list(db.collection("users").where(filter=FieldFilter("role", "==", "student")).stream()))
    rooms = [d.to_dict() for d in db.collection("rooms").stream()]
    total_capacity = sum(r.get("capacity", 0) for r in rooms)
    vacant_rooms = sum(1 for r in rooms if r.get("status") == "AVAILABLE")

    return {
        "institution": "Campus Residential Complex",
        "location": "Central Campus Green Zone",
        "hostel_name": "HostelOS Intelligent Residential Facility",
        "statistics": {
            "total_capacity": total_capacity,
            "active_residents": students_count,
            "vacant_rooms": vacant_rooms,
            "wifi_coverage": "High-speed Campus Wi-Fi 6",
            "security_surveillance": "24/7 Gated Security with Server-Verified Passes"
        },
        "amenities": [
            {"title": "Spacious Living", "desc": "Double and Triple sharing rooms with study desks and storage"},
            {"title": "Dining & Mess", "desc": "Fresh meal planning with AI demand forecasting to prevent food waste"},
            {"title": "Fitness Center", "desc": "Equipped Gymnasium and fitness corner"},
            {"title": "Study & Recreation", "desc": "Silent study rooms and high-speed Wi-Fi hubs"},
            {"title": "Safety & Health", "desc": "Digital safety blueprint with 24/7 SOS distress dispatch"}
        ],
        "emergency_contacts": {
            "Hostel Warden Desk": "+91 98000 00020",
            "Main Gate Security": "+91 98000 00030",
            "Health & First Aid Centre": "+91 98000 00099"
        }
    }

def create_audit_log(actor_id: str, actor_role: str, action: str, resource: str, details: str):
    db = get_firestore_client()
    if not db:
        return
    log_id = str(uuid.uuid4())[:8]
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    db.collection("audit_logs").document(log_id).set({
        "log_id": log_id,
        "actor_id": actor_id,
        "actor_role": actor_role,
        "action": action,
        "resource": resource,
        "timestamp": now_str,
        "details": details
    })

def get_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    db = get_firestore_client()
    if not db:
        return []
    docs = db.collection("audit_logs").stream()
    logs = [dict(d.to_dict(), log_id=d.id) for d in docs]
    logs.sort(key=lambda x: (x.get("timestamp", ""), x.get("log_id", "")), reverse=True)
    return logs[:limit]
