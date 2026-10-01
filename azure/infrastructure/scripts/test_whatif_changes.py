import importlib.util
from pathlib import Path
import unittest


module_path = Path(__file__).with_name("Test-WhatIfChanges.py")
spec = importlib.util.spec_from_file_location("test_whatif_module", module_path)
whatif_module = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(whatif_module)
delta_is_actionable = whatif_module.delta_is_actionable
is_actionable = whatif_module.is_actionable


class WhatIfChangeTests(unittest.TestCase):
    def test_ignored_parent_suppresses_provider_owned_subtree(self):
        item = {
            "path": "properties.privateEndpointConnections",
            "propertyChangeType": "Array",
            "children": [{"path": "0", "propertyChangeType": "Modify", "children": []}],
        }
        self.assertFalse(delta_is_actionable(item, {"properties.privateEndpointConnections"}))

    def test_only_ignored_array_leaf_is_suppressed(self):
        item = {
            "path": "properties.ipConfigurations",
            "propertyChangeType": "Array",
            "children": [
                {
                    "path": "0",
                    "propertyChangeType": "Modify",
                    "children": [
                        {"path": "type", "propertyChangeType": "Delete", "children": None}
                    ],
                }
            ],
        }
        self.assertFalse(delta_is_actionable(item, {"properties.ipConfigurations[0].type"}))

    def test_real_array_change_remains_actionable(self):
        item = {
            "path": "properties.ipConfigurations",
            "propertyChangeType": "Array",
            "children": [
                {
                    "path": "0",
                    "propertyChangeType": "Modify",
                    "children": [
                        {"path": "type", "propertyChangeType": "Delete", "children": None},
                        {"path": "name", "propertyChangeType": "Modify", "children": None},
                    ],
                }
            ],
        }
        self.assertTrue(delta_is_actionable(item, {"properties.ipConfigurations[0].type"}))

    def test_no_effect_is_not_actionable(self):
        change = {
            "changeType": "Modify",
            "delta": [
                {
                    "path": "properties.enablePrivateIpAddress",
                    "propertyChangeType": "NoEffect",
                    "children": None,
                }
            ],
        }
        self.assertFalse(is_actionable(change, set()))


if __name__ == "__main__":
    unittest.main()
