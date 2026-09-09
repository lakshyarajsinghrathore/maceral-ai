from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.schemas import MineSchema, ComplianceScoreResponse, AlertResponse, AlertActionRequest
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
        status=alert.status,
        escalated_to=alert.escalated_to,
        created_at=alert.created_at,
        updated_at=alert.updated_at
    )
