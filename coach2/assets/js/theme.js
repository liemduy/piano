// Theme helpers.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const setTheme = (theme, { persist = true } = {}) => {
  document.body.classList.remove('theme-retro', 'theme-ocean', 'theme-coder');
  document.body.classList.add(`theme-${theme}`);
  PianoApp.state.settings.theme = theme;
  if (persist && PianoApp.savePreferences) PianoApp.savePreferences();
};

const getNextTheme = (currentTheme) => {
  if (currentTheme === 'retro') return 'ocean';
  if (currentTheme === 'ocean') return 'coder';
  return 'retro';
};

PianoApp.setTheme = setTheme;
PianoApp.getNextTheme = getNextTheme;
