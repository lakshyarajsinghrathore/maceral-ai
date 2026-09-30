# SIH 26024 Gap Analysis & Roadmap

This analysis compares the current **Maceral AI** platform against the requirements laid out in SIH Problem Statement 26024.

## 1. Missing Features (Phase 2 Roadmap)
These features are core requirements that are not currently implemented in the platform.

- **[ ] Geo-Tagged Mobile Application (Field Reporting PWA)**
  - *Requirement:* GPS geo-tagging for site inspections, mobile tracking, and offline sync capability.
  - *Current Status:* We have a functional offline inspection form, but it lacks deep PWA integration (push notifications, camera access for geo-tagged image uploads) and a robust offline sync queue persistent storage mechanism.
- **[ ] Contractor & Labor Grievance Management**
  - *Requirement:* Digital tracking of contractor performance and a dedicated portal for labor/contractor grievances.
  - *Current Status:* We have a UI mock, but no backend logic, database tables, or workflow for grievance submission/resolution cycles.
- **[ ] Asset/Equipment Tracking**
  - *Requirement:* Real-time tracking of heavy machinery (Draglines, Shovels, Dumpers) and their health telemetry.
  - *Current Status:* We have basic telemetry (methane, temp, compliance), but lack a dedicated machinery/asset tracking module with preventative maintenance scheduling based on hours usage.
- **[ ] Advanced Multilingual Support**
  - *Requirement:* Conversational interfaces and reports in regional languages.
  - *Current Status:* CoalGPT backend supports multi-language queries, but the frontend interface, static labels, and document exports are English-only.
- **[ ] Blockchain-Linked Ledger**
  - *Requirement:* Tamper-proof audit trails.
  - *Current Status:* We display hashed log entries in the audit dashboard for visual demonstration, but we need to implement the server-side cryptographic hash-chaining logic to ensure logs cannot be retrospectively altered.

## 2. Features Requiring Improvement
These features are present but need enhancement to meet enterprise standards.

- **[ ] GIS Mapping Integration**
  - *Improvement:* Move from basic OSM tiles to advanced vector-based GIS layers (e.g., Mapbox GL, MapTiler) to visualize actual mine lease boundaries/polygons instead of just points/markers.
- **[ ] Neural OCR Extraction Engine**
  - *Improvement:* Currently processing sample documents; needs to scale to handle handwritten field notes and low-quality scanned documents using a more robust pipeline (e.g., Tesseract + LayoutLMv3 or specialized Table Transformer models).
- **[ ] GIS & Compliance Scoring Engine**
  - *Improvement:* Compliance score updates are static/seed-based in the backend; needs to be dynamically calculated in real-time based on live telemetry feeds and incoming document OCR results.
- **[ ] CoalGPT RAG Engine**
  - *Improvement:* Currently searching document chunks; needs semantic search enhancement to relate questions to geospatial mine clusters or specific contractor sites.
- **[ ] UI/UX Accessibility (A11y)**
  - *Improvement:* Modernizing the dashboard for high-contrast accessibility (WCAG compliant), crucial for inspectors working in varying daytime/nighttime environmental conditions.
