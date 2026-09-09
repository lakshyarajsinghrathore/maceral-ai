import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.schemas import ReportRequest, ReportResponse
from ..models.db_models import Report, Mine
from ..services.report_generator import ReportGeneratorService

router = APIRouter(prefix="/api/reports", tags=["Ministry Reports"])

@router.post("/generate", response_model=ReportResponse)
def generate_ministry_report(payload: ReportRequest, db: Session = Depends(get_db)):
    """
    Automated One-Click Ministry Report Generation Engine:
    Generates official PDF / DOCX reports with KPI tables, charts, and executive briefings in seconds.
    """
    report_record = ReportGeneratorService.generate_report(
        db=db,
        report_title=payload.report_title,
        report_type=payload.report_type,
        reporting_period=payload.reporting_period,
        mine_id=payload.mine_id,
        file_format=payload.file_format,
        custom_notes=payload.custom_notes
    )

    mine = db.query(Mine).filter(Mine.id == report_record.mine_id).first() if report_record.mine_id else None

    return ReportResponse(
        id=report_record.id,
        mine_id=report_record.mine_id,
        mine_name=mine.name if mine else "All Subsidiaries",
        report_title=report_record.report_title,
        report_type=report_record.report_type,
        reporting_period=report_record.reporting_period,
        file_format=report_record.file_format,
        file_url=f"/api/reports/{report_record.id}/download",
        summary=report_record.summary,
        metrics_json=report_record.metrics_json,
        created_at=report_record.created_at
    )


@router.get("/", response_model=List[ReportResponse])
def list_reports(limit: int = 50, db: Session = Depends(get_db)):
    """Lists all generated reports."""
    reports = db.query(Report).order_by(Report.created_at.desc()).limit(limit).all()
    results = []
    for r in reports:
        results.append(ReportResponse(
            id=r.id,
            mine_id=r.mine_id,
            mine_name=r.mine.name if r.mine else "National Fleet",
            report_title=r.report_title,
            report_type=r.report_type,
            reporting_period=r.reporting_period,
            file_format=r.file_format,
            file_url=f"/api/reports/{r.id}/download",
            summary=r.summary,
            metrics_json=r.metrics_json,
            created_at=r.created_at
        ))
    return results


@router.get("/{report_id}/download")
def download_report_file(report_id: str, db: Session = Depends(get_db)):
    """Downloads physical PDF / DOCX report."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")

    media_type = "application/pdf" if report.file_format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    filename = os.path.basename(report.file_path)
    return FileResponse(
        path=report.file_path,
        media_type=media_type,
        filename=filename
    )
