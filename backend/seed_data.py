import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.db_models import Mine, Document, DocumentChunk, ExtractedData, ComplianceScore, Alert, Report, User
from app.services.report_generator import ReportGeneratorService
from app.services.auth_service import hash_password

MINES_SEED = [
    {
        "id": "m-singrauli-north",
        "name": "Singrauli North",
        "code": "NCL-SNG-01",
        "subsidiary": "NCL",
        "region": "Sonbhadra",
        "state": "Uttar Pradesh",
        "latitude": 24.1982,
        "longitude": 82.6712,
        "mine_type": "Opencast",
        "target_annual_production_mt": 28.5,
        "coal_seam": "Purewa Bottom",
        "daily_target_kt": 28.5,
        "daily_actual_kt": 23.1,
        "coal_dispatched_kt": 19.2,
        "pithead_temp_c": 38.4,
        "methane_ch4_pct": 1.42,
        "dust_particulate_mg_m3": 4.1,
        "telemetry_status": "Critical",
        "score": 68.0,
        "risk": "Critical"
    },
    {
        "id": "m-jharia-ug",
        "name": "Jharia Underground",
        "code": "BCCL-JHA-02",
        "subsidiary": "BCCL",
        "region": "Dhanbad",
        "state": "Jharkhand",
        "latitude": 23.7436,
        "longitude": 86.4125,
        "mine_type": "Underground",
        "target_annual_production_mt": 16.0,
        "coal_seam": "Seam X Coking",
        "daily_target_kt": 16.0,
        "daily_actual_kt": 15.2,
        "coal_dispatched_kt": 14.0,
        "pithead_temp_c": 37.8,
        "methane_ch4_pct": 0.85,
        "dust_particulate_mg_m3": 2.8,
        "telemetry_status": "Watch",
        "score": 76.0,
        "risk": "Watch"
    },
    {
        "id": "m-korba-central",
        "name": "Korba Central",
        "code": "SECL-KOR-03",
        "subsidiary": "SECL",
        "region": "Korba",
        "state": "Chhattisgarh",
        "latitude": 22.3276,
        "longitude": 82.6975,
        "mine_type": "Opencast",
        "target_annual_production_mt": 42.0,
        "coal_seam": "Upper Kusmunda",
        "daily_target_kt": 42.0,
        "daily_actual_kt": 36.4,
        "coal_dispatched_kt": 32.0,
        "pithead_temp_c": 36.5,
        "methane_ch4_pct": 0.44,
        "dust_particulate_mg_m3": 2.1,
        "telemetry_status": "Watch",
        "score": 84.0,
        "risk": "Watch"
    },
    {
        "id": "m-talcher-east",
        "name": "Talcher East",
        "code": "MCL-TAL-04",
        "subsidiary": "MCL",
        "region": "Angul",
        "state": "Odisha",
        "latitude": 20.9500,
        "longitude": 85.1200,
        "mine_type": "Opencast",
        "target_annual_production_mt": 34.0,
        "coal_seam": "Seam VIII",
        "daily_target_kt": 34.0,
        "daily_actual_kt": 31.8,
        "coal_dispatched_kt": 27.5,
        "pithead_temp_c": 41.2,
        "methane_ch4_pct": 0.68,
        "dust_particulate_mg_m3": 3.4,
        "telemetry_status": "Watch",
        "score": 79.0,
        "risk": "Watch"
    },
    {
        "id": "m-ib-valley",
        "name": "Ib Valley OCP",
        "code": "MCL-IBV-05",
        "subsidiary": "MCL",
        "region": "Jharsuguda",
        "state": "Odisha",
        "latitude": 21.8250,
        "longitude": 83.9210,
        "mine_type": "Opencast",
        "target_annual_production_mt": 15.0,
        "coal_seam": "Lajkura Seam",
        "daily_target_kt": 15.0,
        "daily_actual_kt": 15.4,
        "coal_dispatched_kt": 14.2,
        "pithead_temp_c": 35.5,
        "methane_ch4_pct": 0.35,
        "dust_particulate_mg_m3": 2.0,
        "telemetry_status": "Normal",
        "score": 91.0,
        "risk": "Normal"
    },
    {
        "id": "m-jharkhand-pit",
        "name": "Jharkhand Pit (Rajmahal)",
        "code": "ECL-JHK-06",
        "subsidiary": "ECL",
        "region": "Rajmahal",
        "state": "Jharkhand",
        "latitude": 25.0450,
        "longitude": 87.3780,
        "mine_type": "Opencast",
        "target_annual_production_mt": 3.0,
        "coal_seam": "Rajmahal Seam II",
        "daily_target_kt": 3.0,
        "daily_actual_kt": 3.0,
        "coal_dispatched_kt": 2.0,
        "pithead_temp_c": 35.0,
        "methane_ch4_pct": 0.30,
        "dust_particulate_mg_m3": 1.7,
        "telemetry_status": "Normal",
        "score": 80.0,
        "risk": "Normal"
    },
    {
        "id": "m-north-karanpura",
        "name": "North Karanpura",
        "code": "CCL-NKP-07",
        "subsidiary": "CCL",
        "region": "Chatra",
        "state": "Jharkhand",
        "latitude": 23.8560,
        "longitude": 85.0320,
        "mine_type": "Mixed",
        "target_annual_production_mt": 20.0,
        "coal_seam": "Dakra Incline",
        "daily_target_kt": 20.0,
        "daily_actual_kt": 21.2,
        "coal_dispatched_kt": 18.4,
        "pithead_temp_c": 33.8,
        "methane_ch4_pct": 0.22,
        "dust_particulate_mg_m3": 1.6,
        "telemetry_status": "Normal",
        "score": 94.0,
        "risk": "Normal"
    },
    {
        "id": "m-raniganj-deep",
        "name": "Raniganj Deep",
        "code": "ECL-RAN-08",
        "subsidiary": "ECL",
        "region": "Asansol",
        "state": "West Bengal",
        "latitude": 23.6820,
        "longitude": 86.9850,
        "mine_type": "Underground",
        "target_annual_production_mt": 14.5,
        "coal_seam": "Dishergarh",
        "daily_target_kt": 14.5,
        "daily_actual_kt": 14.9,
        "coal_dispatched_kt": 13.8,
        "pithead_temp_c": 34.1,
        "methane_ch4_pct": 0.32,
        "dust_particulate_mg_m3": 1.8,
        "telemetry_status": "Normal",
        "score": 92.0,
        "risk": "Normal"
    },
    {
        "id": "m-wardha-valley",
        "name": "Wardha Valley",
        "code": "WCL-WAR-09",
        "subsidiary": "WCL",
        "region": "Chandrapur",
        "state": "Maharashtra",
        "latitude": 19.9610,
        "longitude": 79.2960,
        "mine_type": "Opencast",
        "target_annual_production_mt": 18.0,
        "coal_seam": "Ballarpur Bottom",
        "daily_target_kt": 18.0,
        "daily_actual_kt": 17.4,
        "coal_dispatched_kt": 15.1,
        "pithead_temp_c": 35.0,
        "methane_ch4_pct": 0.28,
        "dust_particulate_mg_m3": 1.9,
        "telemetry_status": "Normal",
        "score": 89.0,
        "risk": "Normal"
    }
]

SAMPLE_DOCS = [
    {
        "id": "doc-gevra-q3-statutory",
        "mine_id": "m1-gevra-secl",
        "title": "Gevra OCP Quarterly Statutory Operations & DGMS Safety Review",
        "file_name": "Gevra_OCP_Q3_Operations_Safety_Review.pdf",
        "file_type": "pdf",
        "file_size_bytes": 1420800,
        "doc_category": "Production & Safety",
        "ocr_applied": False,
        "raw_text": """GOVERNMENT OF INDIA • MINISTRY OF COAL
SOUTH EASTERN COALFIELDS LIMITED (SECL)
GEVRA EXPANSION OPENCAST PROJECT — STATUTORY COMPLIANCE REPORT
Reporting Period: Q3 FY 2024-25 (October - December 2024)

1. EXECUTIVE OPERATIONAL PERFORMANCE
During Q3 FY2024-25, Gevra OCP extracted a total gross coal quantity of 14.85 Million Tonnes (MT) against the quarterly prorated target of 15.00 MT, achieving 99.0% target adherence. Total Overburden Removal (OBR) for the quarter stood at 22.40 Million Cubic Meters (MCuM), yielding an operative stripping ratio of 1.51 Cu.M/Tonne. Rail dispatch through the East-West Rail Corridor via merry-go-round (MGR) reached 11.20 MT, while 3.65 MT was evacuated via high-capacity in-pit conveyor and truck-haulage.

2. GEOLOGICAL SEAM QUALITY AUDIT
Coal extraction was primarily concentrated in Upper Kusmunda Seam (Thickness: 28.5 meters) and Lower Kusmunda Seam (Thickness: 19.2 meters). Laboratory bomb calorimeter analysis certified an average Gross Calorific Value (GCV) of 3,840 kcal/kg, placing the extracted lot under Grade G11 Non-Coking Coal. Average Ash Content is recorded at 38.6%, inherent moisture at 8.9%, volatile matter at 23.4%, and sulphur content at 0.42%.

3. DGMS STATUTORY SAFETY & MINE INTEGRITY
Safety performance remained exemplary with zero fatal accidents recorded during the quarter. Two minor reportable near-misses occurred in the eastern overburden dump bench during heavy machinery maneuvering, following which DGMS Circular No. 04 slope stabilization guidelines were immediately enacted. Ambient methane (CH4) sensors registered negligible 0.01% concentrations. Continuous telemetry monitoring of high-wall stability with synthetic aperture radar (SAR) confirmed zero slope deformation across all 42 benches.

4. ENVIRONMENTAL & CPCB STATUTORY NORMS
Ambient air quality monitoring within the 5 km buffer radius yielded an average PM10 concentration of 76.2 µg/m³ (CPCB permissible limit: 100 µg/m³) and PM2.5 concentration of 38.4 µg/m³ (limit: 60 µg/m³). Water discharge effluent treatment plants (ETP) maintained discharge pH at 7.4 with Total Suspended Solids (TSS) at 34 mg/l against the maximum statutory limit of 100 mg/l. Stage-II Forest Clearance compliance remains active across 1,840 hectares.""",
        "chunks": [
            {
                "page": 1,
                "section": "Executive Operational Performance",
                "text": "During Q3 FY2024-25, Gevra OCP extracted a total gross coal quantity of 14.85 Million Tonnes (MT) against the quarterly prorated target of 15.00 MT, achieving 99.0% target adherence. Total Overburden Removal (OBR) for the quarter stood at 22.40 Million Cubic Meters (MCuM), yielding an operative stripping ratio of 1.51 Cu.M/Tonne. Rail dispatch through East-West Rail Corridor reached 11.20 MT."
            },
            {
                "page": 2,
                "section": "Geological Seam Quality",
                "text": "Coal extraction was primarily concentrated in Upper Kusmunda Seam (Thickness: 28.5 meters). Laboratory bomb calorimeter analysis certified an average Gross Calorific Value (GCV) of 3,840 kcal/kg (Grade G11 Non-Coking Coal). Average Ash Content is recorded at 38.6%, inherent moisture at 8.9%, volatile matter at 23.4%, and sulphur content at 0.42%."
            },
            {
                "page": 3,
                "section": "DGMS Safety & Environmental",
                "text": "Safety performance remained exemplary with zero fatal accidents. Ambient air quality monitoring yielded average PM10 concentration of 76.2 µg/m³ (limit: 100 µg/m³) and PM2.5 of 38.4 µg/m³. Water discharge pH stood at 7.4 and TSS at 34 mg/l."
            }
        ],
        "extracted": {
            "document_summary": "Quarterly operational and statutory safety review for Gevra OCP showing 14.85 MT coal production (99% target adherence), Grade G11 coal (GCV 3840 kcal/kg), zero fatalities, and clean environmental indicators.",
            "reporting_period": "Q3 FY 2024-25",
            "mine_identification": {
                "mine_name": "Gevra Opencast Mine",
                "subsidiary": "SECL",
                "block_region": "Korba Coalfield",
                "state": "Chhattisgarh"
            },
            "production_metrics": {
                "gross_production_mt": 14.85,
                "target_production_mt": 15.00,
                "variance_percentage": -1.00,
                "overburden_removal_mcum": 22.40,
                "stripping_ratio": 1.51,
                "dispatch_rail_mt": 11.20,
                "dispatch_road_mt": 3.65,
                "closing_stock_mt": 0.85,
                "notable_production_observations": ["99.0% target adherence achieved", "East-West rail corridor operational at maximum capacity"]
            },
            "geological_metrics": {
                "coal_seam_name": "Upper & Lower Kusmunda Seam",
                "working_thickness_meters": 28.5,
                "coal_grade": "G11",
                "gcv_kcal_per_kg": 3840.0,
                "ash_content_percentage": 38.6,
                "moisture_percentage": 8.9,
                "volatile_matter_percentage": 23.4,
                "sulphur_percentage": 0.42
            },
            "safety_and_health": {
                "fatalities_count": 0,
                "serious_injuries_count": 0,
                "near_misses_count": 2,
                "methane_ch4_peak_percentage": 0.01,
                "carbon_monoxide_co_ppm": 2.0,
                "ventilation_status": "Adequate",
                "dgms_violations_or_notices": []
            },
            "environmental_and_statutory": {
                "ec_capacity_approved_mtpa": 52.5,
                "forest_clearance_status": "Stage-II Cleared",
                "pm10_ug_per_m3": 76.2,
                "pm25_ug_per_m3": 38.4,
                "water_discharge_ph": 7.4,
                "water_tss_mg_per_l": 34.0,
                "ob_dump_stability_status": "Stable (SAR radar active)"
            },
            "topic_identification": {
                "primary_topics": ["Opencast Production", "East-West Rail Dispatch", "Upper Kusmunda Seam", "SAR Radar Bench Stability"],
                "geological_domain_keywords": ["GCV 3840", "Grade G11", "Ash 38.6%", "Overburden 22.4 MCuM", "Stripping 1.51"],
                "word_frequencies": [
                    {"text": "Production", "value": 34},
                    {"text": "Overburden", "value": 26},
                    {"text": "GCV", "value": 22},
                    {"text": "Dispatch", "value": 20},
                    {"text": "Stripping", "value": 18},
                    {"text": "Seam", "value": 16},
                    {"text": "Ash", "value": 15},
                    {"text": "Radar", "value": 12},
                    {"text": "Rail", "value": 11},
                    {"text": "Safety", "value": 10}
                ]
            },
            "key_risks_or_red_flags": [],
            "confidence_score": 98.2
        }
    },
    {
        "id": "doc-moonidih-gas-audit",
        "mine_id": "m3-moonidih-bccl",
        "title": "Moonidih Deep Underground Gas Monitoring & Ventilation Audit",
        "file_name": "Moonidih_BCCL_Underground_Ventilation_Audit.pdf",
        "file_type": "scanned_pdf",
        "file_size_bytes": 2180000,
        "doc_category": "Safety & Gas Monitoring",
        "ocr_applied": True,
        "raw_text": """BHARAT COKING COAL LIMITED (BCCL) • MOONIDIH COLLIERY
DGMS STATUTORY UNDERGROUND METHANE DRAINAGE & STRATA AUDIT
Period: November 2024

1. VENTILATION & IN-SEAM GAS DRAINAGE
Moonidih Underground Project (Depth: 510m, Seam XVI-Top) operates mechanized longwall extraction. Methane drainage boreholes evacuated 14,200 m³/day of firedamp (92% CH4 purity). Main return airway velocity is maintained at 4.2 m/s with total intake airflow of 18,500 m³/min. Tele-monitoring detected brief local CH4 buildup of 0.78% at Tailgate 2, triggering automatic power cut-off in compliance with Coal Mines Regulations (CMR) 2017.

2. PRODUCTION & TARGETS
Monthly metallurgical coking coal production reached 0.31 MT against monthly target of 0.35 MT (-11.4% variance) due to scheduled overhaul of Shearer 2 power pack. Coal quality: Prime Coking Coal Grade Steel-I, Ash 16.5%, Volatile Matter 28.2%.

3. ACTION REQUIRED
DGMS issued statutory recommendation under CMR 133 to reinforce rib pillars with 2.4m resin-grouted cable bolts in the vicinity of cross-cut 14.""",
        "chunks": [
            {
                "page": 1,
                "section": "Ventilation & Methane Drainage",
                "text": "Moonidih Underground Project (Depth: 510m, Seam XVI-Top) operates mechanized longwall extraction. Methane drainage boreholes evacuated 14,200 m³/day of firedamp. Tele-monitoring detected brief local CH4 buildup of 0.78% at Tailgate 2, triggering automatic power cut-off per CMR 2017."
            },
            {
                "page": 2,
                "section": "Coking Coal Production & Strata Directives",
                "text": "Monthly metallurgical coking coal production reached 0.31 MT against monthly target of 0.35 MT. Coal quality: Prime Coking Coal Grade Steel-I, Ash 16.5%. DGMS issued statutory recommendation under CMR 133 to reinforce rib pillars with 2.4m resin-grouted cable bolts."
            }
        ],
        "extracted": {
            "document_summary": "Underground methane and ventilation audit for Moonidih colliery. Recorded 0.31 MT Prime Coking Coal production, 0.78% peak CH4, and DGMS strata reinforcement requirement.",
            "reporting_period": "November 2024",
            "mine_identification": {
                "mine_name": "Moonidih Deep Underground Mine",
                "subsidiary": "BCCL",
                "block_region": "Jharia Coalfield",
                "state": "Jharkhand"
            },
            "production_metrics": {
                "gross_production_mt": 0.31,
                "target_production_mt": 0.35,
                "variance_percentage": -11.4,
                "overburden_removal_mcum": 0.0,
                "stripping_ratio": 0.0,
                "dispatch_rail_mt": 0.28,
                "dispatch_road_mt": 0.03,
                "closing_stock_mt": 0.05,
                "notable_production_observations": ["Shearer power pack overhaul caused brief slowdown"]
            },
            "geological_metrics": {
                "coal_seam_name": "Seam XVI-Top",
                "working_thickness_meters": 3.8,
                "coal_grade": "Prime Coking Coal Steel-I",
                "gcv_kcal_per_kg": 6400.0,
                "ash_content_percentage": 16.5,
                "moisture_percentage": 1.8,
                "volatile_matter_percentage": 28.2,
                "sulphur_percentage": 0.65
            },
            "safety_and_health": {
                "fatalities_count": 0,
                "serious_injuries_count": 0,
                "near_misses_count": 1,
                "methane_ch4_peak_percentage": 0.78,
                "carbon_monoxide_co_ppm": 6.5,
                "ventilation_status": "Adequate with Continuous Drainage",
                "dgms_violations_or_notices": ["CMR 133: Reinforce rib pillars with 2.4m resin cable bolts near cross-cut 14"]
            },
            "environmental_and_statutory": {
                "ec_capacity_approved_mtpa": 4.2,
                "forest_clearance_status": "Not Applicable (Underground)",
                "pm10_ug_per_m3": 45.0,
                "pm25_ug_per_m3": 22.0,
                "water_discharge_ph": 7.8,
                "water_tss_mg_per_l": 28.0,
                "ob_dump_stability_status": "Not Applicable"
            },
            "topic_identification": {
                "primary_topics": ["Firedamp Methane Drainage", "Deep Underground Longwall", "CMR 133 Strata Notice", "Prime Metallurgical Coking Coal"],
                "geological_domain_keywords": ["GCV 6400", "Steel-I Grade", "Ash 16.5%", "Peak CH4 0.78%", "Resin Cable Bolts"],
                "word_frequencies": [
                    {"text": "Methane", "value": 30},
                    {"text": "Ventilation", "value": 24},
                    {"text": "Drainage", "value": 20},
                    {"text": "Coking", "value": 18},
                    {"text": "DGMS", "value": 16},
                    {"text": "Longwall", "value": 15},
                    {"text": "Strata", "value": 14},
                    {"text": "Shearer", "value": 12},
                    {"text": "Airway", "value": 11},
                    {"text": "Pillars", "value": 10}
                ]
            },
            "key_risks_or_red_flags": [
                "Local Methane CH4 spike of 0.78% recorded at Tailgate 2",
                "DGMS strata control notice under CMR 133 pending completion"
            ],
            "confidence_score": 96.0
        }
    }
]

def seed_database(db: Session):
    """Populates database with realistic initial Indian Coal mining sites, documents, and compliance records."""
    # 0. Seed Default Administrator Account
    if db.query(User).count() == 0:
        admin_user = User(
            email="admin@coal.gov.in",
            hashed_password=hash_password("Admin@12345"),
            full_name="Ministry of Coal Admin",
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print(" Seeded default administrator account: admin@coal.gov.in / Admin@12345")

    print("Upserting 9 Indian Coal Mines and real-world telemetry dataset...")
    # 1. Seed / Update Mines & Compliance Scores
    for m in MINES_SEED:
        mine_obj = db.query(Mine).filter((Mine.id == m["id"]) | (Mine.code == m["code"])).first()
        if not mine_obj:
            mine_obj = Mine(
                id=m["id"],
                name=m["name"],
                code=m["code"],
                subsidiary=m["subsidiary"],
                region=m["region"],
                state=m["state"],
                latitude=m["latitude"],
                longitude=m["longitude"],
                mine_type=m["mine_type"],
                target_annual_production_mt=m["target_annual_production_mt"],
                coal_seam=m.get("coal_seam"),
                daily_target_kt=m.get("daily_target_kt", 15.0),
                daily_actual_kt=m.get("daily_actual_kt", 15.0),
                coal_dispatched_kt=m.get("coal_dispatched_kt", 14.0),
                pithead_temp_c=m.get("pithead_temp_c", 35.0),
                methane_ch4_pct=m.get("methane_ch4_pct", 0.25),
                dust_particulate_mg_m3=m.get("dust_particulate_mg_m3", 2.0),
                telemetry_status=m.get("telemetry_status", "Normal")
            )
            db.add(mine_obj)
        else:
            mine_obj.name = m["name"]
            mine_obj.subsidiary = m["subsidiary"]
            mine_obj.region = m["region"]
            mine_obj.state = m["state"]
            mine_obj.latitude = m["latitude"]
            mine_obj.longitude = m["longitude"]
            mine_obj.mine_type = m["mine_type"]
            mine_obj.target_annual_production_mt = m["target_annual_production_mt"]
            mine_obj.coal_seam = m.get("coal_seam")
            mine_obj.daily_target_kt = m.get("daily_target_kt", 15.0)
            mine_obj.daily_actual_kt = m.get("daily_actual_kt", 15.0)
            mine_obj.coal_dispatched_kt = m.get("coal_dispatched_kt", 14.0)
            mine_obj.pithead_temp_c = m.get("pithead_temp_c", 35.0)
            mine_obj.methane_ch4_pct = m.get("methane_ch4_pct", 0.25)
            mine_obj.dust_particulate_mg_m3 = m.get("dust_particulate_mg_m3", 2.0)
            mine_obj.telemetry_status = m.get("telemetry_status", "Normal")

        # Compliance score
        score_obj = db.query(ComplianceScore).filter(ComplianceScore.mine_id == mine_obj.id).first()
        if not score_obj:
            score_obj = ComplianceScore(
                mine_id=mine_obj.id,
                overall_score=m["score"],
                safety_score=m["score"] + 2.0 if m["score"] < 98 else 98.0,
                environmental_score=m["score"] - 1.5,
                production_variance_score=m["score"] - 3.0,
                statutory_adherence_score=m["score"] + 1.0,
                risk_level=m["risk"],
                breakdown_json={
                    "safety_weight": "30%",
                    "environmental_weight": "25%",
                    "production_weight": "20%",
                    "statutory_weight": "25%"
                },
                evaluated_period="Latest"
            )
            db.add(score_obj)
        else:
            score_obj.overall_score = m["score"]
            score_obj.risk_level = m["risk"]

    db.commit()

    # 2. Seed Sample Documents & Extracted Chunks
    if db.query(Document).count() == 0:
        for doc_info in SAMPLE_DOCS:
            doc_obj = Document(
                id=doc_info["id"],
                mine_id=doc_info["mine_id"],
                title=doc_info["title"],
                file_name=doc_info["file_name"],
                file_path=f"./uploads/{doc_info['file_name']}",
                file_type=doc_info["file_type"],
                file_size_bytes=doc_info["file_size_bytes"],
                doc_category=doc_info["doc_category"],
                ocr_applied=doc_info["ocr_applied"],
                raw_text=doc_info["raw_text"],
                chunk_count=len(doc_info["chunks"]),
                status="processed"
            )
            db.add(doc_obj)
            db.flush()

            for idx, ch in enumerate(doc_info["chunks"]):
                chunk_obj = DocumentChunk(
                    document_id=doc_obj.id,
                    mine_id=doc_info["mine_id"],
                    chunk_index=idx,
                    page_number=ch["page"],
                    section_title=ch["section"],
                    content=ch["text"],
                    metadata_json={"source": doc_info["title"]}
                )
                db.add(chunk_obj)

            ext_obj = ExtractedData(
                document_id=doc_obj.id,
                mine_id=doc_info["mine_id"],
                category="production_and_safety",
                reporting_period=doc_info["extracted"].get("reporting_period", "Q3 FY 2024-25"),
                json_payload=doc_info["extracted"],
                confidence_score=doc_info["extracted"].get("confidence_score", 96.0),
                extracted_by="groq-llama-3.3-70b"
            )
            db.add(ext_obj)
        db.commit()

    # 3. Seed Predictive Alerts with Statutory Ownership
    if db.query(Alert).count() == 0 or db.query(Alert).filter(Alert.statutory_rule.isnot(None)).count() == 0:
        sample_alerts = [
            {
                "mine_id": "m-singrauli-north",
                "severity": "critical",
                "category": "safety_breach",
                "title": "Methane Concentration Statutory Breach (1.42% in Panel 4B)",
                "description": "Continuous infrared telemetry detected methane concentration remains above statutory threshold in Panel 4B.",
                "suggested_action": "Immediate electrical isolation of Panel 4B, increase auxiliary airflow, and notify Deputy Director of Mines Safety under CMR 153.",
                "statutory_rule": "CMR 2017 Reg 153 / Reg 154 (Inflammable Gas Standards)",
                "assigned_owner": "Ventilation Control Room",
                "target_resolution_date": "2026-09-14"
            },
            {
                "mine_id": "m-talcher-east",
                "severity": "medium",
                "category": "environmental_limit",
                "title": "Dust Misting Pump Tripped on Haul Road 3",
                "description": "Misting pump tripped on Haul Road 3 during morning shift resulting in localized particulate dust spike (3.4 mg/m³).",
                "suggested_action": "Reset pressure valve, deploy standby water bowsers, and verify continuous ambient particulate telemetry.",
                "statutory_rule": "CMR 2017 Reg 168 (Dust Suppression)",
                "assigned_owner": "Surface Operations",
                "target_resolution_date": "2026-09-13"
            },
            {
                "mine_id": "m-korba-central",
                "severity": "medium",
                "category": "production_drop",
                "title": "Dragline Maintenance Reduced Morning Output (13.3% deficit)",
                "description": "Unscheduled 24/96 walking dragline swing-motor inspection on Bench 4 reduced planned morning overburden stripping capacity.",
                "suggested_action": "Deploy standby hydraulic shovel fleet to Bench 4 to recover overburden stripping deficit.",
                "statutory_rule": "CMR 2017 Reg 106 (Bench Stability)",
                "assigned_owner": "Pit Engineering",
                "target_resolution_date": "2026-09-14"
            },
            {
                "mine_id": "m-jharia-ug",
                "severity": "high",
                "category": "safety_breach",
                "title": "Methane Peak Concentration (0.78% at Tailgate 2)",
                "description": "Peak methane reached 0.78% at Tailgate 2 during high extraction cycle, triggering supervisory watch under DGMS guidelines.",
                "suggested_action": "Increase auxiliary intake airflow and complete CMR 133 strata cable bolting.",
                "statutory_rule": "CMR 2017 Reg 153 (Ventilation & Inflammable Gas)",
                "assigned_owner": "Safety & Ventilation Directorate",
                "target_resolution_date": "2026-09-13"
            },
            {
                "mine_id": "m-jharkhand-pit",
                "severity": "medium",
                "category": "production_drop",
                "title": "Quarterly OBR Stripping Ratio Deficit (18.4%)",
                "description": "Quarterly Overburden Removal (OBR) stripping ratio fell behind target by 18.4% due to monsoon water accumulation in lower benches.",
                "suggested_action": "Deploy high-capacity dewatering sump pumps and review contractor truck deployment.",
                "statutory_rule": "CMR 2017 Reg 106 (Bench Geometry & Slope Stability)",
                "assigned_owner": "Mine Planning & Geotechnical Directorate",
                "target_resolution_date": "2026-09-18"
            }
        ]

        for a in sample_alerts:
            # Check if alert with same title already exists
            existing_a = db.query(Alert).filter(Alert.title == a["title"]).first()
            if not existing_a:
                alert_obj = Alert(
                    mine_id=a["mine_id"],
                    severity=a["severity"],
                    category=a["category"],
                    title=a["title"],
                    description=a["description"],
                    suggested_action=a["suggested_action"],
                    statutory_rule=a.get("statutory_rule"),
                    assigned_owner=a.get("assigned_owner"),
                    target_resolution_date=a.get("target_resolution_date"),
                    status="pending"
                )
                db.add(alert_obj)
            else:
                existing_a.statutory_rule = a.get("statutory_rule")
                existing_a.assigned_owner = a.get("assigned_owner")
                existing_a.target_resolution_date = a.get("target_resolution_date")

        db.commit()

    # 4. Generate initial Ministry Sample Report
    try:
        ReportGeneratorService.generate_report(
            db=db,
            report_title="National Coal Production & DGMS Statutory Safety Briefing",
            report_type="Ministry_Monthly_Executive",
            reporting_period="Q3 FY 2024-25",
            mine_id="m1-gevra-secl",
            file_format="pdf",
            custom_notes="Overall national coal evacuation sustained above 92% across all railway corridors."
        )
    except Exception as rep_err:
        print(f"Seed report generation note: {rep_err}")

    print(" Database successfully seeded with Indian Coal Mines, sample documents, and compliance metrics.")
