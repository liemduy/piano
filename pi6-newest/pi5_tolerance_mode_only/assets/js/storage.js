// Local storage helpers for recent songs and persistent preferences.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const RECENT_KEY = 'liem_piano_coach_recent_v1';
const PREFS_KEY = 'liem_piano_coach_prefs_v3';
const PREFS_SCHEMA_VERSION = 3;

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Ignore storage quota/private-mode errors.
  }
};

const clampPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clampNonNegativeInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const loadRecent = () => {
  const list = readJson(RECENT_KEY, []);
  return Array.isArray(list) ? list : [];
};

const saveRecent = (abc) => {
  const title = (PianoApp.parseTitleFromAbc ? PianoApp.parseTitleFromAbc(abc) : '') || PianoApp.t('common.untitled');
  const now = Date.now();
  const item = { title, abc, ts: now };
  const list = loadRecent()
    .filter((entry) => entry && entry.abc && entry.abc.trim() !== abc.trim())
    .slice(0, 9);

  list.unshift(item);
  writeJson(RECENT_KEY, list);
  renderRecentList();
  PianoApp.showToast(PianoApp.t('toast.saved_local'));
};

const renderRecentList = () => {
  const list = loadRecent();
  const wrap = PianoApp.$('recentList');
  if (!wrap) return;

  wrap.innerHTML = '';
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'recent-empty';
    empty.textContent = PianoApp.t('recent.empty');
    wrap.appendChild(empty);
    return;
  }

  list.forEach((item) => {
    const node = document.createElement('div');
    node.className = 'item';

    const main = document.createElement('div');
    main.className = 'recent-main';

    const title = document.createElement('div');
    title.className = 't';
    title.textContent = item.title || PianoApp.t('common.untitled');

    const stamp = document.createElement('div');
    stamp.className = 's';
    stamp.textContent = new Date(item.ts).toLocaleString(PianoApp.getLocaleTag());

    const arrow = document.createElement('i');
    arrow.className = 'fa-solid fa-chevron-right recent-chevron';

    main.appendChild(title);
    main.appendChild(stamp);
    node.appendChild(main);
    node.appendChild(arrow);

    node.onclick = () => {
      PianoApp.$('abcInput').value = item.abc;
      if (PianoApp.switchTab) PianoApp.switchTab('abc');
      if (PianoApp.renderCurrentSong) PianoApp.renderCurrentSong();
      PianoApp.showToast(PianoApp.t('toast.loaded_song'));
    };

    wrap.appendChild(node);
  });
};

const loadPreferences = () => {
  const prefs = readJson(PREFS_KEY, null) || readJson('liem_piano_coach_prefs_v2', null);
  if (!prefs || typeof prefs !== 'object') return null;
  return prefs;
};

const applyPreferences = (prefs) => {
  if (!prefs || typeof prefs !== 'object') return;

  const { state } = PianoApp;
  state.mode = prefs.mode === 'rhythm' ? 'rhythm' : 'beginner';
  state.settings.theme = typeof prefs.theme === 'string' ? prefs.theme : state.settings.theme;
  state.settings.language = typeof prefs.language === 'string' ? prefs.language : state.settings.language;
  state.settings.practiceBpm = clampPositiveInt(prefs.practiceBpm, state.settings.practiceBpm);
  state.settings.toleranceMs = clampPositiveInt(prefs.toleranceMs, state.settings.toleranceMs);
  state.settings.countInBars = clampNonNegativeInt(prefs.countInBars, state.settings.countInBars);
  state.settings.autoScroll = prefs.autoScroll !== undefined ? !!prefs.autoScroll : state.settings.autoScroll;
  state.settings.editorCollapsed = prefs.editorCollapsed !== undefined ? !!prefs.editorCollapsed : state.settings.editorCollapsed;
};

const savePreferences = () => {
  const { state } = PianoApp;
  const prefs = {
    schemaVersion: PREFS_SCHEMA_VERSION,
    mode: state.mode,
    theme: state.settings.theme,
    language: state.settings.language,
    practiceBpm: state.settings.practiceBpm,
    toleranceMs: state.settings.toleranceMs,
    countInBars: state.settings.countInBars,
    autoScroll: !!state.settings.autoScroll,
    editorCollapsed: !!state.settings.editorCollapsed,
  };

  writeJson(PREFS_KEY, prefs);
  return prefs;
};

PianoApp.loadRecent = loadRecent;
PianoApp.saveRecent = saveRecent;
PianoApp.renderRecentList = renderRecentList;
PianoApp.loadPreferences = loadPreferences;
PianoApp.applyPreferences = applyPreferences;
PianoApp.savePreferences = savePreferences;
