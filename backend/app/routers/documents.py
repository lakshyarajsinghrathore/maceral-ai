import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from ..models.db_models import Document, DocumentChunk, ExtractedData, Mine
from ..models.schemas import DocumentResponse, ExtractedDataResponse
from ..services.ocr_parser import DocumentParserService
from ..services.groq_extractor import GroqExtractionService
from ..services.compliance_engine import ComplianceEngineService

router = APIRouter(prefix="/api/documents", tags=["Documents & Extraction"])
groq_service = GroqExtractionService()

@router.post("/upload", response_model=DocumentResponse)
async def upload_and_process_document(
    file: UploadFile = File(...),
    mine_id: Optional[str] = Form(None),
    doc_category: Optional[str] = Form("General"),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Document Intelligence Processing Pipeline:
    1. Upload file (PDF / Scanned Doc / XLSX / CSV / DOCX)
    2. Intelligent format detection & OCR / Table Parsing
    3. Document Chunking with page and section metadata for RAG citations
    4. Structured extraction via Enterprise Neural AI Engine
    5. Automatic compliance score adjustment
    """
    file_id = str(uuid.uuid4())
    original_filename = file.filename or "uploaded_file"
    file_ext = original_filename.split(".")[-1].lower() if "." in original_filename else "bin"
    saved_filename = f"{file_id}_{original_filename}"
    saved_filepath = os.path.join(settings.UPLOAD_DIR, saved_filename)

    # Save to disk
    with open(saved_filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(saved_filepath)
    doc_title = title if title else original_filename.rsplit(".", 1)[0].replace("_", " ").title()

    # Determine mine if not explicitly passed
    if not mine_id:
        # Check if mine name is in doc title or filename
        found_mine = db.query(Mine).filter(
            (Mine.name.ilike(f"%{doc_title}%")) |
            (Mine.code.ilike(f"%{doc_title}%"))
        ).first()
        if found_mine:
            mine_id = found_mine.id

    # 1. Parse File based on type
    full_text = ""
    page_chunks = []
    is_scanned = False

    if file_ext == "pdf":
        full_text, page_chunks, is_scanned = DocumentParserService.parse_pdf(saved_filepath)
        file_type = "scanned_pdf" if is_scanned else "pdf"
    elif file_ext in ["xlsx", "xls", "csv"]:
        full_text, page_chunks = DocumentParserService.parse_excel(saved_filepath)
        file_type = "xlsx" if file_ext in ["xlsx", "xls"] else "csv"
    elif file_ext in ["docx", "doc"]:
        full_text, page_chunks = DocumentParserService.parse_docx(saved_filepath)
        file_type = "docx"
    else:
        # Generic text / fallback
        with open(saved_filepath, "r", errors="ignore") as f:
            full_text = f.read()
            page_chunks = [{"page_number": 1, "content": full_text, "section_title": "Content"}]
        file_type = "other"

    # 2. Chunking for RAG
    chunk_records = DocumentParserService.chunk_text(page_chunks)

    # 3. Create Document DB record
    doc_record = Document(
        id=file_id,
        mine_id=mine_id,
        title=doc_title,
        file_name=original_filename,
        file_path=saved_filepath,
        file_type=file_type,
        file_size_bytes=file_size,
        doc_category=doc_category,
        ocr_applied=is_scanned,
        raw_text=full_text,
        chunk_count=len(chunk_records),
        status="processed"
    )
    db.add(doc_record)
    db.flush()

    # 4. Save Chunks
    for chunk in chunk_records:
        c_obj = DocumentChunk(
            document_id=doc_record.id,
            mine_id=mine_id,
            chunk_index=chunk["chunk_index"],
            page_number=chunk["page_number"],
            section_title=chunk.get("section_title", f"Page {chunk['page_number']}"),
            content=chunk["content"],
            metadata_json=chunk.get("metadata", {})
        )
        db.add(c_obj)

    # 5. OpenAI GPT-OSS 120B Structured Extraction
    extracted_json = groq_service.extract_mining_data(
        raw_text=full_text,
        doc_category=doc_category,
        doc_title=doc_title
    )

    # Auto-associate mine if extracted JSON detected mine name
    detected_mine_name = extracted_json.get("mine_identification", {}).get("mine_name")
    if detected_mine_name and not mine_id:
        m = db.query(Mine).filter(Mine.name.ilike(f"%{detected_mine_name}%")).first()
        if m:
            doc_record.mine_id = m.id
            mine_id = m.id

    # 6. Save Extracted Data
    ext_obj = ExtractedData(
        document_id=doc_record.id,
        mine_id=mine_id,
        category=doc_category.lower(),
        reporting_period=extracted_json.get("reporting_period", "Current Period"),
        json_payload=extracted_json,
        confidence_score=float(extracted_json.get("confidence_score", 95.0)),
        extracted_by="groq-llama-3.3-70b"
    )
    db.add(ext_obj)
    db.commit()
    db.refresh(doc_record)

    # 7. Re-evaluate compliance if mine associated
    if mine_id:
        try:
            ComplianceEngineService.evaluate_mine_compliance(db, mine_id)
        except Exception as ce_err:
            print(f"Compliance evaluation error: {ce_err}")

    mine_name = doc_record.mine.name if doc_record.mine else None

    return DocumentResponse(
        id=doc_record.id,
        mine_id=doc_record.mine_id,
        mine_name=mine_name,
        title=doc_record.title,
        file_name=doc_record.file_name,
        file_type=doc_record.file_type,
        file_size_bytes=doc_record.file_size_bytes,
        doc_category=doc_record.doc_category,
        uploaded_by=doc_record.uploaded_by,
        ocr_applied=doc_record.ocr_applied,
        chunk_count=doc_record.chunk_count,
        status=doc_record.status,
        created_at=doc_record.created_at,
        extracted_summary=extracted_json
    )


@router.get("/", response_model=List[DocumentResponse])
def list_documents(mine_id: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """Lists uploaded documents with their extracted summary payload."""
    query = db.query(Document)
    if mine_id:
        query = query.filter(Document.mine_id == mine_id)
    docs = query.order_by(Document.created_at.desc()).limit(limit).all()

    results = []
    for d in docs:
        latest_ext = db.query(ExtractedData).filter(ExtractedData.document_id == d.id).first()
        results.append(DocumentResponse(
            id=d.id,
            mine_id=d.mine_id,
            mine_name=d.mine.name if d.mine else None,
            title=d.title,
            file_name=d.file_name,
            file_type=d.file_type,
            file_size_bytes=d.file_size_bytes,
            doc_category=d.doc_category,
            uploaded_by=d.uploaded_by,
            ocr_applied=d.ocr_applied,
            chunk_count=d.chunk_count,
            status=d.status,
            created_at=d.created_at,
            extracted_summary=latest_ext.json_payload if latest_ext else None
        ))
    return results


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """Deletes a document and all its associated chunks and extracted data."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete associated records
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
    db.query(ExtractedData).filter(ExtractedData.document_id == document_id).delete()

    # Delete file from disk if it exists
    try:
        if doc.file_path and os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception as e:
        print(f"Could not delete file from disk: {e}")

    db.delete(doc)
    db.commit()
    return {"success": True, "message": f"Document '{doc.title}' deleted successfully."}


@router.get("/{document_id}")
def get_document_details(document_id: str, db: Session = Depends(get_db)):
    """Returns full document data including chunks, raw text, and extracted structured JSON."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    extracted = db.query(ExtractedData).filter(ExtractedData.document_id == document_id).first()
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).order_by(DocumentChunk.chunk_index).all()

    return {
        "document": {
            "id": doc.id,
            "title": doc.title,
            "file_name": doc.file_name,
            "file_type": doc.file_type,
            "file_size_bytes": doc.file_size_bytes,
            "doc_category": doc.doc_category,
            "ocr_applied": doc.ocr_applied,
            "mine_name": doc.mine.name if doc.mine else None,
            "created_at": doc.created_at
        },
        "raw_text": doc.raw_text,
        "extracted_payload": extracted.json_payload if extracted else None,
        "chunks": [
            {
                "index": c.chunk_index,
                "page": c.page_number,
                "section": c.section_title,
                "content": c.content
            }
            for c in chunks
        ]
    }
