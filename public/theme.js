// First-paint theme, also used by offline help/privacy pages. No profile data.
(function () {
  var key = 'travel_swipe_theme_v1';
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var preference = 'system';
  function valid(value) { return ['light', 'dark', 'system'].indexOf(value) !== -1; }
  try { var saved = localStorage.getItem(key); if (valid(saved)) preference = saved; } catch (_) {}
  function apply() {
    var resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = resolved === 'dark' ? '#0c171c' : '#f5f2eb';
    window.dispatchEvent(new Event('travel-swipe-theme'));
  }
  window.travelSwipeTheme = {
    getPreference: function () { return preference; },
    setPreference: function (value) {
      if (!valid(value)) return;
      preference = value;
      try { localStorage.setItem(key, value); } catch (_) {}
      apply();
    }
  };
  media.addEventListener('change', apply);
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) {
      preference = valid(event.newValue) ? event.newValue : 'system';
      apply();
    }
  });
  apply();
})();
