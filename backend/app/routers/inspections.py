from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models.db_models import Inspection, Mine
from ..models.schemas import InspectionCreate, InspectionResponse

router = APIRouter(prefix="/api/inspections", tags=["Field Inspections"])

@router.post("/", response_model=InspectionResponse)
def create_inspection(payload: InspectionCreate, db: Session = Depends(get_db)):
    """
    Handles submitting a new field inspection report.
    Compatible with the offline-first React PWA strategy.
    Background sync events from IndexedDB will hit this endpoint as soon as network is restored.
    """
    # Verify the target mine exists
    mine = db.query(Mine).filter(Mine.id == payload.mine_id).first()
    if not mine:
        raise HTTPException(status_code=404, detail="Mine not found for this inspection.")

    # Determine status and timestamps based on offline flag payload
    sync_status = "offline-synced" if payload.is_offline_synced else "live-synced"
    actual_inspection_time = payload.inspected_at if payload.inspected_at else datetime.utcnow()

    new_inspection = Inspection(
        mine_id=payload.mine_id,
        inspector_id=payload.inspector_id,
        inspector_name=payload.inspector_name,
        gps_lat=payload.gps_lat,
        gps_lng=payload.gps_lng,
        geo_accuracy_meters=payload.geo_accuracy_meters,
        photo_urls=payload.photo_urls,
        checklist_data=payload.checklist_data,
        violations_found=payload.violations_found,
        inspector_notes=payload.inspector_notes,
        sync_status=sync_status,
        inspected_at=actual_inspection_time,
        synced_at=datetime.utcnow()
    )

    db.add(new_inspection)
    db.commit()
    db.refresh(new_inspection)

    return new_inspection

@router.get("/", response_model=List[InspectionResponse])
def get_inspections(mine_id: str = None, limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieve inspection logs. Supports filtering optionally by specific mine.
    """
    query = db.query(Inspection)
    if mine_id:
        query = query.filter(Inspection.mine_id == mine_id)

    return query.order_by(Inspection.inspected_at.desc()).limit(limit).all()
