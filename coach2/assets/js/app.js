// Application bootstrap and UI wiring.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const DEFAULT_ABC = `X:1
T:Piano Coach Test (2 Voices)
C:Demo
M:4/4
L:1/8
Q:1/4=80
K:C
V:RH clef=treble name="RH"
V:LH clef=bass name="LH"
[V:RH] C2 D2 | E2 F2 | [CEG]2 z2 | G4 |
[V:RH] A2 G2 | F2 E2 | [DFA]2 z2 | C4 ||
[V:LH] C,4 | G,,4 | C,2 G,,2 | C,4 |
[V:LH] F,,4 | G,,4 | C,2 G,,2 | C,4 ||`;

const switchTab = (name) => {
  const isRecent = name === 'recent';
  PianoApp.$('tab-abc').classList.toggle('active', !isRecent);
  PianoApp.$('tab-recent').classList.toggle('active', isRecent);
  PianoApp.$('abcInput').classList.toggle('is-hidden', isRecent);
  PianoApp.$('recentList').classList.toggle('is-hidden', !isRecent);
  if (isRecent && PianoApp.renderRecentList) PianoApp.renderRecentList();
};

const openModal = (id) => {
  const element = PianoApp.$(id);
  if (element) element.classList.add('open');
};

const closeModal = (id) => {
  const element = PianoApp.$(id);
  if (element) element.classList.remove('open');
};

const syncEditorPanelUI = () => {
  const button = PianoApp.$('btnToggleEditor');
  if (!button) return;

  const collapsed = document.body.classList.contains('editor-collapsed');
  button.textContent = collapsed ? '>' : '<';
  const label = collapsed
    ? PianoApp.t('button.toggle_editor_expand')
    : PianoApp.t('button.toggle_editor_collapse');
  button.title = label;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-expanded', String(!collapsed));
};

const setEditorCollapsed = (collapsed, { persist = true } = {}) => {
  document.body.classList.toggle('editor-collapsed', !!collapsed);
  PianoApp.state.settings.editorCollapsed = !!collapsed;
  syncEditorPanelUI();
  if (persist && PianoApp.savePreferences) PianoApp.savePreferences();
};

const toggleEditorPanel = () => {
  setEditorCollapsed(!document.body.classList.contains('editor-collapsed'));
};

const exitFocus = () => {
  if (PianoApp.state.practice.running || PianoApp.state.practice.status === 'countin') {
    PianoApp.stopPractice({ showResult: false });
    return;
  }

  document.body.classList.remove('practice-focus');
};

const wireMetroPopover = () => {
  const button = PianoApp.$('btnMetroMenu');
  const popover = PianoApp.$('metroPopover');
  const backdrop = PianoApp.$('metroBackdrop');
  const closeButton = PianoApp.$('btnMetroPopClose');
  if (!button || !popover) return;

  const open = () => {
    popover.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  };

  const close = () => {
    popover.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (popover.classList.contains('open')) close();
    else open();
  });

  closeButton?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  document.addEventListener('click', (event) => {
    if (!popover.classList.contains('open')) return;
    if (popover.contains(event.target) || button.contains(event.target)) return;
    close();
  });
};

const wireAppSettingsPopover = () => {
  const button = PianoApp.$('btnAppSettings');
  const popover = PianoApp.$('appSettingsPopover');
  const backdrop = PianoApp.$('appSettingsBackdrop');
  const closeButton = PianoApp.$('btnAppSettingsClose');
  if (!button || !popover) return;

  const open = () => {
    popover.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  };

  const close = () => {
    popover.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (popover.classList.contains('open')) close();
    else open();
  });

  closeButton?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  document.addEventListener('click', (event) => {
    if (!popover.classList.contains('open')) return;
    if (popover.contains(event.target) || button.contains(event.target)) return;
    close();
  });
};

const syncControlsFromState = () => {
  const { state } = PianoApp;
  PianoApp.$('modeSelect').value = state.mode;
  PianoApp.$('bpmRange').value = String(state.settings.practiceBpm);
  PianoApp.$('bpmVal').textContent = String(state.settings.practiceBpm);
  PianoApp.$('tolSel').value = String(state.settings.toleranceMs);
  PianoApp.$('countInSel').value = String(state.settings.countInBars);
  PianoApp.$('themeSel').value = state.settings.theme;
  PianoApp.$('languageSel').value = state.settings.language;
  setEditorCollapsed(state.settings.editorCollapsed, { persist: false });
  PianoApp.syncAutoScrollUI();
  syncToleranceVisibility();
};

const copyAbcToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(PianoApp.$('abcInput').value || '');
    PianoApp.showToast(PianoApp.t('toast.copy_abc'));
  } catch (error) {
    const textarea = PianoApp.$('abcInput');
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    PianoApp.showToast(PianoApp.t('toast.copy_abc'));
  }
};

const rerenderCurrentSong = ({ stopPractice = true } = {}) => {
  if (stopPractice && (PianoApp.state.practice.running || PianoApp.state.practice.status === 'countin')) {
    PianoApp.stopPractice({ showResult: false });
  }
  PianoApp.renderCurrentSong();
};

const syncToleranceVisibility = () => {
  const toleranceCtrl = PianoApp.$('toleranceCtrl');
  if (!toleranceCtrl) return;
  toleranceCtrl.classList.toggle('is-hidden', PianoApp.state.mode !== 'rhythm');
};

const syncTempoToEditor = (bpm, sourceAbc = null) => {
  const safeBpm = Math.max(1, parseInt(bpm, 10) || 80);
  const abc = sourceAbc ?? PianoApp.$('abcInput').value ?? '';
  if (!abc.trim()) return abc;

  const meta = PianoApp.parseMetaFromAbc ? PianoApp.parseMetaFromAbc(abc) : { qNum: 1, qDen: 4 };
  const qNum = Math.max(1, parseInt(meta.qNum, 10) || 1);
  const qDen = Math.max(1, parseInt(meta.qDen, 10) || 4);
  const tempoLine = `Q:${qNum}/${qDen}=${safeBpm}`;

  if (/^Q:.*$/m.test(abc)) return abc.replace(/^Q:.*$/m, tempoLine);

  const lines = abc.split('\n');
  let insertAt = lines.findIndex((line) => /^L:\s*/.test(line));
  if (insertAt === -1) insertAt = lines.findIndex((line) => /^M:\s*/.test(line));
  if (insertAt === -1) insertAt = lines.findIndex((line) => /^T:\s*/.test(line));
  if (insertAt === -1) insertAt = 0;
  lines.splice(insertAt + 1, 0, tempoLine);
  return lines.join('\n');
};

const handlePracticeBpmChange = () => {
  const bpm = parseInt(PianoApp.$('bpmRange').value, 10);
  const wasPracticing = PianoApp.state.practice.running || PianoApp.state.practice.status === 'countin';
  PianoApp.state.settings.practiceBpm = bpm;
  PianoApp.$('bpmVal').textContent = String(bpm);

  if (PianoApp.previewStop) PianoApp.previewStop();
  if (window.Metro) Metro.setBpm(bpm);
  if (wasPracticing) {
    PianoApp.stopPractice({ showResult: false });
  }

  PianoApp.$('abcInput').value = syncTempoToEditor(bpm);
  PianoApp.renderCurrentSong({ showToast: false });

  if (wasPracticing) PianoApp.showToast(PianoApp.t('toast.bpm_changed'));
  if (PianoApp.savePreferences) PianoApp.savePreferences();
};

const init = async () => {
  const prefs = PianoApp.loadPreferences ? PianoApp.loadPreferences() : null;
  if (prefs && PianoApp.applyPreferences) PianoApp.applyPreferences(prefs);

  PianoApp.$('abcInput').value = syncTempoToEditor(PianoApp.state.settings.practiceBpm, DEFAULT_ABC);

  PianoApp.setTheme(PianoApp.state.settings.theme, { persist: false });
  PianoApp.setLanguage(PianoApp.state.settings.language, { persist: false });
  syncControlsFromState();

  PianoApp.renderCurrentSong();
  PianoApp.applyZoom();
  PianoApp.buildHud();
  PianoApp.updateHint(PianoApp.t('common.empty'));
  PianoApp.updateLoopUI();

  PianoApp.$('zoomRange').addEventListener('input', PianoApp.applyZoom);
  PianoApp.$('btnRender').onclick = () => rerenderCurrentSong();
  PianoApp.$('btnReset').onclick = () => {
    PianoApp.$('abcInput').value = syncTempoToEditor(PianoApp.state.settings.practiceBpm, DEFAULT_ABC);
    rerenderCurrentSong();
  };
  PianoApp.$('btnPrevPlayPause').onclick = PianoApp.previewPlayPause;
  PianoApp.$('btnPrevStop').onclick = PianoApp.previewStop;
  PianoApp.updatePreviewUI();

  PianoApp.$('tab-abc').onclick = () => switchTab('abc');
  PianoApp.$('tab-recent').onclick = () => switchTab('recent');

  PianoApp.$('btnSave').onclick = () => {
    const abc = PianoApp.$('abcInput').value.trim();
    if (!abc) return;
    PianoApp.saveRecent(abc);
  };
  PianoApp.$('btnCopyAbc').onclick = copyAbcToClipboard;

  PianoApp.$('btnPractice').onclick = PianoApp.startPractice;
  PianoApp.$('btnStopHdr').onclick = () => PianoApp.stopPractice();
  PianoApp.$('btnRestartBarHdr').onclick = PianoApp.restartCurrentBar;
  PianoApp.$('btnFocusBack').onclick = exitFocus;

  PianoApp.$('modeSelect').addEventListener('change', () => {
    PianoApp.setMode(PianoApp.$('modeSelect').value);
    syncToleranceVisibility();
  });
  PianoApp.$('bpmRange').addEventListener('input', handlePracticeBpmChange);
  PianoApp.$('tolSel').addEventListener('change', () => {
    PianoApp.state.settings.toleranceMs = parseInt(PianoApp.$('tolSel').value, 10);
    if (PianoApp.savePreferences) PianoApp.savePreferences();
  });
  PianoApp.$('countInSel').addEventListener('change', () => {
    PianoApp.state.settings.countInBars = parseInt(PianoApp.$('countInSel').value, 10);
    if (PianoApp.savePreferences) PianoApp.savePreferences();
  });
  PianoApp.$('themeSel').addEventListener('change', () => {
    PianoApp.setTheme(PianoApp.$('themeSel').value);
  });
  PianoApp.$('languageSel').addEventListener('change', () => {
    PianoApp.setLanguage(PianoApp.$('languageSel').value);
    syncToleranceVisibility();
  });
  PianoApp.$('btnToggleEditor').onclick = toggleEditorPanel;

  PianoApp.$('btnInstructions').onclick = () => openModal('instrModal');
  PianoApp.$('btnAutoScroll').onclick = () => {
    PianoApp.state.settings.autoScroll = !PianoApp.state.settings.autoScroll;
    PianoApp.syncAutoScrollUI();
    if (PianoApp.savePreferences) PianoApp.savePreferences();
    PianoApp.showToast(PianoApp.t(PianoApp.state.settings.autoScroll ? 'toast.auto_scroll_on' : 'toast.auto_scroll_off'));
  };
  PianoApp.$('btnLoopRange').onclick = () => {
    if (PianoApp.state.looping.active || (PianoApp.state.looping.draft || []).length) {
      PianoApp.clearLoopSelection();
    } else {
      PianoApp.showToast(PianoApp.t('toast.loop_pick_start'));
    }
  };
  PianoApp.$('btnInstrClose').onclick = () => closeModal('instrModal');

  wireMetroPopover();
  wireAppSettingsPopover();

  PianoApp.$('midiBadge').onclick = async () => {
    openModal('midiModal');
    await PianoApp.refreshMidiList();
  };
  PianoApp.$('btnRefreshMidi').onclick = PianoApp.refreshMidiList;
  PianoApp.$('btnMidiClose').onclick = () => closeModal('midiModal');
  PianoApp.$('btnMidiConnect').onclick = PianoApp.connectSelectedMidi;

  PianoApp.$('btnResultClose').onclick = () => closeModal('resultModal');
  PianoApp.$('btnResultAgain').onclick = () => {
    closeModal('resultModal');
    PianoApp.startPractice();
  };

  PianoApp.$('abcInput').addEventListener('input', PianoApp.debounce(() => {
    if (!PianoApp.state.practice.running && PianoApp.state.practice.status !== 'countin') {
      PianoApp.renderCurrentSong();
    }
  }, 650));

  if (window.Metro) {
    Metro.wireUI();
    Metro.setBpm(PianoApp.state.settings.practiceBpm);
  }

  if (!navigator.requestMIDIAccess) PianoApp.setMidiBadge('warn', 'midi.badge.no_webmidi');
  else PianoApp.setMidiBadge('off', 'midi.badge.off');
};

window.addEventListener('keydown', (event) => {
  if (!PianoApp.state.practice.running) return;
  if (event.key.toLowerCase() !== 'r') return;

  event.preventDefault();
  PianoApp.restartCurrentBar();
});

PianoApp.$('midiModal').addEventListener('click', (event) => {
  if (event.target === PianoApp.$('midiModal')) closeModal('midiModal');
});
PianoApp.$('resultModal').addEventListener('click', (event) => {
  if (event.target === PianoApp.$('resultModal')) closeModal('resultModal');
});
PianoApp.$('instrModal').addEventListener('click', (event) => {
  if (event.target === PianoApp.$('instrModal')) closeModal('instrModal');
});

PianoApp.DEFAULT_ABC = DEFAULT_ABC;
PianoApp.switchTab = switchTab;
PianoApp.openModal = openModal;
PianoApp.closeModal = closeModal;
PianoApp.syncEditorPanelUI = syncEditorPanelUI;
PianoApp.setEditorCollapsed = setEditorCollapsed;
PianoApp.toggleEditorPanel = toggleEditorPanel;
PianoApp.syncTempoToEditor = syncTempoToEditor;
PianoApp.syncToleranceVisibility = syncToleranceVisibility;

init();
