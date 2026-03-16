// Generic utility helpers shared by the app.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const midiToName = (midi) => {
  if (typeof midi !== 'number' || !isFinite(midi)) return '?';
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return name + octave;
};

const uniq = (arr) => Array.from(new Set(arr));

const showToast = (message) => {
  const container = PianoApp.$('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
};

const debounce = (fn, ms = 220) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

PianoApp.NOTE_NAMES = NOTE_NAMES;
PianoApp.midiToName = midiToName;
PianoApp.uniq = uniq;
PianoApp.showToast = showToast;
PianoApp.debounce = debounce;
