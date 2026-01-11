"""
Nevika Cura - Data Package
Contains large data structures like medicine inventory and diagnostic tests
"""

from .medicine_inventory import MEDICINE_INVENTORY
from .diagnostic_tests import DIAGNOSTIC_TESTS, DIAGNOSTIC_TEST_PRICES

__all__ = [
    "MEDICINE_INVENTORY",
    "DIAGNOSTIC_TESTS", 
    "DIAGNOSTIC_TEST_PRICES"
]
