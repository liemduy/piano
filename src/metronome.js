import { $, showToast } from './utils.js';
import { state } from './state.js';

// ---------- Metronome (Audio + Flash) ----------
    // Design goals:
    // - Lives on the header (always visible)
    // - Syncs to song meter + current BPM (especially Rhythm mode)
    // - Tick (audio) and Flash (visual) can be toggled independently
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
      let subdivision = 1; // 1=quarter, 2=eighth
      let nextTime = 0;
      let beatInBar = 1;
      let barIndex = 1;
      let subIndex = 0;

      const stateLocal = {
        enabled: false,
        tick: true,
        flash: true,
        sound: 'click',
        accentDifferent: true, // beat 1 uses accentSound
        accentSound: 'wood',
        volume: 0.75
      };

      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

      const ensureAudio = async () => {
        if (audioCtx) return true;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return false;
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = stateLocal.volume;
        masterGain.connect(audioCtx.destination);

        // prebuild 1s noise buffer
        noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
        return true;
      };

      const resumeAudio = async () => {
        const ok = await ensureAudio();
        if (!ok) return false;
        if (audioCtx.state === 'suspended') {
          try { await audioCtx.resume(); } catch(e) {}
        }
        return true;
      };

      const secondsPerSub = () => (60 / Math.max(1, bpm)) / Math.max(1, subdivision);

      const buildLed = () => {
        const led = $('metroLed');
        if (!led) return;
        led.innerHTML = '';
        const n = clamp(beatsPerBar, 1, 12);
        for (let i = 1; i <= n; i++) {
          const dot = document.createElement('div');
          dot.className = 'metroDot' + (i === 1 ? ' accent' : '');
          dot.dataset.beat = String(i);
          led.appendChild(dot);
        }
        // initial highlight
        setActiveBeat(beatInBar, true);
      };

      const setActiveBeat = (beat, pulse=false) => {
        const led = $('metroLed');
        if (!led) return;
        const dots = Array.from(led.querySelectorAll('.metroDot'));
        dots.forEach(d => {
          const b = parseInt(d.dataset.beat, 10);
          d.classList.toggle('active', b === beat);
          if (pulse && stateLocal.flash && b === beat) {
            d.classList.remove('pulse');
            // force reflow to restart animation
            void d.offsetWidth;
            d.classList.add('pulse');
          } else {
            d.classList.remove('pulse');
          }
        });
      };

      const playSoundAt = (time, isAccent=false, isSub=false) => {
        if (!stateLocal.tick) return;
        if (!audioCtx || !masterGain) return;

        const vol = stateLocal.volume * (isAccent ? 1.15 : 0.9) * (isSub ? 0.55 : 1.0);
        const outGain = audioCtx.createGain();
        outGain.gain.setValueAtTime(0.0001, time);
        outGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), time + 0.004);
        outGain.gain.exponentialRampToValueAtTime(0.0001, time + (isSub ? 0.035 : 0.06));
        outGain.connect(masterGain);

        let baseSound = stateLocal.sound;
        if (isAccent && stateLocal.accentDifferent) baseSound = stateLocal.accentSound || baseSound;

        const snd = baseSound === 'random'
          ? (['click','beep','wood','hihat','clave'][Math.floor(Math.random()*5)])
          : baseSound;

        if (snd === 'hihat') {
          const src = audioCtx.createBufferSource();
          src.buffer = noiseBuf;
          const hp = audioCtx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.setValueAtTime(7000, time);
          src.connect(hp);
          hp.connect(outGain);
          src.start(time);
          src.stop(time + 0.05);
          return;
        }

        if (snd === 'wood') {
          // short filtered noise "tap"
          const src = audioCtx.createBufferSource();
          src.buffer = noiseBuf;
          const bp = audioCtx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(isAccent ? 1200 : 900, time);
          bp.Q.setValueAtTime(8, time);
          src.connect(bp);
          bp.connect(outGain);
          src.start(time);
          src.stop(time + 0.06);
          return;
        }

        // oscillator-based
        const osc = audioCtx.createOscillator();
        const wave = (snd === 'click') ? 'square' : (snd === 'clave' ? 'triangle' : 'sine');
        osc.type = wave;
        const baseF = snd === 'beep' ? 880 : (snd === 'clave' ? 620 : 1100);
        const f = baseF * (isAccent ? 1.28 : 1.0) * (isSub ? 0.92 : 1.0);
        osc.frequency.setValueAtTime(f, time);
        osc.connect(outGain);
        osc.start(time);
        osc.stop(time + (snd === 'beep' ? 0.07 : 0.05));
      };

      const scheduleStep = (time) => {
        const isBeat = (subIndex === 0);
        const isAccent = isBeat && (beatInBar === 1);

        playSoundAt(time, isAccent, !isBeat);

        // visual: schedule close to audio time to keep sync
        const doVisual = () => setActiveBeat(beatInBar, true);
        if (stateLocal.flash && audioCtx) {
          const delay = Math.max(0, (time - audioCtx.currentTime) * 1000);
          setTimeout(doVisual, delay);
        } else {
          // no flash => still show current beat (static highlight, no pulse)
          setActiveBeat(beatInBar, false);
        }

        // advance counters
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
          nextTime += secondsPerSub();
        }
      };

      const start = async (opts={}) => {
        bpm = clamp(parseInt(opts.bpm ?? bpm, 10) || bpm, 30, 300);
        beatsPerBar = clamp(parseInt(opts.beatsPerBar ?? beatsPerBar, 10) || beatsPerBar, 1, 12);
        subdivision = clamp(parseInt(opts.subdivision ?? subdivision, 10) || subdivision, 1, 4);

        stateLocal.enabled = true;
        running = true;

        const ok = await resumeAudio();
        if (!ok) {
          showToast('No WebAudio (metronome sound disabled).');
        }

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
        stateLocal.enabled = false;
        running = false;
        if (timer) { clearInterval(timer); timer = null; }
        renderHeaderState();
      };

      const toggle = async () => {
        if (stateLocal.enabled) stop();
        else await start({ bpm, beatsPerBar, subdivision });
      };

      const syncToSong = (meta) => {
        if (!meta) return;
        if (meta.meter) {
          const n = parseInt((String(meta.meter).split('/')[0] || '4'), 10);
          if (Number.isFinite(n) && n > 0) beatsPerBar = clamp(n, 1, 12);
        }
        if (meta.bpm) {
          const v = parseInt(meta.bpm, 10);
          if (Number.isFinite(v) && v > 0) bpm = clamp(v, 30, 300);
        }
        buildLed();
        renderHeaderState();
      };

      const syncToPractice = async ({countInBars=0} = {}) => {
        // Realign phase so beat 1 starts now (count-in uses the same BPM & meter)
        if (!stateLocal.enabled) return;
        await resumeAudio();
        beatInBar = 1;
        barIndex = 1;
        subIndex = 0;
        if (audioCtx) nextTime = audioCtx.currentTime + cfg.startDelaySec;
        buildLed();
        // showToast('Metronome synced');
      };

      const setBpm = (v) => {
        const nv = clamp(parseInt(v, 10) || bpm, 30, 300);
        bpm = nv;
        renderHeaderState();
      };

      const setSound = (s) => { stateLocal.sound = s || 'click'; renderHeaderState(); };
      const setTick = (on) => { stateLocal.tick = !!on; renderHeaderState(); };
      const setFlash = (on) => { stateLocal.flash = !!on; renderHeaderState(); };
      const setSubdivision = (n) => { subdivision = clamp(parseInt(n,10)||1,1,4); subIndex = 0; };

      const renderHeaderState = () => {
        const bpmEl = $('metroBpm'); if (bpmEl) bpmEl.textContent = String(bpm);
        const btn = $('btnMetro');
        if (btn) {
          btn.classList.toggle('on', stateLocal.enabled);
          btn.classList.toggle('off', !stateLocal.enabled);
        }
        const bt = $('btnMetroTick');
        if (bt) { bt.classList.toggle('on', stateLocal.tick); bt.classList.toggle('off', !stateLocal.tick); }
        const bf = $('btnMetroFlash');
        if (bf) { bf.classList.toggle('on', stateLocal.flash); bf.classList.toggle('off', !stateLocal.flash); }
        const sel = $('metroSound');
        if (sel && sel.value !== stateLocal.sound) sel.value = stateLocal.sound;
        const subSel = $('metroSubdiv');
        if (subSel && subSel.value !== String(subdivision)) subSel.value = String(subdivision);

        const ba = $('btnMetroAccent');
        if (ba) { ba.classList.toggle('on', stateLocal.accentDifferent); ba.classList.toggle('off', !stateLocal.accentDifferent); }

        const asel = $('metroAccentSound');
        if (asel) {
          asel.disabled = !stateLocal.accentDifferent;
          if (asel.value !== stateLocal.accentSound) asel.value = stateLocal.accentSound;
        }
      };

      const wireUI = () => {
        buildLed();
        renderHeaderState();

        $('btnMetro')?.addEventListener('click', async () => {
          // user gesture => ok to resume AudioContext
          await toggle();
          if (state.practice.running) await syncToPractice({countInBars: state.settings.countInBars});
        });

        $('btnMetroTick')?.addEventListener('click', async () => {
          stateLocal.tick = !stateLocal.tick;
          if (stateLocal.enabled) await resumeAudio();
          renderHeaderState();
        });

        $('btnMetroFlash')?.addEventListener('click', () => {
          stateLocal.flash = !stateLocal.flash;
          renderHeaderState();
        });

        $('metroSound')?.addEventListener('change', (e) => {
          stateLocal.sound = e.target.value;
          renderHeaderState();
        });

        $('metroSubdiv')?.addEventListener('change', (e) => {
          setSubdivision(e.target.value);
          renderHeaderState();
        });

        $('btnMetroAccent')?.addEventListener('click', () => {
          stateLocal.accentDifferent = !stateLocal.accentDifferent;
          renderHeaderState();
        });

        $('metroAccentSound')?.addEventListener('change', (e) => {
          stateLocal.accentSound = e.target.value;
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
        setSound,
        setTick,
        setFlash,
        setSubdivision,
        renderHeaderState,
        get enabled(){ return stateLocal.enabled; }
      };
    })();

    
export { Metro };
