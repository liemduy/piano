// ---------- App State ----------
    const state = {
      currentSong: {
        title: '',
        originalABC: '',
        workingABC: '',
        visualObj: null,
        baseBpm: 80,
      },
      looping: {
        draft: [],
        active: false,
        startIdx: null,
        endIdx: null,
      },
      mode: 'beginner', // beginner|flow|structure|rhythm
      activeKeys: new Set(),
      midi: {
        access: null,
        input: null,
        connected: false
      },
      settings: {
        bpm: 80,
        countInBars: 2,
        toleranceMs: 160,
        structureStrict: 'normal',
        structureMinMs: 55,
        chordWindowMs: 240,
        allowArpeggio: true,
        chordTogetherMs: 120,
                theme: 'retro',
        autoScroll: true,

      },
      practice: {
        running: false,
        status: 'idle', // idle|countin|running|finished
        startPerf: 0,
        stepIndex: 0,
        expectedSteps: [],
        currentPressed: new Set(),     // beginner
        chordPressed: new Set(),       // flow chord
        chordTimer: null,
        windowPressed: new Set(),      // rhythm
        windowOnsets: new Map(),       // pitch->timeMs within window
        structPressed: new Set(),      // structure mode
        structOnsets: new Map(),       // structure mode: pitch->perfNow
        structExtras: new Set(),       // structure mode: wrong pitches pressed in this step
        structure: { barIndex: null, barStartPerf: 0, barStartExp: 0, k: null, kSamples: 0, lastPerf: null, lastExp: null },
        lastTimingText: '—',
        lastQualText: '—',
        pendingQualText: null,
        stepHadError: false,
        stepCountedWrong: false,
        results: [],
        barFirstIdx: new Map(),
        loop: null,
        stats: {
          total: 0,
          done: 0,
          correctSteps: 0,
          wrongSteps: 0,
          wrongKeystrokes: 0,
          perfectSteps: 0,
        }
      }
    };

    
export { state };
