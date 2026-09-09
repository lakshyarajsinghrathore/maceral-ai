from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.schemas import QARequest, QAResponse
from ..models.db_models import QALog
from ..services.rag_engine import CoalGPTRagEngine

router = APIRouter(prefix="/api/qa", tags=["CoalGPT Q&A with Citations"])
rag_engine = CoalGPTRagEngine()

@router.post("/ask", response_model=QAResponse)
def ask_coalgpt(payload: QARequest, db: Session = Depends(get_db)):
    """
    CoalGPT Enterprise Q&A Engine:
    Retrieves relevant document chunks and synthesizes an authoritative Ministry answer
    with exact source citations and sub-second response latency.
    """
    history = [{"role": m.role, "content": m.content} for m in (payload.chat_history or [])]
    result = rag_engine.ask(
        db=db,
        question=payload.question,
        mine_id=payload.mine_id if not payload.include_all_mines else None,
        doc_category=payload.doc_category,
        chat_history=history
    )
    return result


@router.get("/history")
def get_qa_history(limit: int = 20, db: Session = Depends(get_db)):
    """Returns recent CoalGPT questions, generated answers, and citations."""
    logs = db.query(QALog).order_by(QALog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "question": log.question,
            "answer": log.answer,
            "source_citations": log.source_citations,
            "response_time_ms": log.response_time_ms,
            "model_used": log.model_used,
            "created_at": log.created_at
        }
        for log in logs
    ]
