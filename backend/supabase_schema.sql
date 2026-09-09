-- =================================================================
-- Coal Intelligence Platform - Supabase PostgreSQL Schema
-- Ministry of Coal | Unified AI Document Intelligence & Compliance
-- =================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MINES TABLE
CREATE TABLE IF NOT EXISTS public.mines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    subsidiary VARCHAR(100) NOT NULL, -- e.g. SECL, ECL, BCCL, CCL, WCL, NCL, MCL
    region VARCHAR(100) NOT NULL,     -- e.g. Korba, Singrauli, Dhanbad, Raniganj
    state VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    mine_type VARCHAR(50) DEFAULT 'Opencast', -- Opencast, Underground, Mixed
    target_annual_production_mt NUMERIC(10, 2) DEFAULT 10.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mine_id UUID REFERENCES public.mines(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- pdf, scanned_pdf, xlsx, docx, image
    file_size_bytes BIGINT DEFAULT 0,
    doc_category VARCHAR(100) DEFAULT 'General', -- Production, Geological, Safety, Statutory, Inspection
    uploaded_by VARCHAR(255) DEFAULT 'Ministry User',
    ocr_applied BOOLEAN DEFAULT FALSE,
    raw_text TEXT,
    chunk_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processed', -- uploaded, processing, processed, error
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DOCUMENT CHUNKS TABLE (For Semantic / Vector / Keyword RAG & Source Citation)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    mine_id UUID REFERENCES public.mines(id) ON DELETE SET NULL,
    chunk_index INT NOT NULL,
    page_number INT DEFAULT 1,
    section_title VARCHAR(255),
    content TEXT NOT NULL,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EXTRACTED DATA TABLE (Structured JSON from Groq LLM)
CREATE TABLE IF NOT EXISTS public.extracted_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    mine_id UUID REFERENCES public.mines(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- 'production', 'geological', 'safety', 'statutory_compliance'
    reporting_period VARCHAR(100),  -- 'FY 2024-25 Q3', 'January 2025'
    json_payload JSONB NOT NULL,
    confidence_score NUMERIC(5, 2) DEFAULT 95.0,
    extracted_by VARCHAR(100) DEFAULT 'groq-llama-3.3-70b',
    extracted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. QA LOGS TABLE (CoalGPT Q&A with Strict Source Citations)
CREATE TABLE IF NOT EXISTS public.qa_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_citations JSONB DEFAULT '[]'::jsonb, -- Array of {doc_id, doc_title, page, excerpt}
    context_chunks_used INT DEFAULT 0,
    response_time_ms INT DEFAULT 0,
    model_used VARCHAR(100) DEFAULT 'groq/llama-3.3-70b-versatile',
    user_feedback VARCHAR(50), -- helpful, unhelpful
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COMPLIANCE SCORES TABLE (Algorithmic 0-100 Governance)
CREATE TABLE IF NOT EXISTS public.compliance_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mine_id UUID NOT NULL REFERENCES public.mines(id) ON DELETE CASCADE,
    overall_score NUMERIC(5, 2) NOT NULL, -- 0 - 100
    safety_score NUMERIC(5, 2) NOT NULL,
    environmental_score NUMERIC(5, 2) NOT NULL,
    production_variance_score NUMERIC(5, 2) NOT NULL,
    statutory_adherence_score NUMERIC(5, 2) NOT NULL,
    risk_level VARCHAR(50) DEFAULT 'Low', -- Low (>=80), Moderate (60-79), High (<60)
    breakdown_json JSONB DEFAULT '{}'::jsonb,
    evaluated_period VARCHAR(100) DEFAULT 'Latest',
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ALERTS TABLE (Predictive & Compliance Risk Alerts)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mine_id UUID NOT NULL REFERENCES public.mines(id) ON DELETE CASCADE,
    severity VARCHAR(50) NOT NULL, -- critical, high, medium, low
    category VARCHAR(100) NOT NULL, -- safety_breach, production_drop, environmental_limit, overdue_inspection
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    suggested_action TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, escalated, resolved
    escalated_to VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. GENERATED REPORTS TABLE (One-Click Ministry PDF/DOCX Reports)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mine_id UUID REFERENCES public.mines(id) ON DELETE SET NULL,
    report_title VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL, -- 'Ministry_Monthly_Executive', 'Safety_Audit', 'Parliament_Query_Docket', 'Quarterly_Production'
    reporting_period VARCHAR(100) NOT NULL,
    file_format VARCHAR(20) DEFAULT 'pdf', -- pdf, docx
    file_path TEXT NOT NULL,
    summary TEXT,
    metrics_json JSONB DEFAULT '{}'::jsonb,
    generated_by VARCHAR(255) DEFAULT 'System',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FIELD INSPECTIONS TABLE (Offline-capable PWA capture)
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mine_id UUID NOT NULL REFERENCES public.mines(id) ON DELETE CASCADE,
    inspector_id VARCHAR(255) NOT NULL,
    inspector_name VARCHAR(255) NOT NULL,
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    geo_accuracy_meters NUMERIC(8, 2),
    photo_urls JSONB DEFAULT '[]'::jsonb,
    checklist_data JSONB NOT NULL,
    violations_found INT DEFAULT 0,
    inspector_notes TEXT,
    sync_status VARCHAR(50) DEFAULT 'synced', -- offline_draft, synced
    inspected_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for fast retrieval
CREATE INDEX IF NOT EXISTS idx_documents_mine_id ON public.documents(mine_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_doc_id ON public.extracted_data(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_category ON public.extracted_data(category);
CREATE INDEX IF NOT EXISTS idx_compliance_mine_id ON public.compliance_scores(mine_id);
CREATE INDEX IF NOT EXISTS idx_alerts_mine_id ON public.alerts(mine_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.mines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Default Read/Write policies for authenticated and anon users (for dev/demo setup)
CREATE POLICY "Allow public read on mines" ON public.mines FOR SELECT USING (true);
CREATE POLICY "Allow public insert on mines" ON public.mines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public all on documents" ON public.documents FOR ALL USING (true);
CREATE POLICY "Allow public all on document_chunks" ON public.document_chunks FOR ALL USING (true);
CREATE POLICY "Allow public all on extracted_data" ON public.extracted_data FOR ALL USING (true);
CREATE POLICY "Allow public all on qa_logs" ON public.qa_logs FOR ALL USING (true);
CREATE POLICY "Allow public all on compliance_scores" ON public.compliance_scores FOR ALL USING (true);
CREATE POLICY "Allow public all on alerts" ON public.alerts FOR ALL USING (true);
CREATE POLICY "Allow public all on reports" ON public.reports FOR ALL USING (true);
CREATE POLICY "Allow public all on inspections" ON public.inspections FOR ALL USING (true);
