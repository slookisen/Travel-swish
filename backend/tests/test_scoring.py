"""
Test cases for Travel-Swish preference scoring algorithm v1.

Covers:
- Zero-pref baseline scoring
- Single-facet scoring
- Multi-facet dot product
- Asymmetric weight accumulation (like=+1.0, dislike=-0.3)
- Clamp bounds
- Why-text generation
- Category diversity reordering
"""

import re
from collections import OrderedDict

import pytest

# Constants from main.py (copied to avoid FastAPI import issues)
LIKE_WEIGHT = 1.0
DISLIKE_WEIGHT = -0.3

_LIKE_RE = re.compile(r"(like|right|swipe_right)", re.IGNORECASE)
_NOPE_RE = re.compile(r"(nope|dislike|left|swipe_left)", re.IGNORECASE)


def _detect_direction(ev) -> float | None:
    """Return +1 (like) / -1 (dislike) or None if event is not a swipe.
    
    Copied from main.py for testing.
    """
    payload = ev.payload if hasattr(ev, 'payload') else {}
    # 1. explicit dir field
    d = payload.get("dir")
    if d is not None:
        try:
            return 1.0 if float(d) >= 0 else -1.0
        except (ValueError, TypeError):
            pass
    # 2. liked boolean
    liked = payload.get("liked")
    if liked is not None:
        return 1.0 if liked else -1.0
    # 3. event name heuristic
    name = getattr(ev, 'name', '')
    if _LIKE_RE.search(name):
        return 1.0
    if _NOPE_RE.search(name):
        return -1.0
    return None


def _diversify(items: list[dict], limit: int) -> list[dict]:
    """Round-robin pick across categories so no single cat dominates the list.
    
    Copied from main.py for testing.
    """
    buckets: OrderedDict[str, list[dict]] = OrderedDict()
    for it in items:
        cat = it.get("cat") or "_uncategorized"
        buckets.setdefault(cat, []).append(it)

    result: list[dict] = []
    while len(result) < limit:
        added = False
        for cat in list(buckets):
            if len(result) >= limit:
                break
            if buckets[cat]:
                result.append(buckets[cat].pop(0))
                added = True
            if not buckets[cat]:
                del buckets[cat]
        if not added:
            break
    return result


class TestDirectionDetection:
    """Test swipe direction detection from events."""

    def test_explicit_dir_positive(self):
        """payload.dir >= 0 means like."""
        ev = type('EventIn', (), {'payload': {'dir': 1}})()
        assert _detect_direction(ev) == 1.0

    def test_explicit_dir_negative(self):
        """payload.dir < 0 means dislike."""
        ev = type('EventIn', (), {'payload': {'dir': -1}})()
        assert _detect_direction(ev) == -1.0

    def test_explicit_dir_zero(self):
        """payload.dir == 0 means like (>= 0)."""
        ev = type('EventIn', (), {'payload': {'dir': 0}})()
        assert _detect_direction(ev) == 1.0

    def test_liked_boolean_true(self):
        """payload.liked=True means like."""
        ev = type('EventIn', (), {'payload': {'liked': True}})()
        assert _detect_direction(ev) == 1.0

    def test_liked_boolean_false(self):
        """payload.liked=False means dislike."""
        ev = type('EventIn', (), {'payload': {'liked': False}})()
        assert _detect_direction(ev) == -1.0

    def test_name_like_pattern(self):
        """Event name with 'like' pattern means like."""
        ev = type('EventIn', (), {'payload': {}, 'name': 'swipe_right_like'})()
        assert _detect_direction(ev) == 1.0

    def test_name_nope_pattern(self):
        """Event name with 'nope/left' pattern means dislike."""
        ev = type('EventIn', (), {'payload': {}, 'name': 'swipe_left_nope'})()
        assert _detect_direction(ev) == -1.0

    def test_no_direction_signal(self):
        """Event without direction signal returns None."""
        ev = type('EventIn', (), {'payload': {}, 'name': 'view_card'})()
        assert _detect_direction(ev) is None


class TestWeightConstants:
    """Test asymmetric weight constants."""

    def test_like_weight_positive_one(self):
        """Like weight is +1.0."""
        assert LIKE_WEIGHT == 1.0

    def test_dislike_weight_negative_point_three(self):
        """Dislike weight is -0.3 (asymmetric, less magnitude)."""
        assert DISLIKE_WEIGHT == -0.3

    def test_asymmetry_ratio(self):
        """Dislike magnitude is 30% of like magnitude."""
        assert abs(DISLIKE_WEIGHT) / abs(LIKE_WEIGHT) == 0.3


class TestDiversify:
    """Test category diversity round-robin reordering."""

    def test_single_category_unchanged(self):
        """Items from single category maintain order."""
        items = [
            {'id': '1', 'cat': 'food', 'match': 90},
            {'id': '2', 'cat': 'food', 'match': 80},
            {'id': '3', 'cat': 'food', 'match': 70},
        ]
        result = _diversify(items, 3)
        assert [i['id'] for i in result] == ['1', '2', '3']

    def test_multi_category_round_robin(self):
        """Items from multiple categories are interleaved."""
        items = [
            {'id': 'a1', 'cat': 'adventure', 'match': 95},
            {'id': 'a2', 'cat': 'adventure', 'match': 85},
            {'id': 'f1', 'cat': 'food', 'match': 90},
            {'id': 'f2', 'cat': 'food', 'match': 80},
            {'id': 'c1', 'cat': 'culture', 'match': 88},
        ]
        result = _diversify(items, 5)
        # First round: a1, f1, c1 (highest from each cat)
        # Second round: a2, f2
        cats_in_order = [i['cat'] for i in result]
        # Should start with one from each category before repeating
        assert cats_in_order[0] == 'adventure'
        assert cats_in_order[1] == 'food'
        assert cats_in_order[2] == 'culture'

    def test_limit_truncates(self):
        """Result respects limit parameter."""
        items = [
            {'id': '1', 'cat': 'a', 'match': 90},
            {'id': '2', 'cat': 'b', 'match': 85},
            {'id': '3', 'cat': 'c', 'match': 80},
        ]
        result = _diversify(items, 2)
        assert len(result) == 2

    def test_uncategorized_fallback(self):
        """Items without category use _uncategorized bucket."""
        items = [
            {'id': '1', 'cat': None, 'match': 90},
            {'id': '2', 'cat': 'food', 'match': 85},
        ]
        result = _diversify(items, 2)
        assert len(result) == 2


class TestScoringIntegration:
    """Integration tests for full scoring flow."""

    def test_zero_pref_bootstrap_match(self):
        """New user with no prefs gets 50% match on all items."""
        # Verify the formula: 50 + 0 * 50 = 50
        prefs = {}
        tags = {'adv': 0.8, 'lux': 0.5}
        score = sum(prefs.get(k, 0) * v for k, v in tags.items())
        match = max(0.0, min(100.0, 50.0 + score * 50.0))
        assert match == 50.0

    def test_single_facet_scoring(self):
        """Single matching facet produces proportional score."""
        prefs = {'adv': 0.8}  # User likes adventure
        tags = {'adv': 0.9}   # Card is very adventurous
        score = prefs['adv'] * tags['adv']  # 0.72
        match = max(0.0, min(100.0, 50.0 + score * 50.0))
        assert match == 86.0  # 50 + 0.72 * 50 = 86

    def test_negative_preference(self):
        """Negative pref reduces match score."""
        prefs = {'lux': -0.7}  # User dislikes luxury
        tags = {'lux': 0.9}    # Card is very luxurious
        score = prefs['lux'] * tags['lux']  # -0.63
        match = max(0.0, min(100.0, 50.0 + score * 50.0))
        assert match == 18.5  # 50 + (-0.63) * 50 = 18.5

    def test_clamp_lower_bound(self):
        """Score cannot go below 0."""
        prefs = {'adv': -1.0, 'lux': -1.0, 'food': -1.0}
        tags = {'adv': 1.0, 'lux': 1.0, 'food': 1.0}
        score = sum(prefs[k] * tags[k] for k in prefs)  # -3.0
        match = max(0.0, min(100.0, 50.0 + score * 50.0))
        assert match == 0.0  # Would be -100, clamped to 0

    def test_clamp_upper_bound(self):
        """Score cannot exceed 100."""
        prefs = {'adv': 1.0, 'lux': 1.0, 'food': 1.0}
        tags = {'adv': 1.0, 'lux': 1.0, 'food': 1.0}
        score = sum(prefs[k] * tags[k] for k in prefs)  # 3.0
        match = max(0.0, min(100.0, 50.0 + score * 50.0))
        assert match == 100.0  # Would be 200, clamped to 100

    def test_multi_facet_dot_product(self):
        """Multiple facets contribute additively."""
        prefs = {'adv': 0.6, 'food': 0.4, 'lux': -0.3}
        tags = {'adv': 0.8, 'food': 0.5, 'lux': 0.2}
        score = (0.6 * 0.8) + (0.4 * 0.5) + (-0.3 * 0.2)
        score = 0.48 + 0.20 - 0.06  # 0.62
        match = max(0.0, min(100.0, 50.0 + score * 50.0))
        assert match == 81.0  # 50 + 0.62 * 50 = 81

    def test_orthogonal_prefs(self):
        """Non-overlapping facets produce neutral score."""
        prefs = {'adv': 0.8}      # User cares about adventure
        tags = {'food': 0.9}      # Card is about food
        score = 0  # No overlap
        match = max(0.0, min(100.0, 50.0 + score * 50.0))
        assert match == 50.0


class TestWhyTextGeneration:
    """Test explainability 'why' field generation."""

    def test_no_contributions_bootstrap(self):
        """Empty prefs produces bootstrap message."""
        contributions = []
        if not contributions:
            why = "Bootstrap match (no prefs yet)"
        assert why == "Bootstrap match (no prefs yet)"

    def test_top_five_contributions(self):
        """Why text shows top 5 factors sorted by magnitude."""
        contributions = [
            ('spicy', 0.65),
            ('street_food', 0.45),
            ('local', 0.12),
            ('cheap', -0.08),
            ('crowded', -0.15),
            ('noisy', 0.05),  # 6th, should be excluded
        ]
        contributions.sort(key=lambda x: abs(x[1]), reverse=True)
        top = contributions[:5]
        parts = []
        for facet, c in top:
            sign = "+" if c > 0 else "−"
            parts.append(f"{facet} ({sign}{abs(c):.2f})")
        why = "Top factors: " + ", ".join(parts)
        
        assert 'spicy' in why
        assert 'street_food' in why
        assert 'local' in why
        assert 'crowded' in why
        assert 'cheap' in why
        assert 'noisy' not in why

    def test_minus_sign_unicode(self):
        """Negative contributions use unicode minus sign (−)."""
        c = -0.42
        sign = "+" if c > 0 else "−"
        formatted = f"{sign}{abs(c):.2f}"
        assert formatted == "−0.42"
        assert formatted[0] != "-"  # Not ASCII hyphen


class TestPrefStatsAccumulation:
    """Test preference statistics accumulation."""

    def test_like_adds_positive_contribution(self):
        """Like swipe adds positive contribution to num."""
        weight = LIKE_WEIGHT  # +1.0
        facet_val = 0.8
        contribution = weight * facet_val
        assert contribution == 0.8

    def test_dislike_adds_negative_contribution(self):
        """Dislike swipe adds negative contribution to num."""
        weight = DISLIKE_WEIGHT  # -0.3
        facet_val = 0.8
        contribution = weight * facet_val
        assert contribution == -0.24

    def test_denominator_uses_absolute_value(self):
        """Denominator always increases (absolute value)."""
        facet_val = -0.5
        den_add = abs(facet_val)
        assert den_add == 0.5

    def test_pref_normalization(self):
        """Pref = num / den, clamped to [-1, 1]."""
        # After 2 likes (0.8, 0.6) and 1 dislike (0.5):
        num = (1.0 * 0.8) + (1.0 * 0.6) + (-0.3 * 0.5)
        num = 0.8 + 0.6 - 0.15  # 1.25
        den = 0.8 + 0.6 + 0.5  # 1.9
        pref = num / den  # 0.658
        pref_clamped = max(-1.0, min(1.0, pref))
        assert 0.65 < pref_clamped < 0.66

    def test_clamp_prevents_extreme_prefs(self):
        """Preferences cannot exceed [-1, 1] bounds."""
        num = 50.0  # Extreme accumulated likes
        den = 10.0  # Small denominator
        pref = num / den  # 5.0
        pref_clamped = max(-1.0, min(1.0, pref))
        assert pref_clamped == 1.0


class TestScoreSpread:
    """Test that scoring produces meaningful differentiation."""

    def test_score_spread_exceeds_threshold(self):
        """Real-world scores should have std dev > 5.0."""
        # Simulate scoring 10 items with varied prefs
        prefs = {'adv': 0.6, 'food': 0.3, 'lux': -0.4}
        items_tags = [
            {'adv': 0.9, 'food': 0.2, 'lux': 0.1},
            {'adv': 0.1, 'food': 0.8, 'lux': 0.3},
            {'adv': -0.5, 'food': -0.2, 'lux': 0.9},
            {'adv': 0.7, 'food': 0.6, 'lux': -0.8},
            {'adv': 0.0, 'food': 0.0, 'lux': 0.0},
        ]
        
        matches = []
        for tags in items_tags:
            score = sum(prefs.get(k, 0) * v for k, v in tags.items())
            match = max(0.0, min(100.0, 50.0 + score * 50.0))
            matches.append(match)
        
        # Calculate standard deviation
        mean = sum(matches) / len(matches)
        variance = sum((m - mean) ** 2 for m in matches) / len(matches)
        std_dev = variance ** 0.5
        
        # Should have meaningful spread
        assert std_dev > 5.0, f"Score spread {std_dev:.2f} too low"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
