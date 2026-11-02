import helpers
import tempfile
import unittest
from pathlib import Path

from helpers import make_bar, utc
from trading.errors import MarketDataError
from trading.marketdata import CsvMarketData, InMemoryMarketData

HDR = "symbol,ts,open,high,low,close,volume,interval_seconds\n"


def write(rows: list[str], header: str = HDR) -> tuple[tempfile.TemporaryDirectory, Path]:
    t = tempfile.TemporaryDirectory()
    p = Path(t.name) / "bars.csv"
    p.write_text(header + "".join(r + "\n" for r in rows))
    return t, p


GOOD = ["X,2027-01-12T14:30:00+00:00,100,101,99,100,,",
        "X,2027-01-12T14:35:00+00:00,100,101,99,100,10,300",
        "X,2027-01-12T14:40:00+00:00,100,101,99,100,10,300"]


class TestMarketData(unittest.TestCase):
    def test_csv_parse(self) -> None:
        t, p = write(GOOD)
        with t:
            md = CsvMarketData(p)
            bars = md.bars("X", utc(2027, 1, 12), utc(2027, 1, 13))
            self.assertEqual(len(bars), 3)
            self.assertEqual(bars[0].volume, 0.0)
            self.assertEqual(bars[0].interval_seconds, 300)
            self.assertEqual([b.ts for b in bars], sorted(b.ts for b in bars))

    def test_csv_naive_ts_line_number(self) -> None:
        rows = [GOOD[0], "X,2027-01-12T14:35:00,100,101,99,100,10,300", GOOD[2]]
        t, p = write(rows)
        with t, self.assertRaises(MarketDataError) as cm:
            CsvMarketData(p)
        self.assertIn("line 3", str(cm.exception))

    def test_csv_bad_ohlc_line(self) -> None:
        t, p = write([GOOD[0], "X,2027-01-12T14:35:00+00:00,100,99,101,100,10,300"])
        with t, self.assertRaises(MarketDataError) as cm:
            CsvMarketData(p)
        self.assertIn("line 3", str(cm.exception))
        t2, p2 = write(["X,2027-01-12T14:30:00+00:00,100,99,101,100,10,300"])
        with t2, self.assertRaises(MarketDataError) as cm2:
            CsvMarketData(p2)
        self.assertIn("line 2", str(cm2.exception))

    def test_duplicate_bar(self) -> None:
        b = make_bar("X", utc(2027, 1, 12, 14, 30), 100, 101, 99, 100)
        with self.assertRaises(MarketDataError):
            InMemoryMarketData([b, b])

    def test_half_open_range(self) -> None:
        md = InMemoryMarketData([make_bar("X", utc(2027, 1, 12, 14, m), 100, 101, 99, 100) for m in (30, 35, 40)])
        self.assertEqual(len(md.bars("X", utc(2027, 1, 12, 14, 30), utc(2027, 1, 12, 14, 40))), 2)

    def test_unknown_symbol_empty(self) -> None:
        self.assertEqual(InMemoryMarketData([]).bars("NOPE", utc(2027, 1, 1), utc(2027, 1, 2)), [])

    def test_latest_price(self) -> None:
        md = InMemoryMarketData([make_bar("X", utc(2027, 1, 12, 14, 30), 100, 101, 99, 100),
                                 make_bar("X", utc(2027, 1, 12, 14, 35), 100, 102, 99, 101.5)])
        self.assertEqual(md.latest_price("X", utc(2027, 1, 12, 14, 40)), 101.5)
        self.assertIsNone(md.latest_price("X", utc(2027, 1, 12, 14, 32)))

    def test_missing_header(self) -> None:
        t, p = write(["X,2027-01-12T14:30:00+00:00,100,101,99,10,300"],
                     header="symbol,ts,open,high,low,volume,interval_seconds\n")
        with t, self.assertRaises(MarketDataError) as cm:
            CsvMarketData(p)
        self.assertIn("line 1", str(cm.exception))

    def test_unsorted_input_sorted(self) -> None:
        bars = [make_bar("X", utc(2027, 1, 12, 14, m), 100, 101, 99, 100) for m in (40, 30, 35)]
        got = InMemoryMarketData(bars).bars("X", utc(2027, 1, 12), utc(2027, 1, 13))
        self.assertEqual([b.ts.minute for b in got], [30, 35, 40])

    def test_naive_query_rejected(self) -> None:
        from datetime import datetime
        with self.assertRaises(ValueError):
            InMemoryMarketData([]).bars("X", datetime(2027, 1, 1), utc(2027, 1, 2))


if __name__ == "__main__":
    unittest.main()
