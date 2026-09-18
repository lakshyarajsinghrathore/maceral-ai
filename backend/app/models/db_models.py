import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="officer")  # admin, officer, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="uploader", foreign_keys="Document.uploaded_by_user_id")


class Mine(Base):
    __tablename__ = "mines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    subsidiary = Column(String(100), nullable=False) # SECL, ECL, BCCL, CCL, WCL, NCL, MCL
    region = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    mine_type = Column(String(50), default="Opencast") # Opencast, Underground, Mixed
    target_annual_production_mt = Column(Float, default=10.0)

    # Live Telemetry & Seam Profiling
    coal_seam = Column(String(100), nullable=True)
    daily_target_kt = Column(Float, default=15.0)
    daily_actual_kt = Column(Float, default=15.0)
    coal_dispatched_kt = Column(Float, default=14.0)
    pithead_temp_c = Column(Float, default=35.0)
    methane_ch4_pct = Column(Float, default=0.25)
    dust_particulate_mg_m3 = Column(Float, default=2.0)
    telemetry_status = Column(String(50), default="Normal") # Critical, Watch, Normal

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="mine", cascade="all, delete-orphan")
    compliance_scores = relationship("ComplianceScore", back_populates="mine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="mine", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="mine")
    inspections = relationship("Inspection", back_populates="mine")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    mine_id = Column(String(36), ForeignKey("mines.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_type = Column(String(50), nullable=False) # pdf, scanned_pdf, xlsx, docx, image
    file_size_bytes = Column(Integer, default=0)
    doc_category = Column(String(100), default="General") # Production, Geological, Safety, Statutory
    uploaded_by = Column(String(255), default="Ministry Officer")
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ocr_applied = Column(Boolean, default=False)
    raw_text = Column(Text, nullable=True)
    chunk_count = Column(Integer, default=0)
    status = Column(String(50), default="processed") # uploaded, processing, processed, error
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    mine = relationship("Mine", back_populates="documents")
    uploader = relationship("User", back_populates="documents", foreign_keys=[uploaded_by_user_id])
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    extracted_records = relationship("ExtractedData", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    mine_id = Column(String(36), ForeignKey("mines.id", ondelete="SET NULL"), nullable=True)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1)
    section_title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")


class ExtractedData(Base):
    __tablename__ = "extracted_data"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    mine_id = Column(String(36), ForeignKey("mines.id", ondelete="SET NULL"), nullable=True)
    category = Column(String(100), nullable=False) # production, geological, safety, statutory_compliance
    reporting_period = Column(String(100), nullable=True) # e.g. "Q3 FY2024-25"
    json_payload = Column(JSON, nullable=False)
    confidence_score = Column(Float, default=95.0)
    extracted_by = Column(String(100), default="groq-llama-3.3-70b")
    extracted_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="extracted_records")


class QALog(Base):
    __tablename__ = "qa_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source_citations = Column(JSON, default=list) # [{doc_id, doc_title, page, excerpt}]
    context_chunks_used = Column(Integer, default=0)
    response_time_ms = Column(Integer, default=0)
    model_used = Column(String(100), default="groq/llama-3.3-70b-versatile")
    user_feedback = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ComplianceScore(Base):
    __tablename__ = "compliance_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    mine_id = Column(String(36), ForeignKey("mines.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, nullable=False) # 0 - 100
    safety_score = Column(Float, nullable=False)
    environmental_score = Column(Float, nullable=False)
    production_variance_score = Column(Float, nullable=False)
    statutory_adherence_score = Column(Float, nullable=False)
    risk_level = Column(String(50), default="Low") # Low, Moderate, High
    breakdown_json = Column(JSON, default=dict)
    evaluated_period = Column(String(100), default="Latest")
    computed_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="compliance_scores")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    mine_id = Column(String(36), ForeignKey("mines.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String(50), nullable=False) # critical, high, medium, low
    category = Column(String(100), nullable=False) # safety_breach, production_drop, environmental_limit, overdue_inspection
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=True)
    status = Column(String(50), default="pending") # pending, approved, escalated, resolved
    statutory_rule = Column(String(100), nullable=True) # e.g. CMR 2017 Reg 153, CMR 168, CMR 106
    assigned_owner = Column(String(100), nullable=True) # e.g. Ventilation Control Room, Surface Operations
    target_resolution_date = Column(String(50), nullable=True) # e.g. 2026-09-15
    escalated_to = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mine = relationship("Mine", back_populates="alerts")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    mine_id = Column(String(36), ForeignKey("mines.id", ondelete="SET NULL"), nullable=True)
    report_title = Column(String(255), nullable=False)
    report_type = Column(String(100), nullable=False) # Ministry_Monthly_Executive, Safety_Audit, etc.
    reporting_period = Column(String(100), nullable=False)
    file_format = Column(String(20), default="pdf")
    file_path = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    metrics_json = Column(JSON, default=dict)
    generated_by = Column(String(255), default="System")
    created_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="reports")


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    mine_id = Column(String(36), ForeignKey("mines.id", ondelete="CASCADE"), nullable=False)
    inspector_id = Column(String(255), nullable=False)
    inspector_name = Column(String(255), nullable=False)
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    geo_accuracy_meters = Column(Float, nullable=True)
    photo_urls = Column(JSON, default=list)
    checklist_data = Column(JSON, nullable=False)
    violations_found = Column(Integer, default=0)
    inspector_notes = Column(Text, nullable=True)
    sync_status = Column(String(50), default="synced")
    inspected_at = Column(DateTime, default=datetime.utcnow)
    synced_at = Column(DateTime, default=datetime.utcnow)

    mine = relationship("Mine", back_populates="inspections")
