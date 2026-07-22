"""
AETHON — In-Process Automated Test Runner & Verification Suite
"""
import sys
import unittest
import os

# Add tests folder to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from test_all_features import TestAethonIndustrialPlatform

def run_tests():
    suite = unittest.TestLoader().loadTestsFromTestCase(TestAethonIndustrialPlatform)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result

if __name__ == "__main__":
    res = run_tests()
    if not res.wasSuccessful():
        sys.exit(1)
