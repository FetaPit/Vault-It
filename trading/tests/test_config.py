import helpers
import json
import tempfile
import unittest
from pathlib import Path

from helpers import make_cfg
from trading.config import (config_from_dict, config_hash, config_to_dict, deep_merge, default_config,
                            load_active_config, load_config)
from trading.errors import ConfigError


def base() -> dict:
    return config_to_dict(default_config())


class TestConfig(unittest.TestCase):
    def _raises(self, overrides: dict) -> ConfigError:
        with self.assertRaises(ConfigError) as cm:
            config_from_dict(deep_merge(base(), overrides))
        return cm.exception

    def test_default_config_loads_and_is_paper(self) -> None:
        c = default_config()
        self.assertEqual((c.mode, c.starting_capital_gbp, c.version), ("paper", 625.0, "v0001"))

    def test_roundtrip_dict(self) -> None:
        c = default_config()
        self.assertEqual(config_from_dict(config_to_dict(c)), c)
        json.dumps(config_to_dict(c))

    def test_hash_stable(self) -> None:
        self.assertEqual(config_hash(default_config()), config_hash(default_config()))

    def test_live_mode_rejected(self) -> None:
        self._raises({"mode": "live"})

    def test_risk_over_3pct_rejected(self) -> None:
        self._raises({"risk": {"max_risk_per_trade_pct": 0.031}})

    def test_sweep_multiple_below_2_rejected(self) -> None:
        self._raises({"sweep": {"multiple": 1.5}})

    def test_daily_cap_over_3pct_rejected(self) -> None:
        self._raises({"risk": {"daily_loss_cap_pct": 0.05}})

    def test_cash_mode_with_leverage_rejected(self) -> None:
        self._raises({"risk": {"leverage_mode": "cash_only", "max_leverage": 2.0}})

    def test_leverage_too_high_rejected(self) -> None:
        self._raises({"risk": {"leverage_mode": "leveraged", "max_leverage": 6.0}})

    def test_typo_key_rejected(self) -> None:
        e = self._raises({"risk": {"max_risk_pct": 0.02}})
        self.assertIn("unknown key: risk.max_risk_pct", str(e))

    def test_allocation_sum_rejected(self) -> None:
        self._raises({"sleeve_b": {"allocation_pct": 0.4}})

    def test_missing_fee_profile_rejected(self) -> None:
        self._raises({"instruments": {"VHYL": {"fee_profile": "nope"}}})

    def test_missing_fx_rate_rejected(self) -> None:
        self._raises({"instruments": {"VHYL": {"currency": "EUR"}}})

    def test_gold_with_vat_rejected(self) -> None:
        d = base()
        d["sweep"]["coins"][1]["vat_rate"] = 0.2
        with self.assertRaises(ConfigError):
            config_from_dict(d)

    def test_topup_day_29_rejected(self) -> None:
        self._raises({"topup": {"day_of_month": 29}})

    def test_zero_capital_rejected(self) -> None:
        self._raises({"starting_capital_gbp": 0})

    def test_tranche_sum_rejected(self) -> None:
        self._raises({"sleeve_b": {"tranches": [{"gain_pct": 0.2, "sell_fraction": 0.6},
                                                 {"gain_pct": 0.4, "sell_fraction": 0.6}]}})

    def test_tranche_order_rejected(self) -> None:
        self._raises({"sleeve_b": {"tranches": [{"gain_pct": 0.5, "sell_fraction": 0.2},
                                                 {"gain_pct": 0.25, "sell_fraction": 0.2}]}})

    def test_spread_bet_usd_rejected(self) -> None:
        self._raises({"instruments": {"US500_SB": {"currency": "USD"}}})

    def test_stamp_on_etf_rejected(self) -> None:
        self._raises({"instruments": {"VHYL": {"stamp_duty_rate": 0.005}}})

    def test_version_filename_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "v0002.json"
            p.write_text(json.dumps(base()))
            with self.assertRaises(ConfigError):
                load_config(p)

    def test_load_active_picks_highest(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            d = Path(t)
            (d / "v0001.json").write_text(json.dumps(base()))
            b2 = base()
            b2.update(version="v0002", starting_capital_gbp=700.0)
            (d / "v0002.json").write_text(json.dumps(b2))
            b3 = base()
            b3["version"] = "v0003"
            (d / "v0003.proposed.json").write_text(json.dumps(b3))
            self.assertEqual(load_active_config(d).version, "v0002")

    def test_no_configs(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaises(ConfigError):
                load_active_config(Path(t))

    def test_invalid_json_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as t:
            p = Path(t) / "x.json"
            p.write_text("{")
            with self.assertRaises(ConfigError):
                load_config(p)

    def test_make_cfg_applies_overrides(self) -> None:
        c = make_cfg()
        self.assertIn("TESTC", c.instruments)
        self.assertEqual(c.sleeve_a.symbols, ("TEST",))

    def test_missing_top_level_key(self) -> None:
        d = base()
        del d["fx"]
        with self.assertRaises(ConfigError):
            config_from_dict(d)


if __name__ == "__main__":
    unittest.main()
