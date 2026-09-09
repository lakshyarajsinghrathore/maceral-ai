import os
import io
import csv
from typing import Dict, Any, List, Tuple
from pathlib import Path

class DocumentParserService:
    """
    Multi-format parser for Mining and Ministry of Coal documents:
    - Digital PDF (PyMuPDF / fitz)
    - Scanned PDF / Images (Tesseract OCR / PIL)
    - Excel / CSV (openpyxl / pandas / csv)
    - Word documents (.docx)
    """

    @staticmethod
    def is_scanned_pdf(text_length_per_page: List[int]) -> bool:
        """Heuristic: if average text per page is < 40 characters, it's likely a scan."""
        if not text_length_per_page:
            return True
        avg_len = sum(text_length_per_page) / len(text_length_per_page)
        return avg_len < 40

    @classmethod
    def parse_pdf(cls, file_path: str) -> Tuple[str, List[Dict[str, Any]], bool]:
        """
        Parses PDF file.
        Returns:
            - full_text (str)
            - page_chunks (List[Dict]) with page_number, text, character count
            - is_scanned (bool)
        """
        page_chunks = []
        full_text_list = []
        is_scanned = False
        text_lengths = []

        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            for page_idx, page in enumerate(doc):
                page_num = page_idx + 1
                page_text = page.get_text("text").strip()
                text_lengths.append(len(page_text))

                # Try table extraction if available in fitz
                tables_found = []
                try:
                    tabs = page.find_tables()
                    for t in tabs:
                        df = t.extract()
                        if df:
                            table_md = "\n".join([" | ".join([str(c or "") for c in row]) for row in df])
                            tables_found.append(f"\n[Extracted Table - Page {page_num}]:\n{table_md}")
                except Exception:
                    pass

                if tables_found:
                    page_text += "\n" + "\n".join(tables_found)

                page_chunks.append({
                    "page_number": page_num,
                    "content": page_text,
                    "char_count": len(page_text),
                    "section_title": f"Page {page_num}"
                })
                if page_text:
                    full_text_list.append(f"--- [Page {page_num}] ---\n{page_text}")

            doc.close()
            is_scanned = cls.is_scanned_pdf(text_lengths)

        except Exception as e:
            # Fallback if fitz is not yet installed or file corrupted
            print(f"PyMuPDF parse attempt failed or not installed ({e}), trying fallback...")
            try:
                # Basic text reader fallback
                with open(file_path, "r", errors="ignore") as f:
                    content = f.read()
                    full_text_list.append(content)
                    page_chunks.append({
                        "page_number": 1,
                        "content": content,
                        "char_count": len(content),
                        "section_title": "Document Content"
                    })
            except Exception as e2:
                print(f"Text fallback failed: {e2}")

        # If scanned PDF, try Tesseract OCR on page images
        if is_scanned or not "".join(full_text_list).strip():
            try:
                import pytesseract
                from PIL import Image
                import fitz
                print("Running OCR on scanned document...")
                doc = fitz.open(file_path)
                ocr_chunks = []
                for page_idx, page in enumerate(doc):
                    pix = page.get_pixmap(dpi=200)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img).strip()
                    ocr_chunks.append({
                        "page_number": page_idx + 1,
                        "content": ocr_text,
                        "char_count": len(ocr_text),
                        "section_title": f"Page {page_idx + 1} (OCR)"
                    })
                    full_text_list.append(f"--- [Page {page_idx + 1} OCR] ---\n{ocr_text}")
                doc.close()
                if ocr_chunks:
                    page_chunks = ocr_chunks
                    is_scanned = True
            except Exception as ocr_err:
                print(f"OCR execution skipped or failed: {ocr_err}")

        full_text = "\n\n".join(full_text_list)
        return full_text, page_chunks, is_scanned

    @classmethod
    def parse_excel(cls, file_path: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Parses Excel or CSV files and returns structured markdown tables with page chunks."""
        page_chunks = []
        full_text_list = []

        try:
            import openpyxl
            wb = openpyxl.load_workbook(file_path, data_only=True)
            for sheet_idx, sheet_name in enumerate(wb.sheetnames):
                sheet = wb[sheet_name]
                rows_data = []
                for row in sheet.iter_rows(values_only=True):
                    if any(c is not None for c in row):
                        rows_data.append(" | ".join([str(c) if c is not None else "" for c in row]))

                sheet_text = f"### Sheet: {sheet_name}\n" + "\n".join(rows_data)
                page_chunks.append({
                    "page_number": sheet_idx + 1,
                    "content": sheet_text,
                    "char_count": len(sheet_text),
                    "section_title": f"Worksheet: {sheet_name}"
                })
                full_text_list.append(sheet_text)
            wb.close()
        except Exception as e:
            print(f"openpyxl failed ({e}), trying pandas/csv fallback...")
            try:
                import pandas as pd
                excel_file = pd.ExcelFile(file_path)
                for sheet_idx, sheet_name in enumerate(excel_file.sheet_names):
                    df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    markdown_table = df.to_markdown(index=False)
                    sheet_text = f"### Sheet: {sheet_name}\n{markdown_table}"
                    page_chunks.append({
                        "page_number": sheet_idx + 1,
                        "content": sheet_text,
                        "char_count": len(sheet_text),
                        "section_title": f"Worksheet: {sheet_name}"
                    })
                    full_text_list.append(sheet_text)
            except Exception as e2:
                # CSV fallback
                try:
                    with open(file_path, mode='r', encoding='utf-8', errors='ignore') as f:
                        reader = csv.reader(f)
                        rows = [" | ".join(row) for row in reader if row]
                        sheet_text = "### CSV Table\n" + "\n".join(rows)
                        page_chunks.append({
                            "page_number": 1,
                            "content": sheet_text,
                            "char_count": len(sheet_text),
                            "section_title": "CSV Data"
                        })
                        full_text_list.append(sheet_text)
                except Exception as e3:
                    print(f"CSV fallback error: {e3}")

        return "\n\n".join(full_text_list), page_chunks

    @classmethod
    def parse_docx(cls, file_path: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Parses DOCX document paragraphs and tables."""
        page_chunks = []
        full_text_list = []
        try:
            import docx
            doc = docx.Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]

            tables_data = []
            for t_idx, table in enumerate(doc.tables):
                table_rows = []
                for row in table.rows:
                    table_rows.append(" | ".join([c.text.strip() for c in row.cells]))
                tables_data.append(f"\n[Table {t_idx + 1}]:\n" + "\n".join(table_rows))

            doc_content = "\n\n".join(paragraphs) + ("\n\n" + "\n".join(tables_data) if tables_data else "")
            page_chunks.append({
                "page_number": 1,
                "content": doc_content,
                "char_count": len(doc_content),
                "section_title": "Word Document"
            })
            full_text_list.append(doc_content)
        except Exception as e:
            print(f"DOCX parser error: {e}")
            with open(file_path, "r", errors="ignore") as f:
                content = f.read()
                page_chunks.append({
                    "page_number": 1,
                    "content": content,
                    "char_count": len(content),
                    "section_title": "Document"
                })
                full_text_list.append(content)

        return "\n\n".join(full_text_list), page_chunks

    @classmethod
    def chunk_text(cls, page_chunks: List[Dict[str, Any]], chunk_size_chars: int = 1500, overlap_chars: int = 200) -> List[Dict[str, Any]]:
        """
        Splits page chunks into optimal sized snippets with page metadata preserved for precise citations.
        """
        final_chunks = []
        chunk_idx = 0

        for page in page_chunks:
            page_num = page.get("page_number", 1)
            section = page.get("section_title", f"Page {page_num}")
            content = page.get("content", "").strip()

            if not content:
                continue

            if len(content) <= chunk_size_chars:
                final_chunks.append({
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "section_title": section,
                    "content": content,
                    "metadata": {"char_len": len(content)}
                })
                chunk_idx += 1
            else:
                # Sliding window chunking
                start = 0
                while start < len(content):
                    end = min(start + chunk_size_chars, len(content))
                    chunk_slice = content[start:end]
                    final_chunks.append({
                        "chunk_index": chunk_idx,
                        "page_number": page_num,
                        "section_title": section,
                        "content": chunk_slice,
                        "metadata": {"char_len": len(chunk_slice), "split": True}
                    })
                    chunk_idx += 1
                    if end == len(content):
                        break
                    start += (chunk_size_chars - overlap_chars)

        return final_chunks
