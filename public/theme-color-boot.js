(function () {
  try {
    var KEY = 'kutagjej-color-scheme';
    var dark = true;
    var raw = localStorage.getItem(KEY);
    if (raw != null) {
      var v = raw;
      try {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          if (typeof p.mode === 'string') v = p.mode;
          else if (typeof p.paletteMode === 'string') v = p.paletteMode;
        }
      } catch (e) {}
      if (v === 'light') dark = false;
      else if (v === 'dark') dark = true;
      else if (v === 'system') dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    var c = dark ? '#0a0a0a' : '#f7faf4';
    var id = 'kutagjej-theme-color';
    var m = document.getElementById(id);
    if (!m) {
      m = document.createElement('meta');
      m.id = id;
      m.setAttribute('name', 'theme-color');
      document.head.appendChild(m);
    }
    m.setAttribute('content', c);
    var root = document.documentElement;
    root.style.colorScheme = dark ? 'dark' : 'light';
    root.classList.remove('light', 'dark');
    root.classList.add(dark ? 'dark' : 'light');
    document.cookie =
      'kutagjej-color-scheme=' + (dark ? 'dark' : 'light') + ';path=/;max-age=31536000;SameSite=Lax';
  } catch (e) {}
})();
