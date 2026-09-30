import hashlib
import io
import csv
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models.db_models import Contractor, LaborGrievance, GrievanceActionLog, Mine
from ..models.schemas import (
    ContractorCreate, ContractorResponse, ContractorSummaryResponse,
    LaborGrievanceCreate, LaborGrievanceStatusUpdate, LaborGrievanceResponse,
    GrievanceActionLogResponse
)

router = APIRouter(prefix="/api/contractors", tags=["Contractors & Labor Grievances"])


def calculate_audit_hash(previous_hash: Optional[str], grievance_id: str, action: str, performed_by: str, notes: Optional[str], created_at: datetime) -> str:
    """Computes a SHA-256 cryptographic hash chaining for tamper-evident audit logs."""
    timestamp_str = created_at.isoformat()
    raw = f"{previous_hash or 'GENESIS_BLOCK'}:{grievance_id}:{action}:{performed_by}:{notes or ''}:{timestamp_str}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


# ---------------- CONTRACTOR MANAGEMENT ----------------

@router.get("/summary", response_model=ContractorSummaryResponse)
def get_contractor_summary(db: Session = Depends(get_db)):
    """Computes high-level aggregated metrics for contractors and labor grievances."""
    contractors = db.query(Contractor).all()
    total_contractors = len(contractors)
    compliant = sum(1 for c in contractors if c.status == "Compliant")
    under_audit = sum(1 for c in contractors if c.status == "Under Audit")
    flagged = sum(1 for c in contractors if c.status in ["Flagged", "Suspended"])
    total_labor = sum(c.worker_count for c in contractors)

    grievances = db.query(LaborGrievance).all()
    open_count = sum(1 for g in grievances if g.status in ["Open", "Investigating", "Escalated"])
    resolved_count = sum(1 for g in grievances if g.status in ["Resolved", "Action Taken"])

    avg_wage = (
        sum(c.wage_compliance_pct for c in contractors) / total_contractors
        if total_contractors > 0 else 100.0
    )

    return ContractorSummaryResponse(
        total_contractors=total_contractors,
        compliant_contractors=compliant,
        under_audit_contractors=under_audit,
        flagged_contractors=flagged,
        total_active_labor=total_labor,
        open_grievances=open_count,
        resolved_grievances=resolved_count,
        avg_wage_compliance_pct=round(avg_wage, 1)
    )


@router.get("/", response_model=List[ContractorResponse])
def list_contractors(
    mine_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    """Lists registered mining contractors with active compliance standings and grievance counts."""
    query = db.query(Contractor)
    if mine_id and mine_id != "all":
        query = query.filter(Contractor.mine_id == mine_id)
    if status_filter and status_filter != "all":
        query = query.filter(Contractor.status == status_filter)

    contractors = query.order_by(Contractor.name.asc()).all()

    results = []
    for c in contractors:
        active_grievances = db.query(LaborGrievance).filter(
            LaborGrievance.contractor_id == c.id,
            LaborGrievance.status.in_(["Open", "Investigating", "Escalated"])
        ).count()

        results.append(ContractorResponse(
            id=c.id,
            mine_id=c.mine_id,
            mine_name=c.mine.name if c.mine else "National Allocation",
            name=c.name,
            vendor_code=c.vendor_code,
            pan_number=c.pan_number,
            gstin=c.gstin,
            category=c.category,
            contract_start=c.contract_start,
            contract_end=c.contract_end,
            status=c.status,
            worker_count=c.worker_count,
            safety_rating=c.safety_rating,
            wage_compliance_pct=c.wage_compliance_pct,
            epf_esic_compliance_pct=c.epf_esic_compliance_pct,
            active_grievance_count=active_grievances,
            created_at=c.created_at,
            updated_at=c.updated_at
        ))

    return results


@router.post("/", response_model=ContractorResponse, status_code=status.HTTP_201_CREATED)
def create_contractor(payload: ContractorCreate, db: Session = Depends(get_db)):
    """Registers a new mining service vendor / contractor."""
    existing = db.query(Contractor).filter(Contractor.vendor_code == payload.vendor_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contractor with vendor code {payload.vendor_code} already exists."
        )

    contractor = Contractor(
        name=payload.name,
        vendor_code=payload.vendor_code,
        mine_id=payload.mine_id,
        pan_number=payload.pan_number,
        gstin=payload.gstin,
        category=payload.category,
        contract_start=payload.contract_start,
        contract_end=payload.contract_end,
        worker_count=payload.worker_count,
        safety_rating=payload.safety_rating,
        wage_compliance_pct=payload.wage_compliance_pct,
        epf_esic_compliance_pct=payload.epf_esic_compliance_pct,
        status=payload.status
    )
    db.add(contractor)
    db.commit()
    db.refresh(contractor)

    return ContractorResponse(
        id=contractor.id,
        mine_id=contractor.mine_id,
        mine_name=contractor.mine.name if contractor.mine else "National Allocation",
        name=contractor.name,
        vendor_code=contractor.vendor_code,
        pan_number=contractor.pan_number,
        gstin=contractor.gstin,
        category=contractor.category,
        contract_start=contractor.contract_start,
        contract_end=contractor.contract_end,
        status=contractor.status,
        worker_count=contractor.worker_count,
        safety_rating=contractor.safety_rating,
        wage_compliance_pct=contractor.wage_compliance_pct,
        epf_esic_compliance_pct=contractor.epf_esic_compliance_pct,
        active_grievance_count=0,
        created_at=contractor.created_at,
        updated_at=contractor.updated_at
    )


@router.get("/export")
def export_contractors_csv(db: Session = Depends(get_db)):
    """Generates and streams a CSV audit sheet of all contractors and statutory compliance scores."""
    contractors = db.query(Contractor).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Vendor Code",
        "Contractor Name",
        "Assigned Mine",
        "Category",
        "Workers Deployed",
        "Safety Rating (1-5)",
        "Wage Compliance %",
        "EPF / ESIC Compliance %",
        "Status",
        "Active Grievances"
    ])

    for c in contractors:
        active_grievances = db.query(LaborGrievance).filter(
            LaborGrievance.contractor_id == c.id,
            LaborGrievance.status.in_(["Open", "Investigating", "Escalated"])
        ).count()
        writer.writerow([
            c.vendor_code,
            c.name,
            c.mine.name if c.mine else "National Fleet",
            c.category,
            c.worker_count,
            c.safety_rating,
            f"{c.wage_compliance_pct}%",
            f"{c.epf_esic_compliance_pct}%",
            c.status,
            active_grievances
        ])

    output.seek(0)
    filename = f"Contractor_Compliance_Audit_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ---------------- LABOR GRIEVANCE WORKFLOW ----------------

@router.get("/grievances/list", response_model=List[LaborGrievanceResponse])
def list_grievances(
    mine_id: Optional[str] = None,
    contractor_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    db: Session = Depends(get_db)
):
    """Retrieves labor grievances with filtering across mines, contractors, priority, and status."""
    query = db.query(LaborGrievance)
    if mine_id and mine_id != "all":
        query = query.filter(LaborGrievance.mine_id == mine_id)
    if contractor_id and contractor_id != "all":
        query = query.filter(LaborGrievance.contractor_id == contractor_id)
    if status_filter and status_filter != "all":
        query = query.filter(LaborGrievance.status == status_filter)
    if priority_filter and priority_filter != "all":
        query = query.filter(LaborGrievance.priority == priority_filter)

    grievances = query.order_by(LaborGrievance.created_at.desc()).all()

    results = []
    for g in grievances:
        action_logs_resp = [
            GrievanceActionLogResponse(
                id=log.id,
                grievance_id=log.grievance_id,
                action=log.action,
                performed_by=log.performed_by,
                notes=log.notes,
                previous_hash=log.previous_hash,
                block_hash=log.block_hash,
                created_at=log.created_at
            )
            for log in g.action_logs
        ]

        results.append(LaborGrievanceResponse(
            id=g.id,
            ticket_id=g.ticket_id,
            mine_id=g.mine_id,
            mine_name=g.mine.name if g.mine else "National Allocation",
            contractor_id=g.contractor_id,
            contractor_name=g.contractor.name if g.contractor else "Unassigned / Direct",
            labor_worker_name="Anonymous Worker" if g.is_anonymous else (g.labor_worker_name or "Anonymous"),
            worker_phone=None if g.is_anonymous else g.worker_phone,
            is_anonymous=g.is_anonymous,
            grievance_type=g.grievance_type,
            priority=g.priority,
            status=g.status,
            description=g.description,
            remedial_action_notes=g.remedial_action_notes,
            assigned_officer=g.assigned_officer,
            evidence_urls=g.evidence_urls or [],
            created_at=g.created_at,
            updated_at=g.updated_at,
            resolved_at=g.resolved_at,
            action_logs=action_logs_resp
        ))

    return results


@router.post("/grievances", response_model=LaborGrievanceResponse, status_code=status.HTTP_201_CREATED)
def file_grievance(payload: LaborGrievanceCreate, db: Session = Depends(get_db)):
    """
    Files a new labor grievance ticket and generates a tamper-evident SHA-256 genesis audit block.
    """
    # Generate sequential unique Ticket ID: GRV-YYYY-XXXX
    year = datetime.utcnow().year
    count = db.query(LaborGrievance).count()
    ticket_id = f"GRV-{year}-{(count + 1):04d}"
    while db.query(LaborGrievance).filter(LaborGrievance.ticket_id == ticket_id).first():
        count += 1
        ticket_id = f"GRV-{year}-{(count + 1):04d}"

    now = datetime.utcnow()
    grievance = LaborGrievance(
        ticket_id=ticket_id,
        mine_id=payload.mine_id,
        contractor_id=payload.contractor_id,
        labor_worker_name=None if payload.is_anonymous else payload.labor_worker_name,
        worker_phone=None if payload.is_anonymous else payload.worker_phone,
        is_anonymous=payload.is_anonymous,
        grievance_type=payload.grievance_type,
        priority=payload.priority,
        status="Open",
        description=payload.description,
        evidence_urls=payload.evidence_urls or [],
        created_at=now,
        updated_at=now
    )
    db.add(grievance)
    db.flush() # ensure grievance.id is generated

    # Compute Genesis Block Hash
    genesis_hash = calculate_audit_hash(
        previous_hash=None,
        grievance_id=grievance.id,
        action="GRIEVANCE_FILED",
        performed_by="Anonymous Laborer" if payload.is_anonymous else (payload.labor_worker_name or "Labor Worker"),
        notes=f"Initial complaint registered for category: {payload.grievance_type}",
        created_at=now
    )

    action_log = GrievanceActionLog(
        grievance_id=grievance.id,
        action="GRIEVANCE_FILED",
        performed_by="Worker / Portal",
        notes=f"Initial filing: {payload.description[:120]}...",
        previous_hash="0" * 64,
        block_hash=genesis_hash,
        created_at=now
    )
    db.add(action_log)
    db.commit()
    db.refresh(grievance)

    action_logs_resp = [
        GrievanceActionLogResponse(
            id=action_log.id,
            grievance_id=action_log.grievance_id,
            action=action_log.action,
            performed_by=action_log.performed_by,
            notes=action_log.notes,
            previous_hash=action_log.previous_hash,
            block_hash=action_log.block_hash,
            created_at=action_log.created_at
        )
    ]

    return LaborGrievanceResponse(
        id=grievance.id,
        ticket_id=grievance.ticket_id,
        mine_id=grievance.mine_id,
        mine_name=grievance.mine.name if grievance.mine else "National Allocation",
        contractor_id=grievance.contractor_id,
        contractor_name=grievance.contractor.name if grievance.contractor else "Unassigned / Direct",
        labor_worker_name="Anonymous Worker" if grievance.is_anonymous else (grievance.labor_worker_name or "Anonymous"),
        worker_phone=None if grievance.is_anonymous else grievance.worker_phone,
        is_anonymous=grievance.is_anonymous,
        grievance_type=grievance.grievance_type,
        priority=grievance.priority,
        status=grievance.status,
        description=grievance.description,
        remedial_action_notes=grievance.remedial_action_notes,
        assigned_officer=grievance.assigned_officer,
        evidence_urls=grievance.evidence_urls or [],
        created_at=grievance.created_at,
        updated_at=grievance.updated_at,
        resolved_at=grievance.resolved_at,
        action_logs=action_logs_resp
    )


@router.patch("/grievances/{grievance_id}/status", response_model=LaborGrievanceResponse)
def update_grievance_status(
    grievance_id: str,
    payload: LaborGrievanceStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates the lifecycle status of a grievance ticket, sets assigned officer & remedial notes,
    and appends a new cryptographically hash-chained block to the electronic audit trail.
    """
    grievance = db.query(LaborGrievance).filter(LaborGrievance.id == grievance_id).first()
    if not grievance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grievance ticket with ID {grievance_id} not found."
        )

    # Fetch last action log to obtain previous hash
    last_log = db.query(GrievanceActionLog).filter(
        GrievanceActionLog.grievance_id == grievance_id
    ).order_by(GrievanceActionLog.created_at.desc()).first()

    previous_hash = last_log.block_hash if last_log else ("0" * 64)
    now = datetime.utcnow()

    # Update grievance
    old_status = grievance.status
    grievance.status = payload.status
    if payload.remedial_action_notes:
        grievance.remedial_action_notes = payload.remedial_action_notes
    if payload.assigned_officer:
        grievance.assigned_officer = payload.assigned_officer
    if payload.status in ["Resolved", "Action Taken"]:
        grievance.resolved_at = now
    grievance.updated_at = now

    action_name = f"STATUS_CHANGE_{payload.status.upper().replace(' ', '_')}"
    note_text = payload.remedial_action_notes or f"Status changed from {old_status} to {payload.status}."

    new_hash = calculate_audit_hash(
        previous_hash=previous_hash,
        grievance_id=grievance.id,
        action=action_name,
        performed_by=payload.performed_by,
        notes=note_text,
        created_at=now
    )

    action_log = GrievanceActionLog(
        grievance_id=grievance.id,
        action=action_name,
        performed_by=payload.performed_by,
        notes=note_text,
        previous_hash=previous_hash,
        block_hash=new_hash,
        created_at=now
    )
    db.add(action_log)
    db.commit()
    db.refresh(grievance)

    action_logs_resp = [
        GrievanceActionLogResponse(
            id=log.id,
            grievance_id=log.grievance_id,
            action=log.action,
            performed_by=log.performed_by,
            notes=log.notes,
            previous_hash=log.previous_hash,
            block_hash=log.block_hash,
            created_at=log.created_at
        )
        for log in grievance.action_logs
    ]

    return LaborGrievanceResponse(
        id=grievance.id,
        ticket_id=grievance.ticket_id,
        mine_id=grievance.mine_id,
        mine_name=grievance.mine.name if grievance.mine else "National Allocation",
        contractor_id=grievance.contractor_id,
        contractor_name=grievance.contractor.name if grievance.contractor else "Unassigned / Direct",
        labor_worker_name="Anonymous Worker" if grievance.is_anonymous else (grievance.labor_worker_name or "Anonymous"),
        worker_phone=None if grievance.is_anonymous else grievance.worker_phone,
        is_anonymous=grievance.is_anonymous,
        grievance_type=grievance.grievance_type,
        priority=grievance.priority,
        status=grievance.status,
        description=grievance.description,
        remedial_action_notes=grievance.remedial_action_notes,
        assigned_officer=grievance.assigned_officer,
        evidence_urls=grievance.evidence_urls or [],
        created_at=grievance.created_at,
        updated_at=grievance.updated_at,
        resolved_at=grievance.resolved_at,
        action_logs=action_logs_resp
    )


@router.get("/grievances/{grievance_id}/audit-trail", response_model=List[GrievanceActionLogResponse])
def get_grievance_audit_trail(grievance_id: str, db: Session = Depends(get_db)):
    """Fetches the complete tamper-evident hash-chained audit log for a grievance."""
    logs = db.query(GrievanceActionLog).filter(
        GrievanceActionLog.grievance_id == grievance_id
    ).order_by(GrievanceActionLog.created_at.asc()).all()

    if not logs:
        # Check if grievance exists
        exists = db.query(LaborGrievance).filter(LaborGrievance.id == grievance_id).first()
        if not exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance not found.")
        return []

    return [
        GrievanceActionLogResponse(
            id=log.id,
            grievance_id=log.grievance_id,
            action=log.action,
            performed_by=log.performed_by,
            notes=log.notes,
            previous_hash=log.previous_hash,
            block_hash=log.block_hash,
            created_at=log.created_at
        )
        for log in logs
    ]
