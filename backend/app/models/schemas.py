from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# ── Authentication Schemas ──────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "officer"

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: Optional[str] = None
    role: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Mine Schemas
class MineBase(BaseModel):
    name: str
    code: str
    subsidiary: str
    region: str
    state: str
    latitude: float
    longitude: float
    mine_type: Optional[str] = "Opencast"
    target_annual_production_mt: Optional[float] = 10.0
    coal_seam: Optional[str] = None
    daily_target_kt: Optional[float] = 15.0
    daily_actual_kt: Optional[float] = 15.0
    coal_dispatched_kt: Optional[float] = 14.0
    pithead_temp_c: Optional[float] = 35.0
    methane_ch4_pct: Optional[float] = 0.25
    dust_particulate_mg_m3: Optional[float] = 2.0
    telemetry_status: Optional[str] = "Normal"

class MineCreate(MineBase):
    pass

class MineSchema(MineBase):
    id: str
    created_at: Optional[datetime] = None
    compliance_score: Optional[float] = None
    risk_level: Optional[str] = "Low"

    class Config:
        from_attributes = True


# Document Schemas
class DocumentResponse(BaseModel):
    id: str
    mine_id: Optional[str] = None
    mine_name: Optional[str] = None
    title: str
    file_name: str
    file_type: str
    file_size_bytes: int
    doc_category: str
    uploaded_by: str
    ocr_applied: bool
    chunk_count: int
    status: str
    created_at: datetime
    extracted_summary: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# Extracted Data Schemas
class ExtractedDataResponse(BaseModel):
    id: str
    document_id: str
    mine_id: Optional[str] = None
    category: str
    reporting_period: Optional[str] = None
    json_payload: Dict[str, Any]
    confidence_score: float
    extracted_by: str
    extracted_at: datetime

    class Config:
        from_attributes = True


# CoalGPT Q&A Schemas
class Citation(BaseModel):
    doc_id: str
    doc_title: str
    page_number: int
    section_title: Optional[str] = None
    excerpt: str
    relevance_score: Optional[float] = None

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class QARequest(BaseModel):
    question: str
    mine_id: Optional[str] = None
    doc_category: Optional[str] = None
    include_all_mines: Optional[bool] = True
    chat_history: Optional[List[ChatMessage]] = []

class QAResponse(BaseModel):
    question: str
    answer: str
    citations: List[Citation]
    response_time_ms: int
    model_used: str
    chunks_analyzed: int
    context_found: bool


# Report Generation Schemas
class ReportRequest(BaseModel):
    mine_id: Optional[str] = None
    report_title: str
    report_type: str = "Ministry_Monthly_Executive" # Ministry_Monthly_Executive, Safety_Audit, Parliament_Query_Docket, Production_Summary
    reporting_period: str # e.g., "January 2025" or "Q3 FY 2024-25"
    file_format: str = "pdf" # pdf, docx
    custom_notes: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    mine_id: Optional[str] = None
    mine_name: Optional[str] = None
    report_title: str
    report_type: str
    reporting_period: str
    file_format: str
    file_url: str
    summary: Optional[str] = None
    metrics_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Compliance Schemas
class ComplianceScoreResponse(BaseModel):
    id: str
    mine_id: str
    mine_name: Optional[str] = None
    overall_score: float
    safety_score: float
    environmental_score: float
    production_variance_score: float
    statutory_adherence_score: float
    risk_level: str
    breakdown_json: Dict[str, Any]
    evaluated_period: str
    computed_at: datetime

    class Config:
        from_attributes = True


class AlertActionRequest(BaseModel):
    action: str # "approve", "escalate", "resolve", "dismiss"
    escalated_to: Optional[str] = None
    notes: Optional[str] = None

class AlertResponse(BaseModel):
    id: str
    mine_id: str
    mine_name: Optional[str] = None
    severity: str
    category: str
    title: str
    description: str
    suggested_action: Optional[str] = None
    status: str
    statutory_rule: Optional[str] = None
    assigned_owner: Optional[str] = None
    target_resolution_date: Optional[str] = None
    escalated_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TelemetrySummaryResponse(BaseModel):
    total_sites_count: int
    daily_production_kt: float
    daily_target_kt: float
    production_variance_pct: float
    coal_dispatched_kt: float
    watch_critical_sites_count: int
    open_conditions_count: int
    operating_sites: List[Dict[str, Any]]
    active_flags: List[Dict[str, Any]]
