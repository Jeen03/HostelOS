"""
HostelOS Unified Database Layer
Seamlessly supports:
1. Google Cloud Firestore (Primary - when serviceAccountKey.json is configured)
2. Local SQLite Relational Database (Automatic fallback / zero-config dev mode)
"""

import sqlite3
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import firebase_db

DB_PATH = os.path.join(os.path.dirname(__file__), "hostelos.db")

def is_firebase_active() -> bool:
    """Returns True if Google Cloud Firestore is connected and initialized."""
    return firebase_db.is_firestore_ready()

def get_database_status() -> Dict[str, Any]:
    return firebase_db.get_status()

def get_connection():
    """Returns a direct SQLite connection (legacy support)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes Firestore (if credentials exist) and SQLite schema."""
    if is_firebase_active():
        print("[HostelOS Database] Initializing Google Cloud Firestore...")
        firebase_db.seed_firestore_if_empty()
        return

    print("[HostelOS Database] Initializing SQLite local database (Firestore key not detected in backend/serviceAccountKey.json)...")
    init_sqlite()

def reset_and_init_db():
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception:
            pass
    init_sqlite()

def init_sqlite():
    conn = get_connection()
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT DEFAULT 'password123',
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        register_no TEXT UNIQUE,
        email TEXT,
        phone TEXT,
        parent_phone TEXT,
        room_id TEXT,
        department TEXT,
        year INTEGER,
        gender TEXT,
        presence_status TEXT DEFAULT 'IN',
        prefers_quiet_zone INTEGER DEFAULT 0,
        medical_ground_floor_pref INTEGER DEFAULT 0
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS rooms (
        room_id TEXT PRIMARY KEY,
        block TEXT NOT NULL,
        floor INTEGER NOT NULL,
        capacity INTEGER NOT NULL,
        room_type TEXT DEFAULT 'Double Sharing',
        quiet_zone INTEGER DEFAULT 0,
        fee_per_sem INTEGER DEFAULT 25000,
        status TEXT DEFAULT 'AVAILABLE'
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS leave_requests (
        leave_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        type TEXT NOT NULL,
        from_time TEXT NOT NULL,
        to_time TEXT NOT NULL,
        destination TEXT,
        reason TEXT NOT NULL,
        approval_status TEXT DEFAULT 'PENDING',
        warden_id TEXT,
        warden_comment TEXT,
        created_at TEXT NOT NULL
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS qr_tokens (
        token_id TEXT PRIMARY KEY,
        leave_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        purpose TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        expiry TEXT NOT NULL,
        status TEXT DEFAULT 'UNUSED',
        created_at TEXT NOT NULL,
        used_at TEXT
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS movement_records (
        record_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        direction TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        token_id TEXT,
        gate_name TEXT DEFAULT 'Main Gate',
        verified_by TEXT,
        is_exceptional INTEGER DEFAULT 0,
        is_late_flag INTEGER DEFAULT 0,
        verification_status TEXT DEFAULT 'ACCEPTED',
        notes TEXT
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS complaints (
        complaint_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        room_id TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        routed_to TEXT NOT NULL,
        status TEXT DEFAULT 'OPEN',
        confidence REAL,
        precheck_completed INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        assigned_to TEXT,
        resolution_notes TEXT,
        resolved_at TEXT
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS maintenance_history (
        task_id TEXT PRIMARY KEY,
        asset_area TEXT NOT NULL,
        fault_type TEXT NOT NULL,
        block TEXT,
        floor INTEGER,
        cost INTEGER DEFAULT 0,
        logged_date TEXT NOT NULL,
        resolved_date TEXT,
        status TEXT DEFAULT 'RESOLVED'
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS meal_consumption (
        meal_id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        booked_count INTEGER NOT NULL,
        prepared_count INTEGER NOT NULL,
        consumed_count INTEGER NOT NULL,
        wasted_count INTEGER NOT NULL,
        waste_rate REAL NOT NULL
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS kitchen_inventory (
        item_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        current_stock REAL NOT NULL,
        unit TEXT NOT NULL,
        daily_burn_rate REAL NOT NULL,
        reorder_level REAL NOT NULL,
        lead_time_days INTEGER DEFAULT 2,
        cost_per_unit REAL NOT NULL
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS sos_incidents (
        incident_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'Triggered',
        timestamp TEXT NOT NULL,
        acknowledged_by TEXT,
        acknowledged_at TEXT,
        resolved_at TEXT,
        resolution_notes TEXT
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        payment_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        paid_date TEXT
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS bookings (
        booking_id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        resource TEXT NOT NULL,
        date TEXT NOT NULL,
        slot TEXT NOT NULL,
        status TEXT DEFAULT 'CONFIRMED'
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS account_transactions (
        txn_id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        direction TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        reference_id TEXT
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS safety_assets (
        asset_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        block TEXT NOT NULL,
        floor INTEGER NOT NULL,
        location TEXT NOT NULL,
        last_check TEXT NOT NULL,
        next_check_due TEXT NOT NULL,
        status TEXT DEFAULT 'OPERATIONAL'
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        log_id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        details TEXT
    );
    """)

    conn.commit()
    seed_sqlite_clean_data(conn)
    conn.close()

def seed_sqlite_clean_data(conn):
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] > 0:
        return

    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")

    # 1. Rooms
    rooms_data = [
        ("A-101", "Block A", 1, 2, "Double Sharing", 1, 25000, "OCCUPIED"),
        ("A-102", "Block A", 1, 2, "Double Sharing", 1, 25000, "OCCUPIED"),
        ("A-103", "Block A", 1, 3, "Triple Sharing", 0, 22000, "AVAILABLE"),
        ("A-201", "Block A", 2, 2, "Double Sharing", 1, 25000, "OCCUPIED"),
        ("A-202", "Block A", 2, 2, "Double Sharing", 0, 25000, "AVAILABLE"),
        ("A-203", "Block A", 2, 4, "Quad Sharing", 0, 18000, "AVAILABLE"),
        ("B-101", "Block B", 1, 2, "Double Sharing", 0, 25000, "OCCUPIED"),
        ("B-102", "Block B", 1, 2, "Double Sharing", 0, 25000, "AVAILABLE"),
        ("B-201", "Block B", 2, 2, "Double Sharing", 1, 25000, "OCCUPIED"),
        ("B-202", "Block B", 2, 3, "Triple Sharing", 0, 22000, "AVAILABLE"),
        ("C-101", "Block C", 1, 1, "Single Deluxe", 1, 32000, "AVAILABLE"),
    ]
    c.executemany("INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?, ?, ?)", rooms_data)

    # 2. Users
    users_data = [
        ("u_student1", "student", "password123", "Resident Student A", "student", "STU-2026-001", "student@hostel.edu", "+91 98000 00001", "+91 98000 00011", "A-101", "Computer Engineering", 3, "Male", "IN", 1, 0),
        ("u_student2", "student2", "password123", "Resident Student B", "student", "STU-2026-002", "student2@hostel.edu", "+91 98000 00002", "+91 98000 00012", "A-101", "Computer Engineering", 3, "Male", "OUT", 0, 1),
        ("u_student3", "student3", "password123", "Resident Student C", "student", "STU-2026-003", "student3@hostel.edu", "+91 98000 00003", "+91 98000 00013", "A-102", "Electronics", 2, "Female", "ON LEAVE", 1, 0),
        ("u_warden", "warden", "password123", "Hostel Warden", "warden", "EMP-WRD-01", "warden@hostel.edu", "+91 98000 00020", "", "", "Administration", 0, "Staff", "NA", 0, 0),
        ("u_security", "security", "password123", "Gate Security Officer", "security", "EMP-SEC-01", "security@hostel.edu", "+91 98000 00030", "", "", "Campus Security", 0, "Staff", "NA", 0, 0),
        ("u_admin", "admin", "password123", "Hostel Administrator", "administrator", "EMP-ADM-01", "admin@hostel.edu", "+91 98000 00040", "", "", "Operations", 0, "Staff", "NA", 0, 0),
        ("u_mess", "mess", "password123", "Mess Supervisor", "mess", "EMP-MSS-01", "mess@hostel.edu", "+91 98000 00050", "", "", "Catering", 0, "Staff", "NA", 0, 0),
        ("u_maint", "maintenance", "password123", "Facility Technician", "maintenance", "EMP-MNT-01", "maintenance@hostel.edu", "+91 98000 00060", "", "", "Facility Engineering", 0, "Staff", "NA", 0, 0),
        ("u_parent", "parent", "password123", "Student Guardian", "parent", "PAR-2026-001", "guardian@family.org", "+91 98000 00011", "", "A-101", "Guardian", 0, "Guardian", "NA", 0, 0),
    ]
    c.executemany("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", users_data)

    # 3. Leave Requests & QR Tokens
    leave_id = "LEV-2026-101"
    token_id = "TKN-PASS-8821"
    c.execute("""
    INSERT INTO leave_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        leave_id, "u_student2", "Holiday Outing",
        f"{today_str} 17:00", f"{today_str} 21:30",
        "Town Center", "Weekend family visit",
        "APPROVED", "u_warden", "Approved. Curfew cutoff applies.",
        f"{today_str} 09:30"
    ))

    c.execute("""
    INSERT INTO qr_tokens VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        token_id, leave_id, "u_student2", "Holiday Outing - Town Center",
        f"{today_str} 16:30", f"{today_str} 22:00",
        "UNUSED", f"{today_str} 09:35", None
    ))

    # Pending Leave Request for Student 1
    c.execute("""
    INSERT INTO leave_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "LEV-2026-102", "u_student1", "Late Return",
        f"{today_str} 19:30", f"{today_str} 22:00",
        "Campus Central Library", "Study group project review",
        "PENDING", None, None,
        f"{today_str} 14:00"
    ))

    # 4. Movement Records
    c.execute("""
    INSERT INTO movement_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "MOV-1001", "u_student2", "EXIT", f"{today_str} 17:10",
        token_id, "Main Gate", "u_security", 1, 0, "ACCEPTED",
        "Approved exceptional pass verified via scanner."
    ))

    # 5. Complaints
    c.execute("""
    INSERT INTO complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "CMP-201", "u_student1", "A-101", "Room Ceiling Fan Running Slow",
        "The ceiling fan in A-101 is wobbling and runs at low speed regardless of regulator setting.",
        "Electrical", "Medium", "Maintenance - Electrician Wing", "IN_PROGRESS", 0.91, 1,
        f"{today_str} 10:00", "u_maint", "Technician assigned for capacitor inspection", None
    ))

    c.execute("""
    INSERT INTO complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "CMP-202", "u_student3", "A-102", "Washbasin Drain Pipe Leak",
        "Drain pipe under washbasin is leaking clean water onto floor.",
        "Plumbing", "High", "Maintenance - Plumbing Wing", "OPEN", 0.94, 1,
        f"{today_str} 13:20", None, None, None
    ))

    # 6. Safety Assets
    safety_assets_data = [
        ("AST-FE-A1", "Fire Extinguisher", "Block A", 1, "Corridor Staircase A", "2026-08-01", "2026-11-01", "OPERATIONAL"),
        ("AST-FE-A2", "Fire Extinguisher", "Block A", 2, "Central Corridor", "2026-06-01", "2026-09-01", "DUE_FOR_INSPECTION"),
        ("AST-FA-A1", "Fire Alarm Smoke Detector", "Block A", 1, "Lobby Entrance Ceiling", "2026-09-01", "2026-12-01", "OPERATIONAL"),
        ("AST-FAID-A1", "First-Aid Station", "Block A", 1, "Warden Office Entrance", "2026-10-01", "2026-11-01", "OPERATIONAL"),
        ("AST-FE-B1", "Fire Extinguisher", "Block B", 1, "Mess Hall Entrance", "2026-05-15", "2026-08-15", "DUE_FOR_INSPECTION"),
        ("AST-FAID-B1", "First-Aid Station", "Block B", 1, "Fitness Center Vestibule", "2026-10-01", "2026-11-01", "OPERATIONAL"),
    ]
    c.executemany("INSERT INTO safety_assets VALUES (?, ?, ?, ?, ?, ?, ?, ?)", safety_assets_data)

    # 7. Kitchen Inventory
    inventory_data = [
        ("INV-01", "Grain Rice", "Provisions", 180.0, "kg", 35.0, 100.0, 3, 40.0),
        ("INV-02", "Lentils / Dal", "Provisions", 32.0, "kg", 12.0, 40.0, 2, 95.0),
        ("INV-03", "Cooking Oil", "Provisions", 45.0, "L", 8.0, 30.0, 2, 120.0),
        ("INV-04", "Wheat Flour", "Provisions", 90.0, "kg", 20.0, 50.0, 2, 42.0),
        ("INV-05", "Fresh Milk", "Dairy", 16.0, "L", 28.0, 25.0, 1, 50.0),
        ("INV-06", "Vegetables Mix", "Vegetables", 65.0, "kg", 22.0, 40.0, 1, 30.0),
    ]
    c.executemany("INSERT INTO kitchen_inventory VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", inventory_data)

    # 8. Meal Consumption History
    for i in range(7, 0, -1):
        dt = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        c.execute("""
        INSERT INTO meal_consumption VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"ML-{i}-BF", dt, "Breakfast", 210, 220, 208, 12, round(12/220, 3)))
        c.execute("""
        INSERT INTO meal_consumption VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"ML-{i}-LN", dt, "Lunch", 180, 190, 178, 12, round(12/190, 3)))
        c.execute("""
        INSERT INTO meal_consumption VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (f"ML-{i}-DN", dt, "Dinner", 220, 230, 222, 8, round(8/230, 3)))

    # 9. Account Transactions
    txns = [
        ("TXN-101", "Semester Hostel Fee Deposit", "INCOME", 750000.0, f"{today_str}", "Student semester fee collections", None),
        ("TXN-102", "Amenity & Fitness Subscriptions", "INCOME", 45000.0, f"{today_str}", "Monthly gym and Wi-Fi subscriptions", None),
        ("TXN-103", "Mess Catering Supplies", "EXPENSE", 280000.0, f"{today_str}", "Grain and grocery provisioning", None),
        ("TXN-104", "Electricity & Water Utilities", "EXPENSE", 95000.0, f"{today_str}", "Hostel power and utility bill", None),
        ("TXN-105", "Facility Repairs & Maintenance", "EXPENSE", 32000.0, f"{today_str}", "Plumbing fixtures and electrical spares", None),
    ]
    c.executemany("INSERT INTO account_transactions VALUES (?, ?, ?, ?, ?, ?, ?)", txns)

    # 10. Student Payments
    payments_data = [
        ("PAY-01", "u_student1", "Semester Hostel Rent", 25000, "2026-11-15", "PAID", f"{today_str}"),
        ("PAY-02", "u_student2", "Semester Hostel Rent", 25000, "2026-11-15", "PAID", f"{today_str}"),
        ("PAY-03", "u_student3", "Semester Hostel Rent", 25000, "2026-10-15", "OVERDUE", None),
        ("PAY-04", "u_student1", "Fitness Center Monthly Pass", 500, "2026-11-01", "PAID", f"{today_str}"),
    ]
    c.executemany("INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?, ?)", payments_data)

    # 11. Bookings
    c.execute("""
    INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?)
    """, ("BK-01", "u_student1", "Gymnasium", today_str, "06:00 - 07:00 AM", "CONFIRMED"))

    # 12. SOS Incident
    c.execute("""
    INSERT INTO sos_incidents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "SOS-2026-001", "u_student3", "Block A - 1st Floor Corridor",
        "Minor slip on wet floor. First aid assistance requested.",
        "Acknowledged", f"{today_str} 14:15", "u_warden", f"{today_str} 14:18", None,
        "Warden dispatched first aid kit AST-FAID-A1."
    ))

    # 13. Audit Log
    c.execute("""
    INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        "AUD-001", "admin", "administrator", "SYSTEM_START", "HostelOS",
        f"{today_str} 08:00", "HostelOS platform initialized with clean generic data."
    ))

    conn.commit()


# ==========================================================
# UNIFIED DATA ACCESS METHODS (Firestore or SQLite fallback)
# ==========================================================

def get_user_by_login(query_val: str) -> Optional[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_user_by_query(query_val)

    conn = get_connection()
    c = conn.cursor()
    val = query_val.strip()
    c.execute("""
        SELECT * FROM users
        WHERE LOWER(username) = LOWER(?)
           OR LOWER(email) = LOWER(?)
           OR LOWER(id) = LOWER(?)
           OR LOWER(register_no) = LOWER(?)
    """, (val, val, val, val))
    row = c.fetchone()
    if not row:
        c.execute("SELECT * FROM users WHERE LOWER(role) = LOWER(?)", (val,))
        row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_users() -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_all_users()
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users ORDER BY role, name")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_user_by_id(user_id)
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return None
    user = dict(row)
    if user.get("room_id"):
        c.execute("SELECT * FROM rooms WHERE room_id = ?", (user["room_id"],))
        r = c.fetchone()
        if r:
            user["room_details"] = dict(r)
    conn.close()
    return user

def get_dashboard_stats() -> Dict[str, Any]:
    if is_firebase_active():
        return firebase_db.get_dashboard_stats()
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM users WHERE role = 'student'")
    total_students = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM users WHERE role = 'student' AND presence_status = 'IN'")
    present_students = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM users WHERE role = 'student' AND presence_status = 'OUT'")
    out_students = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM users WHERE role = 'student' AND presence_status = 'ON LEAVE'")
    on_leave_students = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM rooms")
    total_rooms = c.fetchone()[0]
    c.execute("SELECT SUM(capacity) FROM rooms")
    total_capacity = c.fetchone()[0] or 0
    c.execute("SELECT COUNT(*) FROM complaints WHERE status != 'RESOLVED'")
    active_complaints = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM sos_incidents WHERE status != 'Resolved'")
    active_emergencies = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM leave_requests WHERE approval_status = 'PENDING'")
    pending_leaves = c.fetchone()[0]
    c.execute("SELECT SUM(amount) FROM account_transactions WHERE direction = 'INCOME'")
    total_income = c.fetchone()[0] or 0.0
    c.execute("SELECT SUM(amount) FROM account_transactions WHERE direction = 'EXPENSE'")
    total_expense = c.fetchone()[0] or 0.0
    conn.close()
    return {
        "total_students": total_students,
        "presence": {
            "in_campus": present_students,
            "out_campus": out_students,
            "on_leave": on_leave_students
        },
        "rooms": {
            "total_rooms": total_rooms,
            "total_bed_capacity": total_capacity,
            "occupancy_rate": round((total_students / total_capacity * 100) if total_capacity else 0, 1)
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
    if is_firebase_active():
        return firebase_db.get_rooms()
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM rooms ORDER BY block, floor, room_id")
    rooms = [dict(r) for r in c.fetchall()]
    for r in rooms:
        c.execute("SELECT id, name, register_no, department, year FROM users WHERE room_id = ?", (r["room_id"],))
        r["occupants"] = [dict(u) for u in c.fetchall()]
        r["vacant_beds"] = r["capacity"] - len(r["occupants"])
    conn.close()
    return rooms

def assign_student_to_room(student_id: str, room_id: str) -> Dict[str, Any]:
    if is_firebase_active():
        return firebase_db.assign_student_to_room(student_id, room_id)
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT capacity FROM rooms WHERE room_id = ?", (room_id,))
    r = c.fetchone()
    if not r:
        conn.close()
        return {"status": "NOT_FOUND", "message": "Room not found"}
    capacity = r[0]
    c.execute("SELECT COUNT(*) FROM users WHERE room_id = ?", (room_id,))
    count = c.fetchone()[0]
    if count >= capacity:
        conn.close()
        return {"status": "FULL", "message": "Room is already at full capacity"}
    c.execute("UPDATE users SET room_id = ? WHERE id = ?", (room_id, student_id))
    create_audit_log("admin", "administrator", "ROOM_ASSIGNMENT", f"Room {room_id}", f"Assigned student {student_id} to room {room_id}")
    conn.commit()
    conn.close()
    return {"status": "SUCCESS", "message": f"Student assigned to {room_id}"}

def get_leave_requests(student_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_leave_requests(student_id)
    conn = get_connection()
    c = conn.cursor()
    query = """
    SELECT l.*, u.name as student_name, u.register_no, u.room_id, u.phone, u.parent_phone, u.department
    FROM leave_requests l
    JOIN users u ON l.student_id = u.id
    """
    params = []
    if student_id:
        query += " WHERE l.student_id = ?"
        params.append(student_id)
    query += " ORDER BY l.created_at DESC"
    c.execute(query, params)
    leaves = [dict(r) for r in c.fetchall()]
    for lev in leaves:
        c.execute("SELECT * FROM qr_tokens WHERE leave_id = ?", (lev["leave_id"],))
        tkn = c.fetchone()
        lev["qr_token"] = dict(tkn) if tkn else None
    conn.close()
    return leaves

def create_leave_request(req_data: Dict[str, Any]) -> str:
    if is_firebase_active():
        return firebase_db.create_leave_request(req_data)
    conn = get_connection()
    c = conn.cursor()
    leave_id = f"LEV-{datetime.now().strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}"
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    c.execute("""
    INSERT INTO leave_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        leave_id, req_data["student_id"], req_data["type"],
        req_data["from_time"], req_data["to_time"], req_data["destination"], req_data["reason"],
        "PENDING", None, None, created_at
    ))
    create_audit_log(req_data["student_id"], "student", "LEAVE_SUBMITTED", leave_id, f"Requested exceptional movement: {req_data['type']}")
    conn.commit()
    conn.close()
    return leave_id

def decide_leave_request(leave_id: str, warden_id: str, decision: str, comment: str) -> Dict[str, Any]:
    if is_firebase_active():
        return firebase_db.decide_leave_request(leave_id, warden_id, decision, comment)
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM leave_requests WHERE leave_id = ?", (leave_id,))
    lev = c.fetchone()
    if not lev:
        conn.close()
        return {"status": "NOT_FOUND"}
    lev_dict = dict(lev)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    c.execute("""
    UPDATE leave_requests
    SET approval_status = ?, warden_id = ?, warden_comment = ?
    WHERE leave_id = ?
    """, (decision, warden_id, comment, leave_id))

    qr_token_record = None
    if decision == "APPROVED":
        token_id = f"TKN-{lev_dict['type'][:3].upper()}-{str(uuid.uuid4())[:8].upper()}"
        valid_from = lev_dict["from_time"]
        expiry = lev_dict["to_time"]
        c.execute("""
        INSERT INTO qr_tokens VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            token_id, leave_id, lev_dict["student_id"],
            f"{lev_dict['type']} to {lev_dict['destination']}",
            valid_from, expiry, "UNUSED", now_str, None
        ))
        qr_token_record = {
            "token_id": token_id,
            "student_id": lev_dict["student_id"],
            "purpose": lev_dict["type"],
            "valid_from": valid_from,
            "expiry": expiry,
            "status": "UNUSED"
        }
    create_audit_log(warden_id, "warden", f"LEAVE_{decision}", leave_id, f"Decision: {decision}. Note: {comment}")
    conn.commit()
    conn.close()
    return {"status": "SUCCESS", "decision": decision, "token": qr_token_record}

def verify_gate_qr(token_id: str, gate_name: str, officer_id: str, direction_opt: str) -> Dict[str, Any]:
    if is_firebase_active():
        return firebase_db.verify_gate_qr(token_id, gate_name, officer_id, direction_opt)

    conn = get_connection()
    c = conn.cursor()
    now = datetime.now()
    now_str = now.strftime("%Y-%m-%d %H:%M")

    c.execute("SELECT * FROM qr_tokens WHERE token_id = ?", (token_id,))
    tkn = c.fetchone()
    if not tkn:
        c.execute("""
        INSERT INTO movement_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4())[:8], "UNKNOWN", "UNKNOWN", now_str, token_id,
            gate_name, officer_id, 1, 0, "REJECTED",
            "Non-existent or forged token reference."
        ))
        conn.commit()
        conn.close()
        return {
            "valid": False,
            "reason_code": "TOKEN_NOT_FOUND",
            "message": "REJECTED: QR token does not exist in server registry. Possible forged code."
        }

    tkn_dict = dict(tkn)
    try:
        exp_dt = datetime.strptime(tkn_dict["expiry"], "%Y-%m-%d %H:%M")
        is_expired = now > exp_dt
    except Exception:
        is_expired = False

    if is_expired:
        c.execute("UPDATE qr_tokens SET status = 'EXPIRED' WHERE token_id = ?", (token_id,))
        c.execute("""
        INSERT INTO movement_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4())[:8], tkn_dict["student_id"], "DENIED", now_str, token_id,
            gate_name, officer_id, 1, 1, "REJECTED",
            f"Token expired at {tkn_dict['expiry']}."
        ))
        conn.commit()
        conn.close()
        return {
            "valid": False,
            "reason_code": "TOKEN_EXPIRED",
            "message": f"REJECTED: QR token expired at {tkn_dict['expiry']}. Authorization lapsed."
        }

    if tkn_dict["status"] != "UNUSED":
        c.execute("""
        INSERT INTO movement_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4())[:8], tkn_dict["student_id"], "DENIED", now_str, token_id,
            gate_name, officer_id, 1, 0, "REJECTED",
            f"Token already marked as {tkn_dict['status']}. Replay or duplicate scan detected."
        ))
        conn.commit()
        conn.close()
        return {
            "valid": False,
            "reason_code": "TOKEN_ALREADY_USED",
            "message": f"REJECTED: Token has already been used ({tkn_dict['status']}). Re-use prohibited."
        }

    c.execute("SELECT * FROM users WHERE id = ?", (tkn_dict["student_id"],))
    stu = c.fetchone()
    if not stu:
        conn.close()
        return {"valid": False, "reason_code": "STUDENT_NOT_FOUND", "message": "Associated student not found"}

    stu_dict = dict(stu)
    current_state = stu_dict["presence_status"]
    if direction_opt and direction_opt in ["ENTRY", "EXIT"]:
        direction = direction_opt
    else:
        direction = "EXIT" if current_state == "IN" else "ENTRY"

    new_state = "OUT" if direction == "EXIT" else "IN"
    c.execute("UPDATE qr_tokens SET status = 'USED', used_at = ? WHERE token_id = ?", (now_str, token_id))
    c.execute("UPDATE users SET presence_status = ? WHERE id = ?", (new_state, stu_dict["id"]))
    mov_id = f"MOV-{now.strftime('%H%M%S')}-{str(uuid.uuid4())[:4].upper()}"
    c.execute("""
    INSERT INTO movement_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        mov_id, stu_dict["id"], direction, now_str, token_id,
        gate_name, officer_id, 1, 0, "ACCEPTED",
        f"Verified pass for {tkn_dict['purpose']}. Presence updated to {new_state}."
    ))
    create_audit_log(officer_id, "security", "GATE_QR_VERIFIED", token_id, f"Verified {stu_dict['name']} for {direction}. Status: {new_state}")
    conn.commit()
    conn.close()
    return {
        "valid": True,
        "reason_code": "AUTHORIZED",
        "direction": direction,
        "new_presence_status": new_state,
        "student": {
            "name": stu_dict["name"],
            "register_no": stu_dict["register_no"],
            "room_id": stu_dict["room_id"],
            "department": stu_dict["department"],
            "phone": stu_dict["phone"]
        },
        "purpose": tkn_dict["purpose"],
        "timestamp": now_str,
        "message": f"ACCESS GRANTED: Exceptional {direction} permitted for {stu_dict['name']}."
    }

def get_movement_records(limit: int = 50) -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_movement_records(limit)
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    SELECT m.*, u.name as student_name, u.register_no, u.room_id
    FROM movement_records m
    LEFT JOIN users u ON m.student_id = u.id
    ORDER BY m.timestamp DESC
    LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_safety_assets() -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_safety_assets()
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM safety_assets ORDER BY block, floor, type")
    assets = [dict(r) for r in c.fetchall()]
    conn.close()
    return assets

def inspect_safety_asset(asset_id: str, new_status: str) -> Dict[str, Any]:
    if is_firebase_active():
        return firebase_db.inspect_safety_asset(asset_id, new_status)
    conn = get_connection()
    c = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d")
    next_check = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
    c.execute("""
    UPDATE safety_assets
    SET status = ?, last_check = ?, next_check_due = ?
    WHERE asset_id = ?
    """, (new_status, now_str, next_check, asset_id))
    conn.commit()
    conn.close()
    return {"status": "SUCCESS", "asset_id": asset_id, "inspection_date": now_str}

def get_sos_incidents() -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_sos_incidents()
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    SELECT s.*, u.name as student_name, u.register_no, u.room_id, u.phone, u.parent_phone
    FROM sos_incidents s
    JOIN users u ON s.student_id = u.id
    ORDER BY s.timestamp DESC
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def create_sos_incident(student_id: str, location: str, description: str) -> str:
    if is_firebase_active():
        return firebase_db.create_sos_incident(student_id, location, description)
    conn = get_connection()
    c = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    incident_id = f"SOS-{datetime.now().strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}"
    c.execute("""
    INSERT INTO sos_incidents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        incident_id, student_id, location, description,
        "Triggered", now_str, None, None, None, None
    ))
    create_audit_log(student_id, "student", "SOS_TRIGGERED", incident_id, f"Emergency from {location}: {description}")
    conn.commit()
    conn.close()
    return incident_id

def update_sos_status(incident_id: str, new_status: str, officer_id: str, notes: Optional[str] = None) -> bool:
    if is_firebase_active():
        return firebase_db.update_sos_status(incident_id, new_status, officer_id, notes)
    conn = get_connection()
    c = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if new_status == "Acknowledged":
        c.execute("""
        UPDATE sos_incidents
        SET status = ?, acknowledged_by = ?, acknowledged_at = ?, resolution_notes = ?
        WHERE incident_id = ?
        """, (new_status, officer_id, now_str, notes, incident_id))
    elif new_status == "Resolved":
        c.execute("""
        UPDATE sos_incidents
        SET status = ?, resolved_at = ?, resolution_notes = ?
        WHERE incident_id = ?
        """, (new_status, now_str, notes, incident_id))
    else:
        c.execute("""
        UPDATE sos_incidents
        SET status = ?, resolution_notes = ?
        WHERE incident_id = ?
        """, (new_status, notes, incident_id))
    create_audit_log(officer_id, "staff", f"SOS_{new_status.upper()}", incident_id, f"Emergency updated to {new_status}. Notes: {notes}")
    conn.commit()
    conn.close()
    return True

def get_complaints(student_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_complaints(student_id)
    conn = get_connection()
    c = conn.cursor()
    query = """
    SELECT comp.*, u.name as student_name, u.register_no, u.phone
    FROM complaints comp
    JOIN users u ON comp.student_id = u.id
    """
    params = []
    if student_id:
        query += " WHERE comp.student_id = ?"
        params.append(student_id)
    query += " ORDER BY comp.created_at DESC"
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def create_complaint(student_id: str, room_id: Optional[str], title: str, description: str, classification: Dict[str, Any], precheck_completed: bool) -> str:
    if is_firebase_active():
        return firebase_db.create_complaint(student_id, room_id, title, description, classification, precheck_completed)
    conn = get_connection()
    c = conn.cursor()
    complaint_id = f"CMP-{datetime.now().strftime('%y%m')}-{str(uuid.uuid4())[:5].upper()}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    if not room_id:
        c.execute("SELECT room_id FROM users WHERE id = ?", (student_id,))
        r = c.fetchone()
        room_id = r[0] if r else "General"
    c.execute("""
    INSERT INTO complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        complaint_id, student_id, room_id, title, description,
        classification["category"], classification["priority"], classification["routed_to"],
        "OPEN", classification["confidence"], 1 if precheck_completed else 0,
        now_str, None, None, None
    ))
    create_audit_log(student_id, "student", "COMPLAINT_REGISTERED", complaint_id, f"AI classified {classification['category']} ({classification['priority']}) -> {classification['routed_to']}")
    conn.commit()
    conn.close()
    return complaint_id

def update_complaint_status(complaint_id: str, new_status: str, assigned_to: Optional[str], notes: Optional[str]) -> bool:
    if is_firebase_active():
        return firebase_db.update_complaint_status(complaint_id, new_status, assigned_to, notes)
    conn = get_connection()
    c = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    resolved_at = now_str if new_status == "RESOLVED" else None
    c.execute("""
    UPDATE complaints
    SET status = ?, assigned_to = COALESCE(?, assigned_to),
        resolution_notes = ?, resolved_at = ?
    WHERE complaint_id = ?
    """, (new_status, assigned_to, notes, resolved_at, complaint_id))
    conn.commit()
    conn.close()
    return True

def get_mess_history(limit: int = 21) -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_mess_history(limit)
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM meal_consumption ORDER BY date DESC, meal_id DESC LIMIT ?", (limit,))
    history = [dict(r) for r in c.fetchall()]
    conn.close()
    return history

def get_kitchen_inventory() -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_kitchen_inventory()
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM kitchen_inventory ORDER BY category, name")
    items = [dict(r) for r in c.fetchall()]
    conn.close()
    return items

def update_inventory_stock(item_id: str, new_stock: float) -> bool:
    if is_firebase_active():
        return firebase_db.update_inventory_stock(item_id, new_stock)
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE kitchen_inventory SET current_stock = ? WHERE item_id = ?", (new_stock, item_id))
    conn.commit()
    conn.close()
    return True

def get_finance_overview() -> Dict[str, Any]:
    if is_firebase_active():
        return firebase_db.get_finance_overview()
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM account_transactions ORDER BY date DESC, txn_id DESC LIMIT 50")
    txns = [dict(r) for r in c.fetchall()]
    c.execute("SELECT SUM(amount) FROM account_transactions WHERE direction = 'INCOME'")
    total_income = c.fetchone()[0] or 0.0
    c.execute("SELECT SUM(amount) FROM account_transactions WHERE direction = 'EXPENSE'")
    total_expense = c.fetchone()[0] or 0.0
    c.execute("SELECT COUNT(*) FROM payments WHERE status = 'OVERDUE'")
    overdue_count = c.fetchone()[0]
    conn.close()
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_balance": total_income - total_expense,
        "overdue_invoices_count": overdue_count,
        "transactions": txns,
        "balance_formula": "Net Balance = Total Income - Total Expenditure"
    }

def create_transaction(category: str, direction: str, amount: float, description: str) -> str:
    if is_firebase_active():
        return firebase_db.create_transaction(category, direction, amount, description)
    conn = get_connection()
    c = conn.cursor()
    txn_id = f"TXN-{str(uuid.uuid4())[:6].upper()}"
    today_str = datetime.now().strftime("%Y-%m-%d")
    c.execute("""
    INSERT INTO account_transactions VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (txn_id, category, direction, amount, today_str, description, None))
    conn.commit()
    conn.close()
    return txn_id

def get_student_dues(student_id: str) -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_student_dues(student_id)
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM payments WHERE student_id = ? ORDER BY due_date ASC", (student_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def pay_student_dues(payment_id: str, student_id: str) -> Optional[float]:
    if is_firebase_active():
        return firebase_db.pay_student_dues(payment_id, student_id)
    conn = get_connection()
    c = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d")
    c.execute("SELECT * FROM payments WHERE payment_id = ?", (payment_id,))
    pay = c.fetchone()
    if not pay:
        conn.close()
        return None
    pay_dict = dict(pay)
    c.execute("UPDATE payments SET status = 'PAID', paid_date = ? WHERE payment_id = ?", (now_str, payment_id))
    txn_id = f"TXN-FEE-{str(uuid.uuid4())[:6].upper()}"
    c.execute("""
    INSERT INTO account_transactions VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        txn_id, f"Fee Payment ({pay_dict['type']})", "INCOME",
        pay_dict["amount"], now_str, f"Student {student_id} settled invoice {payment_id}", payment_id
    ))
    conn.commit()
    conn.close()
    return pay_dict["amount"]

def get_slot_booking_count(resource: str, date_str: str, slot: str) -> int:
    if is_firebase_active():
        return firebase_db.get_slot_booking_count(resource, date_str, slot)
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    SELECT COUNT(*) FROM bookings
    WHERE resource = ? AND date = ? AND slot = ? AND status = 'CONFIRMED'
    """, (resource, date_str, slot))
    count = c.fetchone()[0]
    conn.close()
    return count

def check_student_has_slot(student_id: str, resource: str, date_str: str, slot: str) -> bool:
    if is_firebase_active():
        return firebase_db.check_student_has_slot(student_id, resource, date_str, slot)
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
    SELECT COUNT(*) FROM bookings
    WHERE student_id = ? AND resource = ? AND date = ? AND slot = ?
    """, (student_id, resource, date_str, slot))
    count = c.fetchone()[0]
    conn.close()
    return count > 0

def create_booking(student_id: str, resource: str, date_str: str, slot: str) -> str:
    if is_firebase_active():
        return firebase_db.create_booking(student_id, resource, date_str, slot)
    conn = get_connection()
    c = conn.cursor()
    booking_id = f"BK-{str(uuid.uuid4())[:6].upper()}"
    c.execute("""
    INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?)
    """, (booking_id, student_id, resource, date_str, slot, "CONFIRMED"))
    conn.commit()
    conn.close()
    return booking_id

def get_bookings(student_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_bookings(student_id)
    conn = get_connection()
    c = conn.cursor()
    if student_id:
        c.execute("SELECT * FROM bookings WHERE student_id = ? ORDER BY date DESC, slot ASC", (student_id,))
    else:
        c.execute("""
        SELECT b.*, u.name as student_name, u.register_no, u.room_id
        FROM bookings b
        JOIN users u ON b.student_id = u.id
        ORDER BY b.date DESC, b.slot ASC LIMIT 50
        """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_public_showcase() -> Dict[str, Any]:
    if is_firebase_active():
        return firebase_db.get_public_showcase()
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM users WHERE role = 'student'")
    total_residents = c.fetchone()[0]
    c.execute("SELECT SUM(capacity) FROM rooms")
    total_capacity = c.fetchone()[0] or 0
    c.execute("SELECT COUNT(*) FROM rooms WHERE status = 'AVAILABLE'")
    vacant_rooms = c.fetchone()[0]
    conn.close()
    return {
        "institution": "Campus Residential Complex",
        "location": "Central Campus Green Zone",
        "hostel_name": "HostelOS Intelligent Residential Facility",
        "statistics": {
            "total_capacity": total_capacity,
            "active_residents": total_residents,
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
    if is_firebase_active():
        firebase_db.create_audit_log(actor_id, actor_role, action, resource, details)
        return
    conn = get_connection()
    c = conn.cursor()
    log_id = str(uuid.uuid4())[:8]
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    c.execute("""
    INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (log_id, actor_id, actor_role, action, resource, now_str, details))
    conn.commit()
    conn.close()

def get_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    if is_firebase_active():
        return firebase_db.get_audit_logs(limit)
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC, log_id DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows
