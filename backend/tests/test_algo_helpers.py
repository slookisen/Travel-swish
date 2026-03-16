"""Tests for app.algo helper functions (score_match, format_why).

These tests ensure the algorithm math + explainability formatting are exercised
via actual helper implementations (not re-derived inline in tests).
"""

from app.algo import MINUS_SIGN, format_why, score_match

import pytest


def test_score_match_bootstrap_no_prefs():
    match, contribs = score_match({}, {"adv": 0.9})
    assert match == 50.0
    assert contribs == []


def test_score_match_single_facet_positive():
    # 50 + (0.8*0.9)*50 = 86
    match, contribs = score_match({"adv": 0.8}, {"adv": 0.9})
    assert match == 86.0
    assert len(contribs) == 1
    assert contribs[0][0] == "adv"
    assert contribs[0][1] == pytest.approx(0.72)


def test_score_match_clamps_to_0_100():
    match_low, _ = score_match({"a": -1.0, "b": -1.0, "c": -1.0}, {"a": 1.0, "b": 1.0, "c": 1.0})
    assert match_low == 0.0

    match_high, _ = score_match({"a": 1.0, "b": 1.0, "c": 1.0}, {"a": 1.0, "b": 1.0, "c": 1.0})
    assert match_high == 100.0


def test_format_why_bootstrap():
    assert format_why([]) == "Bootstrap match (no prefs yet)"


def test_format_why_top_n_and_minus_sign():
    why = format_why(
        [
            ("spicy", 0.65),
            ("crowded", -0.15),
            ("cheap", -0.08),
            ("local", 0.12),
            ("street_food", 0.45),
            ("noisy", 0.05),  # should be excluded (6th)
        ],
        top_n=5,
    )

    assert why.startswith("Top factors: ")
    assert "spicy" in why
    assert "street_food" in why
    assert "local" in why
    assert "crowded" in why
    assert "cheap" in why
    assert "noisy" not in why

    # Negative entries should use unicode minus sign, not ASCII hyphen.
    assert f"({MINUS_SIGN}0.15)" in why
    assert "(-0.15)" not in why
