"""Off-Pi lamp-pattern regression tests: python -m unittest test_lamp_patterns."""
import unittest
from unittest.mock import Mock

from lamp_patterns import LampDriver, evaluate_lamps


def rule(**overrides):
    return dict(physicalPin="LED1", key="link", label="Uplink", when="power and not win", **overrides)


class LampPatternTests(unittest.TestCase):
    def test_legacy_condition_and_default_steady(self):
        for power, win, expected in [(True, False, True), (False, False, False), (True, True, False)]:
            state = evaluate_lamps([rule()], {"power": power, "win": win})["LED1"]
            self.assertEqual(state["active"], expected)
            self.assertEqual(state["pattern"], "on")

    def test_restored_overrides_blink_and_false_condition(self):
        state = evaluate_lamps([rule(pattern="blink")], {"power": False, "win": True}, restored=True)
        self.assertTrue(state["LED1"]["active"])
        self.assertEqual(state["LED1"]["pattern"], "on")

    def test_invalid_configuration_fails(self):
        with self.assertRaises(ValueError):
            evaluate_lamps([rule(pattern="typo")], {})
        with self.assertRaises(ValueError):
            evaluate_lamps([rule(), rule()], {"power": True, "win": False})

    def test_repeated_scans_do_not_restart_blink(self):
        led = Mock()
        driver = LampDriver({"LED1": led})
        state = evaluate_lamps([rule(pattern="blink")], {"power": True, "win": False})
        for _ in range(40):
            driver.apply(state)
        led.blink.assert_called_once_with(on_time=0.5, off_time=0.5, background=True)
        driver.apply(evaluate_lamps([rule()], {"power": False, "win": False}))
        led.off.assert_called_once()

    def test_win_stops_blink_and_reset_clears_old_mode(self):
        led = Mock()
        driver = LampDriver({"LED1": led})
        rules = [rule(pattern="fast_blink")]
        driver.apply(evaluate_lamps(rules, {"power": True, "win": False}))
        led.blink.assert_called_once_with(on_time=0.15, off_time=0.15, background=True)
        driver.apply(evaluate_lamps(rules, {"power": True, "win": True}, restored=True))
        led.on.assert_called_once()
        driver.reset()
        led.off.assert_called_once()
        driver.apply(evaluate_lamps(rules, {"power": True, "win": False}))
        self.assertEqual(led.blink.call_count, 2)


if __name__ == "__main__":
    unittest.main()
