// Metronome feature logic.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const Metro = (() => {
  const cfg = {
    lookaheadMs: 25,
    scheduleAheadSec: 0.15,
    startDelaySec: 0.06,
  };

  let audioCtx = null;
  let masterGain = null;
  let noiseBuf = null;
  let timer = null;
  let running = false;

  let bpm = 80;
  let beatsPerBar = 4;
  let subdivision = 1;
  let nextTime = 0;
  let beatInBar = 1;
  let barIndex = 1;
  let subIndex = 0;

  const localState = {
    enabled: false,
    tick: true,
    flash: true,
    sound: 'click',
    accentDifferent: true,
    accentSound: 'wood',
    volume: 0.75,
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const ensureAudio = async () => {
    if (audioCtx) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;

    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = localState.volume;
    masterGain.connect(audioCtx.destination);

    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2) - 1;

    return true;
  };

  const resumeAudio = async () => {
    const ok = await ensureAudio();
    if (!ok) return false;
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (error) {
        // Ignore browsers that refuse resume.
      }
    }
    return true;
  };

  const secondsPerSubdivision = () => (60 / Math.max(1, bpm)) / Math.max(1, subdivision);

  const buildLed = () => {
    const led = PianoApp.$('metroLed');
    if (!led) return;

    led.innerHTML = '';
    const count = clamp(beatsPerBar, 1, 12);
    for (let beat = 1; beat <= count; beat += 1) {
      const dot = document.createElement('div');
      dot.className = `metroDot${beat === 1 ? ' accent' : ''}`;
      dot.dataset.beat = String(beat);
      led.appendChild(dot);
    }

    setActiveBeat(beatInBar, true);
  };

  const setActiveBeat = (beat, pulse = false) => {
    const led = PianoApp.$('metroLed');
    if (!led) return;

    Array.from(led.querySelectorAll('.metroDot')).forEach((dot) => {
      const currentBeat = parseInt(dot.dataset.beat, 10);
      dot.classList.toggle('active', currentBeat === beat);
      if (pulse && localState.flash && currentBeat === beat) {
        dot.classList.remove('pulse');
        void dot.offsetWidth;
        dot.classList.add('pulse');
      } else {
        dot.classList.remove('pulse');
      }
    });
  };

  const playSoundAt = (time, isAccent = false, isSubdivision = false) => {
    if (!localState.tick || !audioCtx || !masterGain) return;

    const volume = localState.volume * (isAccent ? 1.15 : 0.9) * (isSubdivision ? 0.55 : 1);
    const outGain = audioCtx.createGain();
    outGain.gain.setValueAtTime(0.0001, time);
    outGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), time + 0.004);
    outGain.gain.exponentialRampToValueAtTime(0.0001, time + (isSubdivision ? 0.035 : 0.06));
    outGain.connect(masterGain);

    let baseSound = localState.sound;
    if (isAccent && localState.accentDifferent) baseSound = localState.accentSound || baseSound;

    const sound = baseSound === 'random'
      ? ['click', 'beep', 'wood', 'hihat', 'clave'][Math.floor(Math.random() * 5)]
      : baseSound;

    if (sound === 'hihat') {
      const src = audioCtx.createBufferSource();
      src.buffer = noiseBuf;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, time);
      src.connect(filter);
      filter.connect(outGain);
      src.start(time);
      src.stop(time + 0.05);
      return;
    }

    if (sound === 'wood') {
      const src = audioCtx.createBufferSource();
      src.buffer = noiseBuf;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isAccent ? 1200 : 900, time);
      filter.Q.setValueAtTime(8, time);
      src.connect(filter);
      filter.connect(outGain);
      src.start(time);
      src.stop(time + 0.06);
      return;
    }

    const osc = audioCtx.createOscillator();
    osc.type = sound === 'click' ? 'square' : (sound === 'clave' ? 'triangle' : 'sine');
    const baseFrequency = sound === 'beep' ? 880 : (sound === 'clave' ? 620 : 1100);
    const frequency = baseFrequency * (isAccent ? 1.28 : 1) * (isSubdivision ? 0.92 : 1);
    osc.frequency.setValueAtTime(frequency, time);
    osc.connect(outGain);
    osc.start(time);
    osc.stop(time + (sound === 'beep' ? 0.07 : 0.05));
  };

  const scheduleStep = (time) => {
    const isBeat = subIndex === 0;
    const isAccent = isBeat && beatInBar === 1;

    playSoundAt(time, isAccent, !isBeat);

    const doVisual = () => setActiveBeat(beatInBar, true);
    if (localState.flash && audioCtx) {
      const delay = Math.max(0, (time - audioCtx.currentTime) * 1000);
      setTimeout(doVisual, delay);
    } else {
      setActiveBeat(beatInBar, false);
    }

    subIndex += 1;
    if (subIndex >= subdivision) {
      subIndex = 0;
      beatInBar += 1;
      if (beatInBar > beatsPerBar) {
        beatInBar = 1;
        barIndex += 1;
      }
    }
  };

  const scheduler = () => {
    if (!running || !audioCtx) return;
    while (nextTime < audioCtx.currentTime + cfg.scheduleAheadSec) {
      scheduleStep(nextTime);
      nextTime += secondsPerSubdivision();
    }
  };

  const renderHeaderState = () => {
    const bpmEl = PianoApp.$('metroBpm');
    if (bpmEl) bpmEl.textContent = String(bpm);

    const button = PianoApp.$('btnMetro');
    if (button) {
      button.classList.toggle('on', localState.enabled);
      button.classList.toggle('off', !localState.enabled);
    }

    const tickButton = PianoApp.$('btnMetroTick');
    if (tickButton) {
      tickButton.classList.toggle('on', localState.tick);
      tickButton.classList.toggle('off', !localState.tick);
    }

    const flashButton = PianoApp.$('btnMetroFlash');
    if (flashButton) {
      flashButton.classList.toggle('on', localState.flash);
      flashButton.classList.toggle('off', !localState.flash);
    }

    const soundSelect = PianoApp.$('metroSound');
    if (soundSelect && soundSelect.value !== localState.sound) soundSelect.value = localState.sound;

    const subdivisionSelect = PianoApp.$('metroSubdiv');
    if (subdivisionSelect && subdivisionSelect.value !== String(subdivision)) subdivisionSelect.value = String(subdivision);

    const accentButton = PianoApp.$('btnMetroAccent');
    if (accentButton) {
      accentButton.classList.toggle('on', localState.accentDifferent);
      accentButton.classList.toggle('off', !localState.accentDifferent);
    }

    const accentSelect = PianoApp.$('metroAccentSound');
    if (accentSelect) {
      accentSelect.disabled = !localState.accentDifferent;
      if (accentSelect.value !== localState.accentSound) accentSelect.value = localState.accentSound;
    }
  };

  const start = async (opts = {}) => {
    bpm = clamp(parseInt(opts.bpm ?? bpm, 10) || bpm, 30, 300);
    beatsPerBar = clamp(parseInt(opts.beatsPerBar ?? beatsPerBar, 10) || beatsPerBar, 1, 12);
    subdivision = clamp(parseInt(opts.subdivision ?? subdivision, 10) || subdivision, 1, 4);

    localState.enabled = true;
    running = true;

    const ok = await resumeAudio();
    if (!ok) PianoApp.showToast(PianoApp.t('toast.metro_audio_unavailable'));

    beatInBar = 1;
    barIndex = 1;
    subIndex = 0;
    buildLed();

    if (audioCtx) nextTime = audioCtx.currentTime + cfg.startDelaySec;
    if (timer) clearInterval(timer);
    timer = setInterval(scheduler, cfg.lookaheadMs);
    renderHeaderState();
  };

  const stop = () => {
    localState.enabled = false;
    running = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    renderHeaderState();
  };

  const toggle = async () => {
    if (localState.enabled) stop();
    else await start({ bpm, beatsPerBar, subdivision });
  };

  const syncToSong = (meta) => {
    if (!meta) return;
    if (meta.meter) {
      const beats = parseInt((String(meta.meter).split('/')[0] || '4'), 10);
      if (Number.isFinite(beats) && beats > 0) beatsPerBar = clamp(beats, 1, 12);
    }

    if (meta.bpm) {
      const nextBpm = parseInt(meta.bpm, 10);
      if (Number.isFinite(nextBpm) && nextBpm > 0) bpm = clamp(nextBpm, 30, 300);
    }

    buildLed();
    renderHeaderState();
  };

  const syncToPractice = async () => {
    if (!localState.enabled) return;
    await resumeAudio();
    beatInBar = 1;
    barIndex = 1;
    subIndex = 0;
    if (audioCtx) nextTime = audioCtx.currentTime + cfg.startDelaySec;
    buildLed();
  };

  const setBpm = (value) => {
    bpm = clamp(parseInt(value, 10) || bpm, 30, 300);
    renderHeaderState();
  };

  const setSubdivision = (value) => {
    subdivision = clamp(parseInt(value, 10) || 1, 1, 4);
    subIndex = 0;
  };

  const wireUI = () => {
    buildLed();
    renderHeaderState();

    PianoApp.$('btnMetro')?.addEventListener('click', async () => {
      await toggle();
      if (PianoApp.state.practice.running) await syncToPractice();
    });

    PianoApp.$('btnMetroTick')?.addEventListener('click', async () => {
      localState.tick = !localState.tick;
      if (localState.enabled) await resumeAudio();
      renderHeaderState();
    });

    PianoApp.$('btnMetroFlash')?.addEventListener('click', () => {
      localState.flash = !localState.flash;
      renderHeaderState();
    });

    PianoApp.$('metroSound')?.addEventListener('change', (event) => {
      localState.sound = event.target.value;
      renderHeaderState();
    });

    PianoApp.$('metroSubdiv')?.addEventListener('change', (event) => {
      setSubdivision(event.target.value);
      renderHeaderState();
    });

    PianoApp.$('btnMetroAccent')?.addEventListener('click', () => {
      localState.accentDifferent = !localState.accentDifferent;
      renderHeaderState();
    });

    PianoApp.$('metroAccentSound')?.addEventListener('change', (event) => {
      localState.accentSound = event.target.value;
      renderHeaderState();
    });
  };

  return {
    wireUI,
    start,
    stop,
    toggle,
    syncToSong,
    syncToPractice,
    setBpm,
    setSubdivision,
    renderHeaderState,
    get enabled() {
      return localState.enabled;
    },
  };
})();

window.Metro = Metro;
PianoApp.Metro = Metro;
