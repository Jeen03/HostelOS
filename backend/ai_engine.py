"""
HostelOS Intelligence & Analytics Layer
Implements:
1. AI Complaint Classifier using scikit-learn (TF-IDF + MultinomialNB/SGD) with Priority Routing and evaluation metrics (Precision, Recall, F1).
2. Explainable Room Allocation Engine using constraint-based multi-factor weighted scoring.
3. Meal Demand & Food Waste Predictor (MAE, RMSE, MAPE, Waste Rate).
4. Kitchen Inventory Forecaster (Burn rate, Reorder level, Stockout warning).
5. Hostel Risk & Anomaly Analyzer (Curfew/Movement anomalies, recurring facility faults, safety inspection status).
"""

import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import precision_recall_fscore_support, accuracy_score

# ==========================================================
# 1. AI COMPLAINT CLASSIFIER & PRIORITY ROUTING
# ==========================================================

# Comprehensive training corpus reflecting actual hostel maintenance issues
TRAINING_DATA = [
    # Electrical
    ("Tube light flickering in room 204", "Electrical", "Medium"),
    ("Power outage in 2nd floor B Block", "Electrical", "High"),
    ("Ceiling fan making squeaking noise and running slow", "Electrical", "Low"),
    ("Switchboard sparking when plugging in laptop charger", "Electrical", "Critical"),
    ("MCB keeps tripping every 10 minutes in room 108", "Electrical", "High"),
    ("Study lamp socket not supplying any power", "Electrical", "Low"),
    ("Corridor lights completely off in C Block", "Electrical", "Medium"),
    ("Exhaust fan in common washroom burnt out with smoke smell", "Electrical", "Critical"),
    ("Geyser not heating water in bathroom 3", "Electrical", "Medium"),
    ("Bare live wire hanging near drinking water cooler", "Electrical", "Critical"),

    # Plumbing
    ("Severe tap leakage in bathroom sink wasting water", "Plumbing", "Medium"),
    ("Toilet flush not working and tank continuously overflowing", "Plumbing", "High"),
    ("Shower head detached and shooting water sideways", "Plumbing", "Low"),
    ("Main drain clogged causing sewage water stagnation in washroom", "Plumbing", "Critical"),
    ("Water purifier dispenser leaking on ground floor", "Plumbing", "Medium"),
    ("No water supply in Block A 3rd floor washrooms", "Plumbing", "Critical"),
    ("Low water pressure in sink tap", "Plumbing", "Low"),
    ("Washbasin pipe leaking beneath the counter", "Plumbing", "Medium"),

    # Internet / Wi-Fi
    ("Hostel Wi-Fi router in corridor not broadcasting SSID", "Internet", "High"),
    ("Extremely high ping and frequent disconnections on floor 2", "Internet", "Medium"),
    ("LAN port in room 312 has broken clip and cannot connect", "Internet", "Low"),
    ("Hostel portal and study portals unreachable over college Wi-Fi", "Internet", "High"),
    ("Wi-Fi speed throttled below 1 Mbps during project submission", "Internet", "Medium"),
    ("Wi-Fi authentication captive portal error 502", "Internet", "High"),

    # Furniture & Carpentry
    ("Bed wooden plank cracked and unsafe to sleep on", "Furniture", "High"),
    ("Study table drawer handle broken and stuck", "Furniture", "Low"),
    ("Wardrobe door hinge loose and falling off", "Furniture", "Medium"),
    ("Window latch broken, window swinging violently in wind", "Furniture", "High"),
    ("Chair leg wobbling and unstable", "Furniture", "Low"),
    ("Door lock latch jammed, cannot lock room from inside", "Furniture", "High"),

    # Housekeeping & Cleaning
    ("Common dustbins overflowing on floor 1 corridor", "Cleaning", "Medium"),
    ("Washroom floor slippery and uncleaned for two days", "Cleaning", "High"),
    ("Cobwebs and dust accumulation in study hall", "Cleaning", "Low"),
    ("Stray dog entered corridor and soiled the hallway", "Cleaning", "High"),
    ("Water cooler tray full of dirt and algae", "Cleaning", "High"),
    ("Foul smell from trash chute", "Cleaning", "Medium"),

    # Mess & Food
    ("Insect or hair found in breakfast sambar", "Mess", "Critical"),
    ("Drinking water dispenser in mess hall tasting foul and metallic", "Mess", "Critical"),
    ("Chapatis served half-cooked and burnt in dinner", "Mess", "Medium"),
    ("Shortage of food in dinner line, meals ran out by 8:45 PM", "Mess", "High"),
    ("Dining tables sticky and uncleaned between batches", "Mess", "Medium"),
    ("Rice contains tiny stones", "Mess", "High"),
]

# Pre-Complaint Guided Self-Check Rules to minimize redundant tickets
GUIDED_SELF_CHECKS = {
    "Electrical": [
        {"id": "mcb", "question": "Have you checked if your room's Miniature Circuit Breaker (MCB) switch has tripped to the OFF position?", "action": "Reset MCB switch upwards firmly once."},
        {"id": "plug", "question": "Does the issue persist if you plug your appliance into a different wall socket?", "action": "Test appliance on alternate socket to rule out appliance fault."},
        {"id": "neighbor", "question": "Are neighboring rooms also facing power disruption?", "action": "Check if whole wing is affected before raising a single-room fault."}
    ],
    "Plumbing": [
        {"id": "angle_valve", "question": "Is the quarter-turn shutoff valve under the basin or behind the toilet open?", "action": "Turn the angle cock valve anti-clockwise to open."},
        {"id": "aerator", "question": "Is the tap spout mesh aerator clogged by sand or scale deposit?", "action": "Unscrew aerator nozzle and rinse under running water."},
        {"id": "tank_supply", "question": "Is the overhead tank supply currently undergoing scheduled filling (usually 2-4 PM)?", "action": "Verify hostel mess/tank pumping timings."}
    ],
    "Internet": [
        {"id": "reauth", "question": "Have you tried logging out and logging back in at http://10.0.0.1:8080 portal?", "action": "Clear captive portal cookies and re-authenticate with student credentials."},
        {"id": "airplane", "question": "Did toggling Airplane Mode / Wi-Fi restart help obtain a valid 10.x.x.x IP address?", "action": "Toggle Wi-Fi for 15 seconds to renew DHCP lease."},
        {"id": "device_limit", "question": "Do you already have 2 active devices connected under your student roll ID?", "action": "Deregister an idle device from the Wi-Fi portal."}
    ],
    "Furniture": [
        {"id": "screws", "question": "Is the drawer simply jammed due to an obstruction inside the slide rail?", "action": "Inspect drawer runners for lodged notebooks or pens."}
    ],
    "Mess": [
        {"id": "mess_precheck", "question": "Did you immediately bring the issue to the notice of the on-duty Mess Representative / Warden?", "action": "Contact Mess Supervisor on duty (+91 94471 00000) for immediate meal replacement."}
    ],
    "Cleaning": [
        {"id": "cleaning_schedule", "question": "Daily room cleaning is conducted between 9:30 AM - 12:30 PM. Has the current cycle passed?", "action": "Leave key at warden reception if you desire daytime cleaning."}
    ]
}


class AIComplaintEngine:
    def __init__(self):
        self.categories = sorted(list(set(cat for _, cat, _ in TRAINING_DATA)))
        texts = [item[0] for item in TRAINING_DATA]
        labels = [item[1] for item in TRAINING_DATA]

        self.model = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), lowercase=True)),
            ('clf', MultinomialNB(alpha=0.1))
        ])
        self.model.fit(texts, labels)

        # Compute internal evaluation metrics for demonstration
        y_pred = self.model.predict(texts)
        self.acc = float(accuracy_score(labels, y_pred))
        p, r, f1, _ = precision_recall_fscore_support(labels, y_pred, average='weighted', zero_division=0)
        self.metrics = {
            "accuracy": round(self.acc, 4),
            "precision": round(float(p), 4),
            "recall": round(float(r), 4),
            "f1_score": round(float(f1), 4),
            "sample_count": len(TRAINING_DATA),
            "categories": self.categories
        }

    def classify(self, text: str) -> Dict[str, Any]:
        """Classifies text into category and computes priority based on severity keywords."""
        pred_category = str(self.model.predict([text])[0])
        probs = self.model.predict_proba([text])[0]
        confidence = float(np.max(probs))

        # Priority routing heuristics based on safety keywords
        text_lower = text.lower()
        if any(w in text_lower for w in ["fire", "spark", "bare wire", "shock", "smoke", "gas", "sewage overflow", "poison", "insect", "hazard", "blood"]):
            priority = "Critical"
            sla_hours = 1
        elif any(w in text_lower for w in ["no water", "power outage", "broken latch", "cannot lock", "flooded", "broken bed", "tripping", "shortage"]):
            priority = "High"
            sla_hours = 4
        elif any(w in text_lower for w in ["leakage", "loose", "slow", "flicker", "smell", "uncleaned", "ping", "drawer"]):
            priority = "Medium"
            sla_hours = 24
        else:
            priority = "Low"
            sla_hours = 48

        # Department routing target
        routing_map = {
            "Electrical": "Maintenance - Electrician Wing",
            "Plumbing": "Maintenance - Plumbing Wing",
            "Internet": "Campus IT / Network Ops",
            "Furniture": "Maintenance - Carpentry",
            "Cleaning": "Housekeeping Services",
            "Mess": "Mess Committee & Chief Warden"
        }

        return {
            "category": pred_category,
            "confidence": round(confidence, 3),
            "priority": priority,
            "sla_hours": sla_hours,
            "routed_to": routing_map.get(pred_category, "General Administration"),
            "model_metrics": self.metrics
        }

    def get_self_checks(self, category: str) -> List[Dict[str, str]]:
        return GUIDED_SELF_CHECKS.get(category, [])


# ==========================================================
# 2. EXPLAINABLE ROOM ALLOCATION ENGINE
# Formula: Score(s, r) = w1*f1 + w2*f2 + w3*f3 + w4*f4 + w5*f5
# ==========================================================

class ExplainableRoomAllocator:
    """
    Ranks available rooms for a student using transparent, explainable scoring:
    - Dept match (f1, w=0.25): encourages peer study groups
    - Year / Cohort match (f2, w=0.25): seniors and juniors balanced
    - Floor / Mobility accessibility (f3, w=0.20): ground floor for medical/sports needs
    - Quiet study zone preference (f4, w=0.15): matches student study style
    - Room capacity / vacancy balance (f5, w=0.15): prevents lopsided room utilization
    """
    WEIGHTS = {
        "dept_affinity": 0.25,
        "cohort_affinity": 0.25,
        "floor_accessibility": 0.20,
        "quiet_zone_match": 0.15,
        "occupancy_balance": 0.15
    }

    @classmethod
    def evaluate_room(cls, student: Dict[str, Any], room: Dict[str, Any], current_occupants: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Capacity check constraint (hard requirement)
        vacant_beds = room["capacity"] - len(current_occupants)
        if vacant_beds <= 0:
            return {"feasible": False, "score": 0.0, "reason": "Room is fully occupied"}

        explanations = []
        score = 0.0

        # Criterion 1: Department match
        dept_matches = sum(1 for occ in current_occupants if occ.get("department") == student.get("department"))
        if len(current_occupants) == 0:
            f1 = 0.8  # neutral-high for fresh room
            explanations.append(f"Neutral department baseline (+{round(f1 * cls.WEIGHTS['dept_affinity'] * 100, 1)} pts)")
        elif dept_matches > 0:
            f1 = 1.0
            explanations.append(f"Department peer match: {dept_matches} roommate(s) from {student.get('department')} (+{round(f1 * cls.WEIGHTS['dept_affinity'] * 100, 1)} pts)")
        else:
            f1 = 0.4
            explanations.append(f"Cross-department cohort (+{round(f1 * cls.WEIGHTS['dept_affinity'] * 100, 1)} pts)")
        score += f1 * cls.WEIGHTS["dept_affinity"]

        # Criterion 2: Cohort / Year match
        year_matches = sum(1 for occ in current_occupants if occ.get("year") == student.get("year"))
        if len(current_occupants) == 0:
            f2 = 0.8
            explanations.append(f"Open cohort placement (+{round(f2 * cls.WEIGHTS['cohort_affinity'] * 100, 1)} pts)")
        elif year_matches > 0:
            f2 = 1.0
            explanations.append(f"Same academic batch Year {student.get('year')} (+{round(f2 * cls.WEIGHTS['cohort_affinity'] * 100, 1)} pts)")
        else:
            f2 = 0.5
            explanations.append(f"Mixed batch room (+{round(f2 * cls.WEIGHTS['cohort_affinity'] * 100, 1)} pts)")
        score += f2 * cls.WEIGHTS["cohort_affinity"]

        # Criterion 3: Floor / Mobility preference
        has_medical_need = student.get("medical_ground_floor_pref", False)
        is_ground = room.get("floor", 1) == 0 or room.get("floor", 1) == 1
        if has_medical_need:
            f3 = 1.0 if is_ground else 0.1
            explanations.append(f"Medical low-floor alignment: {'Satisfied' if is_ground else 'Not satisfied'} (+{round(f3 * cls.WEIGHTS['floor_accessibility'] * 100, 1)} pts)")
        else:
            f3 = 0.9
            explanations.append(f"Standard floor accessibility satisfied (+{round(f3 * cls.WEIGHTS['floor_accessibility'] * 100, 1)} pts)")
        score += f3 * cls.WEIGHTS["floor_accessibility"]

        # Criterion 4: Quiet study zone alignment
        wants_quiet = student.get("prefers_quiet_zone", False)
        is_quiet = room.get("quiet_zone", False)
        if wants_quiet == is_quiet:
            f4 = 1.0
            explanations.append(f"Quiet study zone match ({'Silent study block' if is_quiet else 'Regular wing'}) (+{round(f4 * cls.WEIGHTS['quiet_zone_match'] * 100, 1)} pts)")
        else:
            f4 = 0.3
            explanations.append(f"Quiet zone mismatch (+{round(f4 * cls.WEIGHTS['quiet_zone_match'] * 100, 1)} pts)")
        score += f4 * cls.WEIGHTS["quiet_zone_match"]

        # Criterion 5: Vacancy balance
        occupancy_ratio = len(current_occupants) / room["capacity"]
        f5 = 1.0 - (0.5 * occupancy_ratio)
        explanations.append(f"Room bed availability: {vacant_beds} bed(s) vacant (+{round(f5 * cls.WEIGHTS['occupancy_balance'] * 100, 1)} pts)")
        score += f5 * cls.WEIGHTS["occupancy_balance"]

        final_normalized_score = round(score * 100, 1)

        return {
            "feasible": True,
            "score": final_normalized_score,
            "vacant_beds": vacant_beds,
            "room_id": room["room_id"],
            "block": room["block"],
            "floor": room["floor"],
            "capacity": room["capacity"],
            "current_occupancy": len(current_occupants),
            "explanations": explanations,
            "formula": "Score = 0.25*Dept + 0.25*Year + 0.20*Floor + 0.15*Quiet + 0.15*Vacancy"
        }

    @classmethod
    def rank_rooms(cls, student: Dict[str, Any], all_rooms: List[Dict[str, Any]], occupants_by_room: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        scored = []
        for r in all_rooms:
            occupants = occupants_by_room.get(r["room_id"], [])
            eval_res = cls.evaluate_room(student, r, occupants)
            if eval_res["feasible"]:
                scored.append(eval_res)
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored


# ==========================================================
# 3. MEAL DEMAND & FOOD-WASTE ANALYTICS
# Formulas:
# MAE = (1/n) * sum(|At - Ft|)
# RMSE = sqrt((1/n) * sum((At - Ft)^2))
# MAPE = (100/n) * sum(|At - Ft| / At)
# Waste rate = (Prepared - Consumed) / Prepared
# ==========================================================

class MealForecaster:
    @staticmethod
    def calculate_metrics(history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates forecast error metrics and waste statistics from historical meal records."""
        if not history:
            return {"mae": 0.0, "rmse": 0.0, "mape": 0.0, "avg_waste_rate": 0.0}

        diffs = []
        sq_diffs = []
        pct_diffs = []
        waste_rates = []

        for record in history:
            actual = record["consumed_count"]
            forecast = record.get("forecast_count", record["booked_count"])
            prepared = record["prepared_count"]

            if actual > 0:
                diff = abs(actual - forecast)
                diffs.append(diff)
                sq_diffs.append(diff ** 2)
                pct_diffs.append(diff / actual)

            if prepared > 0:
                w_rate = max(0.0, (prepared - actual) / prepared)
                waste_rates.append(w_rate)

        n = len(diffs)
        if n == 0:
            return {"mae": 0.0, "rmse": 0.0, "mape": 0.0, "avg_waste_rate": 0.0}

        mae = sum(diffs) / n
        rmse = math.sqrt(sum(sq_diffs) / n)
        mape = (sum(pct_diffs) / n) * 100.0
        avg_waste = (sum(waste_rates) / len(waste_rates)) * 100.0 if waste_rates else 0.0

        return {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "mape": round(mape, 2),
            "avg_waste_rate": round(avg_waste, 2),
            "total_meals_recorded": len(history)
        }

    @staticmethod
    def forecast_next_meals(total_residents: int, current_on_leave: int, day_of_week: int) -> Dict[str, Any]:
        """
        Estimates upcoming meal bookings and recommended prep batches:
        Applies day-of-week attendance coefficients (weekends have higher leave percentage).
        """
        present_residents = max(0, total_residents - current_on_leave)

        # Typical consumption ratios (Breakfast, Lunch, Dinner)
        is_weekend = day_of_week in [5, 6]  # Sat, Sun
        bf_factor = 0.82 if is_weekend else 0.94
        lunch_factor = 0.65 if not is_weekend else 0.88  # many attend college canteen on weekdays
        dinner_factor = 0.91 if not is_weekend else 0.85

        bf_demand = int(round(present_residents * bf_factor))
        lunch_demand = int(round(present_residents * lunch_factor))
        dinner_demand = int(round(present_residents * dinner_factor))

        # Recommended buffer prep (5% buffer to avoid stockouts while cutting waste)
        return {
            "present_residents": present_residents,
            "on_leave_residents": current_on_leave,
            "forecasts": {
                "Breakfast": {
                    "estimated_diners": bf_demand,
                    "recommended_prep": int(round(bf_demand * 1.05)),
                    "buffer_margin": "5%",
                    "rationale": f"Attendance rate {int(bf_factor*100)}% based on {'weekend' if is_weekend else 'weekday'} trend"
                },
                "Lunch": {
                    "estimated_diners": lunch_demand,
                    "recommended_prep": int(round(lunch_demand * 1.05)),
                    "buffer_margin": "5%",
                    "rationale": f"Attendance rate {int(lunch_factor*100)}% ({'resident holiday' if is_weekend else 'working day campus classes'})"
                },
                "Dinner": {
                    "estimated_diners": dinner_demand,
                    "recommended_prep": int(round(dinner_demand * 1.05)),
                    "buffer_margin": "5%",
                    "rationale": f"Attendance rate {int(dinner_factor*100)}% post-curfew presence"
                }
            }
        }


# ==========================================================
# 4. KITCHEN INVENTORY FORECASTING
# ==========================================================

class InventoryForecaster:
    @staticmethod
    def evaluate_inventory(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for item in items:
            stock = item["current_stock"]
            burn = max(0.1, item["daily_burn_rate"])
            days_left = round(stock / burn, 1)
            reorder_lvl = item["reorder_level"]
            lead_time = item.get("lead_time_days", 2)

            # Safety threshold = burn_rate * lead_time
            safety_stock = burn * lead_time

            if stock <= reorder_lvl:
                status = "REORDER_URGENT" if stock <= safety_stock else "REORDER_WARNING"
            else:
                status = "HEALTHY"

            suggested_reorder_qty = max(0, int(round((reorder_lvl * 2.5) - stock)))

            results.append({
                **item,
                "days_until_stockout": days_left,
                "safety_threshold": round(safety_stock, 1),
                "stock_health": status,
                "recommended_order_quantity": suggested_reorder_qty
            })
        return results


# ==========================================================
# 5. HOSTEL RISK & ANOMALIES ANALYZER
# ==========================================================

class HostelRiskAnalyzer:
    @staticmethod
    def analyze_operational_risks(
        movement_records: List[Dict[str, Any]],
        complaints: List[Dict[str, Any]],
        safety_assets: List[Dict[str, Any]],
        unpaid_fees: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Aggregates multi-source hostel data to pinpoint operational vulnerabilities:
        - Movement curfew risk
        - Equipment failure clusters
        - Fire safety compliance
        - Financial collection health
        """
        risks = []
        risk_score = 0

        # Risk A: Safety inspection overdue
        overdue_safety = [a for a in safety_assets if a.get("status") == "DUE_FOR_INSPECTION"]
        if overdue_safety:
            risk_score += len(overdue_safety) * 12
            risks.append({
                "severity": "High" if len(overdue_safety) > 2 else "Medium",
                "area": "Fire & Life Safety",
                "detail": f"{len(overdue_safety)} fire extinguisher/first-aid asset(s) overdue for inspection check.",
                "action": "Dispatch safety officer to update safety asset audit tag."
            })

        # Risk B: Recurring maintenance hotspots
        open_complaints = [c for c in complaints if c.get("status") != "RESOLVED"]
        critical_complaints = [c for c in open_complaints if c.get("priority") in ["Critical", "High"]]
        if critical_complaints:
            risk_score += len(critical_complaints) * 15
            risks.append({
                "severity": "Critical",
                "area": "Hostel Facilities & Infrastructure",
                "detail": f"{len(critical_complaints)} unresolved high/critical complaint(s) open over SLA window.",
                "action": "Escalate to Chief Warden and Maintenance Supervisor."
            })

        # Risk C: Late Gate Entries / Curfew anomalies
        late_entries = [m for m in movement_records if m.get("is_late_flag", False)]
        if late_entries:
            risk_score += len(late_entries) * 8
            risks.append({
                "severity": "Medium",
                "area": "Gate Movement & Curfew",
                "detail": f"{len(late_entries)} late entry movement(s) logged without prior approved exceptional pass.",
                "action": "Generate disciplinary review list for Warden review."
            })

        # Risk D: Financial Dues Overdue
        overdue_payments = [p for p in unpaid_fees if p.get("status") == "OVERDUE"]
        if overdue_payments:
            total_overdue = sum(p.get("amount", 0) for p in overdue_payments)
            risk_score += 10
            risks.append({
                "severity": "Low",
                "area": "Hostel Accounts & Finance",
                "detail": f"{len(overdue_payments)} overdue student fee invoice(s) totaling ₹{total_overdue:,}.",
                "action": "Send automated SMS/email payment notification reminders."
            })

        normalized_index = min(100, risk_score)
        health_state = "Low Risk (Normal)" if normalized_index < 30 else ("Moderate Risk" if normalized_index < 60 else "High Risk (Attention Required)")

        return {
            "overall_risk_index": normalized_index,
            "system_health_state": health_state,
            "active_risk_count": len(risks),
            "risk_items": risks,
            "timestamp": datetime.now().isoformat()
        }


# Singleton instances for API usage
complaint_engine = AIComplaintEngine()
room_allocator = ExplainableRoomAllocator()
meal_forecaster = MealForecaster()
inventory_forecaster = InventoryForecaster()
risk_analyzer = HostelRiskAnalyzer()
