// Practice engine and scoring logic.

var PianoApp = window.PianoApp || (window.PianoApp = {});

let rhythmRAF = null;
const practiceEmptyText = () => PianoApp.t('common.empty');

const PRACTICE_TRANSITIONS = {
  idle: new Set(['countin', 'running']),
  countin: new Set(['running', 'finished']),
  running: new Set(['finished']),
  finished: new Set(['idle', 'countin', 'running']),
};

const setPracticeStatus = (nextStatus) => {
  const { practice } = PianoApp.state;
  const current = practice.status || 'idle';
  if (current !== nextStatus && !PRACTICE_TRANSITIONS[current]?.has(nextStatus)) {
    console.warn(`Unexpected practice transition: ${current} -> ${nextStatus}`);
  }
  practice.status = nextStatus;
};

const clearPracticeCountIn = () => {
  const timer = PianoApp.state.practice.countInTimer;
  if (timer) clearTimeout(timer);
  PianoApp.state.practice.countInTimer = null;
};

const clearRhythmLoop = () => {
  if (rhythmRAF) {
    try {
      cancelAnimationFrame(rhythmRAF);
    } catch (error) {
      // Ignore stale RAF handles.
    }
    rhythmRAF = null;
  }
};

const getScaledTimeMs = (rawMs) => {
  const base = PianoApp.state.currentSong.baseBpm || PianoApp.state.settings.practiceBpm || 80;
  const target = PianoApp.state.settings.practiceBpm || base;
  if (!base || !target) return rawMs;
  return rawMs * (base / target);
};

const computeLoopRange = () => {
  const steps = PianoApp.state.practice.expectedSteps || [];
  if (!steps.length) return { start: 0, end: -1, total: 0 };

  const loop = PianoApp.state.looping;
  if (loop && loop.active && Number.isFinite(loop.startIdx) && Number.isFinite(loop.endIdx)) {
    const start = Math.max(0, Math.min(loop.startIdx, loop.endIdx));
    const end = Math.min(steps.length - 1, Math.max(loop.startIdx, loop.endIdx));
    return { start, end, total: end - start + 1 };
  }

  return { start: 0, end: steps.length - 1, total: steps.length };
};

const getActivePracticeRange = () => {
  const range = PianoApp.state.practice.range;
  if (range && Number.isFinite(range.start) && Number.isFinite(range.end)) return range;
  return computeLoopRange();
};

const resetPracticeBuffers = () => {
  const { practice } = PianoApp.state;
  practice.currentPressed = new Set();
  practice.chordOnsets = new Map();
  practice.windowPressed = new Set();
  practice.windowOnsets = new Map();
  practice.lastTimingText = practiceEmptyText();
  practice.lastQualText = practiceEmptyText();
  practice.pendingQualText = null;
  practice.stepHadError = false;
  practice.stepCountedWrong = false;
};

const resetPracticeStats = (total) => {
  const { stats } = PianoApp.state.practice;
  stats.total = total;
  stats.done = 0;
  stats.correctSteps = 0;
  stats.wrongSteps = 0;
  stats.wrongKeystrokes = 0;
  stats.perfectSteps = 0;
};

const buildHud = () => {
  const { stats } = PianoApp.state.practice;
  let text = practiceEmptyText();

  if (PianoApp.state.mode === 'beginner') {
    const firstTry = Math.round((stats.perfectSteps / Math.max(1, stats.total)) * 100);
    text = PianoApp.t('practice.hud.beginner', {
      firstTry,
      done: stats.done,
      total: stats.total,
      wrongSteps: stats.wrongSteps,
    });
  } else {
    const accuracy = Math.round((stats.correctSteps / Math.max(1, stats.done)) * 100);
    text = PianoApp.t('practice.hud.rhythm', {
      accuracy,
      done: stats.done,
      total: stats.total,
      wrongSteps: stats.wrongSteps,
    });
  }

  const header = PianoApp.$('hdrStats');
  if (header) header.textContent = text;
};

const updateHint = (extraText = practiceEmptyText()) => {
  const { practice } = PianoApp.state;
  const steps = practice.expectedSteps || [];
  const step = steps[practice.stepIndex];
  const range = getActivePracticeRange();
  const total = range.total;
  const current = step ? Math.min((practice.stepIndex - range.start) + 1, total) : total;

  PianoApp.$('coachStep').textContent = `${Math.max(0, current)}/${total}`;
  PianoApp.$('coachTime').textContent = practice.lastTimingText || practiceEmptyText();
  PianoApp.$('coachQual').textContent = practice.lastQualText || practiceEmptyText();

  if (!step) {
    PianoApp.$('coachPlay').textContent = practiceEmptyText();
    PianoApp.$('coachMiss').textContent = practiceEmptyText();
    PianoApp.$('coachExtra').textContent = practiceEmptyText();
    return;
  }

  const required = PianoApp.uniq(step.pitches || []).sort((left, right) => left - right);
  PianoApp.$('coachPlay').textContent = required.length ? required.map(PianoApp.midiToName).join(' ') : practiceEmptyText();

  const pressed = PianoApp.state.mode === 'rhythm'
    ? new Set([...practice.windowPressed, ...PianoApp.state.activeKeys])
    : new Set([...practice.currentPressed, ...PianoApp.state.activeKeys]);

  const missing = required.filter((pitch) => !pressed.has(pitch));
  PianoApp.$('coachMiss').textContent = missing.length ? missing.map(PianoApp.midiToName).join(' ') : practiceEmptyText();
  PianoApp.$('coachExtra').textContent = extraText || practiceEmptyText();
};

const pickPracticeScrollAnchor = (step, activeMap) => {
  const wrap = PianoApp.$('sheetWrap');
  if (!wrap || !step || !step.elements || step.elements.length === 0) return null;

  const elements = (step.elements || []).filter((element) => element && typeof element.getBoundingClientRect === 'function');
  if (!elements.length) return null;

  let stepCenter = 0;
  try {
    const centers = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return (rect.top + rect.bottom) / 2;
    });
    stepCenter = centers.reduce((sum, value) => sum + value, 0) / Math.max(1, centers.length);
  } catch (error) {
    stepCenter = 0;
  }

  const activeRects = Array.from(activeMap.keys())
    .filter((element) => element && typeof element.getBoundingClientRect === 'function')
    .map((element) => ({ element, rect: element.getBoundingClientRect() }));

  if (!activeRects.length) return elements[0];

  const candidates = activeRects.filter((entry) => Math.abs(((entry.rect.top + entry.rect.bottom) / 2) - stepCenter) < 220);
  if (!candidates.length) return elements[0];

  candidates.sort((left, right) => left.rect.top - right.rect.top);
  return candidates[0].element || elements[0];
};

const highlightStep = () => {
  try {
    document.querySelectorAll('g.abcjs-note.note-partial').forEach((element) => element.classList.remove('note-partial'));
  } catch (error) {
    // Ignore detached nodes.
  }

  const steps = PianoApp.state.practice.expectedSteps || [];
  const step = steps[PianoApp.state.practice.stepIndex];
  if (!step) return;

  const nowMs = typeof step.timeMs === 'number' ? step.timeMs : 0;
  PianoApp.expireActive(PianoApp.activePractice, nowMs, 'note-current');
  PianoApp.activateStep(PianoApp.activePractice, step, 'note-current');

  const anchor = pickPracticeScrollAnchor(step, PianoApp.activePractice);
  PianoApp.ensureStepVisible(step, `practice:${PianoApp.state.practice.stepIndex}`, 'smooth', {
    targetRatio: 0.30,
    topBand: 0.12,
    bottomBand: 0.80,
    targetEl: anchor,
  });

  if (PianoApp.state.mode === 'beginner' && step.pitches && step.pitches.length > 1) {
    const held = new Set([...PianoApp.state.activeKeys]);
    const missing = step.pitches.filter((pitch) => !held.has(pitch));
    if (missing.length > 0 && missing.length < step.pitches.length) {
      PianoApp.markStep(step, 'note-partial');
    }
  }
};

const alignTimelineToStep = (stepIndex) => {
  const step = (PianoApp.state.practice.expectedSteps || [])[stepIndex];
  const offset = step ? getScaledTimeMs(step.timeMs || 0) : 0;
  PianoApp.state.practice.startPerf = performance.now() - offset;
};

const finishPractice = ({ showResult = true } = {}) => {
  PianoApp.clearActive(PianoApp.activePractice, 'note-current');
  try {
    document.querySelectorAll('g.abcjs-note.note-partial').forEach((element) => element.classList.remove('note-partial'));
  } catch (error) {
    // Ignore detached nodes.
  }

  PianoApp.state.practice.running = false;
  PianoApp.state.practice.range = null;
  setPracticeStatus('finished');
  clearPracticeCountIn();
  clearRhythmLoop();

  document.body.classList.remove('practice-focus');

  if (!showResult) return;

  const { stats, results } = PianoApp.state.practice;
  let sub = '';
  let statsHtml = '';

  if (PianoApp.state.mode === 'beginner') {
    const firstTry = Math.round((stats.perfectSteps / Math.max(1, stats.total)) * 100);
    sub = PianoApp.t('practice.result.beginner.sub', {
      firstTry,
      wrongSteps: stats.wrongSteps,
      wrongKeys: stats.wrongKeystrokes,
    });
    statsHtml = `
      <div class="stat"><div class="k">${PianoApp.t('practice.result.first_try')}</div><div class="v">${firstTry}%</div></div>
      <div class="stat"><div class="k">${PianoApp.t('practice.result.perfect_steps')}</div><div class="v">${stats.perfectSteps}/${stats.total}</div></div>
      <div class="stat"><div class="k">${PianoApp.t('practice.result.wrong_steps')}</div><div class="v">${stats.wrongSteps}</div></div>
      <div class="stat"><div class="k">${PianoApp.t('practice.result.wrong_keys')}</div><div class="v">${stats.wrongKeystrokes}</div></div>
    `;
  } else {
    const accuracy = Math.round((stats.correctSteps / Math.max(1, stats.done)) * 100);
    sub = PianoApp.t('practice.result.rhythm.sub', {
      accuracy,
      wrongSteps: stats.wrongSteps,
    });
    statsHtml = `
      <div class="stat"><div class="k">${PianoApp.t('practice.result.accuracy')}</div><div class="v">${accuracy}%</div></div>
      <div class="stat"><div class="k">${PianoApp.t('practice.result.done')}</div><div class="v">${stats.done}/${stats.total}</div></div>
      <div class="stat"><div class="k">${PianoApp.t('practice.result.correct_steps')}</div><div class="v">${stats.correctSteps}</div></div>
      <div class="stat"><div class="k">${PianoApp.t('practice.result.wrong_steps')}</div><div class="v">${stats.wrongSteps}</div></div>
    `;

    const deltas = (results || []).map((entry) => entry && entry.deltaMs).filter((value) => typeof value === 'number' && isFinite(value));
    if (deltas.length) {
      const abs = deltas.map((value) => Math.abs(value)).sort((left, right) => left - right);
      const medianAbs = abs[Math.floor(abs.length / 2)];
      const mean = Math.round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length);
      statsHtml += `
        <div class="stat"><div class="k">${PianoApp.t('practice.result.median_delta')}</div><div class="v">${medianAbs}ms</div></div>
        <div class="stat"><div class="k">${PianoApp.t('practice.result.mean_bias')}</div><div class="v">${mean}ms</div></div>
      `;
    }
  }

  PianoApp.$('resultSub').textContent = sub;
  PianoApp.$('resultBody').innerHTML = statsHtml;
  PianoApp.openModal?.('resultModal');
};

const stopPractice = ({ showResult = true } = {}) => {
  if (!PianoApp.state.practice.running && PianoApp.state.practice.status !== 'countin') return;
  finishPractice({ showResult });
};

const restartCurrentBar = () => {
  if (!PianoApp.state.practice.running) return;

  const steps = PianoApp.state.practice.expectedSteps || [];
  const range = getActivePracticeRange();
  const current = steps[PianoApp.state.practice.stepIndex];
  if (!current) return;

  const barIndex = current.barIndex ?? current.bar ?? 0;
  let restartIndex = PianoApp.state.practice.barFirstIdx.get(barIndex);
  if (!Number.isFinite(restartIndex)) restartIndex = range.start;
  restartIndex = Math.max(range.start, Math.min(restartIndex, range.end));

  for (let index = restartIndex; index <= range.end; index += 1) {
    PianoApp.unmarkStep(steps[index], 'note-correct');
    PianoApp.unmarkStep(steps[index], 'note-wrong');
    PianoApp.unmarkStep(steps[index], 'note-had-error');
  }

  PianoApp.state.practice.stepIndex = restartIndex;
  resetPracticeBuffers();
  if (PianoApp.state.mode === 'rhythm') {
    alignTimelineToStep(restartIndex);
    if (PianoApp.state.practice.status === 'running') startRhythmLoop();
  }

  highlightStep();
  updateHint(practiceEmptyText());
  PianoApp.showToast(PianoApp.t('toast.restart_bar'));
};

const getRhythmTol = (stepIndex) => {
  const steps = PianoApp.state.practice.expectedSteps || [];
  const baseTol = Math.max(20, Number(PianoApp.state.settings.toleranceMs || 160));
  const step = steps[stepIndex];
  const next = steps[stepIndex + 1];
  if (!step || !next) return baseTol;

  const start = getScaledTimeMs(step.timeMs || 0);
  const end = getScaledTimeMs(next.timeMs || 0);
  const gap = Math.max(0, end - start);
  const cap = Math.max(25, Math.floor(gap * 0.45));
  return Math.min(baseTol, cap);
};

const evalChordTogether = (spreadMs) => {
  const base = 120;
  const perfect = base;
  const ok = Math.round(base * 1.8);
  const pass = Math.round(base * 2.6);

  if (spreadMs <= perfect) return { pass: true, quality: PianoApp.t('practice.quality.chord_perfect', { spread: spreadMs }), hadError: false };
  if (spreadMs <= ok) return { pass: true, quality: PianoApp.t('practice.quality.chord_ok', { spread: spreadMs }), hadError: true };
  if (spreadMs <= pass) return { pass: true, quality: PianoApp.t('practice.quality.chord_late', { spread: spreadMs }), hadError: true };
  return { pass: false, quality: PianoApp.t('practice.quality.chord_fail', { spread: spreadMs }), hadError: true };
};

const completeStep = (ok, missing = [], extra = [], deltaMs = null) => {
  const { practice } = PianoApp.state;
  const steps = practice.expectedSteps || [];
  const step = steps[practice.stepIndex];
  if (!step) return;

  PianoApp.unmarkStep(step, 'note-current');
  PianoApp.unmarkStep(step, 'note-partial');

  if (ok) {
    PianoApp.unmarkStep(step, 'note-wrong');
    PianoApp.markStep(step, 'note-correct');
    if (practice.stepHadError) PianoApp.markStep(step, 'note-had-error');
  } else {
    PianoApp.unmarkStep(step, 'note-correct');
    PianoApp.markStep(step, 'note-wrong');
    PianoApp.markStep(step, 'note-had-error');
  }

  practice.stats.done += 1;
  if (ok) practice.stats.correctSteps += 1;
  else practice.stats.wrongSteps += 1;

  practice.results.push({
    ok,
    missing,
    extra,
    deltaMs,
    bar: step.barIndex ?? step.bar ?? 0,
  });

  practice.stepIndex += 1;
  resetPracticeBuffers();

  if (deltaMs === null || deltaMs === undefined) {
    practice.lastTimingText = practiceEmptyText();
  } else {
    const abs = Math.abs(deltaMs);
    practice.lastTimingText = abs <= 12
      ? PianoApp.t('practice.timing.on_time')
      : (deltaMs < 0
        ? PianoApp.t('practice.timing.early', { abs })
        : PianoApp.t('practice.timing.late', { abs }));
  }

  if (practice.pendingQualText) {
    practice.lastQualText = practice.pendingQualText;
    practice.pendingQualText = null;
  } else {
    practice.lastQualText = ok
      ? PianoApp.t('practice.quality.ok')
      : (PianoApp.state.mode === 'rhythm' ? PianoApp.t('practice.quality.off') : PianoApp.t('practice.quality.wrong'));
  }

  const range = getActivePracticeRange();
  if (practice.stepIndex > range.end) {
    stopPractice();
    return;
  }

  highlightStep();
  updateHint(practiceEmptyText());
  buildHud();
};

const handleNoteOn = (pitch) => {
  const { practice } = PianoApp.state;
  if (!practice.running || practice.status !== 'running') return;

  const steps = practice.expectedSteps || [];
  const step = steps[practice.stepIndex];
  if (!step) return;

  let extraText = practiceEmptyText();

  if (PianoApp.state.mode === 'beginner') {
    const required = step.pitches || [];
    const requiredSet = new Set(required);
    const isChord = requiredSet.size > 1;

    if (!requiredSet.has(pitch)) {
      practice.stats.wrongKeystrokes += 1;
      extraText = PianoApp.midiToName(pitch);
      if (!practice.stepCountedWrong) {
        practice.stats.wrongSteps += 1;
        practice.stepCountedWrong = true;
      }
      practice.stepHadError = true;
      PianoApp.markStep(step, 'note-wrong');
      setTimeout(() => PianoApp.unmarkStep(step, 'note-wrong'), 120);
      buildHud();
      updateHint(extraText);
      return;
    }

    if (!isChord) {
      practice.currentPressed.add(pitch);
      const pressed = new Set([...practice.currentPressed, ...PianoApp.state.activeKeys]);
      const missing = required.filter((requiredPitch) => !pressed.has(requiredPitch));
      if (!missing.length) {
        if (!practice.stepHadError) practice.stats.perfectSteps += 1;
        completeStep(true, [], [], null);
      } else {
        buildHud();
        updateHint(practiceEmptyText());
      }
      return;
    }

    if (!practice.chordOnsets.has(pitch)) practice.chordOnsets.set(pitch, performance.now());

    const held = new Set(PianoApp.state.activeKeys);
    const missingHeld = required.filter((requiredPitch) => !held.has(requiredPitch));
    if (missingHeld.length > 0) {
      const heldCount = required.filter((requiredPitch) => held.has(requiredPitch)).length;
      if (heldCount > 0 && heldCount < required.length) PianoApp.markStep(step, 'note-partial');
      buildHud();
      updateHint(practiceEmptyText());
      return;
    }

    const onsetTimes = required.map((requiredPitch) => practice.chordOnsets.get(requiredPitch)).filter((value) => typeof value === 'number');
    const spread = onsetTimes.length === required.length ? Math.max(...onsetTimes) - Math.min(...onsetTimes) : Infinity;
    const spreadMs = isFinite(spread) ? Math.round(spread) : 999999;
    const chordEval = evalChordTogether(spreadMs);
    practice.lastTimingText = practiceEmptyText();
    practice.pendingQualText = chordEval.quality;

    if (chordEval.hadError) {
      practice.stepHadError = true;
      if (!practice.stepCountedWrong) {
        practice.stats.wrongSteps += 1;
        practice.stepCountedWrong = true;
      }
    }

    if (!chordEval.pass) {
      PianoApp.markStep(step, 'note-wrong');
      setTimeout(() => PianoApp.unmarkStep(step, 'note-wrong'), 160);
      practice.chordOnsets = new Map();
      buildHud();
      updateHint(chordEval.quality);
      return;
    }

    if (!practice.stepHadError) practice.stats.perfectSteps += 1;
    completeStep(true, [], [], null);
    return;
  }

  const now = performance.now();
  const elapsed = now - practice.startPerf;
  const expected = getScaledTimeMs(step.timeMs || 0);
  const tolerance = getRhythmTol(practice.stepIndex);
  const required = step.pitches || [];
  const requiredSet = new Set(required);
  const inWindow = elapsed >= expected - tolerance && elapsed <= expected + tolerance;

  if (!inWindow) {
    practice.stats.wrongKeystrokes += 1;
    practice.stepHadError = true;
    PianoApp.markStep(step, 'note-wrong');
    setTimeout(() => PianoApp.unmarkStep(step, 'note-wrong'), 120);
    updateHint(PianoApp.t('practice.pitch.off', { note: PianoApp.midiToName(pitch) }));
    buildHud();
    return;
  }

  practice.windowPressed.add(pitch);
  if (!practice.windowOnsets.has(pitch)) practice.windowOnsets.set(pitch, elapsed);

  if (!requiredSet.has(pitch)) {
    practice.stepHadError = true;
    PianoApp.markStep(step, 'note-wrong');
    setTimeout(() => PianoApp.unmarkStep(step, 'note-wrong'), 120);
  }

  updateHint(PianoApp.midiToName(pitch));
  buildHud();

  const played = new Set(practice.windowPressed);
  const missing = required.filter((requiredPitch) => !played.has(requiredPitch));
  if (!missing.length && required.length > 0) {
    const extra = [...played].filter((playedPitch) => !requiredSet.has(playedPitch));
    if (extra.length) practice.stats.wrongKeystrokes += extra.length;

    let delta = null;
    const onsets = required.map((requiredPitch) => practice.windowOnsets.get(requiredPitch)).filter((value) => typeof value === 'number');
    if (onsets.length) delta = Math.round(Math.min(...onsets) - expected);
    completeStep(extra.length === 0, [], extra, delta);
  }
};

const startRhythmLoop = () => {
  clearRhythmLoop();
  PianoApp.state.practice._lastRhythmHiIdx = -1;

  const tick = () => {
    const { practice } = PianoApp.state;
    if (!practice.running || practice.status !== 'running' || PianoApp.state.mode !== 'rhythm') return;

    const steps = practice.expectedSteps || [];
    if (!steps.length) {
      stopPractice();
      return;
    }

    const elapsed = performance.now() - practice.startPerf;
    const currentIndex = practice.stepIndex;
    if (practice._lastRhythmHiIdx !== currentIndex) {
      practice._lastRhythmHiIdx = currentIndex;
      highlightStep();
    }

    let safety = 0;
    while (safety < 12) {
      safety += 1;
      const step = steps[practice.stepIndex];
      if (!step) {
        stopPractice();
        return;
      }

      const expected = getScaledTimeMs(step.timeMs || 0);
      const tolerance = getRhythmTol(practice.stepIndex);
      if (elapsed <= expected + tolerance) break;

      const required = step.pitches || [];
      const requiredSet = new Set(required);
      const played = new Set(practice.windowPressed);
      const missing = required.filter((pitch) => !played.has(pitch));
      const extra = [...played].filter((pitch) => !requiredSet.has(pitch));
      if (extra.length) practice.stats.wrongKeystrokes += extra.length;

      let delta = null;
      const onsets = required.map((pitch) => practice.windowOnsets.get(pitch)).filter((value) => typeof value === 'number');
      if (onsets.length) delta = Math.round(Math.min(...onsets) - expected);

      completeStep(missing.length === 0 && extra.length === 0, missing, extra, delta);
      if (!practice.running) return;

      if (practice._lastRhythmHiIdx !== practice.stepIndex) {
        practice._lastRhythmHiIdx = practice.stepIndex;
        highlightStep();
      }
    }

    rhythmRAF = requestAnimationFrame(tick);
  };

  rhythmRAF = requestAnimationFrame(tick);
};

const startPractice = async () => {
  if (PianoApp.previewStop) PianoApp.previewStop();

  if (!PianoApp.state.currentSong.visualObj) PianoApp.renderCurrentSong();
  if (!PianoApp.state.currentSong.visualObj) {
    PianoApp.showToast(PianoApp.t('toast.render_first'));
    return;
  }

  if (!PianoApp.state.practice.expectedSteps || PianoApp.state.practice.expectedSteps.length === 0) {
    PianoApp.showToast(PianoApp.t('toast.no_steps'));
    return;
  }

  if (!PianoApp.state.midi.connected) PianoApp.showToast(PianoApp.t('toast.midi_hint'));

  const range = computeLoopRange();
  const { practice } = PianoApp.state;

  PianoApp.clearAllMarks();
  PianoApp.applyLoopMarks();
  clearPracticeCountIn();
  clearRhythmLoop();

  practice.running = true;
  practice.range = range;
  practice.results = [];
  practice.stepIndex = range.start;
  resetPracticeBuffers();
  resetPracticeStats(range.total);
  setPracticeStatus('countin');

  document.body.classList.add('practice-focus');

  buildHud();
  highlightStep();
  updateHint(practiceEmptyText());

  const bars = PianoApp.state.settings.countInBars;
  if (window.Metro && Metro.enabled) Metro.syncToPractice({ countInBars: bars });

  if (PianoApp.state.mode === 'rhythm' && bars > 0) {
    PianoApp.showToast(PianoApp.t('toast.count_in', { bars }));
    const meter = PianoApp.state.currentSong.meta?.meter || '4/4';
    const beats = parseInt((meter.split('/')[0] || '4'), 10);
    const countMs = bars * beats * (60000 / Math.max(1, PianoApp.state.settings.practiceBpm));

    practice.countInTimer = setTimeout(() => {
      practice.countInTimer = null;
      if (!practice.running) return;
      setPracticeStatus('running');
      alignTimelineToStep(range.start);
      PianoApp.showToast(PianoApp.t('toast.start'));
      startRhythmLoop();
    }, Math.max(200, countMs));
    return;
  }

  setPracticeStatus('running');
  if (PianoApp.state.mode === 'rhythm') {
    alignTimelineToStep(range.start);
    startRhythmLoop();
  }
};

const setMode = (mode) => {
  PianoApp.state.mode = mode === 'rhythm' ? 'rhythm' : 'beginner';
  const select = PianoApp.$('modeSelect');
  if (select) select.value = PianoApp.state.mode;

  if (PianoApp.state.mode === 'beginner') PianoApp.showToast(PianoApp.t('toast.mode_beginner'));
  else PianoApp.showToast(PianoApp.t('toast.mode_rhythm'));

  if (PianoApp.state.practice.running || PianoApp.state.practice.status === 'countin') {
    PianoApp.showToast(PianoApp.t('toast.mode_changed_stop'));
    stopPractice({ showResult: false });
  }

  if (PianoApp.savePreferences) PianoApp.savePreferences();
  buildHud();
  updateHint(practiceEmptyText());
  if (PianoApp.syncToleranceVisibility) PianoApp.syncToleranceVisibility();
};

PianoApp.getScaledTimeMs = getScaledTimeMs;
PianoApp.getActivePracticeRange = getActivePracticeRange;
PianoApp.buildHud = buildHud;
PianoApp.updateHint = updateHint;
PianoApp.highlightStep = highlightStep;
PianoApp.stopPractice = stopPractice;
PianoApp.restartCurrentBar = restartCurrentBar;
PianoApp.startPractice = startPractice;
PianoApp.handleNoteOn = handleNoteOn;
PianoApp.setMode = setMode;
