// ---------- Utilities ----------
    const $ = (id) => document.getElementById(id);
    const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const midiToName = (m) => {
      if (typeof m !== 'number' || !isFinite(m)) return '?';
      const name = NOTE_NAMES[m % 12];
      const oct = Math.floor(m/12) - 1;
      return name + oct;
    };
    const uniq = (arr) => Array.from(new Set(arr));

    const showToast = (msg) => {
      const c = $('toast-container');
      const t = document.createElement('div');
      t.className = 'toast';
      t.textContent = msg;
      c.appendChild(t);
      setTimeout(() => t.remove(), 2600);
    };

    const debounce = (fn, ms=220) => {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
      };
    };


    
export { $, midiToName, uniq, showToast, debounce };
