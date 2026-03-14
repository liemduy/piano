// Rendering, note mapping, highlighting, loop UI, and sheet interactions.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const elementPitchMap = new Map();
const elementStepIndexMap = new Map();
const activePractice = new Map();
const activePreview = new Map();

let hoverTimer = null;
let lastHoverEl = null;
let noteTooltipScrollBound = false;
let lastAutoScrollKey = null;
let lastAutoScrollAt = 0;

const renderEmptyText = () => PianoApp.t('common.empty');

const getLoopLabelForStep = (index) => {
  const steps = PianoApp.state.practice.expectedSteps || [];
  const step = steps[index];
  if (!step) return renderEmptyText();

  const names = PianoApp.uniq(step.pitches || []).sort((a, b) => a - b).map(PianoApp.midiToName).join(' ');
  const parallel = Math.max(0, PianoApp.uniq(step.pitches || []).length - 1);
  return PianoApp.t('loop.step_label', {
    index: index + 1,
    names: names || renderEmptyText(),
    parallel: parallel > 0 ? PianoApp.t('loop.step_parallel', { count: parallel }) : '',
  });
};

const clearLoopMarks = () => {
  document.querySelectorAll('g.abcjs-note').forEach((element) => {
    element.classList.remove('note-loop-pick', 'note-loop-span', 'note-loop-edge');
  });
};

const updateLoopUI = () => {
  const button = PianoApp.$('btnLoopRange');
  const sub = PianoApp.$('songLoopSub');
  const loop = PianoApp.state.looping || {};
  if (!button || !sub) return;

  button.classList.toggle('toggleOn', !!loop.active);
  if (loop.active && Number.isFinite(loop.startIdx) && Number.isFinite(loop.endIdx)) {
    button.innerHTML = `<i class="fa-solid fa-repeat"></i> ${PianoApp.t('loop.button.active')}`;
    sub.textContent = PianoApp.t('loop.active_sub', {
      start: getLoopLabelForStep(loop.startIdx),
      end: getLoopLabelForStep(loop.endIdx),
    });
    return;
  }

  if ((loop.draft || []).length === 1) {
    button.innerHTML = `<i class="fa-solid fa-repeat"></i> ${PianoApp.t('loop.button.off')}`;
    sub.textContent = PianoApp.t('loop.draft_sub', { label: getLoopLabelForStep(loop.draft[0]) });
    return;
  }

  button.innerHTML = `<i class="fa-solid fa-repeat"></i> ${PianoApp.t('loop.button.off')}`;
  sub.textContent = PianoApp.t('loop.off_sub');
};

const applyLoopMarks = () => {
  clearLoopMarks();
  const steps = PianoApp.state.practice.expectedSteps || [];
  const loop = PianoApp.state.looping || {};

  if (loop.active && Number.isFinite(loop.startIdx) && Number.isFinite(loop.endIdx)) {
    const start = Math.max(0, Math.min(loop.startIdx, loop.endIdx));
    const end = Math.min(steps.length - 1, Math.max(loop.startIdx, loop.endIdx));
    for (let index = start; index <= end; index += 1) {
      const step = steps[index];
      if (!step || !step.elements) continue;
      step.elements.forEach((element) => element.classList.add('note-loop-span'));
    }

    [start, end].forEach((index) => {
      const step = steps[index];
      if (!step || !step.elements) return;
      step.elements.forEach((element) => {
        element.classList.remove('note-loop-span');
        element.classList.add('note-loop-edge');
      });
    });
  } else if ((loop.draft || []).length === 1) {
    const step = steps[loop.draft[0]];
    if (step && step.elements) step.elements.forEach((element) => element.classList.add('note-loop-pick'));
  }

  updateLoopUI();
};

const clearLoopSelection = ({ silent = false } = {}) => {
  const { looping } = PianoApp.state;
  looping.draft = [];
  looping.active = false;
  looping.startIdx = null;
  looping.endIdx = null;
  applyLoopMarks();
  if (!silent) PianoApp.showToast(PianoApp.t('toast.loop_disabled'));
};

const setLoopRange = (indexA, indexB) => {
  const steps = PianoApp.state.practice.expectedSteps || [];
  if (!steps.length) return;

  const start = Math.max(0, Math.min(indexA, indexB));
  const end = Math.min(steps.length - 1, Math.max(indexA, indexB));
  const { looping } = PianoApp.state;
  looping.draft = [];
  looping.active = true;
  looping.startIdx = start;
  looping.endIdx = end;
  applyLoopMarks();
  PianoApp.showToast(PianoApp.t('toast.loop_set', { start: start + 1, end: end + 1 }));
};

const handleLoopNotePick = (noteElement) => {
  if (PianoApp.state.practice.running) {
    PianoApp.showToast(PianoApp.t('toast.loop_stop_practice'));
    return;
  }

  if (!noteElement) return;
  const index = elementStepIndexMap.get(noteElement);
  if (!Number.isFinite(index)) return;

  if (PianoApp.state.looping.active) clearLoopSelection({ silent: true });

  const draft = Array.isArray(PianoApp.state.looping.draft) ? PianoApp.state.looping.draft.slice() : [];
  if (!draft.length) {
    PianoApp.state.looping.draft = [index];
    applyLoopMarks();
    PianoApp.showToast(PianoApp.t('toast.loop_pick_progress'));
    return;
  }

  if (draft[0] === index) {
    PianoApp.state.looping.draft = [];
    applyLoopMarks();
    PianoApp.showToast(PianoApp.t('toast.loop_delete_mark'));
    return;
  }

  setLoopRange(draft[0], index);
};

const buildElementPitchMap = (steps) => {
  elementPitchMap.clear();
  elementStepIndexMap.clear();

  (steps || []).forEach((step, stepIndex) => {
    if (!step || !step.elements || !step.pitches) return;
    if (!step.elements.length || !step.pitches.length) return;

    if (step.elements.length === step.pitches.length) {
      for (let index = 0; index < step.elements.length; index += 1) {
        const element = step.elements[index];
        const pitch = step.pitches[index];
        if (!element) continue;
        const set = elementPitchMap.get(element) || new Set();
        set.add(pitch);
        elementPitchMap.set(element, set);
        if (!elementStepIndexMap.has(element)) elementStepIndexMap.set(element, stepIndex);
      }
      return;
    }

    step.elements.forEach((element) => {
      if (!element) return;
      const set = elementPitchMap.get(element) || new Set();
      step.pitches.forEach((pitch) => set.add(pitch));
      elementPitchMap.set(element, set);
      if (!elementStepIndexMap.has(element)) elementStepIndexMap.set(element, stepIndex);
    });
  });
};

const hideNoteTooltip = () => {
  const tooltip = PianoApp.$('noteTooltip');
  if (!tooltip) return;
  tooltip.style.display = 'none';
  tooltip.textContent = '';
};

const showNoteTooltip = (element) => {
  const tooltip = PianoApp.$('noteTooltip');
  const wrap = PianoApp.$('sheetWrap');
  if (!tooltip || !wrap || !element) return;

  const wrapRect = wrap.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const x = (rect.left - wrapRect.left) + (rect.width / 2);
  const y = rect.top - wrapRect.top;

  let pitches = null;
  const mapped = elementPitchMap.get(element);
  if (mapped && mapped.size) {
    pitches = Array.from(mapped);
  } else if (element.dataset && element.dataset.pitches) {
    pitches = element.dataset.pitches.split(',').map((value) => parseInt(value, 10)).filter(Number.isFinite);
  }

  if (!pitches || !pitches.length) return;

  pitches = Array.from(new Set(pitches)).sort((left, right) => left - right);
  let names = element.dataset && element.dataset.noteNames ? element.dataset.noteNames : pitches.map(PianoApp.midiToName).join(' ');
  if (!names || names.trim() === '' || names.trim() === '?') names = pitches.join(' ');

  tooltip.textContent = names;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.style.display = 'block';
};

const bindNoteHoverTooltips = () => {
  hideNoteTooltip();
  document.querySelectorAll('g.abcjs-note').forEach((element) => {
    element.addEventListener('mouseenter', () => {
      lastHoverEl = element;
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        if (lastHoverEl === element) showNoteTooltip(element);
      }, 450);
    });

    element.addEventListener('mouseleave', () => {
      lastHoverEl = null;
      if (hoverTimer) clearTimeout(hoverTimer);
      hideNoteTooltip();
    });
  });

  if (!noteTooltipScrollBound) {
    PianoApp.$('sheetWrap')?.addEventListener('scroll', hideNoteTooltip, { passive: true });
    noteTooltipScrollBound = true;
  }
};

const selectAbcRange = (start, end) => {
  const textarea = PianoApp.$('abcInput');
  if (!textarea) return;
  if (typeof start !== 'number' || typeof end !== 'number' || start < 0 || end <= start) return;

  textarea.focus();
  textarea.setSelectionRange(start, end);

  const before = textarea.value.slice(0, start);
  const line = before.split('\n').length;
  textarea.scrollTop = Math.max(0, (line - 3) * 18);
};

const getClickCharRange = (abcElement, analysis) => {
  const candidates = [abcElement, abcElement && abcElement.abcelem, analysis, analysis && analysis.abcelem, analysis && analysis.elem];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const start = candidate.startChar ?? candidate.start;
    const end = candidate.endChar ?? candidate.end;
    if (typeof start === 'number' && typeof end === 'number' && end > start) return { start, end };
  }
  return null;
};

const clearCurrentMark = () => {
  document.querySelectorAll('g.abcjs-note.note-current, g.abcjs-note.note-partial').forEach((element) => {
    element.classList.remove('note-current', 'note-partial');
  });
};

const removeClassSafe = (element, className) => {
  try {
    if (element && element.classList) element.classList.remove(className);
  } catch (error) {
    // Ignore detached DOM nodes.
  }
};

const clearActive = (activeMap, className) => {
  if (!activeMap) return;
  for (const [element] of Array.from(activeMap.entries())) removeClassSafe(element, className);
  activeMap.clear();
};

const expireActive = (activeMap, nowMs, className) => {
  if (!activeMap || activeMap.size === 0) return;
  for (const [element, endMs] of Array.from(activeMap.entries())) {
    if (!element || !Number.isFinite(endMs) || endMs <= nowMs + 1) {
      removeClassSafe(element, className);
      activeMap.delete(element);
    }
  }
};

const activateStep = (activeMap, step, className) => {
  if (!step) return;
  const startMs = typeof step.timeMs === 'number' ? step.timeMs : 0;
  const holds = step.holds && step.holds.length ? step.holds : (step.elements || []).map((element) => ({ el: element, durMs: 0 }));

  holds.forEach((hold) => {
    const element = hold && hold.el ? hold.el : hold;
    if (!element) return;

    const durMs = hold && Number.isFinite(hold.durMs) ? Math.max(0, hold.durMs) : 0;
    const endMs = startMs + durMs;
    const previous = activeMap.get(element);
    if (!previous || endMs > previous) activeMap.set(element, endMs);
    try {
      element.classList.add(className);
    } catch (error) {
      // Ignore detached DOM nodes.
    }
  });
};

const clearAllMarks = () => {
  document.querySelectorAll('g.abcjs-note').forEach((element) => {
    element.classList.remove('note-current', 'note-correct', 'note-wrong', 'note-partial', 'note-had-error', 'note-playback');
  });

  clearActive(activePractice, 'note-current');
  clearActive(activePreview, 'note-playback');
};

const markStep = (step, className) => {
  if (!step || !step.elements) return;
  step.elements.forEach((element) => element.classList.add(className));
};

const unmarkStep = (step, className) => {
  if (!step || !step.elements) return;
  step.elements.forEach((element) => element.classList.remove(className));
};

const syncAutoScrollUI = () => {
  const button = PianoApp.$('btnAutoScroll');
  if (!button) return;
  button.classList.toggle('toggleOn', !!PianoApp.state.settings.autoScroll);
  button.title = PianoApp.state.settings.autoScroll
    ? PianoApp.t('toast.auto_scroll_on')
    : PianoApp.t('toast.auto_scroll_off');
};

const ensureStepVisible = (step, key, behavior = 'smooth', opts = {}) => {
  if (!PianoApp.state.settings.autoScroll) return;
  const wrap = PianoApp.$('sheetWrap');
  if (!wrap || !step || !step.elements || step.elements.length === 0) return;

  const now = performance.now();
  if (key && key === lastAutoScrollKey && (now - lastAutoScrollAt) < 250) return;
  lastAutoScrollKey = key || null;
  lastAutoScrollAt = now;

  const target = opts.targetEl && typeof opts.targetEl.getBoundingClientRect === 'function'
    ? opts.targetEl
    : step.elements.find((element) => element && typeof element.getBoundingClientRect === 'function');
  if (!target) return;

  const wrapRect = wrap.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const height = Math.max(1, wrapRect.height);
  const targetRatio = typeof opts.targetRatio === 'number' ? opts.targetRatio : 0.32;
  const topBand = typeof opts.topBand === 'number' ? opts.topBand : 0.18;
  const bottomBand = typeof opts.bottomBand === 'number' ? opts.bottomBand : 0.62;

  const center = (rect.top + rect.bottom) / 2;
  const topBound = wrapRect.top + height * topBand;
  const bottomBound = wrapRect.top + height * bottomBand;
  const desired = wrapRect.top + height * targetRatio;
  if (center >= topBound && center <= bottomBound) return;

  const delta = center - desired;
  const maxTop = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
  let newTop = wrap.scrollTop + delta;
  newTop = Math.max(0, Math.min(maxTop, newTop));
  if (Math.abs(newTop - wrap.scrollTop) < 2) return;

  try {
    wrap.scrollTo({ top: newTop, behavior });
  } catch (error) {
    wrap.scrollTop = newTop;
  }
};

const applyZoom = () => {
  const zoom = parseInt(PianoApp.$('zoomRange').value, 10) / 100;
  PianoApp.$('paper').style.transform = `scale(${zoom})`;
};

const buildBarFirstIdx = (steps) => {
  const barMap = new Map();
  steps.forEach((step, index) => {
    const barIndex = step.barIndex ?? 0;
    if (!barMap.has(barIndex)) barMap.set(barIndex, index);
  });
  return barMap;
};

const attachVisualMapping = ({ baseSteps, voiceOrder, eventsByVoice, tickMsBase }) => {
  const stepsByTime = new Map(baseSteps.map((step) => [step.timeMs, step]));
  const visualElements = document.querySelectorAll('g.abcjs-note');
  if (!visualElements || visualElements.length === 0) return;

  const voiceDomCounters = {};
  const getVoiceId = (voiceIndex) => voiceOrder[voiceIndex] || voiceOrder[0] || '1';

  visualElements.forEach((element) => {
    let voiceIndex = 0;
    element.classList.forEach((className) => {
      const match = className.match(/^abcjs-v(\d+)$/);
      if (match) voiceIndex = parseInt(match[1], 10);
    });

    const voiceId = getVoiceId(voiceIndex);
    const eventIndex = voiceDomCounters[voiceIndex] || 0;
    voiceDomCounters[voiceIndex] = eventIndex + 1;

    const voiceEvents = eventsByVoice[voiceId] || [];
    const event = voiceEvents[eventIndex];
    if (!event) return;

    const timeMs = Math.round(event.timeMs * tickMsBase);
    const step = stepsByTime.get(timeMs);
    if (!step) return;

    step.elements.push(element);
    try {
      element.dataset.pitches = (event.pitches || []).join(',');
      element.dataset.noteNames = (event.pitches || []).filter(Number.isFinite).map(PianoApp.midiToName).join(' ');
      element.dataset.durMs = String(Math.round((event.durT || 0) * tickMsBase));
    } catch (error) {
      // Ignore dataset failures on foreign SVG nodes.
    }

    step.elementPitches.push({ el: element, pitches: event.pitches });
    step.holds.push({ el: element, durMs: Math.round((event.durT || 0) * tickMsBase) });
  });
};

const createRenderAlert = (message) => {
  const paper = PianoApp.$('paper');
  if (!paper) return;
  paper.innerHTML = '';

  const alert = document.createElement('div');
  alert.className = 'render-alert';
  alert.textContent = message;
  paper.appendChild(alert);
};

const refreshSongMeta = () => {
  const { currentSong } = PianoApp.state;
  const titleEl = PianoApp.$('songTitle');
  const subEl = PianoApp.$('songSub');
  if (titleEl) titleEl.textContent = currentSong.title || renderEmptyText();
  if (!subEl) return;

  if (currentSong.meta) {
    subEl.textContent = PianoApp.t('song.meta', {
      key: currentSong.meta.key || 'C',
      meter: currentSong.meta.meter || '4/4',
      tempo: currentSong.baseBpm || PianoApp.state.settings.practiceBpm || 80,
    });
    return;
  }

  subEl.textContent = PianoApp.t('song.default_sub');
};

const renderCurrentSong = ({ showToast = true } = {}) => {
  const textarea = PianoApp.$('abcInput');
  if (!textarea) return;

  let abc = textarea.value.trim();
  if (!abc) return;

  const normalized = PianoApp.normalizeAbc(abc);
  if (normalized !== abc) {
    textarea.value = normalized;
    abc = normalized;
    PianoApp.showToast(PianoApp.t('toast.abc_normalized'));
  }

  const abcData = PianoApp.extractAbcData(abc, { fallbackBpm: PianoApp.state.settings.practiceBpm });
  const { state } = PianoApp;
  state.currentSong.originalABC = abc;
  state.currentSong.workingABC = abc;
  state.currentSong.baseBpm = abcData.meta.bpm || state.settings.practiceBpm;
  state.currentSong.meta = abcData.meta;
  state.settings.practiceBpm = state.currentSong.baseBpm || 80;

  const title = PianoApp.parseTitleFromAbc(abc);
  state.currentSong.title = title;
  refreshSongMeta();
  PianoApp.$('bpmRange').value = String(state.settings.practiceBpm);
  PianoApp.$('bpmVal').textContent = String(state.settings.practiceBpm);

  if (window.Metro && Metro.syncToSong) {
    Metro.syncToSong({ meter: abcData.meta.meter, bpm: state.settings.practiceBpm });
  }

  if (!window.ABCJS || !ABCJS.renderAbc) {
    PianoApp.showToast(PianoApp.t('toast.abcjs_missing'));
    createRenderAlert(PianoApp.t('render.abcjs_alert'));
    return;
  }

  try {
    const visualObjs = ABCJS.renderAbc('paper', abc, {
      add_classes: true,
      clickListener: (abcElement, tuneNumber, classes, analysis, drag, mouseEvent) => {
        const target = mouseEvent && mouseEvent.target && mouseEvent.target.closest
          ? mouseEvent.target.closest('g.abcjs-note')
          : null;

        if (mouseEvent && (mouseEvent.ctrlKey || mouseEvent.metaKey)) {
          mouseEvent.preventDefault();
          handleLoopNotePick(target);
          return;
        }

        const range = getClickCharRange(abcElement, analysis);
        if (!range) return;
        selectAbcRange(range.start, range.end);
        if (document.body.classList.contains('practice-focus')) {
          PianoApp.showToast(PianoApp.t('toast.abc_selected'));
        }
      },
      responsive: 'resize',
      paddingtop: 10,
      paddingleft: 10,
      paddingright: 10,
      paddingbottom: 10,
      staffwidth: 860,
    });
    state.currentSong.visualObj = visualObjs && visualObjs[0] ? visualObjs[0] : null;
  } catch (error) {
    console.error(error);
    PianoApp.showToast(PianoApp.t('toast.render_failed'));
    return;
  }

  try {
    document.querySelectorAll('g.abcjs-note.note-playback').forEach((element) => element.classList.remove('note-playback'));
  } catch (error) {
    // Ignore stale highlights from previous render.
  }

  attachVisualMapping(abcData);
  const steps = PianoApp.expandRepeatsAndVoltas(abcData.baseSteps, abcData.markers, abcData.tickMsBase);
  state.practice.expectedSteps = steps;
  state.practice.barFirstIdx = buildBarFirstIdx(steps);

  buildElementPitchMap(steps);
  bindNoteHoverTooltips();

  state.looping.draft = [];
  state.looping.active = false;
  state.looping.startIdx = null;
  state.looping.endIdx = null;
  applyLoopMarks();
  clearAllMarks();

  if (PianoApp.buildHud) PianoApp.buildHud();
  if (PianoApp.updateHint) PianoApp.updateHint(renderEmptyText());
  if (showToast) PianoApp.showToast(PianoApp.t('toast.rendered_steps', { count: steps.length }));
};

PianoApp.activePractice = activePractice;
PianoApp.activePreview = activePreview;
PianoApp.getLoopLabelForStep = getLoopLabelForStep;
PianoApp.updateLoopUI = updateLoopUI;
PianoApp.applyLoopMarks = applyLoopMarks;
PianoApp.clearLoopSelection = clearLoopSelection;
PianoApp.setLoopRange = setLoopRange;
PianoApp.handleLoopNotePick = handleLoopNotePick;
PianoApp.buildElementPitchMap = buildElementPitchMap;
PianoApp.hideNoteTooltip = hideNoteTooltip;
PianoApp.bindNoteHoverTooltips = bindNoteHoverTooltips;
PianoApp.clearCurrentMark = clearCurrentMark;
PianoApp.clearActive = clearActive;
PianoApp.expireActive = expireActive;
PianoApp.activateStep = activateStep;
PianoApp.clearAllMarks = clearAllMarks;
PianoApp.markStep = markStep;
PianoApp.unmarkStep = unmarkStep;
PianoApp.syncAutoScrollUI = syncAutoScrollUI;
PianoApp.ensureStepVisible = ensureStepVisible;
PianoApp.applyZoom = applyZoom;
PianoApp.refreshSongMeta = refreshSongMeta;
PianoApp.renderCurrentSong = renderCurrentSong;
