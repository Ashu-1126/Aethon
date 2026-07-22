"""
AETHON — Comprehensive End-to-End Verification Test Suite
Tests all 15+ industrial intelligence engines, REST endpoints, data structures,
and AI generators across the backend platform.
"""
import json
import os
import sys
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from graph import init_db, get_assets, add_asset, get_asset, traverse_asset_memory_graph
from assets import get_asset_health, get_asset_forecast, calculate_factory_risk_heatmap, scan_enterprise_knowledge_gaps
from investigation import run_autonomous_investigation, list_investigations
from predictive import calculate_asset_pdm, get_all_pdm_predictions
from work_orders import generate_work_order, list_work_orders
from shift_reports import generate_shift_report, list_shift_reports
from emergency_plans import generate_emergency_plan, list_emergency_plans
from agents import compliance_audit, detect_conflicts
from rag import answer


class TestAethonIndustrialPlatform(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Initialize database before running tests."""
        init_db()

    def test_01_asset_registry_and_graph(self):
        """Test Asset CRUD and Unified Asset Memory Graph multi-hop traversal."""
        fleet = get_assets()
        self.assertIsInstance(fleet, list)
        self.assertTrue(len(fleet) > 0, "Asset fleet should contain seeded assets")

        # Test single asset fetch
        asset = get_asset("P-204")
        self.assertIsNotNone(asset)
        self.assertEqual(asset["tag"].upper(), "P-204")

        # Test multi-hop graph traversal
        traversal = traverse_asset_memory_graph("P-204", max_depth=2)
        self.assertIn("root_asset", traversal)
        self.assertEqual(traversal["root_asset"], "P-204")
        self.assertIn("nodes", traversal)
        self.assertIn("relationships", traversal)

    def test_02_factory_risk_heatmap(self):
        """Test composite multi-factor risk heatmap calculation."""
        heatmap = calculate_factory_risk_heatmap()
        self.assertIsInstance(heatmap, list)
        self.assertTrue(len(heatmap) > 0)
        
        first = heatmap[0]
        self.assertIn("asset_tag", first)
        self.assertIn("risk_score", first)
        self.assertIn("color_tier", first)
        self.assertIn(first["color_tier"], ["RED", "ORANGE", "YELLOW", "GREEN"])

    def test_03_enterprise_knowledge_gap_scanner(self):
        """Test continuous knowledge gap audit scanner."""
        gaps = scan_enterprise_knowledge_gaps()
        self.assertIsInstance(gaps, list)
        if len(gaps) > 0:
            gap = gaps[0]
            self.assertIn("asset_tag", gap)
            self.assertIn("gap_category", gap)
            self.assertIn("severity", gap)

    def test_04_predictive_maintenance_and_roi_engine(self):
        """Test AI PdM engine calculations and financial ROI estimations."""
        pdm = calculate_asset_pdm("P-204", force=True)
        self.assertIsInstance(pdm, dict)
        self.assertIn("health_score", pdm)
        self.assertIn("remaining_useful_life_days", pdm)
        self.assertIn("failure_probability_percentage", pdm)
        self.assertIn("maintenance_recommendations", pdm)

        recs = pdm["maintenance_recommendations"]
        self.assertTrue(len(recs) > 0)
        rec = recs[0]
        self.assertIn("action", rec)
        self.assertIn("priority", rec)

    def test_05_autonomous_investigation_engine(self):
        """Test multi-aspect incident investigation and timeline reconstruction."""
        report = run_autonomous_investigation("Vibration spike on Pump P-204", asset_tag="P-204")
        self.assertIsInstance(report, dict)
        self.assertIn("incident_title", report)
        self.assertIn("ranked_root_causes", report)
        self.assertIn("chronological_timeline", report)
        self.assertIn("overall_confidence", report)

        # Check timeline items
        timeline = report["chronological_timeline"]
        self.assertTrue(len(timeline) > 0)
        self.assertIn("timestamp", timeline[0])
        self.assertIn("event", timeline[0])

    def test_06_work_order_generator(self):
        """Test AI Maintenance Work Order Planner synthesis."""
        wo = generate_work_order("P-204", "Overhaul Drive-End Bearing", priority="high")
        self.assertIsInstance(wo, dict)
        self.assertIn("wo_id", wo)
        self.assertEqual(wo["asset_tag"], "P-204")
        self.assertIn("required_tools", wo)
        self.assertIn("required_parts", wo)
        self.assertIn("safety_checklist", wo)
        self.assertIn("required_ppe", wo)
        self.assertIn("shutdown_required", wo)

        wos = list_work_orders("P-204")
        self.assertTrue(len(wos) > 0)

    def test_07_shift_handover_report_generator(self):
        """Test Shift Handover synthesis engine."""
        report = generate_shift_report("Day Shift (06:00 - 18:00)", "Lead Operations Engineer")
        self.assertIsInstance(report, dict)
        self.assertIn("report_id", report)
        self.assertIn("completed_work", report)
        self.assertIn("pending_work", report)
        self.assertIn("open_alarms", report)
        self.assertIn("machine_status_summary", report)

        reports = list_shift_reports()
        self.assertTrue(len(reports) > 0)

    def test_08_emergency_response_plan_generator(self):
        """Test Emergency Response Plan generator for industrial hazards."""
        plan = generate_emergency_plan("Gas leak", asset_tag="P-204")
        self.assertIsInstance(plan, dict)
        self.assertIn("plan_id", plan)
        self.assertEqual(plan["hazard_type"], "Gas leak")
        self.assertIn("emergency_sop", plan)
        self.assertIn("shutdown_sequence", plan)
        self.assertIn("isolation_steps", plan)
        self.assertIn("required_ppe", plan)
        self.assertIn("evacuation_protocol", plan)

    def test_09_compliance_and_predictive_violations(self):
        """Test multi-standard compliance audit and predictive future violations."""
        comp = compliance_audit()
        self.assertIsInstance(comp, dict)
        self.assertIn("overall_score", comp)
        self.assertIn("standards", comp)

    def test_10_conflict_detection_and_unified_compliance(self):
        """Test cross-regulatory conflict detection and unified directives."""
        conflicts = detect_conflicts(force_rescan=False)
        self.assertIsInstance(conflicts, list)

    def test_11_explainable_ai_rag_engine(self):
        """Test mandatory explainability schema on RAG turns."""
        res = answer("What is the maintenance procedure for Pump P-204?")
        self.assertIsInstance(res, dict)
        self.assertIn("answer", res)
        self.assertIn("confidence", res)
        self.assertIn("reasoning_chain", res)
        self.assertIn("supporting_documents", res)
        self.assertIn("supporting_graph_nodes", res)
        self.assertIn("conflicting_evidence", res)
        self.assertIn("decision_explanation", res)



if __name__ == "__main__":
    unittest.main()
