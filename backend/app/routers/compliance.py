from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.schemas import MineSchema, ComplianceScoreResponse, AlertResponse, AlertActionRequest, TelemetrySummaryResponse
from ..models.db_models import Mine, ComplianceScore, Alert
from ..services.compliance_engine import ComplianceEngineService

router = APIRouter(prefix="/api/compliance", tags=["Compliance & Mine Governance"])

@router.get("/mines", response_model=List[MineSchema])
def list_mines(db: Session = Depends(get_db)):
    """Returns all mine sites with geographic coordinates and real-time compliance health score."""
    mines = db.query(Mine).all()
    results = []
    for m in mines:
        comp = db.query(ComplianceScore).filter(ComplianceScore.mine_id == m.id).first()
        results.append(MineSchema(
            id=m.id,
            name=m.name,
            code=m.code,
            subsidiary=m.subsidiary,
            region=m.region,
            state=m.state,
            latitude=m.latitude,
            longitude=m.longitude,
            mine_type=m.mine_type,
            target_annual_production_mt=m.target_annual_production_mt,
            coal_seam=m.coal_seam,
            daily_target_kt=m.daily_target_kt,
            daily_actual_kt=m.daily_actual_kt,
            coal_dispatched_kt=m.coal_dispatched_kt,
            pithead_temp_c=m.pithead_temp_c,
            methane_ch4_pct=m.methane_ch4_pct,
            dust_particulate_mg_m3=m.dust_particulate_mg_m3,
            telemetry_status=m.telemetry_status,
            created_at=m.created_at,
            compliance_score=comp.overall_score if comp else 85.0,
            risk_level=comp.risk_level if comp else "Low"
        ))
    return results


@router.get("/scores", response_model=List[ComplianceScoreResponse])
def get_compliance_scores(db: Session = Depends(get_db)):
    """Lists compliance scores across all mine blocks."""
    scores = db.query(ComplianceScore).all()
    results = []
    for s in scores:
        mine = db.query(Mine).filter(Mine.id == s.mine_id).first()
        results.append(ComplianceScoreResponse(
            id=s.id,
            mine_id=s.mine_id,
            mine_name=mine.name if mine else None,
            overall_score=s.overall_score,
            safety_score=s.safety_score,
            environmental_score=s.environmental_score,
            production_variance_score=s.production_variance_score,
            statutory_adherence_score=s.statutory_adherence_score,
            risk_level=s.risk_level,
            breakdown_json=s.breakdown_json or {},
            evaluated_period=s.evaluated_period,
            computed_at=s.computed_at
        ))
    return results


@router.get("/alerts", response_model=List[AlertResponse])
def list_active_alerts(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Lists predictive and operational compliance alerts."""
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    alerts = query.order_by(Alert.created_at.desc()).all()

    results = []
    for a in alerts:
        mine = db.query(Mine).filter(Mine.id == a.mine_id).first()
        results.append(AlertResponse(
            id=a.id,
            mine_id=a.mine_id,
            mine_name=mine.name if mine else None,
            severity=a.severity,
            category=a.category,
            title=a.title,
            description=a.description,
            suggested_action=a.suggested_action,
            statutory_rule=a.statutory_rule,
            assigned_owner=a.assigned_owner,
            target_resolution_date=a.target_resolution_date,
            status=a.status,
            escalated_to=a.escalated_to,
            created_at=a.created_at,
            updated_at=a.updated_at
        ))
    return results


@router.post("/alerts/{alert_id}/action", response_model=AlertResponse)
def handle_alert_action(alert_id: str, payload: AlertActionRequest, db: Session = Depends(get_db)):
    """Human-in-the-loop action: Approve, Escalate, Resolve, or Dismiss an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if payload.action == "escalate":
        alert.status = "escalated"
        alert.escalated_to = payload.escalated_to or "Ministry Executive Safety Directorate"
    elif payload.action == "resolve":
        alert.status = "resolved"
    elif payload.action == "approve":
        alert.status = "approved"
    elif payload.action == "dismiss":
        alert.status = "dismissed"

    db.commit()
    db.refresh(alert)
    mine = db.query(Mine).filter(Mine.id == alert.mine_id).first()

    return AlertResponse(
        id=alert.id,
        mine_id=alert.mine_id,
        mine_name=mine.name if mine else None,
        severity=alert.severity,
        category=alert.category,
        title=alert.title,
        description=alert.description,
        suggested_action=alert.suggested_action,
        statutory_rule=alert.statutory_rule,
        assigned_owner=alert.assigned_owner,
        target_resolution_date=alert.target_resolution_date,
        status=alert.status,
        escalated_to=alert.escalated_to,
        created_at=alert.created_at,
        updated_at=alert.updated_at
    )


@router.get("/telemetry", response_model=TelemetrySummaryResponse)
def get_telemetry_matrix(db: Session = Depends(get_db)):
    """
    Returns the real-time Multi-Colliery Telemetry & Condition Ledger
    aggregating the 9 operating sites, seam strata profiles, gas/dust sensors,
    and active statutory condition flags.
    """
    mines = db.query(Mine).all()
    operating_sites = []

    total_daily_production = 0.0
    total_daily_target = 0.0
    total_dispatched = 0.0
    watch_critical_count = 0

    for m in mines:
        comp = db.query(ComplianceScore).filter(ComplianceScore.mine_id == m.id).first()
        prod_act = m.daily_actual_kt or 15.0
        prod_tgt = m.daily_target_kt or 15.0
        dispatched = m.coal_dispatched_kt or 14.0
        temp = m.pithead_temp_c or 35.0
        methane = m.methane_ch4_pct or 0.25
        dust = m.dust_particulate_mg_m3 or 2.0
        risk = comp.risk_level if comp else (m.telemetry_status or "Normal")

        total_daily_production += prod_act
        total_daily_target += prod_tgt
        total_dispatched += dispatched

        if risk in ("Critical", "Watch", "High", "Moderate"):
            watch_critical_count += 1

        operating_sites.append({
            "id": m.id,
            "name": m.name,
            "code": m.code,
            "subsidiary": m.subsidiary,
            "region": m.region,
            "state": m.state,
            "coal_seam": m.coal_seam or "General Seam",
            "daily_target_kt": round(prod_tgt, 1),
            "daily_actual_kt": round(prod_act, 1),
            "coal_dispatched_kt": round(dispatched, 1),
            "pithead_temp_c": round(temp, 1),
            "methane_ch4_pct": round(methane, 2),
            "dust_particulate_mg_m3": round(dust, 1),
            "compliance_score": round(comp.overall_score, 1) if comp else 85.0,
            "risk": risk,
            "telemetry_status": m.telemetry_status or risk
        })

    # Active alert flags
    active_alerts = db.query(Alert).filter(Alert.status != "resolved").all()
    active_flags = []
    for a in active_alerts:
        mine = db.query(Mine).filter(Mine.id == a.mine_id).first()
        active_flags.append({
            "id": a.id,
            "mine_id": a.mine_id,
            "mine_name": mine.name if mine else "Multi-Pit",
            "subsidiary": mine.subsidiary if mine else "CIL",
            "severity": a.severity,
            "title": a.title,
            "description": a.description,
            "suggested_action": a.suggested_action,
            "statutory_rule": a.statutory_rule or "CMR 2017",
            "assigned_owner": a.assigned_owner or "Mine Safety Directorate",
            "target_resolution_date": a.target_resolution_date or "Immediate",
            "status": a.status
        })

    variance_pct = round(((total_daily_production - total_daily_target) / total_daily_target * 100), 1) if total_daily_target > 0 else 0.0

    return TelemetrySummaryResponse(
        total_sites_count=len(mines),
        daily_production_kt=round(total_daily_production, 1),
        daily_target_kt=round(total_daily_target, 1),
        production_variance_pct=variance_pct,
        coal_dispatched_kt=round(total_dispatched, 1),
        watch_critical_sites_count=watch_critical_count,
        open_conditions_count=len(active_flags),
        operating_sites=operating_sites,
        active_flags=active_flags
    )
