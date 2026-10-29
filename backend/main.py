"""
HostelOS REST API Backend (FastAPI)
Implements all 4 modules and 7 roles defined in the B.Tech Phase-I Project Report:
- Core Administration, Identity and Movement Authorization Module
- Safety, Emergency and Gate Verification Module
- Intelligence and Analytics Module
- Resident Services and Finance Module

Database Layer: Google Cloud Firestore (via firebase-admin) with seamless SQLite fallback.
"""

import sys
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database
from ai_engine import (
    complaint_engine,
    room_allocator,
    meal_forecaster,
    inventory_forecaster,
    risk_analyzer
)

app = FastAPI(
    title="HostelOS - Intelligent Hostel Operations API",
    description="Unified hostel management, Cloud Firestore backend, server-side QR movement, safety SOS, AI intelligence layer, and resident finance.",
    version="2.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    database.init_db()


# ==========================================================
# PYDANTIC REQUEST / RESPONSE SCHEMAS
# ==========================================================

class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = "password123"
    role: Optional[str] = None

class LeaveRequestCreate(BaseModel):
    student_id: str
    type: str  # 'Late Return', 'Holiday Outing', 'Medical Visit', 'Personal Visit'
    from_time: str
    to_time: str
    destination: str
    reason: str

class LeaveApprovalUpdate(BaseModel):
    leave_id: str
    warden_id: str
    decision: str  # 'APPROVED' or 'REJECTED'
    comment: Optional[str] = "Approved by Warden"

class QRVerificationRequest(BaseModel):
    token_id: str
    gate_name: Optional[str] = "Main Campus Gate"
    security_officer_id: Optional[str] = "u_security"
    direction: Optional[str] = "AUTO"  # 'ENTRY', 'EXIT', or 'AUTO'

class ComplaintCreate(BaseModel):
    student_id: str
    room_id: Optional[str] = None
    title: str
    description: str
    precheck_completed: bool = True

class ComplaintStatusUpdate(BaseModel):
    complaint_id: str
    status: str  # 'OPEN', 'IN_PROGRESS', 'RESOLVED'
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

class SOSCreate(BaseModel):
    student_id: str
    location: str
    description: str

class SOSStatusUpdate(BaseModel):
    incident_id: str
    status: str  # 'Triggered', 'Alerted', 'Acknowledged', 'Responding', 'Resolved'
    officer_id: str
    notes: Optional[str] = None

class BookingCreate(BaseModel):
    student_id: str
    resource: str
    date: str
    slot: str

class TransactionCreate(BaseModel):
    category: str
    direction: str  # 'INCOME' or 'EXPENSE'
    amount: float
    description: str

class PaymentRecord(BaseModel):
    payment_id: str
    student_id: str

class RoomAllocationRequest(BaseModel):
    name: str
    register_no: str
    department: str
    year: int
    gender: str = "Male"
    prefers_quiet_zone: bool = False
    medical_ground_floor_pref: bool = False


# ==========================================================
# DATABASE STATUS (Cloud Firestore / SQLite)
# ==========================================================

@app.get("/api/database/status")
def get_database_status():
    """Returns database connection status, provider (Firestore / SQLite fallback), and project metadata."""
    return database.get_database_status()


# ==========================================================
# AUTHENTICATION & USER CONTEXT (7 ROLES)
# ==========================================================

@app.post("/api/auth/login")
def login(req: LoginRequest):
    """Authenticates username/email/register_no and role, returning user profile session."""
    user = database.get_user_by_login(req.username)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Account not found. Please verify your username, email, or register number."
        )

    # Password validation
    if user.get("password") and req.password:
        if user["password"] != req.password:
            raise HTTPException(
                status_code=401,
                detail="Incorrect password. (Default demo password is 'password123')"
            )

    # Role matching validation if a specific role was requested
    if req.role and user.get("role"):
        target_role = req.role.lower()
        actual_role = user["role"].lower()
        role_matches = (
            actual_role == target_role or
            (target_role == "administrator" and actual_role in ["admin", "administrator"])
        )
        if not role_matches:
            raise HTTPException(
                status_code=403,
                detail=f"This account belongs to the '{user['role'].title()}' portal, not '{req.role.title()}'. Please choose the matching role."
            )

    if user.get("room_id") and "room_details" not in user:
        prof = database.get_user_profile(user["id"])
        if prof and "room_details" in prof:
            user["room_details"] = prof["room_details"]

    return {
        "status": "SUCCESS",
        "token": f"token_{str(uuid.uuid4())[:12]}",
        "user": user
    }

@app.get("/api/auth/users")
def get_all_users():
    """Returns demo users across all 7 roles for instant role-switching in the UI."""
    return database.get_all_users()

@app.get("/api/users/{user_id}")
def get_user_profile(user_id: str):
    user = database.get_user_profile(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ==========================================================
# MODULE 1: CORE ADMINISTRATION & IDENTITY
# ==========================================================

@app.get("/api/admin/dashboard-stats")
def get_dashboard_stats():
    return database.get_dashboard_stats()

@app.get("/api/rooms")
def list_rooms():
    return database.get_rooms()

@app.post("/api/rooms/allocate-explainable")
def allocate_room_explainable(req: RoomAllocationRequest):
    """
    Evaluates and ranks all rooms for the new or moving student using
    the explainable multi-criterion formula from Section 4.4.1.
    """
    rooms = database.get_rooms()
    occupants_by_room = {r["room_id"]: r.get("occupants", []) for r in rooms}
    student_dict = req.dict()
    ranked_rooms = room_allocator.rank_rooms(student_dict, rooms, occupants_by_room)

    return {
        "candidate": student_dict,
        "recommendations": ranked_rooms,
        "top_recommendation": ranked_rooms[0] if ranked_rooms else None
    }

@app.post("/api/rooms/assign")
def assign_student_to_room(student_id: str = Query(...), room_id: str = Query(...)):
    res = database.assign_student_to_room(student_id, room_id)
    if res.get("status") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail=res["message"])
    if res.get("status") == "FULL":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


# ==========================================================
# MODULE 1 & 2: LEAVE & EXCEPTIONAL-MOVEMENT QR WORKFLOW
# ==========================================================

@app.get("/api/leave/requests")
def get_leave_requests(student_id: Optional[str] = None):
    return database.get_leave_requests(student_id)

@app.post("/api/leave/request")
def create_leave_request(req: LeaveRequestCreate):
    leave_id = database.create_leave_request(req.dict())
    return {
        "status": "SUCCESS",
        "leave_id": leave_id,
        "message": "Exceptional movement request submitted for Warden approval."
    }

@app.post("/api/leave/decide")
def decide_leave_request(approval: LeaveApprovalUpdate):
    """
    Warden reviews and approves/rejects request.
    If APPROVED: Generates a temporary, server-verified QR token with valid_from and expiry.
    """
    res = database.decide_leave_request(
        approval.leave_id,
        approval.warden_id,
        approval.decision,
        approval.comment or f"Decision by Warden ({approval.decision})"
    )
    if res.get("status") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Leave request not found")

    return {
        "status": "SUCCESS",
        "decision": approval.decision,
        "token": res.get("token"),
        "message": f"Leave request {approval.decision.lower()} successfully."
    }


# ==========================================================
# MODULE 2: GATE QR VERIFICATION & MOVEMENT
# Mathematical Logic from Section 3.8:
# Valid(T) = exists(T) AND now < expiry AND status == UNUSED AND
#            student matches AND permission approved AND state compatible
# ==========================================================

@app.post("/api/gate/verify-qr")
def verify_gate_qr(req: QRVerificationRequest):
    """
    Scanned at the gate by Security Personnel.
    Token reference verified strictly on the server against all security criteria.
    """
    return database.verify_gate_qr(
        req.token_id,
        req.gate_name or "Main Campus Gate",
        req.security_officer_id or "u_security",
        req.direction or "AUTO"
    )

@app.get("/api/gate/movement-records")
def list_movement_records(limit: int = 50):
    return database.get_movement_records(limit)


# ==========================================================
# MODULE 2: SAFETY BLUEPRINT & EMERGENCY SOS
# Lifecycle: Triggered -> Alerted -> Acknowledged -> Responding -> Resolved
# ==========================================================

@app.get("/api/safety/assets")
def list_safety_assets():
    return database.get_safety_assets()

@app.post("/api/safety/inspect-asset")
def inspect_safety_asset(asset_id: str = Query(...), status: str = Query(...)):
    return database.inspect_safety_asset(asset_id, status)

@app.get("/api/sos/incidents")
def list_sos_incidents():
    return database.get_sos_incidents()

@app.post("/api/sos/trigger")
def trigger_sos(req: SOSCreate):
    incident_id = database.create_sos_incident(req.student_id, req.location, req.description)
    return {
        "status": "ALERTED",
        "incident_id": incident_id,
        "message": "EMERGENCY ALERT BROADCAST to Warden, Security Post, and Medical Room immediately."
    }

@app.post("/api/sos/update-status")
def update_sos_status(req: SOSStatusUpdate):
    database.update_sos_status(req.incident_id, req.status, req.officer_id, req.notes)
    return {"status": "SUCCESS", "incident_status": req.status}


# ==========================================================
# MODULE 3: COMPLAINTS & GUIDED PRE-CHECK
# ==========================================================

@app.get("/api/complaints/self-check-questions")
def get_guided_self_checks(category: str):
    """Provides guided self-checks (e.g. check MCB / angle valve) prior to filing ticket."""
    checks = complaint_engine.get_self_checks(category)
    return {"category": category, "checklist": checks}

@app.post("/api/ai/classify-text")
def classify_complaint_text(text: str = Query(...)):
    """Runs scikit-learn NLP classification on complaint text."""
    return complaint_engine.classify(text)

@app.get("/api/complaints")
def list_complaints(student_id: Optional[str] = None):
    return database.get_complaints(student_id)

@app.post("/api/complaints/register")
def register_complaint(req: ComplaintCreate):
    full_text = f"{req.title} {req.description}"
    ai_result = complaint_engine.classify(full_text)
    complaint_id = database.create_complaint(
        req.student_id,
        req.room_id,
        req.title,
        req.description,
        ai_result,
        req.precheck_completed
    )
    return {
        "status": "SUCCESS",
        "complaint_id": complaint_id,
        "classification": ai_result
    }

@app.post("/api/complaints/update-status")
def update_complaint_status(req: ComplaintStatusUpdate):
    database.update_complaint_status(
        req.complaint_id,
        req.status,
        req.assigned_to,
        req.resolution_notes
    )
    return {"status": "SUCCESS", "complaint_id": req.complaint_id, "updated_status": req.status}


# ==========================================================
# MODULE 3: MESS DEMAND & INVENTORY FORECASTING
# ==========================================================

@app.get("/api/mess/overview")
def get_mess_overview():
    users = database.get_all_users()
    students = [u for u in users if u.get("role") == "student"]
    total_students = len(students)
    on_leave = sum(1 for s in students if s.get("presence_status") == "ON LEAVE")
    history = database.get_mess_history(21)
    metrics = meal_forecaster.calculate_metrics(history)
    today_dow = datetime.now().weekday()
    upcoming_forecast = meal_forecaster.forecast_next_meals(total_students, on_leave, today_dow)

    return {
        "metrics": metrics,
        "upcoming_forecast": upcoming_forecast,
        "historical_records": history
    }

@app.get("/api/mess/inventory")
def get_kitchen_inventory():
    items = database.get_kitchen_inventory()
    evaluated_inventory = inventory_forecaster.evaluate_inventory(items)
    return evaluated_inventory

@app.post("/api/mess/update-stock")
def update_inventory_stock(item_id: str = Query(...), new_stock: float = Query(...)):
    database.update_inventory_stock(item_id, new_stock)
    return {"status": "SUCCESS", "item_id": item_id, "current_stock": new_stock}


# ==========================================================
# MODULE 3: RISK ANALYSIS & ANOMALIES
# ==========================================================

@app.get("/api/analytics/risk-report")
def get_risk_report():
    movements = database.get_movement_records(100)
    complaints = database.get_complaints()
    assets = database.get_safety_assets()

    # Find unpaid overdue fees across all students
    all_users = database.get_all_users()
    all_overdues = []
    for u in all_users:
        if u.get("role") == "student":
            dues = database.get_student_dues(u["id"])
            all_overdues.extend([d for d in dues if d.get("status") == "OVERDUE"])

    report = risk_analyzer.analyze_operational_risks(movements, complaints, assets, all_overdues)
    return report


# ==========================================================
# MODULE 4: RESIDENT SERVICES & FINANCE
# ==========================================================

@app.get("/api/finance/overview")
def get_finance_overview():
    return database.get_finance_overview()

@app.post("/api/finance/transaction")
def create_transaction(txn: TransactionCreate):
    txn_id = database.create_transaction(
        txn.category,
        txn.direction,
        txn.amount,
        txn.description
    )
    return {"status": "SUCCESS", "txn_id": txn_id}

@app.get("/api/student/dues")
def get_student_dues(student_id: str):
    return database.get_student_dues(student_id)

@app.post("/api/student/pay-dues")
def pay_student_dues(req: PaymentRecord):
    amount = database.pay_student_dues(req.payment_id, req.student_id)
    if amount is None:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return {"status": "SUCCESS", "message": f"Payment of ₹{amount} confirmed."}


# ==========================================================
# AMENITY BOOKINGS (GYM, FITNESS CORNER, WI-FI, ENTERTAINMENT)
# Capacity check: Accept booking if Booked(slot) < Capacity(slot)
# ==========================================================

RESOURCE_CAPACITIES = {
    "Gymnasium": 15,
    "Fitness Corner": 10,
    "Entertainment Corner": 20,
    "Study Hub Wi-Fi": 30
}

@app.get("/api/amenities/slots")
def get_amenity_slots(resource: str, date: Optional[str] = None):
    date_str = date or datetime.now().strftime("%Y-%m-%d")
    slots = [
        "06:00 - 07:00 AM",
        "07:00 - 08:00 AM",
        "08:00 - 09:00 AM",
        "16:00 - 17:00 PM",
        "17:00 - 18:00 PM",
        "18:00 - 19:00 PM",
        "19:00 - 20:00 PM",
        "20:00 - 21:00 PM",
    ]

    capacity = RESOURCE_CAPACITIES.get(resource, 10)
    slot_details = []

    for slot in slots:
        booked_count = database.get_slot_booking_count(resource, date_str, slot)
        remaining = max(0, capacity - booked_count)
        slot_details.append({
            "slot": slot,
            "capacity": capacity,
            "booked": booked_count,
            "remaining": remaining,
            "available": remaining > 0
        })

    return {
        "resource": resource,
        "date": date_str,
        "max_capacity": capacity,
        "slots": slot_details
    }

@app.post("/api/amenities/book")
def book_amenity_slot(b: BookingCreate):
    capacity = RESOURCE_CAPACITIES.get(b.resource, 10)
    booked_count = database.get_slot_booking_count(b.resource, b.date, b.slot)
    if booked_count >= capacity:
        raise HTTPException(status_code=400, detail="Slot capacity reached. Please select an alternate time.")

    if database.check_student_has_slot(b.student_id, b.resource, b.date, b.slot):
        raise HTTPException(status_code=400, detail="You already hold a confirmed reservation for this slot.")

    booking_id = database.create_booking(b.student_id, b.resource, b.date, b.slot)
    return {"status": "SUCCESS", "booking_id": booking_id, "message": f"Slot reserved for {b.resource} at {b.slot}."}

@app.get("/api/bookings")
def list_student_bookings(student_id: Optional[str] = None):
    return database.get_bookings(student_id)


# ==========================================================
# PUBLIC COLLEGE WEBSITE SHOWCASE WIDGET
# Exposes only non-sensitive, aggregated hostel information
# ==========================================================

@app.get("/api/public/showcase")
def get_public_showcase():
    return database.get_public_showcase()


# ==========================================================
# SYSTEM AUDIT LOGS
# ==========================================================

@app.get("/api/audit/logs")
def get_audit_logs(limit: int = 50):
    return database.get_audit_logs(limit)


# ==========================================================
# HEALTH CHECK (FOR RENDER / CLOUD MONITORING)
# ==========================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "HostelOS API",
        "timestamp": datetime.utcnow().isoformat(),
        "database": database.get_database_status()
    }


# ==========================================================
# SERVE PRODUCTION FRONTEND (SINGLE-CONTAINER / UNIFIED HOSTING)
# ==========================================================
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    # Mount assets if directory exists
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

    # Catch-all route to serve static assets or index.html (SPA support)
    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        # Don't hijack API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        target = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(target):
            return FileResponse(target)
        
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        
        raise HTTPException(status_code=404, detail="Page not found")

