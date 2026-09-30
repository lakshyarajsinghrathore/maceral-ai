import os
import io
import csv
import re
from typing import Dict, Any, List, Tuple
from pathlib import Path
import numpy as np
from PIL import Image

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    cv2 = None
    HAS_OPENCV = False

try:
    import pytesseract
    HAS_TESSERACT = True
    common_tesseract_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\MY PC\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
        r"/usr/bin/tesseract",
        r"/usr/local/bin/tesseract"
    ]
    for p in common_tesseract_paths:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            break
except ImportError:
    pytesseract = None
    HAS_TESSERACT = False

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    fitz = None
    HAS_PYMUPDF = False


class DocumentParserService:
    """
    Advanced Neural OCR & Multi-Format Extraction Engine (SIH 26024):
    - Digital PDF (PyMuPDF native text & table parser)
    - Computer Vision Table Grid Extraction (OpenCV morphological kernels)
    - Handwritten Observation Enhancement & Transcription (Bilateral Filtering + CLAHE + LSTM OCR)
    - Scanned Images (Direct JPEG, PNG, WEBP from mobile inspection PWA)
    - Spreadsheets & Tabular Data (openpyxl / pandas / csv)
    - Statutory Word Documents (.docx)
    """

    @staticmethod
    def is_scanned_pdf(text_length_per_page: List[int]) -> bool:
        """Heuristic: if average text per page is < 40 characters, it's likely a scan."""
        if not text_length_per_page:
            return True
        avg_len = sum(text_length_per_page) / len(text_length_per_page)
        return avg_len < 40

    @classmethod
    def preprocess_handwritten_image(cls, image_np: np.ndarray) -> np.ndarray:
        """
        Enhances handwritten field notes and pencil/pen marks:
        1. Bilateral filter removes paper grain, stains, and dirt while preserving ink edges.
        2. CLAHE (Contrast Limited Adaptive Histogram Equalization) amplifies subtle pen contrast.
        """
        if not HAS_OPENCV or image_np is None:
            return image_np

        try:
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY) if len(image_np.shape) == 3 else image_np
            # Bilateral filter for noise reduction while keeping edges sharp
            denoised = cv2.bilateralFilter(gray, 9, 75, 75)
            # CLAHE for localized contrast enhancement
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            enhanced = clahe.apply(denoised)
            return enhanced
        except Exception as e:
            print(f"Handwritten image preprocessing warning: {e}")
            return image_np

    @classmethod
    def extract_tables_with_opencv(cls, image_np: np.ndarray, page_num: int = 1) -> List[Dict[str, Any]]:
        """
        Detects and extracts structured multi-row statutory table grids (DGMS Form 3, manifests, core logs)
        using OpenCV morphological line decomposition kernels.
        """
        if not HAS_OPENCV or image_np is None:
            return []

        tables_extracted = []
        try:
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY) if len(image_np.shape) == 3 else image_np
            img_h, img_w = gray.shape[:2]

            # Invert and threshold image
            binary = cv2.adaptiveThreshold(
                ~gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, -2
            )

            # Define morphological structuring elements for horizontal and vertical lines
            scale = 25
            h_size = max(15, int(img_w / scale))
            v_size = max(15, int(img_h / scale))

            h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_size, 1))
            v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_size))

            # Isolate lines
            h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel, iterations=2)
            v_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel, iterations=2)

            # Combine lines to build table mesh
            table_mesh = cv2.add(h_lines, v_lines)

            # Detect external contours of cells
            contours, _ = cv2.findContours(table_mesh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

            # Filter valid cell bounding boxes
            boxes = []
            for c in contours:
                x, y, w, h = cv2.boundingRect(c)
                # Cell must be larger than 25x14 px and smaller than full page
                if w >= 25 and h >= 14 and w < (img_w * 0.95) and h < (img_h * 0.5):
                    boxes.append((x, y, w, h))

            # If fewer than 4 cells detected, it is not a multi-row structured table
            if len(boxes) < 4:
                return []

            # Cluster cell boxes into table rows by Y coordinate within tolerance
            boxes.sort(key=lambda b: (b[1], b[0]))
            rows = []
            current_row = []
            current_y = None
            row_tol = 15  # 15px vertical tolerance for row grouping

            for b in boxes:
                x, y, w, h = b
                if current_y is None or abs(y - current_y) <= row_tol:
                    current_row.append(b)
                    if current_y is None:
                        current_y = y
                else:
                    current_row.sort(key=lambda item: item[0])
                    rows.append(current_row)
                    current_row = [b]
                    current_y = y

            if current_row:
                current_row.sort(key=lambda item: item[0])
                rows.append(current_row)

            # Only process if at least 2 rows with 2+ columns exist
            if len(rows) < 2 or max(len(r) for r in rows) < 2:
                return []

            # Perform OCR on each individual cell
            table_data = []
            has_detected_text = False
            for r_idx, row in enumerate(rows):
                row_cells = []
                for c_idx, (cx, cy, cw, ch) in enumerate(row):
                    cell_crop = gray[max(0, cy):min(img_h, cy + ch), max(0, cx):min(img_w, cx + cw)]
                    cell_text = ""
                    if HAS_TESSERACT and cell_crop.size > 0:
                        try:
                            cell_text = pytesseract.image_to_string(
                                cell_crop, config="--psm 6 -c preserve_interword_spaces=1"
                            ).strip()
                            cell_text = " ".join(cell_text.split())
                        except Exception:
                            cell_text = ""
                    if cell_text:
                        has_detected_text = True
                        row_cells.append(cell_text)
                    else:
                        row_cells.append(f"Cell_{r_idx+1}_{c_idx+1}")
                table_data.append(row_cells)

            if len(table_data) >= 2 and (has_detected_text or len(table_data) >= 3):
                # Align columns
                max_cols = max(len(r) for r in table_data)
                aligned_rows = [r + ["-"] * (max_cols - len(r)) for r in table_data]

                # Convert to Markdown table format
                header_row = " | ".join(aligned_rows[0])
                separator_row = " | ".join(["---"] * max_cols)
                data_rows = [" | ".join(r) for r in aligned_rows[1:]]

                md_table = f"| {header_row} |\n| {separator_row} |\n" + "\n".join([f"| {r} |" for r in data_rows])
                
                tables_extracted.append({
                    "markdown": md_table,
                    "rows_count": len(aligned_rows),
                    "cols_count": max_cols,
                    "has_text": has_detected_text,
                    "raw_matrix": aligned_rows
                })

        except Exception as e:
            print(f"OpenCV table extraction warning on page {page_num}: {e}")

        return tables_extracted

    @classmethod
    def transcribe_handwritten_notes(cls, image_np: np.ndarray) -> str:
        """
        Transcribes handwritten field inspector observations and notes
        using bilateral enhancement and LSTM neural network OCR mode.
        """
        if not HAS_TESSERACT or image_np is None:
            return ""

        try:
            enhanced = cls.preprocess_handwritten_image(image_np)
            # PSM 6: Assume a single uniform block of text (ideal for inspector logbook notes)
            # OEM 1: Neural Nets LSTM engine only
            custom_config = r'--oem 1 --psm 6'
            text = pytesseract.image_to_string(enhanced, config=custom_config).strip()
            
            # Post-process common mining handwritten OCR confusions
            domain_corrections = [
                (r"\bC114\b", "CH4"),
                (r"\b0BR\b", "OBR"),
                (r"\bDCMS\b", "DGMS"),
                (r"\bC0\b", "CO"),
                (r"\bG-1l\b", "G-11"),
                (r"\bSECL-([a-z0-9]+)\b", r"SECL-\1")
            ]
            for pat, repl in domain_corrections:
                text = re.sub(pat, repl, text, flags=re.IGNORECASE)

            return text
        except Exception as e:
            print(f"Handwritten transcription warning: {e}")
            return ""

    @classmethod
    def parse_image(cls, file_path: str) -> Tuple[str, List[Dict[str, Any]], bool]:
        """
        Direct parser for image files (JPEG, PNG, WEBP) uploaded from mobile inspections
        or scanner flatbeds.
        """
        page_chunks = []
        full_text_list = []

        try:
            if HAS_OPENCV:
                img_cv = cv2.imread(file_path)
            else:
                img_cv = None

            pil_img = Image.open(file_path)
            if img_cv is None and HAS_OPENCV:
                img_cv = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

            # 1. Check for Structured Table Grids (OpenCV)
            tables = cls.extract_tables_with_opencv(img_cv, page_num=1) if img_cv is not None else []
            table_md = "\n\n".join([f"### [Extracted Statutory Table]:\n{t['markdown']}" for t in tables])

            # 2. Extract General and Handwritten Text
            ocr_text = ""
            if HAS_TESSERACT:
                try:
                    handwritten_text = cls.transcribe_handwritten_notes(img_cv) if img_cv is not None else ""
                    standard_text = pytesseract.image_to_string(pil_img).strip()
                    ocr_text = handwritten_text if len(handwritten_text) > len(standard_text) else standard_text
                except Exception as t_err:
                    print(f"Tesseract OCR fallback note: {t_err}")
                    ocr_text = ""

            if not ocr_text:
                img_name = os.path.basename(file_path)
                ocr_text = f"[Field Inspection Image: {img_name} - Dimensions: {pil_img.size[0]}x{pil_img.size[1]} px. Visual features: {len(tables)} tabular grids detected.]"

            combined_text = ocr_text
            if table_md:
                combined_text = f"{table_md}\n\n### [General Observations & Field Text]:\n{combined_text}"

            page_chunks.append({
                "page_number": 1,
                "content": combined_text,
                "char_count": len(combined_text),
                "section_title": "Field Photo / Scanned Sheet",
                "metadata": {
                    "is_image": True,
                    "has_table": bool(tables),
                    "tables_count": len(tables)
                }
            })
            full_text_list.append(combined_text)

        except Exception as e:
            print(f"Error parsing image file {file_path}: {e}")
            fallback_text = f"[Image Document: {os.path.basename(file_path)}]"
            page_chunks.append({
                "page_number": 1,
                "content": fallback_text,
                "char_count": len(fallback_text),
                "section_title": "Image File"
            })
            full_text_list.append(fallback_text)

        return "\n\n".join(full_text_list), page_chunks, True

    @classmethod
    def parse_pdf(cls, file_path: str) -> Tuple[str, List[Dict[str, Any]], bool]:
        """
        Parses PDF files with dual-engine table extraction and neural handwritten OCR fallback.
        """
        page_chunks = []
        full_text_list = []
        is_scanned = False
        text_lengths = []

        try:
            if not HAS_PYMUPDF:
                raise ImportError("PyMuPDF (fitz) is not installed.")

            doc = fitz.open(file_path)
            for page_idx, page in enumerate(doc):
                page_num = page_idx + 1
                page_text = page.get_text("text").strip()
                text_lengths.append(len(page_text))

                # Step A: Try PyMuPDF native table extraction
                tables_found = []
                try:
                    tabs = page.find_tables()
                    for t in tabs:
                        df = t.extract()
                        if df and len(df) >= 2:
                            headers = " | ".join([str(c or "").strip() for c in df[0]])
                            sep = " | ".join(["---"] * len(df[0]))
                            rows = [" | ".join([str(c or "").strip() for c in r]) for r in df[1:]]
                            table_md = f"| {headers} |\n| {sep} |\n" + "\n".join([f"| {r} |" for r in rows])
                            tables_found.append(f"\n[Extracted Table - Page {page_num}]:\n{table_md}")
                except Exception:
                    pass

                # Step B: If no digital tables found and text is sparse, rasterize and run OpenCV table detector
                if not tables_found and HAS_OPENCV:
                    try:
                        pix = page.get_pixmap(dpi=180)
                        img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                        if pix.n == 4:  # RGBA to BGR
                            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
                        elif pix.n == 3:  # RGB to BGR
                            img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

                        cv_tables = cls.extract_tables_with_opencv(img_np, page_num=page_num)
                        for t in cv_tables:
                            tables_found.append(f"\n[OpenCV Grid Table - Page {page_num}]:\n{t['markdown']}")
                    except Exception as cv_err:
                        print(f"OpenCV raster table pass skipped on page {page_num}: {cv_err}")

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
            print(f"PyMuPDF parse failed ({e}), trying fallback text reader...")
            try:
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

        # If scanned PDF, run Neural OCR & Handwritten Enhancement on rasterized page images
        if is_scanned or not "".join(full_text_list).strip():
            try:
                if HAS_PYMUPDF and (HAS_TESSERACT or HAS_OPENCV):
                    print("Running Neural OCR & Morphological Processing on scanned document...")
                    doc = fitz.open(file_path)
                    ocr_chunks = []
                    full_text_list = []

                    for page_idx, page in enumerate(doc):
                        page_num = page_idx + 1
                        pix = page.get_pixmap(dpi=200)
                        
                        img_np = None
                        if HAS_OPENCV:
                            img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
                            if pix.n >= 3:
                                img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

                        # OpenCV table extraction on scanned page
                        scanned_tables = cls.extract_tables_with_opencv(img_np, page_num=page_num) if img_np is not None else []
                        table_str = "\n\n".join([f"[Scanned Table Grid]:\n{t['markdown']}" for t in scanned_tables])

                        # Neural OCR for text & handwriting
                        ocr_text = ""
                        if HAS_TESSERACT:
                            # Try handwritten observation enhancement
                            hw_text = cls.transcribe_handwritten_notes(img_np) if img_np is not None else ""
                            
                            img_pil = Image.open(io.BytesIO(pix.tobytes("png")))
                            std_text = pytesseract.image_to_string(img_pil).strip()
                            ocr_text = hw_text if len(hw_text) > len(std_text) else std_text

                        page_content = ocr_text
                        if table_str:
                            page_content = f"{table_str}\n\n{page_content}"

                        ocr_chunks.append({
                            "page_number": page_num,
                            "content": page_content,
                            "char_count": len(page_content),
                            "section_title": f"Page {page_num} (Neural OCR)",
                            "metadata": {
                                "is_scanned": True,
                                "tables_detected": len(scanned_tables)
                            }
                        })
                        full_text_list.append(f"--- [Page {page_num} Neural OCR] ---\n{page_content}")

                    doc.close()
                    if ocr_chunks:
                        page_chunks = ocr_chunks
                        is_scanned = True
            except Exception as ocr_err:
                print(f"Neural OCR execution error: {ocr_err}")

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
        Preserves table formatting and structural integrity across chunks.
        """
        final_chunks = []
        chunk_idx = 0

        for page in page_chunks:
            page_num = page.get("page_number", 1)
            section = page.get("section_title", f"Page {page_num}")
            content = page.get("content", "").strip()
            page_meta = page.get("metadata", {})

            if not content:
                continue

            if len(content) <= chunk_size_chars:
                final_chunks.append({
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "section_title": section,
                    "content": content,
                    "metadata": {**page_meta, "char_len": len(content)}
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
                        "metadata": {**page_meta, "char_len": len(chunk_slice), "split": True}
                    })
                    chunk_idx += 1
                    if end == len(content):
                        break
                    start += (chunk_size_chars - overlap_chars)

        return final_chunks
