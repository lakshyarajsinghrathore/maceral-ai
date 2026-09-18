import sys
sys.path.insert(0, '.')
import json
from app.database import SessionLocal
from app.routers.compliance import get_telemetry_matrix

db = SessionLocal()
res = get_telemetry_matrix(db)
db.close()

data = res.model_dump() if hasattr(res, 'model_dump') else res.dict()
print('=== TELEMETRY SUMMARY ===')
print(f"Total Sites: {data['total_sites_count']}")
print(f"Daily Production: {data['daily_production_kt']} kT")
print(f"Daily Target: {data['daily_target_kt']} kT")
print(f"Production Variance: {data['production_variance_pct']}%")
print(f"Total Dispatched: {data['coal_dispatched_kt']} kT")
print(f"Watch/Critical Sites: {data['watch_critical_sites_count']}")
print(f"Open Conditions: {data['open_conditions_count']}")
print('\n=== ALL 9 OPERATING SITES ===')
for s in data['operating_sites']:
    print(f"-> {s['name']} ({s['subsidiary']}) | Seam: {s['coal_seam']} | Target: {s['daily_target_kt']}kT | Actual: {s['daily_actual_kt']}kT | Temp: {s['pithead_temp_c']}C | CH4: {s['methane_ch4_pct']}% | Dust: {s['dust_particulate_mg_m3']}mg/m3 | Status: {s['telemetry_status']}")

print('\n=== ACTIVE STATUTORY FLAGS ===')
for f in data['active_flags']:
    print(f"[{f['severity'].upper()}] {f['mine_name']} | Rule: {f['statutory_rule']} | Owner: {f['assigned_owner']} | Due: {f['target_resolution_date']}")
    print(f"  Title: {f['title']}")
    print(f"  Suggested Action: {f['suggested_action']}\n")
