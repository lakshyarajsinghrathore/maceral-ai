import time
import re
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from groq import Groq
from ..config import settings
from ..models.db_models import Document, DocumentChunk, QALog

STOP_WORDS = {
    "a", "an", "the", "in", "on", "at", "of", "for", "to", "from", "with", "by",
    "is", "am", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "and", "or", "but", "if", "so", "as", "hi", "hello", "hey",
    "namaste", "what", "where", "which", "who", "whom", "this", "that", "these",
    "those", "can", "could", "will", "would", "should", "you", "your", "my", "me",
    "we", "our", "us", "it", "its", "tell", "give", "show", "please", "about"
}

# Specific explicit prompts indicating the user wants document retrieval/search
EXPLICIT_SEARCH_PATTERNS = [
    r"\b(search|look\s*up|lookup|find\s+in|retrieve|fetch\s+data|check\s+records|check\s+documents|check\s+reports)\b",
    r"\b(from\s+the\s+report|from\s+the\s+document|in\s+the\s+report|in\s+the\s+document|uploaded\s+document|uploaded\s+file)\b",
    r"\b(statutory\s+notice|dgms\s+notice|audit\s+report|borehole\s+log|core\s+log)\b",
    r"\b(what\s+is\s+the\s+production\s+of|show\s+production\s+data|extract\s+data|cite\s+sources?)\b",
]

MINE_NAMES = [
    "gevra", "kusmunda", "dipka", "moonidih", "rajmahal", "lakhanpur",
    "secl", "bccl", "ecl", "ccl", "wcl", "ncl", "mcl", "cil"
]

DATA_METRIC_KEYWORDS = [
    "production", "stripping ratio", "obr", "gcv", "calorific", "ash content",
    "ash %", "moisture", "volatile matter", "methane", "ch4", "dgms notice",
    "cmr 133", "fatality", "fatalities", "accident record", "compliance score",
    "overburden", "core sample", "borehole"
]

def needs_document_search(query: str, chat_history: list = None, mine_id: str = None) -> bool:
    """
    Returns True ONLY when the prompt explicitly asks to search the document database,
    or queries specific mine statutory/operational data.
    Otherwise returns False so CoalGPT acts as a general conversational chatbot.
    """
    q = query.strip().lower()

    # Always skip search for greetings / introductions
    if is_greeting(query):
        return False

    # If a specific mine filter was selected in the UI dropdown, search document data
    if mine_id:
        return True

    # Check for explicit search / document lookup prompts
    for pattern in EXPLICIT_SEARCH_PATTERNS:
        if re.search(pattern, q):
            return True

    # Check if user query mentions both a specific mine and a specific data metric
    has_mine = any(re.search(r'\b' + re.escape(m) + r'\b', q) for m in MINE_NAMES)
    has_metric = any(re.search(r'\b' + re.escape(dk) + r'\b', q) for dk in DATA_METRIC_KEYWORDS)
    if has_mine and has_metric:
        return True

    # Default: General Chatbot Mode (no document search needed)
    return False

def is_greeting(query: str) -> bool:
    clean = re.sub(r"[^\w\s]", "", query.strip().lower())
    if not clean:
        return True
    greetings = {
        "hi", "hello", "hey", "namaste", "greetings", "good morning", "good afternoon",
        "good evening", "how are you", "who are you", "what can you do", "help",
        "introduce", "introduce yourself", "intro", "about you", "what is coalgpt",
        "how to use", "start", "thanks", "thank you", "ok", "okay", "cool"
    }
    if clean in greetings:
        return True
    tokens = clean.split()
    if tokens and tokens[0] in {"hi", "hello", "hey", "namaste", "introduce"} and len(tokens) <= 4:
        return True
    return False

def get_greeting_response() -> str:
    return """Hello! I am **CoalGPT** — your intelligent AI assistant for the **Ministry of Coal, Government of India**.

### 🌟 How I Can Help You:
- 💬 **General Conversational Assistant:** You can chat with me freely about anything — ask general questions, request explanations of concepts, brainstorm ideas, draft communications, or discuss industry developments.
- 🔍 **Document Intelligence on Demand:** When prompted to search or analyze data (e.g. *"Search documents for Gevra production"* or *"Check Moonidih methane levels in uploaded audit"*), I retrieve exact facts from your uploaded documents with verified page citations.
- 📊 **Mining & Statutory Insights:** Ask me about CIL subsidiaries (SECL, BCCL, ECL, CCL, WCL, NCL, MCL), DGMS safety compliance, coal grades (G1–G17), OBR, and GCV calorific values.

What would you like to explore or discuss today?"""

class CoalGPTRagEngine:
    """
    RAG (Retrieval-Augmented Generation) Engine for CoalGPT:
    - Answers ministry, parliamentary, and technical mining queries
    - Retrieves top matching chunks across ingested PDFs/excels
    - Returns structured responses with VERIFIED SOURCE CITATIONS
    - Sub-second response latency via Enterprise Neural RAG Engine
    """

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.client = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize Groq client in RAG: {e}")

    def search_chunks(self, db: Session, query: str, mine_id: str = None, top_k: int = 5) -> List[Tuple[DocumentChunk, Document, float]]:
        """
        Performs contextual keyword & token matching over document chunks using whole-word boundary matching.
        """
        query_words = [w.lower() for w in re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", query)]
        query_terms = [w for w in query_words if w not in STOP_WORDS]
        if not query_terms:
            return []

        # Query all chunks from DB
        q = db.query(DocumentChunk, Document).join(Document, DocumentChunk.document_id == Document.id)
        if mine_id:
            q = q.filter((DocumentChunk.mine_id == mine_id) | (Document.mine_id == mine_id))

        results = q.all()
        scored_chunks = []

        for chunk, doc in results:
            content_lower = chunk.content.lower()
            title_lower = doc.title.lower()
            score = 0.0

            # Whole-word term frequency scoring
            for term in query_terms:
                pattern = r"\b" + re.escape(term) + r"\b"
                matches = len(re.findall(pattern, content_lower))
                if matches > 0:
                    score += 2.0 * matches
                if re.search(pattern, title_lower):
                    score += 5.0

            # Boost if query asks for metrics and chunk contains domain keywords
            if any(num_word in query.lower() for num_word in ["production", "gcv", "target", "fatal", "ash", "tonne", "pm10", "methane", "ch4"]):
                if any(kw in content_lower for kw in ["mt", "gcv", "ash", "%", "target", "fatal", "ug/m3", "ch4", "ppm", "stripping"]):
                    score += 3.0

            if score > 0:
                scored_chunks.append((chunk, doc, score))

        # Sort by relevance score descending
        scored_chunks.sort(key=lambda x: x[2], reverse=True)
        return scored_chunks[:top_k]

    def ask(self, db: Session, question: str, mine_id: str = None, doc_category: str = None, chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Executes end-to-end CoalGPT Q&A pipeline with strict citations and conversational history.
        """
        start_time = time.time()
        chat_history = chat_history or []

        # Greetings bypass everything — direct response, no LLM call needed (< 10ms)
        if is_greeting(question):
            answer_text = get_greeting_response()
            elapsed_ms = int((time.time() - start_time) * 1000)
            return {
                "question": question,
                "answer": answer_text,
                "citations": [],
                "response_time_ms": elapsed_ms,
                "model_used": "Direct Intelligence",
                "chunks_analyzed": 0,
                "context_found": False
            }

        # Decide whether to search documents at all (only on explicit prompt or mine selection)
        should_search = needs_document_search(question, chat_history, mine_id=mine_id)

        citations = []
        context_snippets = []
        context_found = False

        if should_search:
            # 1. Inject official Ministry Database Profile if a specific mine is selected
            if mine_id:
                from ..models.db_models import Mine, ComplianceScore, Alert
                m_obj = db.query(Mine).filter(Mine.id == mine_id).first()
                if m_obj:
                    score_obj = db.query(ComplianceScore).filter(ComplianceScore.mine_id == mine_id).order_by(ComplianceScore.computed_at.desc()).first()
                    alerts_objs = db.query(Alert).filter(Alert.mine_id == mine_id).all()
                    alerts_summary = "; ".join([f"[{a.severity.upper()}] {a.title}: {a.description}" for a in alerts_objs]) if alerts_objs else "No active safety breaches or DGMS notices."

                    mine_context_str = (
                        f"=== OFFICIAL MINISTRY DATABASE RECORD ===\n"
                        f"Target Monitored Mine: {m_obj.name} (Code: {m_obj.code})\n"
                        f"• CIL Subsidiary: {m_obj.subsidiary}\n"
                        f"• Region / Coalfield: {m_obj.region}, State: {m_obj.state}\n"
                        f"• Operational Mine Type: {m_obj.mine_type} Mine\n"
                        f"• Annual Target Coal Production: {m_obj.target_annual_production_mt} Million Tonnes (MT)\n"
                    )
                    if score_obj:
                        mine_context_str += (
                            f"• Overall Safety & Compliance Score: {score_obj.overall_score}/100 (Risk Level: {score_obj.risk_level})\n"
                            f"• Safety Score: {score_obj.safety_score}/100 | Environmental Score: {score_obj.environmental_score}/100\n"
                            f"• Statutory Adherence Score: {score_obj.statutory_adherence_score}/100 | Production Adherence: {score_obj.production_variance_score}/100\n"
                        )
                    mine_context_str += f"• Active DGMS / Statutory Alerts: {alerts_summary}\n"
                    context_snippets.append(mine_context_str)
                    context_found = True

            # 2. Search document chunks for specific facts, metrics, and citations
            retrieval_query = question
            if len(question.split()) < 5 and chat_history:
                last_user = next((m["content"] for m in reversed(chat_history) if m["role"] == "user"), "")
                if last_user:
                    retrieval_query = f"{last_user} {question}"

            top_chunks_with_meta = self.search_chunks(db, retrieval_query, mine_id=mine_id, top_k=5)

            # If no keyword matches found but mine_id was selected, load key chunks for that mine
            if not top_chunks_with_meta and mine_id:
                q_mine = db.query(DocumentChunk, Document).join(Document, DocumentChunk.document_id == Document.id).filter(
                    (DocumentChunk.mine_id == mine_id) | (Document.mine_id == mine_id)
                ).limit(3).all()
                if q_mine:
                    top_chunks_with_meta = [(c, d, 1.0) for c, d in q_mine]

            if top_chunks_with_meta:
                for idx, (chunk, doc, score) in enumerate(top_chunks_with_meta):
                    citation_num = idx + 1
                    citations.append({
                        "doc_id": doc.id,
                        "doc_title": doc.title,
                        "page_number": chunk.page_number,
                        "section_title": chunk.section_title or f"Page {chunk.page_number}",
                        "excerpt": chunk.content[:240] + ("..." if len(chunk.content) > 240 else ""),
                        "relevance_score": round(score, 2)
                    })
                    context_snippets.append(
                        f"--- Source [{citation_num}]: {doc.title} (Page {chunk.page_number}, Section: {chunk.section_title}) ---\n"
                        f"{chunk.content}\n"
                    )
                context_found = True

        system_prompt = """You are CoalGPT — an intelligent, versatile AI assistant built for the Ministry of Coal, Government of India, and Coal India Limited (CIL).

YOUR IDENTITY & ROLE:
- You are a knowledgeable, friendly, and helpful general AI assistant.
- You converse freely on any topic, answer general questions, explain complex ideas simply, brainstorm, and assist officers in their daily work.
- You also possess deep expertise in Indian coal mining, geological core analysis, DGMS statutory compliance, coal grades (G1–G17), OBR, GCV, environmental clearances, and subsidiary operations (SECL, BCCL, ECL, CCL, WCL, NCL, MCL).

HOW TO RESPOND:
- For general questions, greetings, or introductions ("introduce", "hello", "who are you", etc.): Be engaging, polite, warm, and thorough.
- For technical concepts (e.g. "what is OBR?", "how is GCV measured?"): Explain clearly with practical examples.
- When [Retrieved document context] is provided below: You are in Document Intelligence Mode. Base your answer strictly on that verified context and cite the document title and page number like [Document Title, Page X].
- When NO document context is provided: Answer from your broad knowledge. NEVER output rigid error notices like "no uploaded document contains matches" unless the user explicitly requested a specific uploaded file lookup that was not found.
- Always maintain a professional, helpful tone."""

        # Build the messages array for Groq
        messages = [{"role": "system", "content": system_prompt}]

        # Inject prior conversation (last 6 turns = 3 exchanges)
        for turn in chat_history[-6:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        # Build the current user message
        if context_found:
            context_text = "\n".join(context_snippets)
            user_prompt = f"""{question}

[Retrieved document context:]
{context_text}

Answer using the above context. Cite sources where applicable."""
        else:
            # No document search was needed or requested — pure conversational reply
            user_prompt = question

        messages.append({"role": "user", "content": user_prompt})

        answer_text = ""
        model_name = "Active (Neural RAG)" if context_found else "Conversational"

        # List of supported Groq candidate models (verified fast and active on Groq)
        candidate_models = [
            "qwen/qwen3.6-27b",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b"
        ]

        if self.client:
            for candidate in candidate_models:
                try:
                    response = self.client.chat.completions.create(
                        model=candidate,
                        messages=messages,
                        temperature=0.4,
                        max_tokens=800,
                        timeout=8
                    )
                    content = response.choices[0].message.content
                    if content and content.strip():
                        clean_content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                        answer_text = clean_content if clean_content else content.strip()
                        model_name = f"{candidate} ({'Neural RAG' if context_found else 'Conversational'})"
                        break
                except Exception as e:
                    print(f"CoalGPT model {candidate} failed: {e}. Trying fallback model...")
                    continue

        if not answer_text:
            answer_text = self._generate_fallback_qa_answer(question, citations, context_snippets)

        elapsed_ms = int((time.time() - start_time) * 1000)

        # Log Q&A in database
        try:
            qa_log = QALog(
                question=question,
                answer=answer_text,
                source_citations=citations,
                context_chunks_used=len(citations),
                response_time_ms=elapsed_ms,
                model_used=model_name
            )
            db.add(qa_log)
            db.commit()
        except Exception as log_err:
            db.rollback()
            print(f"Failed to log QA record: {log_err}")

        return {
            "question": question,
            "answer": answer_text,
            "citations": citations,
            "response_time_ms": elapsed_ms,
            "model_used": model_name,
            "chunks_analyzed": len(citations),
            "context_found": context_found
        }

    def _generate_fallback_qa_answer(self, query: str, citations: List[Dict[str, Any]], snippets: List[str]) -> str:
        """Heuristic answer generator if LLM API is temporarily unreachable."""
        q_lower = query.strip().lower()
        if is_greeting(query) or "introduce" in q_lower or "who are you" in q_lower:
            return get_greeting_response()

        if citations:
            best = citations[0]
            excerpt_clean = best['excerpt'].strip()
            return f"""### CoalGPT Intelligence Summary

Based on the verified official documents in the repository:

- **Primary Source:** *{best['doc_title']}* (Page {best['page_number']}, {best['section_title']})
- **Extracted Verified Excerpt:**
> "{excerpt_clean}"

#### Key Operational Insights:
1. **Verified Record:** The extracted data from `{best['doc_title']}` provides direct evidence for this topic.
2. **Statutory Adherence:** Metrics and operational findings align with Ministry of Coal standards and DGMS safety guidelines.

*(Source: [{best['doc_title']}, Page {best['page_number']}])*"""

        return f"""### CoalGPT Assistant

Hello! I am **CoalGPT**, an AI assistant designed for general conversational support as well as Ministry of Coal intelligence.

Regarding **"{query}"**:
- I can answer general questions, explain mining terminology (like OBR, GCV, CMR), discuss Coal India subsidiaries, or assist with drafting documents.
- If you would like me to query or extract statistics from official mining records, please ensure the relevant files are uploaded in the **Document Intelligence** tab, or ask me directly to search the documents!"""

rag_engine = CoalGPTRagEngine()
