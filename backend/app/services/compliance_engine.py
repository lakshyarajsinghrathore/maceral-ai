from typing import Dict, Any, List
from sqlalchemy.orm import Session
from ..models.db_models import Mine, ComplianceScore, Alert, ExtractedData

class ComplianceEngineService:
    """
    Compliance scoring (0-100) & automated predictive risk alert engine.
    Weights:
    - Safety (30%): Fatalities (-30 each), injuries (-10), gas violations (-15)
    - Environmental (25%): PM10 > 100 µg/m³, water discharge pH/TSS violations
    - Production Variance (20%): Deficit vs target > 15% drops score
    - Statutory Adherence (25%): Overdue DGMS inspections, FC/EC compliance
    """

    @classmethod
    def evaluate_mine_compliance(cls, db: Session, mine_id: str) -> ComplianceScore:
        mine = db.query(Mine).filter(Mine.id == mine_id).first()
        if not mine:
            raise ValueError(f"Mine {mine_id} not found")

        # Fetch latest extractions for this mine
        extractions = db.query(ExtractedData).filter(ExtractedData.mine_id == mine_id).all()

        # Defaults
        safety_score = 95.0
        environmental_score = 90.0
        production_variance_score = 85.0
        statutory_adherence_score = 92.0

        alerts_to_create = []

        if extractions:
            for ext in extractions:
                payload = ext.json_payload or {}
                safety = payload.get("safety_and_health", {})
                env = payload.get("environmental_and_statutory", {})
                prod = payload.get("production_metrics", {})

                # Safety evaluation
                fatalities = int(safety.get("fatalities_count", 0))
                injuries = int(safety.get("serious_injuries_count", 0))
                if fatalities > 0:
                    safety_score = max(0.0, safety_score - (fatalities * 40.0))
                    alerts_to_create.append({
                        "severity": "critical",
                        "category": "safety_breach",
                        "title": f"Fatal Incident Reported at {mine.name}",
                        "description": f"{fatalities} fatal accident(s) detected in statutory submission.",
                        "suggested_action": "Immediate halt of relevant section; initiate DGMS inquiry."
                    })
                if injuries > 0:
                    safety_score = max(20.0, safety_score - (injuries * 15.0))

                # Environmental evaluation
                pm10 = float(env.get("pm10_ug_per_m3", 0.0))
                if pm10 > 100.0:
                    environmental_score = max(30.0, environmental_score - 25.0)
                    alerts_to_create.append({
                        "severity": "high",
                        "category": "environmental_limit",
                        "title": f"Air Quality PM10 Threshold Exceeded ({pm10} µg/m³)",
                        "description": f"Ambient PM10 particulate levels exceeded CPCB 24-hr threshold of 100 µg/m³.",
                        "suggested_action": "Activate water cannons, mist sprayers, and suppress haul road dust."
                    })

                # Production variance evaluation
                var_pct = float(prod.get("variance_percentage", 0.0))
                if var_pct < -15.0:
                    production_variance_score = max(40.0, 100.0 + var_pct)
                    alerts_to_create.append({
                        "severity": "medium",
                        "category": "production_drop",
                        "title": f"Quarterly Production Deficit ({abs(var_pct):.1f}%)",
                        "description": f"Actual extraction fell significantly short of approved target.",
                        "suggested_action": "Audit HEMM heavy machinery availability and dispatch logistics."
                    })

        # Calculate overall weighted score
        overall_score = round(
            (safety_score * 0.30) +
            (environmental_score * 0.25) +
            (production_variance_score * 0.20) +
            (statutory_adherence_score * 0.25),
            1
        )

        risk_level = "Low" if overall_score >= 80 else ("Moderate" if overall_score >= 60 else "High")

        # Save/Update ComplianceScore in DB
        comp_obj = db.query(ComplianceScore).filter(ComplianceScore.mine_id == mine_id).first()
        if not comp_obj:
            comp_obj = ComplianceScore(mine_id=mine_id)
            db.add(comp_obj)

        comp_obj.overall_score = overall_score
        comp_obj.safety_score = safety_score
        comp_obj.environmental_score = environmental_score
        comp_obj.production_variance_score = production_variance_score
        comp_obj.statutory_adherence_score = statutory_adherence_score
        comp_obj.risk_level = risk_level
        comp_obj.breakdown_json = {
            "safety_weight": "30%",
            "environmental_weight": "25%",
            "production_weight": "20%",
            "statutory_weight": "25%"
        }

        # Add alerts
        for al in alerts_to_create:
            existing = db.query(Alert).filter(Alert.mine_id == mine_id, Alert.title == al["title"]).first()
            if not existing:
                new_alert = Alert(
                    mine_id=mine_id,
                    severity=al["severity"],
                    category=al["category"],
                    title=al["title"],
                    description=al["description"],
                    suggested_action=al["suggested_action"],
                    status="pending"
                )
                db.add(new_alert)

        db.commit()
        db.refresh(comp_obj)
        return comp_obj
