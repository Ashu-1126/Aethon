import sqlite3
import uuid
import time
from pathlib import Path

DB_PATH = Path("data/graph.db")

def seed_assets():
    print("Seeding hackathon factory assets...")
    
    assets = [
        ("P-204", "Main Cooling Water Pump", "Pump", "Cooling Tower A", "critical", "operational", "FlowServe", "VTP-4000", "2018-04-12"),
        ("C-101", "Primary Air Compressor", "Compressor", "Utility Building", "high", "degraded", "Atlas Copco", "GA-90", "2015-08-22"),
        ("B-501", "High Pressure Steam Boiler", "Boiler", "Power Plant", "critical", "maintenance", "Babcock", "FM-120", "2012-11-05"),
        ("V-302", "Ammonia Storage Vessel", "Tank", "Storage Area", "critical", "operational", "CB&I", "Spherical-500", "2010-02-18"),
        ("M-801", "Conveyor Drive Motor", "Motor", "Packaging Line", "medium", "offline", "Siemens", "Simotics-SD", "2021-09-30"),
        ("P-205", "Aux Cooling Water Pump", "Pump", "Cooling Tower A", "medium", "operational", "FlowServe", "VTP-2000", "2018-04-12"),
        ("HX-401", "Crude Heat Exchanger", "Heat Exchanger", "Unit 4", "high", "degraded", "Alfa Laval", "T20", "2016-07-11"),
        ("T-901", "Gas Turbine Generator", "Turbine", "Power Plant", "critical", "operational", "GE", "Frame 6B", "2014-05-20"),
    ]

    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    with sqlite3.connect(DB_PATH) as con:
        # Clear existing assets just in case
        con.execute("DELETE FROM assets")
        
        for asset in assets:
            tag, name, cat, loc, crit, status, mfg, model, install = asset
            asset_id = str(uuid.uuid4())[:12]
            
            con.execute("""
                INSERT INTO assets 
                (id, tag, name, category, location, criticality, status, manufacturer, model_number, install_date, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (asset_id, tag, name, cat, loc, crit, status, mfg, model, install, now, now))
            
            # Create a few fake alert events for the degraded/offline ones so they show up as RED/ORANGE on heatmap
            if status in ["degraded", "offline"]:
                event_id = str(uuid.uuid4())
                con.execute("""
                    INSERT INTO asset_events (id, asset_id, event_type, severity, title, detail, source, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (event_id, asset_id, "alert", "high", f"Abnormal vibration on {tag}", "Detected by edge sensor", "IoT Monitor", now))

    print(f"✅ Successfully seeded {len(assets)} assets into the registry!")
    print("Go check your browser Dashboard and Heatmap now!")

if __name__ == "__main__":
    seed_assets()
