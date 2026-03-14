// Preview playback feature logic.

var PianoApp = window.PianoApp || (window.PianoApp = {});

let previewSynth = null;
let previewState = 'stopped';
let previewBoundVisualObj = null;
let previewDurationSec = 0;
let previewTimer = null;
let previewPlayedMs = 0;
let previewLastStartMs = 0;
let previewVizTimer = null;
let previewVizLastIdx = -1;
let previewVizLastAddedIdx = -1;

const clearPreviewVizTimer = () => {
  if (previewVizTimer) {
    clearTimeout(previewVizTimer);
    previewVizTimer = null;
  }
};

const clearPreviewVizHighlight = () => {
  try {
    document.querySelectorAll('g.abcjs-note.note-playback').forEach((element) => element.classList.remove('note-playback'));
  } catch (error) {
    // Ignore detached SVG elements.
  }

  try {
    PianoApp.clearActive(PianoApp.activePreview, 'note-playback');
  } catch (error) {
    // Ignore when render layer is not ready yet.
  }

  previewVizLastIdx = -1;
  previewVizLastAddedIdx = -1;
};

const getPreviewLoopBoundsMs = () => {
  const steps = PianoApp.state.practice.expectedSteps || [];
  const range = PianoApp.getActivePracticeRange();
  if (!steps.length || range.end < range.start) return null;

  const startStep = steps[range.start];
  const endStep = steps[range.end];
  if (!startStep || !endStep) return null;

  const startMs = Math.max(0, Number(startStep.timeMs || 0));
  let endMs = Number(endStep.timeMs || 0);
  const holdEnds = (endStep.holds || []).map((hold) => endMs + Math.max(0, Number(hold && hold.durMs || 0)));
  if (holdEnds.length) endMs = Math.max(endMs, ...holdEnds);

  const nextStep = steps[range.end + 1];
  if (nextStep && Number.isFinite(nextStep.timeMs)) endMs = Math.min(endMs, Number(nextStep.timeMs));

  endMs = Math.max(startMs + 40, endMs);
  return { startMs, endMs };
};

const getPreviewElapsedMs = () => {
  if (previewState === 'playing') return previewPlayedMs + (performance.now() - previewLastStartMs);
  return previewPlayedMs;
};

const findLastStepAtOrBefore = (steps, timeMs) => {
  let lo = 0;
  let hi = steps.length - 1;
  let answer = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const stepTime = steps[mid] && typeof steps[mid].timeMs === 'number' ? steps[mid].timeMs : 0;
    if (stepTime <= timeMs) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return answer;
};

const setPreviewVizIdx = (steps, index, nowMs) => {
  if (!steps || !steps.length) return;
  if (index < 0) {
    clearPreviewVizHighlight();
    return;
  }

  if (index < previewVizLastAddedIdx) {
    PianoApp.clearActive(PianoApp.activePreview, 'note-playback');
    previewVizLastAddedIdx = -1;
  }

  const from = Math.max(0, previewVizLastAddedIdx + 1);
  for (let cursor = from; cursor <= index; cursor += 1) {
    const step = steps[cursor];
    if (!step) continue;
    PianoApp.activateStep(PianoApp.activePreview, step, 'note-playback');
  }
  previewVizLastAddedIdx = Math.max(previewVizLastAddedIdx, index);

  const tNow = Number.isFinite(nowMs) ? nowMs : (steps[index] && steps[index].timeMs ? steps[index].timeMs : 0);
  PianoApp.expireActive(PianoApp.activePreview, tNow, 'note-playback');

  if (index !== previewVizLastIdx) {
    previewVizLastIdx = index;
    const step = steps[index];
    PianoApp.ensureStepVisible(step, `preview:${index}`, 'smooth', { targetRatio: 0.28, topBand: 0.10, bottomBand: 0.55 });
  }
};

const previewVizTick = () => {
  clearPreviewVizTimer();
  if (previewState !== 'playing') return;
  if (PianoApp.state.practice.running) return;

  const steps = PianoApp.state.practice.expectedSteps || [];
  if (!steps.length) return;

  const elapsed = getPreviewElapsedMs();
  const index = findLastStepAtOrBefore(steps, elapsed);
  setPreviewVizIdx(steps, index, elapsed);

  let nextT = Infinity;
  if (index + 1 < steps.length) {
    const next = steps[index + 1] && typeof steps[index + 1].timeMs === 'number' ? steps[index + 1].timeMs : Infinity;
    if (Number.isFinite(next)) nextT = Math.min(nextT, next);
  } else if (index < 0 && steps.length > 0) {
    const first = steps[0] && typeof steps[0].timeMs === 'number' ? steps[0].timeMs : Infinity;
    if (Number.isFinite(first)) nextT = Math.min(nextT, first);
  }

  for (const endMs of PianoApp.activePreview.values()) {
    if (Number.isFinite(endMs) && endMs > elapsed) nextT = Math.min(nextT, endMs);
  }

  if (!Number.isFinite(nextT) || nextT === Infinity) return;
  const delay = Math.max(0, nextT - elapsed);
  previewVizTimer = setTimeout(previewVizTick, Math.min(250, delay + 5));
};

const startPreviewViz = (reset = false) => {
  if (PianoApp.state.practice.running) return;
  clearPreviewVizTimer();
  if (reset) clearPreviewVizHighlight();
  previewVizTick();
};

const pausePreviewViz = () => {
  clearPreviewVizTimer();
};

const stopPreviewViz = () => {
  clearPreviewVizTimer();
  previewVizLastIdx = -1;
  clearPreviewVizHighlight();
};

const clearPreviewTimer = () => {
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
};

const updatePreviewUI = () => {
  const button = PianoApp.$('btnPrevPlayPause');
  const stopButton = PianoApp.$('btnPrevStop');
  if (!button || !stopButton) return;

  if (previewState === 'playing') {
    button.innerHTML = `<i class="fa-solid fa-pause"></i> ${PianoApp.t('button.listen_pause')}`;
    button.title = PianoApp.t('button.listen_pause');
    stopButton.disabled = false;
    return;
  }

  if (previewState === 'paused') {
    button.innerHTML = `<i class="fa-solid fa-play"></i> ${PianoApp.t('button.listen_resume')}`;
    button.title = PianoApp.t('button.listen_resume');
    stopButton.disabled = false;
    return;
  }

  button.innerHTML = `<i class="fa-solid fa-play"></i> ${PianoApp.t('button.listen')}`;
  button.title = PianoApp.t('button.listen.title');
  stopButton.disabled = true;
};

const schedulePreviewEnd = () => {
  clearPreviewTimer();
  const loopBounds = PianoApp.state.looping.active ? getPreviewLoopBoundsMs() : null;

  if (loopBounds) {
    const remainingMs = Math.max(0, loopBounds.endMs - previewPlayedMs);
    previewTimer = setTimeout(() => {
      if (previewState !== 'playing' || !previewSynth) return;
      try {
        previewSynth.seek(loopBounds.startMs / 1000, 'seconds');
      } catch (error) {
        console.error(error);
      }
      previewPlayedMs = loopBounds.startMs;
      previewLastStartMs = performance.now();
      startPreviewViz(true);
      schedulePreviewEnd();
    }, remainingMs + 40);
    return;
  }

  if (!previewDurationSec) return;
  const remainingMs = Math.max(0, (previewDurationSec * 1000) - previewPlayedMs);
  previewTimer = setTimeout(() => {
    previewState = 'stopped';
    previewPlayedMs = 0;
    stopPreviewViz();
    updatePreviewUI();
  }, remainingMs + 80);
};

const ensurePreviewSynth = async () => {
  if (!PianoApp.state.currentSong.visualObj) PianoApp.renderCurrentSong();
  if (!PianoApp.state.currentSong.visualObj) return false;

  if (!window.ABCJS || !ABCJS.synth || !ABCJS.synth.CreateSynth) {
    PianoApp.showToast(PianoApp.t('toast.preview_audio_unavailable'));
    return false;
  }

  if (!previewSynth || previewBoundVisualObj !== PianoApp.state.currentSong.visualObj) {
    previewSynth = new ABCJS.synth.CreateSynth();
    previewBoundVisualObj = PianoApp.state.currentSong.visualObj;
    previewDurationSec = 0;
    previewPlayedMs = 0;
    previewState = 'stopped';

    try {
      await previewSynth.init({
        visualObj: PianoApp.state.currentSong.visualObj,
        options: {
          soundFontUrl: 'https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/',
          program: 0,
        },
      });
      const response = await previewSynth.prime();
      previewDurationSec = response && typeof response.duration === 'number' ? response.duration : 0;
    } catch (error) {
      console.error(error);
      PianoApp.showToast(PianoApp.t('toast.preview_browser_unavailable'));
      previewSynth = null;
      previewBoundVisualObj = null;
      return false;
    }
  }

  return true;
};

const previewPlayPause = async () => {
  const ok = await ensurePreviewSynth();
  if (!ok || !previewSynth) return;

  try {
    if (previewState === 'playing') {
      previewSynth.pause();
      previewState = 'paused';
      previewPlayedMs += performance.now() - previewLastStartMs;
      clearPreviewTimer();
      pausePreviewViz();
      updatePreviewUI();
      return;
    }

    if (previewState === 'paused') {
      previewSynth.resume();
      previewState = 'playing';
      previewLastStartMs = performance.now();
      schedulePreviewEnd();
      startPreviewViz(false);
      updatePreviewUI();
      return;
    }

    const loopBounds = PianoApp.state.looping.active ? getPreviewLoopBoundsMs() : null;
    if (loopBounds) {
      try {
        previewSynth.seek(loopBounds.startMs / 1000, 'seconds');
      } catch (error) {
        console.error(error);
      }
      previewPlayedMs = loopBounds.startMs;
    } else {
      previewPlayedMs = 0;
    }

    previewSynth.start();
    previewState = 'playing';
    previewLastStartMs = performance.now();
    schedulePreviewEnd();
    startPreviewViz(true);
    updatePreviewUI();
  } catch (error) {
    console.error(error);
    PianoApp.showToast(PianoApp.t('toast.preview_play_error'));
    previewState = 'stopped';
    previewPlayedMs = 0;
    clearPreviewTimer();
    stopPreviewViz();
    updatePreviewUI();
  }
};

const previewStop = () => {
  if (!previewSynth) return;
  try {
    previewSynth.stop();
  } catch (error) {
    console.error(error);
  }

  previewState = 'stopped';
  previewPlayedMs = 0;
  clearPreviewTimer();
  stopPreviewViz();
  updatePreviewUI();
};

PianoApp.updatePreviewUI = updatePreviewUI;
PianoApp.previewPlayPause = previewPlayPause;
PianoApp.previewStop = previewStop;
