from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import edge_tts
import re
from ..database import get_db
from ..models.schemas import QARequest, QAResponse, TTSRequest
from ..models.db_models import QALog
from ..services.rag_engine import CoalGPTRagEngine

router = APIRouter(prefix="/api/qa", tags=["CoalGPT Q&A with Citations"])
rag_engine = CoalGPTRagEngine()

VOICE_MAP = {
    "Hindi": "hi-IN-SwaraNeural",
    "Bengali": "bn-IN-TanishaaNeural",
    "English": "en-IN-NeerjaNeural",
}

def clean_speech_text(text: str) -> str:
    """Pre-processes text to eliminate markdown, code brackets, URLs, and asterisks for smooth human speech."""
    if not text or not isinstance(text, str):
        return ""
    t = re.sub(r'#{1,6}\s*', '', text)
    t = re.sub(r'\*\*(.*?)\*\*', r'\1', t)
    t = re.sub(r'\*(.*?)\*', r'\1', t)
    t = re.sub(r'\[.*?\]', '', t)
    t = re.sub(r'https?://\S+', '', t)
    t = re.sub(r'[_`~]', '', t)
    return t.strip()

@router.post("/speak")
async def stream_tts(payload: TTSRequest):
    """
    Stream ultra-realistic Microsoft Azure Neural voice audio (MP3)
    using authentic human voice packs (Swara for Hindi, Tanishaa for Bengali, Neerja for English).
    """
    clean_text = clean_speech_text(payload.text)
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text is empty")

    voice = VOICE_MAP.get(payload.language, "en-IN-NeerjaNeural")

    async def audio_generator():
        communicate = edge_tts.Communicate(clean_text, voice=voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(
        audio_generator(),
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "inline; filename=speech.mp3",
            "Cache-Control": "no-cache",
        }
    )

@router.get("/speak")
async def stream_tts_get(text: str = Query(..., description="Text to synthesize"), language: Optional[str] = "English"):
    """GET endpoint for audio streaming support."""
    return await stream_tts(TTSRequest(text=text, language=language))

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
        chat_history=history,
        language=payload.language
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
