import helpers  # noqa: F401  (sets sys.path)
import unittest

from trading.mathutil import floor_to_step, step_decimals


class TestMathutil(unittest.TestCase):
    def test_floor_fractional_step(self) -> None:
        self.assertAlmostEqual(floor_to_step(3.90625, 0.01), 3.9, places=6)

    def test_floor_float_noise(self) -> None:
        self.assertEqual(floor_to_step(2.9999999999, 1.0), 3.0)

    def test_floor_bad_step(self) -> None:
        with self.assertRaises(ValueError):
            floor_to_step(5, 0)

    def test_floor_negative_value(self) -> None:
        self.assertEqual(floor_to_step(-1, 0.1), 0.0)

    def test_floor_below_one_step(self) -> None:
        self.assertAlmostEqual(floor_to_step(0.12499, 0.1), 0.1, places=6)

    def test_step_decimals(self) -> None:
        self.assertEqual([step_decimals(0.01), step_decimals(1.0), step_decimals(0.0001)], [2, 0, 4])


if __name__ == "__main__":
    unittest.main()
