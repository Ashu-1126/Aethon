import unittest
from unittest.mock import patch, MagicMock
import json
import os
from pathlib import Path

# Set dummy environment variables before importing config/agents
os.environ["MISTRAL_API_KEY"] = "mock-mistral-key"

import agents
from agents import compliance_audit, detect_conflicts, root_cause_analysis, generate_rewrite
from config import DATA_DIR

class TestAgentsUnit(unittest.TestCase):

    def setUp(self):
        # Clear compliance cache file before each test
        self.cache_file = DATA_DIR / "compliance_cache.json"
        if self.cache_file.exists():
            try:
                os.remove(self.cache_file)
            except Exception:
                pass

    def tearDown(self):
        # Clean up cache file
        if self.cache_file.exists():
            try:
                os.remove(self.cache_file)
            except Exception:
                pass

    @patch("agents.client.chat.completions.create")
    @patch("agents.retrieve")
    def test_compliance_audit_success(self, mock_retrieve, mock_create):
        # Mock retrieve to return dummy chunks
        mock_retrieve.return_value = [
            {"doc_name": "SOP-44.pdf", "page": 1, "text": "Confined space entry permit procedures"}
        ]
        
        # Mock LLM API response
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = json.dumps({
            "overall_score": 90,
            "standards": [
                {
                    "standard": "Factory Act",
                    "score": 90,
                    "gaps": []
                }
            ]
        })
        mock_create.return_value = mock_resp

        # Run compliance audit
        result = compliance_audit()
        
        self.assertEqual(result["overall_score"], 90)
        self.assertEqual(len(result["standards"]), 1)
        self.assertEqual(result["standards"][0]["standard"], "Factory Act")
        self.assertTrue(self.cache_file.exists())

    @patch("agents.client.chat.completions.create")
    @patch("agents.retrieve")
    def test_compliance_audit_fallback_cache(self, mock_retrieve, mock_create):
        # Write dummy data to cache file
        cached_data = {"overall_score": 82, "standards": [{"standard": "OISD-116", "score": 82, "gaps": []}]}
        with open(self.cache_file, "w") as f:
            json.dump(cached_data, f)
            
        mock_retrieve.return_value = [
            {"doc_name": "SOP-44.pdf", "page": 1, "text": "Confined space entry permit procedures"}
        ]
        
        # Simulate LLM API failure
        mock_create.side_effect = Exception("API rate-limited")

        # Run compliance audit (should fall back to cache)
        result = compliance_audit()
        self.assertEqual(result["overall_score"], 82)
        self.assertEqual(result["standards"][0]["standard"], "OISD-116")

    @patch("agents.client.chat.completions.create")
    @patch("agents.retrieve")
    def test_detect_conflicts_success(self, mock_retrieve, mock_create):
        # Mock retrieve with 2 chunks
        mock_retrieve.return_value = [
            {"doc_name": "MP-12.pdf", "page": 1, "text": "Lubrication interval is 90 days"},
            {"doc_name": "OEM_Pump.pdf", "page": 1, "text": "Lubricate bearings every 60 days"}
        ]
        
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = json.dumps({
            "conflicts": [
                {
                    "doc_a": "MP-12.pdf",
                    "doc_b": "OEM_Pump.pdf",
                    "field": "lubrication_interval",
                    "value_a": "90 days",
                    "value_b": "60 days"
                }
            ]
        })
        mock_create.return_value = mock_resp

        result = detect_conflicts()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["field"], "lubrication_interval")
        self.assertEqual(result[0]["value_a"], "90 days")
        self.assertEqual(result[0]["value_b"], "60 days")

    @patch("agents.client.chat.completions.create")
    @patch("graph.get_related_graph_context")
    @patch("agents.retrieve")
    def test_root_cause_analysis_success(self, mock_retrieve, mock_graph, mock_create):
        mock_retrieve.return_value = [
            {"doc_name": "WorkOrder.pdf", "page": 1, "text": "Pump bearing seized", "doc_type": "document"}
        ]
        mock_graph.return_value = "Graph entities: Pump P-204"
        
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = json.dumps({
            "answer": "The bearing failure was caused by lack of lubrication.",
            "confidence": 85
        })
        mock_create.return_value = mock_resp

        result = root_cause_analysis("Pump")
        self.assertEqual(result["confidence"], 85)
        self.assertIn("bearing failure", result["answer"])
        self.assertEqual(result["sources"][0]["doc_name"], "WorkOrder.pdf")

    @patch("agents.client.chat.completions.create")
    def test_generate_rewrite_success(self, mock_create):
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = json.dumps({
            "rewrite": "Lubrication shall be done every 60 days."
        })
        mock_create.return_value = mock_resp

        result = generate_rewrite(
            clause="Lubrication interval: 90 days",
            issue="OEM requires 60 days"
        )
        self.assertEqual(result["rewrite"], "Lubrication shall be done every 60 days.")

if __name__ == "__main__":
    unittest.main()
