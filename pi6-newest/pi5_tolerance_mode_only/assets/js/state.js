// Shared application state.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const state = {
  currentSong: {
    title: '',
    originalABC: '',
    workingABC: '',
    visualObj: null,
    baseBpm: 80,
    meta: null,
  },
  looping: {
    draft: [],
    active: false,
    startIdx: null,
    endIdx: null,
  },
  mode: 'beginner', // beginner|rhythm
  activeKeys: new Set(),
  midi: {
    access: null,
    input: null,
    connected: false,
    badgeStatus: 'off',
    badgeLabelKey: null,
  },
  settings: {
    practiceBpm: 80,
    countInBars: 2,
    toleranceMs: 160,
    theme: 'retro',
    language: 'vi',
    autoScroll: true,
    editorCollapsed: false,
  },
  practice: {
    running: false,
    status: 'idle', // idle|countin|running|finished
    startPerf: 0,
    stepIndex: 0,
    expectedSteps: [],
    range: null,
    countInTimer: null,
    currentPressed: new Set(),
    chordOnsets: new Map(),
    windowPressed: new Set(),
    windowOnsets: new Map(),
    lastTimingText: '—',
    lastQualText: '—',
    pendingQualText: null,
    stepHadError: false,
    stepCountedWrong: false,
    results: [],
    barFirstIdx: new Map(),
    stats: {
      total: 0,
      done: 0,
      correctSteps: 0,
      wrongSteps: 0,
      wrongKeystrokes: 0,
      perfectSteps: 0,
    },
  },
};

PianoApp.state = state;
