const { useState, useEffect, useRef, useCallback } = React;
const {
    Music,
    Play,
    Pause,
    Square,
    Plus,
    Settings,
    XIcon,
    Edit3,
    AlignLeft,
    Layers,
    CopyIcon,
    Check,
    DownloadIcon,
    GlobeIcon,
    PaletteIcon,
    RestQuarterIcon,
    RestEighthIcon,
    RestSixteenthIcon,
    RestThirtySecondIcon,
    UndoIcon,
    RedoIcon,
    RotateCcwIcon,
    SparklesIcon,
} = window.AppIcons;
const {
    DEFAULT_ABC,
    OCTAVES,
    NOTES,
    KEY_TONICS,
    buildKeyString,
    KEY_SIG_HINT,
    SHARP_ORDER,
    FLAT_ORDER,
    MAJOR_BY_SHARPS,
    MAJOR_BY_FLATS,
    MINOR_BY_SHARPS,
    MINOR_BY_FLATS,
    SYMBOLS,
    TUPLET_MENU_DEFS,
    DECORATION_MENU_DEFS,
    NoteIcon,
} = window.AppConstants;
const { MiniAbcPreview, CloudControls, CloudModals } = window.AppComponents;
const { supabaseClient } = window.AppServices;
const { useDismissibleLayer, useEscapeToClose } = window.AppHooks;
const { useLibraryFeature } = window.AppFeatureHooks;
const { tFor, setLanguage, syncDocumentLanguage } = window.AppI18n;

function App() {
            const [abcText, setAbcText] = useState(DEFAULT_ABC);
            const [abcjsLoaded, setAbcjsLoaded] = useState(false);
            const [isPlaying, setIsPlaying] = useState(false);
            const [cursorPos, setCursorPos] = useState(0);
            const [loopEnabled, setLoopEnabled] = useState(false);
            const [rangeSelection, setRangeSelection] = useState(null);
            const [rangeMenu, setRangeMenu] = useState({ visible: false, x: 0, y: 0, target: null });

            // Import + Background overlay (PDF/Image as reference)
            const fileInputRef = useRef(null);
            const [importBusy, setImportBusy] = useState(false);
            const [bgPages, setBgPages] = useState([]); // [{ src, x, y, scale }]
            const [bgPageIndex, setBgPageIndex] = useState(0);
            const [bgOpacity, setBgOpacity] = useState(0.42);
            const [bgLocked, setBgLocked] = useState(true);

            // Global Editor State
            const [title, setTitle] = useState('New Song');
            const [composer, setComposer] = useState('Composer');
            const [meter, setMeter] = useState('4/4');
            const [duration, setDuration] = useState(() => {
                try { return localStorage.getItem('qs_dur_v1') || '4'; } catch (e) { return '4'; }
            });
            const [isDotted, setIsDotted] = useState(() => {
                try { return localStorage.getItem('qs_dotted_v1') === '1'; } catch (e) { return false; }
            });
            const [tempo, setTempo] = useState('120');

            // Key Signature
            const [keyTonic, setKeyTonic] = useState('C');
            const [keyMode, setKeyMode] = useState('major'); // 'major' | 'minor'

            const [keySigInput, setKeySigInput] = useState(KEY_SIG_HINT);
            const [keySigDirty, setKeySigDirty] = useState(false);

            // Optimize menu
            const [showOptimizeMenu, setShowOptimizeMenu] = useState(false);
            const [showAutoBarlinePreview, setShowAutoBarlinePreview] = useState(false);
            const [autoBarlineBefore, setAutoBarlineBefore] = useState('');
            const [autoBarlineAfter, setAutoBarlineAfter] = useState('');

            // Export & Language
            const [showExportMenu, setShowExportMenu] = useState(false);
            const [lang, setLang] = useState('vi'); // vi | en | jp

            // Theme (Retro / Ocean / Dark)
            const THEMES = ['retro','ocean','coder']; // coder theme is labeled as Dark in UI
            const [theme, setTheme] = useState(() => {
                try { return localStorage.getItem('qs_theme_v1') || 'coder'; } catch (e) { return 'coder'; }
            });
            useEffect(() => {
                try {
                    document.body.classList.remove('theme-retro','theme-ocean','theme-coder');
                    document.body.classList.add('theme-' + theme);
                    localStorage.setItem('qs_theme_v1', theme);
                } catch (e) {}
            }, [theme]);



            // --- Duration Brush (Trường độ) helpers + persistence ---
            const DURATION_ORDER = ['1','2','4','8','16','32']; // whole → 32nd
            const durationToPretty = (d) => {
                if (d === '1') return '1';
                if (d === '2') return '1/2';
                if (d === '4') return '1/4';
                if (d === '8') return '1/8';
                if (d === '16') return '1/16';
                if (d === '32') return '1/32';
                return d || '';
            };
            const getLengthStrFor = (durVal, dottedVal) => {
                // L:1/4 assumed (default in this app)
                let lengthStr = '';
                if (durVal === '1') lengthStr = dottedVal ? '6' : '4';
                else if (durVal === '2') lengthStr = dottedVal ? '3' : '2';
                else if (durVal === '4') lengthStr = dottedVal ? '3/2' : '';
                else if (durVal === '8') lengthStr = dottedVal ? '3/4' : '/2';
                else if (durVal === '16') lengthStr = dottedVal ? '3/8' : '/4';
                else if (durVal === '32') lengthStr = dottedVal ? '3/16' : '/8';
                return lengthStr;
            };

            // Persist duration brush across refresh
            useEffect(() => {
                try {
                    localStorage.setItem('qs_dur_v1', duration);
                    localStorage.setItem('qs_dotted_v1', isDotted ? '1' : '0');
                } catch (e) {}
            }, [duration, isDotted]);

            const durationRef = useRef(duration);
            const dottedRef = useRef(isDotted);
            useEffect(() => { durationRef.current = duration; }, [duration]);
            useEffect(() => { dottedRef.current = isDotted; }, [isDotted]);

            // Duration hotkeys help toggle
            const [showHotkeysHelp, setShowHotkeysHelp] = useState(false);
            const [showHotkeysModal, setShowHotkeysModal] = useState(false);

            // Lightweight toast for hotkey feedback
            const [toast, setToast] = useState(null);
            const toastTimerRef = useRef(null);
            const showToast = useCallback((msg) => {
                if (!msg) return;
                try { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); } catch (e) {}
                setToast(String(msg));
                toastTimerRef.current = setTimeout(() => setToast(null), 900);
            }, []);

            // Double-tap ArrowUp/ArrowDown (outside typing) to step duration
            const arrowTapRef = useRef({ key: null, t: 0 });

            // Hotkeys helpers (refs to avoid stale closures)
            const undoFnRef = useRef(() => {});
            const redoFnRef = useRef(() => {});
            const togglePlayRef = useRef(() => {});
            const stopAudioRef = useRef(() => {});
            const spaceTimerRef = useRef(null);

            // update document lang attr for accessibility
            useEffect(() => {
                try {
                    document.documentElement.lang = (lang === 'en') ? 'en' : (lang === 'jp' ? 'ja' : 'vi');
                } catch (e) {}
            }, [lang]);


            // Voicing State
            const [voices, setVoices] = useState([{ id: 1, clef: 'treble' }]);
            const [activeVoice, setActiveVoice] = useState(1);
            const [showAddVoice, setShowAddVoice] = useState(false);
            const [isCopied, setIsCopied] = useState(false);

            // Long press for accidentals
            const [longPressTarget, setLongPressTarget] = useState(null);
            const pressTimer = useRef(null);

            // Refs
            const textAreaRef = useRef(null);
            const renderAreaRef = useRef(null);
            const rangeMenuRef = useRef(null);
            const previewWrapRef = useRef(null);
            const previewScrollRef = useRef(null);
            const synthRef = useRef(null);

            // Audio playback controller (for repeat + synced cursor)
            const synthControlRef = useRef(null);
            const audioCtxRef = useRef(null);
            const visualObjRef = useRef(null);
            const sequenceRef = useRef(null);
            const noteTimingsRef = useRef([]);
            const baseSequenceRef = useRef(null);
            const baseNoteTimingsRef = useRef([]);
            const playbackRoadmapRef = useRef({ kind: 'base', key: 'base', markers: null });
            const audioPreparedRef = useRef(false);
            const lastCurrentElsRef = useRef([]);
            const lastFullLoopBeatRef = useRef(-1);
            const rangeSynthRef = useRef(null);
            const playbackModeRef = useRef(null);
            const loopEnabledRef = useRef(loopEnabled);
            const rangeSelectionRef = useRef(rangeSelection);
            const rangePlaybackRef = useRef({
                preparedKey: null,
                events: [],
                totalMs: 0,
                currentMs: 0,
                pausedMs: 0,
                nextEventIndex: 0,
                running: false,
                startPerfMs: 0,
                rafId: null,
                ignoreEnded: false,
                ending: false,
            });

            // --- UNDO/REDO (tối đa 5 bước) ---
            const MAX_HISTORY = 5;
            const [undoStack, setUndoStack] = useState([]);
            const [redoStack, setRedoStack] = useState([]);

            const abcTextRef = useRef(abcText);
            const cursorPosRef = useRef(cursorPos);
            const undoRef = useRef(undoStack);
            const redoRef = useRef(redoStack);

            useEffect(() => { abcTextRef.current = abcText; }, [abcText]);
            useEffect(() => { cursorPosRef.current = cursorPos; }, [cursorPos]);
            useEffect(() => { undoRef.current = undoStack; }, [undoStack]);
            useEffect(() => { redoRef.current = redoStack; }, [redoStack]);
            useEffect(() => { loopEnabledRef.current = loopEnabled; }, [loopEnabled]);
            useEffect(() => { rangeSelectionRef.current = rangeSelection; }, [rangeSelection]);

            const pushHistory = (prevText, prevCursor) => {
                setUndoStack(prev => {
                    const next = [...prev, { text: prevText, cursor: prevCursor }];
                    return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
                });
                setRedoStack([]);
            };

            const applyTextChange = (newText, newPos, { skipHistory = false, focus = true } = {}) => {
                const prevText = abcTextRef.current;
                const prevCursor = cursorPosRef.current;

                if (!skipHistory && prevText !== newText) {
                    pushHistory(prevText, prevCursor);
                }

                setAbcText(newText);
                setCursorPos(newPos);

                if (focus) {
                    setTimeout(() => {
                        if (textAreaRef.current) {
                            textAreaRef.current.focus();
                            try { textAreaRef.current.setSelectionRange(newPos, newPos); } catch (e) {}
                        }
                    }, 0);
                }
            };

            const handleUndo = () => {
                const u = undoRef.current;
                if (!u || u.length === 0) return;
                const last = u[u.length - 1];
                setUndoStack(u.slice(0, -1));
                setRedoStack(prev => {
                    const next = [...prev, { text: abcTextRef.current, cursor: cursorPosRef.current }];
                    return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
                });
                applyTextChange(last.text, last.cursor, { skipHistory: true, focus: true });
            };

            const handleRedo = () => {
                const r = redoRef.current;
                if (!r || r.length === 0) return;
                const last = r[r.length - 1];
                setRedoStack(r.slice(0, -1));
                setUndoStack(prev => {
                    const next = [...prev, { text: abcTextRef.current, cursor: cursorPosRef.current }];
                    return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
                });
                applyTextChange(last.text, last.cursor, { skipHistory: true, focus: true });
            };

            // --- MENU CHUỘT PHẢI CHO BÈ 2 ---
            const [voiceMenu, setVoiceMenu] = useState({ visible: false, x: 0, y: 0, voiceId: null });

            // Symbol menu (hold to choose variants)
            const [symbolMenu, setSymbolMenu] = useState({ visible: false, x: 0, y: 0, items: [] });
            const symbolHoldTimerRef = useRef(null);
            const symbolHoldOpenedRef = useRef(false);
            const symbolTapRef = useRef({ last: 0, timer: null });
            const [repeatQuickToken, setRepeatQuickToken] = useState(':|');
            const [decoQuickToken, setDecoQuickToken] = useState('!accent!');


            const closeVoiceMenu = () => setVoiceMenu(v => ({ ...v, visible: false }));

            const closeSymbolMenu = () => setSymbolMenu(m => ({ ...m, visible: false, items: [] }));

            const openSymbolMenu = (x, y, items) => {
                // close any pending double-tap timer
                if (symbolTapRef.current.timer) {
                    clearTimeout(symbolTapRef.current.timer);
                    symbolTapRef.current.timer = null;
                }
                symbolTapRef.current.last = 0;

                setSymbolMenu({ visible: true, x, y, items });
            };

            const handleSymbolTapDouble = (onDouble) => {
                const now = Date.now();
                const last = symbolTapRef.current.last || 0;

                // second tap within window -> trigger
                if (now - last < 260) {
                    symbolTapRef.current.last = 0;
                    if (symbolTapRef.current.timer) {
                        clearTimeout(symbolTapRef.current.timer);
                        symbolTapRef.current.timer = null;
                    }
                    onDouble();
                    return;
                }

                // first tap -> wait for second
                symbolTapRef.current.last = now;
                if (symbolTapRef.current.timer) clearTimeout(symbolTapRef.current.timer);
                symbolTapRef.current.timer = setTimeout(() => {
                    symbolTapRef.current.last = 0;
                    symbolTapRef.current.timer = null;
                }, 260);
            };

            const startSymbolHold = (e, items) => {
                symbolHoldOpenedRef.current = false;
                // hold to open variants
                const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

                if (symbolHoldTimerRef.current) clearTimeout(symbolHoldTimerRef.current);
                symbolHoldTimerRef.current = setTimeout(() => {
                    symbolHoldOpenedRef.current = true;
                    openSymbolMenu(x, y, items);
                }, 400);
            };

            const cancelSymbolHold = () => {
                // if hold hasn't fired yet, reset flag
                if (!symbolMenu.visible) symbolHoldOpenedRef.current = false;
                if (symbolHoldTimerRef.current) {
                    clearTimeout(symbolHoldTimerRef.current);
                    symbolHoldTimerRef.current = null;
                }
            };

            const getLengthStrForDuration = () => getLengthStrFor(duration, isDotted);

            const insertRestDefault = () => {
                const len = getLengthStrForDuration();
                insertSmartText('z' + len);
            };

            const wrapSelectionWith = (left, right) => {
                const ta = textAreaRef.current;
                if (!ta) return;

                const start = ta.selectionStart ?? cursorPos;
                const end = ta.selectionEnd ?? cursorPos;

                if (start !== end) {
                    const newText = abcText.slice(0, start) + left + abcText.slice(start, end) + right + abcText.slice(end);
                    const newPos = end + left.length + right.length;
                    applyTextChange(newText, newPos, { focus: false, skipHistory: false });
                    return;
                }

                // no selection -> just insert left
                insertSmartText(left);
            };

            const insertPairedToken = (left, right) => {
                const ta = textAreaRef.current;
                if (!ta) {
                    insertSmartText(left + right);
                    return;
                }

                const start = ta.selectionStart ?? cursorPos;
                const end = ta.selectionEnd ?? cursorPos;

                if (start !== end) {
                    wrapSelectionWith(left, right);
                    return;
                }

                const newText = abcText.slice(0, start) + left + right + abcText.slice(end);
                const newPos = start + left.length;
                applyTextChange(newText, newPos, { focus: true, skipHistory: false });
            };

            const insertLyricsLine = () => {
                const ta = textAreaRef.current;
                const pos = ta ? (ta.selectionStart ?? cursorPos) : cursorPos;
                const src = abcTextRef.current || '';
                const needsNewLine = pos > 0 && src[pos - 1] !== '\n';
                insertSmartText((needsNewLine ? '\n' : '') + 'w: ');
            };

            const runRepeatInsert = (token) => {
                setRepeatQuickToken(token);
                insertSmartText(token);
                closeSymbolMenu();
            };

            const runDecoInsert = (token) => {
                setDecoQuickToken(token);
                insertSmartText(token);
                closeSymbolMenu();
            };

            const barlineMenuItems = [
                { label: '||', title: 'Double barline', onClick: () => { insertSmartText('||'); closeSymbolMenu(); } },
                { label: '|]', title: 'Final barline', onClick: () => { insertSmartText('|]'); closeSymbolMenu(); } },
                { label: '[|', title: 'Left bracket barline', onClick: () => { insertSmartText('[|'); closeSymbolMenu(); } },
            ];

            const repeatMenuItems = [
                { label: '|:', title: 'Repeat start', onClick: () => runRepeatInsert('|:') },
                { label: ':|', title: 'Repeat end', onClick: () => runRepeatInsert(':|') },
                { label: '[1', title: 'First ending', onClick: () => runRepeatInsert('[1') },
                { label: '[2', title: 'Second ending', onClick: () => runRepeatInsert('[2') },
            ];

            const restMenuItems = [
                { label: 'z', title: 'Quarter rest', onClick: () => { insertSmartText('z'); closeSymbolMenu(); } },
                { label: 'z2', title: 'Half rest', onClick: () => { insertSmartText('z2'); closeSymbolMenu(); } },
                { label: 'z/2', title: 'Eighth rest', onClick: () => { insertSmartText('z/2'); closeSymbolMenu(); } },
                { label: 'z/4', title: 'Sixteenth rest', onClick: () => { insertSmartText('z/4'); closeSymbolMenu(); } },
            ];

            const slurMenuItems = [
                { label: '(', title: 'Open slur', onClick: () => { insertSmartText('('); closeSymbolMenu(); } },
                { label: ')', title: 'Close slur', onClick: () => { insertSmartText(')'); closeSymbolMenu(); } },
                { label: '(...)', title: 'Wrap current selection', onClick: () => { wrapSelectionWith('(', ')'); closeSymbolMenu(); } },
            ];

            const rhythmMenuItems = [
                { label: '>', title: 'Broken rhythm to the right', onClick: () => { insertSmartText('>'); closeSymbolMenu(); } },
                { label: '<', title: 'Broken rhythm to the left', onClick: () => { insertSmartText('<'); closeSymbolMenu(); } },
            ];

            const moreMenuItems = [
                { label: '{ }', title: 'Grace notes', onClick: () => { insertPairedToken('{', '}'); closeSymbolMenu(); } },
                { label: 'w:', title: 'Lyrics line', onClick: () => { insertLyricsLine(); closeSymbolMenu(); } },
            ];

            const tupletMenuItems = TUPLET_MENU_DEFS.map((def) => (
                def.header
                    ? { ...def }
                    : {
                        ...def,
                        label: def.token,
                        onClick: () => {
                            insertSmartText(def.token);
                            closeSymbolMenu();
                        }
                    }
            ));

            const decoQuickTokens = ['!accent!', '!fermata!', '!tenuto!', '!trill!', '!p!', '!mf!', '!f!', '!crescendo(!', '!diminuendo(!'];
            const quickDecorationMenuItems = [
                { header: 'Quick' },
                ...decoQuickTokens
                    .map((token) => DECORATION_MENU_DEFS.find((def) => def.token === token))
                    .filter(Boolean)
                    .map((def) => ({
                        ...def,
                        label: def.token,
                        onClick: () => runDecoInsert(def.token),
                    })),
                { header: 'All Decorations' },
                ...DECORATION_MENU_DEFS.map((def) => (
                    def.header
                        ? { ...def }
                        : {
                            ...def,
                            label: def.token,
                            onClick: () => runDecoInsert(def.token),
                        }
                )),
            ];



            // --- Duration apply to current selection (best-effort) ---
            // Rule: if user is selecting music tokens in ABC textarea, hotkey can "apply" duration to selection.
            // Safe guards: skip header lines (X/T/C/M/L/Q/K and V: declarations), protect chord symbols in quotes ("Am").
            const tryApplyDurationToSelection = (durVal, dottedVal) => {
                const ta = textAreaRef.current;
                if (!ta) return false;

                const start = ta.selectionStart ?? cursorPosRef.current;
                const end = ta.selectionEnd ?? cursorPosRef.current;
                if (start === end) return false;

                const src = abcTextRef.current || '';
                const sel = src.slice(start, end);
                const lengthStr = getLengthStrFor(durVal, dottedVal);

                const isHeaderLine = (line) => {
                    const t = (line || '').trimStart();
                    if (/^(X|T|C|M|L|Q|K):/.test(t)) return true;
                    if (/^V:\d+/.test(t)) return true; // V:1 clef=...
                    return false;
                };

                const replaceCore = (s) => {
                    // rests: z, z2, z/2...
                    let out = s.replace(/(^|[^A-Za-z])z(\d+\/\d+|\d+|\/\d+|\/)?/g, (m, pre) => `${pre}z${lengthStr}`);
                    // notes: ^C,,  D'  e/2 ...
                    out = out.replace(/(\^{1,2}|_{1,2}|=)?([A-Ga-g])([,']*)(\d+\/\d+|\d+|\/\d+|\/)?/g,
                        (m, acc, note, oct) => `${acc || ''}${note}${oct || ''}${lengthStr}`
                    );
                    return out;
                };

                const replacePlain = (seg) => {
                    // protect chord symbols in quotes: "Am"
                    let out = '';
                    let i = 0;
                    while (i < seg.length) {
                        const q1 = seg.indexOf('"', i);
                        if (q1 === -1) { out += replaceCore(seg.slice(i)); break; }
                        const q2 = seg.indexOf('"', q1 + 1);
                        if (q2 === -1) { out += replaceCore(seg.slice(i)); break; }
                        out += replaceCore(seg.slice(i, q1));
                        out += seg.slice(q1, q2 + 1);
                        i = q2 + 1;
                    }
                    return out;
                };

                const applyLine = (line) => {
                    if (!line) return line;
                    if (isHeaderLine(line)) return line;

                    let out = '';
                    let i = 0;

                    // scan chords [CEG]2 as atomic unit: keep inside, replace length after ]
                    while (i < line.length) {
                        const open = line.indexOf('[', i);
                        if (open === -1) { out += replacePlain(line.slice(i)); break; }
                        const close = line.indexOf(']', open + 1);
                        if (close === -1) { out += replacePlain(line.slice(i)); break; }

                        out += replacePlain(line.slice(i, open));

                        const chordBody = line.slice(open, close + 1);
                        let j = close + 1;
                        const m = line.slice(j).match(/^(\d+\/\d+|\d+|\/\d+|\/)?/);
                        if (m) j += (m[1] || '').length;

                        out += chordBody + lengthStr;
                        i = j;
                    }

                    return out;
                };

                const lines = sel.split('\n');
                const nextSel = lines.map(applyLine).join('\n');

                if (nextSel === sel) return false;

                const newText = src.slice(0, start) + nextSel + src.slice(end);
                applyTextChange(newText, start + nextSel.length, { focus: true, skipHistory: false });

                // keep selection for convenience
                setTimeout(() => {
                    const t = textAreaRef.current;
                    if (!t) return;
                    try { t.setSelectionRange(start, start + nextSel.length); } catch (e) {}
                }, 0);

                return true;
            };

            useEffect(() => {
                if (!voiceMenu.visible) return;
                const onDown = () => closeVoiceMenu();
                const onKey = (e) => { if (e.key === 'Escape') closeVoiceMenu(); };
                document.addEventListener('mousedown', onDown);
                document.addEventListener('keydown', onKey);
                return () => {
                    document.removeEventListener('mousedown', onDown);
                    document.removeEventListener('keydown', onKey);
                };
            }, [voiceMenu.visible]);

            useEffect(() => {
                if (!symbolMenu.visible) return;
                const onDown = () => closeSymbolMenu();
                const onKey = (e) => { if (e.key === 'Escape') closeSymbolMenu(); };
                document.addEventListener('mousedown', onDown);
                document.addEventListener('keydown', onKey);
                return () => {
                    document.removeEventListener('mousedown', onDown);
                    document.removeEventListener('keydown', onKey);
                };
            }, [symbolMenu.visible]);

            useEffect(() => {
                if (!rangeMenu.visible) return;
                const onDown = (e) => {
                    const menu = rangeMenuRef.current;
                    if (menu && menu.contains(e.target)) return;
                    closeRangeMenu();
                };
                const onKey = (e) => { if (e.key === 'Escape') closeRangeMenu(); };
                document.addEventListener('mousedown', onDown);
                document.addEventListener('keydown', onKey);
                return () => {
                    document.removeEventListener('mousedown', onDown);
                    document.removeEventListener('keydown', onKey);
                };
            }, [closeRangeMenu, rangeMenu.visible]);

            useEffect(() => {
                const root = renderAreaRef.current;
                if (!root) return;

                const onClick = (e) => {
                    if (typeof e.button === 'number' && e.button !== 0) return;
                    const visual = visualObjRef.current;
                    if (!visual || typeof visual.findSelectableElement !== 'function') return;

                    const analysis = visual.findSelectableElement(e.target);
                    const charRange = getRawSheetCharRange(null, analysis);
                    if (!charRange) return;

                    e.preventDefault();
                    selectAbcRange(charRange.startChar, charRange.endChar);
                };

                const onContextMenu = (e) => {
                    const visual = visualObjRef.current;
                    if (!visual || typeof visual.findSelectableElement !== 'function') return;

                    const analysis = visual.findSelectableElement(e.target);
                    const target = buildSheetTarget(null, analysis);
                    if (!target) return;

                    e.preventDefault();
                    openRangeMenu(e.clientX, e.clientY, target);
                };

                root.addEventListener('click', onClick);
                root.addEventListener('contextmenu', onContextMenu);
                return () => {
                    root.removeEventListener('click', onClick);
                    root.removeEventListener('contextmenu', onContextMenu);
                };
            }, [buildSheetTarget, getRawSheetCharRange, openRangeMenu, selectAbcRange]);


            const openVoiceMenu = (e, voiceId) => {
                if (voiceId !== 2) return;
                e.preventDefault();
                setVoiceMenu({ visible: true, x: e.clientX, y: e.clientY, voiceId });
            };

            const extractVoicesFromText = (text) => {
                const lines = (text || '').split('\n');
                const found = [];
                for (const line of lines) {
                    const m = line.match(/^V:(\d+)(?:\s+.*)?(?:\s+clef=(treble|bass))?/);
                    if (m) {
                        const id = parseInt(m[1], 10);
                        const clef = (m[2] === 'bass' || m[2] === 'treble') ? m[2] : 'treble';
                        found.push({ id, clef });
                    }
                }

                // Nếu user xoá khai báo V: nhưng vẫn còn marker [V:2], vẫn coi là có bè 2
                if ((text || '').includes('[V:2]') && !found.some(v => v.id === 2)) {
                    found.push({ id: 2, clef: 'treble' });
                }

                if (found.length === 0) return [{ id: 1, clef: 'treble' }];
                const map = new Map();
                for (const v of found) {
                    if (!map.has(v.id)) map.set(v.id, v);
                }
                const arr = Array.from(map.values()).sort((a, b) => a.id - b.id).slice(0, 2);
                if (!arr.some(v => v.id === 1)) arr.unshift({ id: 1, clef: 'treble' });
                return arr.slice(0, 2);
            };

            const syncVoicesFromText = (text) => {
                const parsed = extractVoicesFromText(text);
                setVoices(parsed);
                if (!parsed.some(v => v.id === activeVoice)) {
                    setActiveVoice(parsed[0]?.id || 1);
                }
            };

            const deleteVoice = (voiceId) => {
                if (voiceId !== 2) return;
                closeVoiceMenu();

                const text = abcTextRef.current;
                let lines = text.split('\n');
                lines = lines.filter(l => !l.trim().startsWith(`V:${voiceId}`));
                let cleaned = lines.join('\n');

                const marker = `[V:${voiceId}]`;
                const idx = cleaned.indexOf(marker);
                if (idx !== -1) {
                    let start = idx;
                    if (start > 0 && cleaned[start - 1] === '\n') start -= 1;
                    const nextIdx = cleaned.indexOf('\n[V:', idx + marker.length);
                    const end = nextIdx !== -1 ? nextIdx : cleaned.length;
                    cleaned = cleaned.slice(0, start) + cleaned.slice(end);
                }

                const finalText = cleaned.trimEnd();
                setVoices(prev => prev.filter(v => v.id !== voiceId));
                if (activeVoice === voiceId) setActiveVoice(1);
                applyTextChange(finalText, Math.min(cursorPosRef.current, finalText.length), { focus: false });
            };

            const toggleVoiceClef = (voiceId) => {
                if (voiceId !== 2) return;
                closeVoiceMenu();

                const current = voices.find(v => v.id === voiceId);
                const nextClef = current?.clef === 'bass' ? 'treble' : 'bass';

                setVoices(prev => prev.map(v => v.id === voiceId ? ({ ...v, clef: nextClef }) : v));

                const lines = abcTextRef.current.split('\n');
                const idx = lines.findIndex(l => l.trim().startsWith(`V:${voiceId}`));
                if (idx !== -1) {
                    if (lines[idx].includes('clef=')) {
                        lines[idx] = lines[idx].replace(/clef=(treble|bass)/, `clef=${nextClef}`);
                    } else {
                        lines[idx] = lines[idx].trimEnd() + ` clef=${nextClef}`;
                    }
                }
                const updated = lines.join('\n');
                applyTextChange(updated, Math.min(cursorPosRef.current, updated.length), { focus: false });
            };

            // --- AUTO SAVE (localStorage) mỗi 1 phút ---
            useEffect(() => {
                const KEY = 'abc_quickwriter_autosave_v1';
                try {
                    const saved = localStorage.getItem(KEY);
                    if (saved && saved.trim().length > 0 && saved !== DEFAULT_ABC) {
                        applyTextChange(saved, saved.length, { skipHistory: true, focus: false });
                        setTimeout(() => { syncVoicesFromText(saved); }, 0);
                    }
                } catch (e) {}

                const timer = setInterval(() => {
                    try { localStorage.setItem(KEY, abcTextRef.current); } catch (e) {}
                }, 60000);

                return () => clearInterval(timer);
            }, []);


            // --- TẢI THƯ VIỆN ABCJS ĐỘNG ---
            useEffect(() => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/abcjs@6.6.2/dist/abcjs-basic-min.js';
                script.async = true;
                script.onload = () => {
                    setAbcjsLoaded(true);
                    // Render current ABC (autosave may have loaded a different text)
                    setTimeout(() => {
                        const cur = (abcTextRef.current && abcTextRef.current.trim().length > 0) ? abcTextRef.current : DEFAULT_ABC;
                        renderSheetMusic(cur);
                    }, 0);
                };
                document.body.appendChild(script);

                return () => {
                    document.body.removeChild(script);
                    try { if (synthControlRef.current) synthControlRef.current.pause(); } catch (e) {}
                    try { if (rangeSynthRef.current) rangeSynthRef.current.stop(); } catch (e) {}
                };
            }, []);

            // --- HÀM RENDER & AUDIO (LIVE PREVIEW) ---
            const clearPlaybackHighlights = useCallback(() => {
                const root = renderAreaRef.current || document;
                try {
                    root.querySelectorAll('.note-played').forEach(el => el.classList.remove('note-played'));
                    root.querySelectorAll('.note-current').forEach(el => el.classList.remove('note-current'));
                } catch (e) {}
                lastCurrentElsRef.current = [];
                lastAutoScrollElRef.current = null;
            }, []);

            const clearPlayedHighlights = useCallback(() => {
                const root = renderAreaRef.current || document;
                try {
                    root.querySelectorAll('.note-played').forEach(el => el.classList.remove('note-played'));
                } catch (e) {}
            }, []);

            const flatElements = (els) => {
                const out = [];
                const add = (x) => {
                    if (!x) return;
                    if (Array.isArray(x)) return x.forEach(add);
                    if (x.classList) out.push(x);
                };
                add(els);
                return out;
            };

            // --- Auto scroll during playback: keep current note visible in the preview ---
            const pendingAutoScrollRef = useRef(false);
            const lastAutoScrollElRef = useRef(null);

            const ensureNoteVisible = (el) => {
                const container = previewScrollRef.current;
                if (!container || !el || !el.getBoundingClientRect) return;

                const c = container.getBoundingClientRect();
                const r = el.getBoundingClientRect();

                const margin = 120; // px: keep some breathing room above/below

                if (r.top < c.top + margin) {
                    container.scrollTop -= (c.top + margin - r.top);
                } else if (r.bottom > c.bottom - margin) {
                    container.scrollTop += (r.bottom - (c.bottom - margin));
                }
            };

            const requestAutoScrollTo = (el) => {
                if (!el) return;
                if (lastAutoScrollElRef.current === el) return;
                lastAutoScrollElRef.current = el;

                if (pendingAutoScrollRef.current) return;
                pendingAutoScrollRef.current = true;

                requestAnimationFrame(() => {
                    pendingAutoScrollRef.current = false;
                    try { ensureNoteVisible(el); } catch (e) {}
                });
            };

            const removeCurrentPlaybackHighlight = () => {
                try {
                    lastCurrentElsRef.current.forEach(el => el.classList && el.classList.remove('note-current'));
                } catch (e) {}
                lastCurrentElsRef.current = [];
            };

            const handlePlaybackEvent = (ev) => {
                removeCurrentPlaybackHighlight();

                if (!ev || !ev.elements) return;

                const els = flatElements(ev.elements);
                lastCurrentElsRef.current = els;

                els.forEach(el => {
                    try {
                        el.classList.add('note-played');
                        el.classList.add('note-current');
                    } catch (e) {}
                });

                try { if (els && els.length) requestAutoScrollTo(els[0]); } catch (e) {}
            };


            const ensureSynthController = () => {
                if (!window.ABCJS || !window.ABCJS.synth || !window.ABCJS.synth.supportsAudio || !window.ABCJS.synth.supportsAudio()) return null;
                if (synthControlRef.current) return synthControlRef.current;

                // Hidden DOM node for abcjs control (we use our own buttons)
                const holderId = 'abcjs-audio-hidden';
                let holder = document.getElementById(holderId);
                if (!holder) {
                    holder = document.createElement('div');
                    holder.id = holderId;
                    holder.style.display = 'none';
                    document.body.appendChild(holder);
                }

                // CursorControl for synced highlighting
                const cursorControl = {
                    onStart: () => {
                        lastFullLoopBeatRef.current = -1;
                    },
                    onFinished: () => {
                        // Remove "current" highlight but keep "played"
                        removeCurrentPlaybackHighlight();
                        lastFullLoopBeatRef.current = -1;
                        try { synthControlRef.current && synthControlRef.current.restart(); } catch (e) {}
                        playbackModeRef.current = null;
                        setIsPlaying(false);
                    },
                    onBeat: (beatNumber) => {
                        if (playbackModeRef.current !== 'full') return;
                        if (
                            loopEnabledRef.current
                            && lastFullLoopBeatRef.current >= 0
                            && beatNumber < lastFullLoopBeatRef.current
                        ) {
                            clearPlayedHighlights();
                        }
                        lastFullLoopBeatRef.current = beatNumber;
                    },
                    onEvent: (ev) => {
                        handlePlaybackEvent(ev);
                    }
                };

                const sc = new window.ABCJS.synth.SynthController();
                sc.load('#' + holderId, cursorControl, {
                    displayLoop: false,
                    displayRestart: false,
                    displayPlay: false,
                    displayProgress: false,
                    displayWarp: false,
                });

                synthControlRef.current = sc;
                return sc;
            };


            // --- Click a note in the rendered sheet -> select corresponding ABC text ---
            const selectAbcRange = useCallback((startChar, endChar) => {
                const ta = textAreaRef.current;
                const src = abcTextRef.current || '';
                if (!ta || typeof startChar !== 'number' || typeof endChar !== 'number') return;

                const s = Math.max(0, Math.min(startChar, src.length));
                const e = Math.max(s, Math.min(endChar, src.length));
                const applySelection = () => {
                    const node = textAreaRef.current;
                    if (!node) return;
                    try { node.focus({ preventScroll: true }); } catch (focusErr) { try { node.focus(); } catch (focusErr2) {} }
                    try { node.setSelectionRange(s, e, 'forward'); } catch (selectionErr) {}
                };

                // Focus + select
                applySelection();

                // Keep internal cursor position in sync with the visual selection
                try { cursorPosRef.current = s; } catch (e4) {}
                try { setCursorPos(s); } catch (e5) {}

                // Scroll textarea so selection is visible (best-effort)
                try {
                    const before = src.slice(0, s);
                    const line = before.split('\n').length - 1;
                    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 18;
                    const targetTop = Math.max(0, (line - 3) * lh);
                    if (Math.abs((ta.scrollTop || 0) - targetTop) > lh * 2) ta.scrollTop = targetTop;
                } catch (e3) {}

                requestAnimationFrame(() => {
                    const node = textAreaRef.current;
                    if (!node) return;
                    if (node.selectionStart !== s || node.selectionEnd !== e) applySelection();
                });
            }, []);

            const commitRangeSelection = useCallback((next) => {
                rangeSelectionRef.current = next;
                setRangeSelection(next);
            }, []);

            const closeRangeMenu = useCallback(() => {
                setRangeMenu(menu => ({ ...menu, visible: false, target: null }));
            }, []);

            const openRangeMenu = useCallback((x, y, target) => {
                if (!target) return;
                setRangeMenu({ visible: true, x, y, target });
            }, []);

            const getTimingEvents = () => {
                const timings = noteTimingsRef.current || [];
                return timings.filter(ev => ev && ev.type === 'event');
            };

            const getTimingEventForChars = (startChar, endChar) => {
                const timings = getTimingEvents();
                for (let i = 0; i < timings.length; i++) {
                    const ev = timings[i];
                    if (!Array.isArray(ev.startCharArray) || !Array.isArray(ev.endCharArray)) continue;
                    for (let j = 0; j < ev.startCharArray.length; j++) {
                        if (ev.startCharArray[j] === startChar && ev.endCharArray[j] === endChar) {
                            return ev;
                        }
                    }
                }
                return null;
            };

            const getMillisecondsPerWholeNote = () => {
                const visual = visualObjRef.current;
                if (!visual || typeof visual.millisecondsPerMeasure !== 'function') return 0;
                const meter = (typeof visual.getMeterFraction === 'function' && visual.getMeterFraction()) || { num: 4, den: 4 };
                const meterSize = (meter && meter.den) ? (meter.num / meter.den) : 1;
                if (!meterSize) return 0;
                return visual.millisecondsPerMeasure() / meterSize;
            };

            const buildTimelineTarget = useCallback((startChar, endChar) => {
                if (typeof startChar !== 'number' || typeof endChar !== 'number' || endChar <= startChar) return null;

                const msPerWhole = getMillisecondsPerWholeNote();
                const sequence = sequenceRef.current;
                const candidates = [];

                if (sequence && Array.isArray(sequence.tracks) && msPerWhole > 0) {
                    sequence.tracks.forEach(track => {
                        if (!Array.isArray(track)) return;
                        track.forEach(ev => {
                            if (!ev || ev.cmd !== 'note') return;
                            if (ev.startChar !== startChar || ev.endChar !== endChar) return;

                            const startWhole = typeof ev.start === 'number' ? ev.start : 0;
                            const durationWhole = typeof ev.duration === 'number' ? ev.duration : 0;
                            if (durationWhole <= 0) return;

                            candidates.push({
                                startChar,
                                endChar,
                                startWhole,
                                endWhole: startWhole + durationWhole,
                                startMs: startWhole * msPerWhole,
                                endMs: (startWhole + durationWhole) * msPerWhole,
                            });
                        });
                    });
                }

                candidates.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

                const timingEvent = getTimingEventForChars(startChar, endChar);
                if (candidates.length > 0) {
                    const chosen = candidates[0];
                    return {
                        ...chosen,
                        startMs: timingEvent ? timingEvent.milliseconds : chosen.startMs,
                    };
                }

                if (timingEvent) {
                    const timings = getTimingEvents();
                    const eventIndex = timings.findIndex(ev => ev === timingEvent);
                    const nextTiming = eventIndex >= 0 ? timings[eventIndex + 1] : null;
                    const fallbackEndMs = nextTiming ? nextTiming.milliseconds : timingEvent.milliseconds;
                    const startWhole = msPerWhole > 0 ? timingEvent.milliseconds / msPerWhole : 0;
                    const endWhole = msPerWhole > 0 ? fallbackEndMs / msPerWhole : startWhole;
                    return {
                        startChar,
                        endChar,
                        startWhole,
                        endWhole: Math.max(endWhole, startWhole),
                        startMs: timingEvent.milliseconds,
                        endMs: Math.max(fallbackEndMs, timingEvent.milliseconds),
                    };
                }

                return null;
            }, []);

            const getRawSheetCharRange = useCallback((abcElem, analysis) => {
                const s =
                    (abcElem && typeof abcElem.startChar === 'number') ? abcElem.startChar :
                    (abcElem && abcElem.abcelem && typeof abcElem.abcelem.startChar === 'number') ? abcElem.abcelem.startChar :
                    (analysis && typeof analysis.startChar === 'number') ? analysis.startChar :
                    (analysis && analysis.abcelem && typeof analysis.abcelem.startChar === 'number') ? analysis.abcelem.startChar :
                    (analysis && analysis.element && analysis.element.absEl && analysis.element.absEl.abcelem && typeof analysis.element.absEl.abcelem.startChar === 'number') ? analysis.element.absEl.abcelem.startChar :
                    null;

                const e =
                    (abcElem && typeof abcElem.endChar === 'number') ? abcElem.endChar :
                    (abcElem && abcElem.abcelem && typeof abcElem.abcelem.endChar === 'number') ? abcElem.abcelem.endChar :
                    (analysis && typeof analysis.endChar === 'number') ? analysis.endChar :
                    (analysis && analysis.abcelem && typeof analysis.abcelem.endChar === 'number') ? analysis.abcelem.endChar :
                    (analysis && analysis.element && analysis.element.absEl && analysis.element.absEl.abcelem && typeof analysis.element.absEl.abcelem.endChar === 'number') ? analysis.element.absEl.abcelem.endChar :
                    null;

                if (typeof s !== 'number' || typeof e !== 'number' || e <= s) return null;
                return { startChar: s, endChar: e };
            }, []);

            const getSheetCharRange = useCallback((abcElem, analysis) => {
                const elType = (abcElem && (abcElem.el_type || (abcElem.abcelem && abcElem.abcelem.el_type)))
                    || (analysis && analysis.element && analysis.element.absEl && analysis.element.absEl.abcelem && analysis.element.absEl.abcelem.el_type)
                    || null;
                if (elType && elType !== 'note' && elType !== 'rest') return null;
                return getRawSheetCharRange(abcElem, analysis);
            }, [getRawSheetCharRange]);

            const buildSheetTarget = useCallback((abcElem, analysis) => {
                const charRange = getSheetCharRange(abcElem, analysis);
                if (!charRange) return null;

                const { startChar, endChar } = charRange;
                return buildTimelineTarget(startChar, endChar);
            }, [buildTimelineTarget, getSheetCharRange]);

            const clearRangeHighlights = useCallback(() => {
                const root = renderAreaRef.current || document;
                try {
                    root.querySelectorAll('.note-range').forEach(el => el.classList.remove('note-range'));
                    root.querySelectorAll('.note-range-start').forEach(el => el.classList.remove('note-range-start'));
                    root.querySelectorAll('.note-range-start-peer').forEach(el => el.classList.remove('note-range-start-peer'));
                    root.querySelectorAll('.note-range-end').forEach(el => el.classList.remove('note-range-end'));
                    root.querySelectorAll('.note-range-end-peer').forEach(el => el.classList.remove('note-range-end-peer'));
                } catch (e) {}
            }, []);

            const applyRangeHighlights = useCallback((selection) => {
                clearRangeHighlights();

                if (!selection) return;

                const timings = getTimingEvents();
                if (!timings.length) return;

                const markBoundary = (ev, anchor, primaryClass, peerClass) => {
                    if (!ev || !anchor || !Array.isArray(ev.elements)) return;
                    ev.elements.forEach((group, idx) => {
                        const sameAnchor = Array.isArray(ev.startCharArray) && Array.isArray(ev.endCharArray)
                            && ev.startCharArray[idx] === anchor.startChar
                            && ev.endCharArray[idx] === anchor.endChar;
                        flatElements(group).forEach(el => {
                            try { el.classList.add(sameAnchor ? primaryClass : peerClass); } catch (e) {}
                        });
                    });
                };

                if (selection.type === 'active') {
                    timings.forEach(ev => {
                        if (ev.milliseconds < selection.start.startMs) return;
                        if (ev.milliseconds > selection.end.startMs) return;
                        flatElements(ev.elements).forEach(el => {
                            try { el.classList.add('note-range'); } catch (e) {}
                        });
                    });
                }

                const startEvent = getTimingEventForChars(selection.start.startChar, selection.start.endChar)
                    || timings.find(ev => ev.milliseconds === selection.start.startMs);
                markBoundary(startEvent, selection.start, 'note-range-start', 'note-range-start-peer');

                if (selection.type === 'active') {
                    const endEvent = getTimingEventForChars(selection.end.startChar, selection.end.endChar)
                        || timings.find(ev => ev.milliseconds === selection.end.startMs);
                    markBoundary(endEvent, selection.end, 'note-range-end', 'note-range-end-peer');
                }
            }, [clearRangeHighlights]);

            const normalizeRangeSelection = useCallback((first, second) => {
                let start = first;
                let end = second;

                if (!start || !end) return null;

                if (end.startMs < start.startMs || (end.startMs === start.startMs && end.endMs < start.endMs)) {
                    start = second;
                    end = first;
                }

                return { type: 'active', start, end };
            }, []);

            const handleRangePick = useCallback((target) => {
                if (!target) return;
                closeRangeMenu();
                if (playbackModeRef.current) {
                    try { stopAudioRef.current && stopAudioRef.current(); } catch (e) {}
                }

                const current = rangeSelectionRef.current;
                if (!current) {
                    commitRangeSelection({ type: 'anchor', start: target });
                    showToast('Đã chọn điểm bắt đầu');
                    return;
                }

                if (current.type === 'anchor') {
                    const next = normalizeRangeSelection(current.start, target);
                    if (!next) return;
                    commitRangeSelection(next);
                    showToast('Range đang hoạt động');
                    return;
                }

                showToast('Bấm Range để clear vùng chọn trước.');
            }, [closeRangeMenu, commitRangeSelection, normalizeRangeSelection, showToast]);

            const sheetClickListener = useCallback((abcElem, tuneNumber, classes, analysis, drag, mouseEvent) => {
                try {
                    if (drag) return;

                    const charRange = getRawSheetCharRange(abcElem, analysis);
                    if (!charRange) return;
                    selectAbcRange(charRange.startChar, charRange.endChar);
                } catch (e) {}
            }, [getRawSheetCharRange, selectAbcRange]);


            // --- Background helpers ---
            const currentBg = bgPages && bgPages.length ? (bgPages[bgPageIndex] || bgPages[0]) : null;

            const updateCurrentBg = useCallback((patch) => {
                setBgPages(prev => {
                    if (!prev || !prev.length) return prev;
                    const idx = Math.max(0, Math.min(bgPageIndex, prev.length - 1));
                    return prev.map((p, i) => i === idx ? ({ ...p, ...patch }) : p);
                });
            }, [bgPageIndex]);

            const clearBackground = useCallback(() => {
                setBgPages([]);
                setBgPageIndex(0);
                setBgLocked(true);
            }, []);

            const resetBackground = useCallback(() => {
                if (!currentBg) return;
                updateCurrentBg({ x: 0, y: 0, scale: 1 });
            }, [currentBg, updateCurrentBg]);

            // Background move handlers (only active when unlocked)
            const bgDragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0, pid: null });

            const onBgPointerDown = useCallback((e) => {
                if (bgLocked || !currentBg) return;
                try {
                    e.preventDefault();
                    e.stopPropagation();
                } catch (err) {}
                bgDragRef.current.active = true;
                bgDragRef.current.startX = e.clientX;
                bgDragRef.current.startY = e.clientY;
                bgDragRef.current.origX = currentBg.x || 0;
                bgDragRef.current.origY = currentBg.y || 0;
                bgDragRef.current.pid = e.pointerId;
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
            }, [bgLocked, currentBg]);

            const onBgPointerMove = useCallback((e) => {
                if (bgLocked || !currentBg) return;
                if (!bgDragRef.current.active) return;
                const dx = e.clientX - bgDragRef.current.startX;
                const dy = e.clientY - bgDragRef.current.startY;
                updateCurrentBg({ x: bgDragRef.current.origX + dx, y: bgDragRef.current.origY + dy });
            }, [bgLocked, currentBg, updateCurrentBg]);

            const onBgPointerUp = useCallback((e) => {
                if (!bgDragRef.current.active) return;
                bgDragRef.current.active = false;
                try { if (e && e.currentTarget && bgDragRef.current.pid != null) e.currentTarget.releasePointerCapture(bgDragRef.current.pid); } catch (err) {}
                bgDragRef.current.pid = null;
            }, []);

            const onBgWheel = useCallback((e) => {
                if (bgLocked || !currentBg) return;
                // zoom background with wheel while unlocked
                try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
                const dir = e.deltaY > 0 ? -1 : 1;
                const factor = dir > 0 ? 1.08 : 0.92;
                let next = (currentBg.scale || 1) * factor;
                next = Math.max(0.2, Math.min(4, next));
                updateCurrentBg({ scale: next });
            }, [bgLocked, currentBg, updateCurrentBg]);

            const toggleBgLock = useCallback(() => {
                if (!currentBg) return;
                setBgLocked(v => !v);
            }, [currentBg]);

            // --- Import handlers ---
            const handleImportClick = useCallback(() => {
                try {
                    if (fileInputRef.current) fileInputRef.current.click();
                } catch (e) {}
            }, []);

            const ensurePdfWorker = useCallback(() => {
                try {
                    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                        // Match the version above (cdnjs)
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js';
                    }
                } catch (e) {}
            }, []);

            const keyFromFifths = (fifths, mode) => {
                const maj = { "-7":"Cb","-6":"Gb","-5":"Db","-4":"Ab","-3":"Eb","-2":"Bb","-1":"F","0":"C","1":"G","2":"D","3":"A","4":"E","5":"B","6":"F#","7":"C#" };
                const min = { "-7":"Abm","-6":"Ebm","-5":"Bbm","-4":"Fm","-3":"Cm","-2":"Gm","-1":"Dm","0":"Am","1":"Em","2":"Bm","3":"F#m","4":"C#m","5":"G#m","6":"D#m","7":"A#m" };
                const map = (mode === 'minor') ? min : maj;
                return map[String(fifths)] || (mode === 'minor' ? 'Am' : 'C');
            };

            const pitchToAbc = (step, alter, octave) => {
                if (!step) return '';
                const acc = (alter === 2) ? '^^' : (alter === 1) ? '^' : (alter === -1) ? '_' : (alter === -2) ? '__' : '';
                const st = String(step).toUpperCase();
                const oct = (typeof octave === 'number') ? octave : 4;
                let note = st;

                if (oct >= 5) {
                    note = st.toLowerCase();
                    note += "'".repeat(Math.max(0, oct - 5));
                } else if (oct === 4) {
                    note = st;
                } else {
                    note = st + ",".repeat(Math.max(0, 4 - oct));
                }
                return acc + note;
            };

            const gcd2 = (a, b) => {
                a = Math.abs(a|0); b = Math.abs(b|0);
                while (b) { const t = a % b; a = b; b = t; }
                return a || 1;
            };

            const parseMusicXMLToABC = (xmlText) => {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(xmlText, 'application/xml');
                    const root = doc.documentElement;
                    if (!root) throw new Error('Invalid XML');

                    const titleNode = doc.querySelector('work > work-title') || doc.querySelector('movement-title');
                    const composerNode = doc.querySelector('identification creator[type="composer"]');
                    const tTitle = titleNode ? (titleNode.textContent || '').trim() : 'Imported';
                    const tComposer = composerNode ? (composerNode.textContent || '').trim() : '';

                    const part = doc.querySelector('part');
                    if (!part) throw new Error('No <part> found');

                    const firstMeasure = part.querySelector('measure');
                    const divisionsNode = firstMeasure ? firstMeasure.querySelector('attributes > divisions') : null;
                    const divisions = divisionsNode ? parseInt(divisionsNode.textContent || '0', 10) : 0;

                    const timeNode = firstMeasure ? firstMeasure.querySelector('attributes > time') : null;
                    const beats = timeNode ? parseInt((timeNode.querySelector('beats')?.textContent || '4'), 10) : 4;
                    const beatType = timeNode ? parseInt((timeNode.querySelector('beat-type')?.textContent || '4'), 10) : 4;

                    const keyNode = firstMeasure ? firstMeasure.querySelector('attributes > key') : null;
                    const fifths = keyNode ? parseInt((keyNode.querySelector('fifths')?.textContent || '0'), 10) : 0;
                    const modeTxt = (keyNode?.querySelector('mode')?.textContent || '').trim().toLowerCase();
                    const mode = modeTxt === 'minor' ? 'minor' : 'major';
                    const keyStr = keyFromFifths(fifths, mode);

                    // Tempo (best-effort)
                    let bpm = 120;
                    const tempoAttr = doc.querySelector('direction sound[tempo]');
                    if (tempoAttr) {
                        const v = parseFloat(tempoAttr.getAttribute('tempo') || '');
                        if (Number.isFinite(v) && v > 10 && v < 400) bpm = Math.round(v);
                    }

                    // Gather durations to choose L:
                    const durVals = [];
                    part.querySelectorAll('note duration').forEach(n => {
                        const v = parseInt(n.textContent || '0', 10);
                        if (v > 0) durVals.push(v);
                    });
                    let base = (durVals.length ? durVals.reduce((g, v) => gcd2(g, v), durVals[0]) : (divisions ? Math.max(1, Math.floor(divisions/4)) : 1));
                    if (!base || base <= 0) base = 1;
                    const div = divisions || 1;
                    // L is fraction of whole note: baseQuarter = base/div, whole = baseQuarter/4 => denom = 4*div/base
                    let denom = Math.round((4 * div) / base);
                    const nice = [1,2,4,8,16,32,64];
                    denom = nice.reduce((best, n) => (Math.abs(n - denom) < Math.abs(best - denom) ? n : best), nice[3]);
                    if (denom < 1) denom = 8;

                    // Convert measures
                    const measures = Array.from(part.querySelectorAll('measure'));
                    const bodyParts = [];
                    for (const meas of measures) {
                        const notes = Array.from(meas.querySelectorAll('note'));
                        let i = 0;
                        const tokens = [];
                        while (i < notes.length) {
                            const n = notes[i];
                            const isChord = !!n.querySelector('chord');
                            if (isChord) { i++; continue; } // should be consumed by previous
                            // group chord notes
                            const group = [n];
                            let j = i + 1;
                            while (j < notes.length && notes[j].querySelector('chord')) { group.push(notes[j]); j++; }

                            const durNode = n.querySelector('duration');
                            const dur = durNode ? parseInt(durNode.textContent || '0', 10) : 0;
                            const unitsRaw = dur > 0 ? (dur / base) : 1;
                            const units = Number.isFinite(unitsRaw) ? unitsRaw : 1;
                            const lenStr = (Math.abs(units - 1) < 1e-6) ? '' :
                                (Number.isInteger(units) ? String(units) : (String(units).includes('.') ? String(units).replace(/\.0+$/,'') : String(units)));

                            const isRest = !!n.querySelector('rest');
                            if (isRest) {
                                tokens.push('z' + lenStr);
                            } else if (group.length > 1) {
                                const pitches = group.map(nn => {
                                    const p = nn.querySelector('pitch');
                                    const step = p?.querySelector('step')?.textContent || '';
                                    const alter = parseInt(p?.querySelector('alter')?.textContent || '0', 10) || 0;
                                    const octave = parseInt(p?.querySelector('octave')?.textContent || '4', 10) || 4;
                                    return pitchToAbc(step, alter, octave);
                                }).join('');
                                tokens.push('[' + pitches + ']' + lenStr);
                            } else {
                                const p = n.querySelector('pitch');
                                const step = p?.querySelector('step')?.textContent || '';
                                const alter = parseInt(p?.querySelector('alter')?.textContent || '0', 10) || 0;
                                const octave = parseInt(p?.querySelector('octave')?.textContent || '4', 10) || 4;
                                tokens.push(pitchToAbc(step, alter, octave) + lenStr);
                            }

                            i = j;
                        }
                        bodyParts.push(tokens.join(' ') + ' |');
                    }

                    const header = [
                        'X: 1',
                        `T: ${tTitle || 'Imported'}`,
                        tComposer ? `C: ${tComposer}` : 'C: ',
                        `M: ${beats}/${beatType}`,
                        `L: 1/${denom}`,
                        `Q: 1/4=${bpm}`,
                        `K: ${keyStr}`,
                        'V:1 clef=treble',
                        '[V:1] ' + bodyParts.join('\n')
                    ].join('\n');

                    return header;
                } catch (err) {
                    throw err;
                }
            };

            // Minimal MIDI -> ABC (best-effort, monophonic/chords only)
            const midiNoteToAbc = (midi, preferFlats) => {
                const n = midi | 0;
                const namesSharp = ['C','^C','D','^D','E','F','^F','G','^G','A','^A','B'];
                const namesFlat  = ['C','_D','D','_E','E','F','_G','G','_A','A','_B','B'];
                const pc = ((n % 12) + 12) % 12;
                const oct = Math.floor(n / 12) - 1; // MIDI standard
                let base = preferFlats ? namesFlat[pc] : namesSharp[pc]; // includes accidental prefix
                // base is like '^C' or '_D' or 'E'
                let acc = '';
                let step = base;
                if (base.startsWith('^^') || base.startsWith('__')) { acc = base.slice(0,2); step = base.slice(2); }
                else if (base.startsWith('^') || base.startsWith('_') || base.startsWith('=')) { acc = base.slice(0,1); step = base.slice(1); }

                const abc = pitchToAbc(step, 0, oct >= 0 ? oct : 4).replace(/^[\^_]+=*/, step => step); // placeholder
                // pitchToAbc expects alter separately; we already have acc as prefix.
                // We'll reuse mapping logic here:
                const st = step.toUpperCase();
                let letter = st;
                if (oct >= 5) {
                    letter = st.toLowerCase() + "'".repeat(Math.max(0, oct - 5));
                } else if (oct === 4) {
                    letter = st;
                } else {
                    letter = st + ",".repeat(Math.max(0, 4 - oct));
                }
                return acc + letter;
            };

            const parseMidiToABC = (arrayBuffer) => {
                const data = new DataView(arrayBuffer);
                let p = 0;
                const readStr = (n) => { let s=''; for (let i=0;i<n;i++) s += String.fromCharCode(data.getUint8(p++)); return s; };
                const readU32 = () => { const v = data.getUint32(p); p += 4; return v; };
                const readU16 = () => { const v = data.getUint16(p); p += 2; return v; };
                const readVar = () => {
                    let v = 0;
                    while (true) {
                        const b = data.getUint8(p++);
                        v = (v << 7) | (b & 0x7F);
                        if ((b & 0x80) === 0) break;
                    }
                    return v;
                };

                const magic = readStr(4);
                if (magic !== 'MThd') throw new Error('Not a MIDI file');
                const hlen = readU32();
                const fmt = readU16();
                const ntr = readU16();
                const div = readU16();
                p += Math.max(0, hlen - 6);

                let tempoUS = 500000; // 120 bpm
                let tsNum = 4, tsDen = 4;
                let keyFifths = 0, keyMode = 0; // 0 major, 1 minor
                const notes = [];

                const openNotes = new Map(); // key: track|chan|pitch -> startTick
                const preferFlats = () => keyFifths < 0;

                for (let t=0; t<ntr; t++) {
                    const trk = readStr(4);
                    if (trk !== 'MTrk') throw new Error('Bad track chunk');
                    const tlen = readU32();
                    const end = p + tlen;

                    let tick = 0;
                    let running = null;

                    while (p < end) {
                        tick += readVar();
                        let status = data.getUint8(p++);
                        if (status < 0x80) {
                            // running status
                            p--;
                            status = running;
                        } else {
                            running = status;
                        }

                        if (status === 0xFF) {
                            const type = data.getUint8(p++);
                            const len = readVar();
                            if (type === 0x51 && len === 3) {
                                tempoUS = (data.getUint8(p)<<16) | (data.getUint8(p+1)<<8) | data.getUint8(p+2);
                            } else if (type === 0x58 && len >= 2) {
                                tsNum = data.getUint8(p);
                                const pow = data.getUint8(p+1);
                                tsDen = Math.pow(2, pow);
                            } else if (type === 0x59 && len >= 2) {
                                const sf = data.getInt8(p);
                                const mi = data.getUint8(p+1);
                                keyFifths = sf;
                                keyMode = mi;
                            }
                            p += len;
                        } else if (status === 0xF0 || status === 0xF7) {
                            const len = readVar();
                            p += len;
                        } else {
                            const type = status & 0xF0;
                            const ch = status & 0x0F;
                            const d1 = data.getUint8(p++);
                            const d2 = (type === 0xC0 || type === 0xD0) ? null : data.getUint8(p++);
                            if (ch === 9) { continue; } // skip percussion channel
                            if (type === 0x90 && d2 !== null && d2 > 0) {
                                openNotes.set(`${t}|${ch}|${d1}`, tick);
                            } else if (type === 0x80 || (type === 0x90 && (d2 === null || d2 === 0))) {
                                const k = `${t}|${ch}|${d1}`;
                                const st = openNotes.get(k);
                                if (typeof st === 'number') {
                                    openNotes.delete(k);
                                    notes.push({ start: st, end: tick, midi: d1 });
                                }
                            }
                        }
                    }
                    p = end;
                }

                notes.sort((a,b) => a.start - b.start || a.midi - b.midi);

                const bpm = Math.round(60000000 / tempoUS);
                const keyStr = keyFromFifths(keyFifths, keyMode === 1 ? 'minor' : 'major');

                const baseTick = Math.max(1, Math.round(div / 4)); // 1/16
                const ticksPerBeat = div;
                const ticksPerBar = Math.round(ticksPerBeat * tsNum * (4 / tsDen));

                let out = [];
                let cur = 0;
                let barPos = 0;

                const emitLen = (ticks) => {
                    const u = Math.max(1, Math.round(ticks / baseTick));
                    return u === 1 ? '' : String(u);
                };

                let i = 0;
                while (i < notes.length) {
                    const start = notes[i].start;
                    if (start > cur) {
                        const restTicks = start - cur;
                        const lenStr = emitLen(restTicks);
                        out.push('z' + lenStr);
                        cur = start;
                        barPos = (barPos + restTicks) % ticksPerBar;
                    }

                    // group simultaneous
                    const group = [];
                    let j = i;
                    while (j < notes.length && notes[j].start === start) { group.push(notes[j]); j++; }
                    const end = Math.min(...group.map(n => n.end));
                    const durTicks = Math.max(baseTick, end - start);

                    const lenStr = emitLen(durTicks);
                    if (group.length > 1) {
                        const chord = group.map(n => midiNoteToAbc(n.midi, preferFlats())).join('');
                        out.push('[' + chord + ']' + lenStr);
                    } else {
                        out.push(midiNoteToAbc(group[0].midi, preferFlats()) + lenStr);
                    }

                    cur += durTicks;
                    barPos = (barPos + durTicks) % ticksPerBar;
                    if (barPos === 0) out.push('|');

                    i = j;
                }

                const header = [
                    'X: 1',
                    'T: Imported MIDI',
                    'C: ',
                    `M: ${tsNum}/${tsDen}`,
                    'L: 1/16',
                    `Q: 1/4=${bpm}`,
                    `K: ${keyStr}`,
                    'V:1 clef=treble',
                    '[V:1] ' + out.join(' ')
                ].join('\n');

                return header;
            };

            const importFromFile = useCallback(async (file) => {
                if (!file) return;
                const name = (file.name || '').toLowerCase();
                const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
                const isImg = (file.type || '').startsWith('image/');
                const isMxl = name.endsWith('.mxl');
                const isXml = name.endsWith('.xml') || name.endsWith('.musicxml') || (file.type || '').includes('xml');
                const isMidi = name.endsWith('.mid') || name.endsWith('.midi');

                // PDF / Image -> background pages
                if (isPdf) {
                    ensurePdfWorker();
                    if (!window.pdfjsLib) throw new Error('PDF.js chưa sẵn sàng');
                    const buf = await file.arrayBuffer();
                    const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
                    const pages = [];
                    for (let i = 1; i <= doc.numPages; i++) {
                        const page = await doc.getPage(i);
                        const viewport = page.getViewport({ scale: 1.7 });
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d', { alpha: false });
                        canvas.width = Math.floor(viewport.width);
                        canvas.height = Math.floor(viewport.height);
                        await page.render({ canvasContext: ctx, viewport }).promise;
                        pages.push({ src: canvas.toDataURL('image/png'), x: 0, y: 0, scale: 1 });
                    }
                    setBgPages(pages);
                    setBgPageIndex(0);
                    setBgLocked(false);
                    showToast(`Đã import PDF (${pages.length} trang) làm nền. Kéo để căn, Ctrl+L để lock.`);
                    return;
                }

                if (isImg) {
                    const src = await new Promise((resolve, reject) => {
                        const fr = new FileReader();
                        fr.onload = () => resolve(fr.result);
                        fr.onerror = () => reject(new Error('Không đọc được ảnh'));
                        fr.readAsDataURL(file);
                    });
                    setBgPages([{ src, x: 0, y: 0, scale: 1 }]);
                    setBgPageIndex(0);
                    setBgLocked(false);
                    showToast('Đã import ảnh làm nền. Kéo để căn, Ctrl+L để lock.');
                    return;
                }

                // MusicXML / MXL -> ABC
                if (isMxl) {
                    if (!window.JSZip) throw new Error('JSZip chưa sẵn sàng');
                    const buf = await file.arrayBuffer();
                    const zip = await window.JSZip.loadAsync(buf);
                    const container = await zip.file('META-INF/container.xml')?.async('string');
                    if (!container) throw new Error('MXL thiếu META-INF/container.xml');
                    const parser = new DOMParser();
                    const cdoc = parser.parseFromString(container, 'application/xml');
                    const rootfile = cdoc.querySelector('rootfile');
                    const fullPath = rootfile?.getAttribute('full-path');
                    if (!fullPath) throw new Error('Không tìm được rootfile trong container.xml');
                    const xml = await zip.file(fullPath)?.async('string');
                    if (!xml) throw new Error('Không đọc được MusicXML trong MXL');
                    const abc = parseMusicXMLToABC(xml);
                    setAbcText(abc);
                    showToast('Đã chuyển MXL (MusicXML) → ABC (best-effort).');
                    return;
                }

                if (isXml) {
                    const txt = await file.text();
                    const abc = parseMusicXMLToABC(txt);
                    setAbcText(abc);
                    showToast('Đã chuyển MusicXML → ABC (best-effort).');
                    return;
                }

                // MIDI -> ABC
                if (isMidi) {
                    const buf = await file.arrayBuffer();
                    const abc = parseMidiToABC(buf);
                    setAbcText(abc);
                    showToast('Đã chuyển MIDI → ABC (best-effort).');
                    return;
                }

                throw new Error('Định dạng chưa hỗ trợ. Hỗ trợ: PDF, ảnh, .mxl/.xml, .mid/.midi');
            }, [ensurePdfWorker, parseMusicXMLToABC, parseMidiToABC, setAbcText, setBgPages, setBgLocked, setBgPageIndex, showToast]);

            const handleImportFileChange = useCallback(async (e) => {
                const file = e?.target?.files && e.target.files[0];
                if (!file) return;
                setImportBusy(true);
                try {
                    await importFromFile(file);
                } catch (err) {
                    console.error(err);
                    showToast((err && err.message) ? err.message : 'Import lỗi');
                } finally {
                    setImportBusy(false);
                    try { e.target.value = ''; } catch (e2) {}
                }
            }, [importFromFile, showToast]);


            const renderSheetMusic = useCallback((text) => {
                if (!window.ABCJS || !renderAreaRef.current) return;
                try {
                    const el = renderAreaRef.current;
                    const w = Math.max(360, Math.floor((el.clientWidth || 740) - 2));
                    const visualObjs = window.ABCJS.renderAbc(el, text, {
                        responsive: 'resize',
                        add_classes: true,
                        clickListener: sheetClickListener,
                        staffwidth: w,
                        paddingtop: 14,
                        paddingbottom: 14,
                        paddingleft: 14,
                        paddingright: 14,
                    });
                    visualObjRef.current = (visualObjs && visualObjs[0]) ? visualObjs[0] : null;

                    // Mark audio as dirty whenever we re-render
                    audioPreparedRef.current = false;
                    sequenceRef.current = null;
                    noteTimingsRef.current = [];
                    baseSequenceRef.current = null;
                    baseNoteTimingsRef.current = [];
                    playbackRoadmapRef.current = { kind: 'base', key: 'base', markers: null };
                    rangePlaybackRef.current.preparedKey = null;

                    // Prepare internal audio mapping so repeat/char positions are stable
                    if (visualObjRef.current && typeof visualObjRef.current.setUpAudio === 'function') {
                        try { baseSequenceRef.current = visualObjRef.current.setUpAudio(); } catch (e) {}
                    }
                    if (visualObjRef.current && typeof visualObjRef.current.setTiming === 'function') {
                        try { baseNoteTimingsRef.current = visualObjRef.current.setTiming(); } catch (e) {}
                    }

                    try {
                        const playbackModel = buildRoadmapPlaybackModel(text, baseSequenceRef.current, baseNoteTimingsRef.current);
                        sequenceRef.current = playbackModel?.sequence || baseSequenceRef.current;
                        noteTimingsRef.current = playbackModel?.timings || baseNoteTimingsRef.current || [];
                        playbackRoadmapRef.current = playbackModel || { kind: 'base', key: 'base', markers: null };
                    } catch (e) {
                        sequenceRef.current = baseSequenceRef.current;
                        noteTimingsRef.current = baseNoteTimingsRef.current || [];
                        playbackRoadmapRef.current = { kind: 'base', key: 'base', markers: null };
                    }

                    requestAnimationFrame(() => applyRangeHighlights(rangeSelectionRef.current));
                } catch (err) {
                    console.warn("Đang chờ người dùng nhập đúng cú pháp...");
                }
            }, [applyRangeHighlights, sheetClickListener]);

            useEffect(() => {
                if (abcjsLoaded) {
                    closeRangeMenu();
                    if (playbackModeRef.current || rangeSelectionRef.current) {
                        try { stopAudioRef.current && stopAudioRef.current(); } catch (e) {}
                        commitRangeSelection(null);
                    }
                    clearPlaybackHighlights();
                    renderSheetMusic(abcText);
                }
            }, [abcText, abcjsLoaded, clearPlaybackHighlights, closeRangeMenu, commitRangeSelection, renderSheetMusic]);

            useEffect(() => {
                applyRangeHighlights(rangeSelection);
            }, [applyRangeHighlights, rangeSelection]);

            const ensureAudioContext = () => {
                if (!audioCtxRef.current) {
                    try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtxRef.current = undefined; }
                }
                return audioCtxRef.current;
            };

            const getTimingCharRange = (ev) => {
                if (!ev) return null;
                const starts = Array.isArray(ev.startCharArray)
                    ? ev.startCharArray.filter(v => typeof v === 'number')
                    : [];
                const ends = Array.isArray(ev.endCharArray)
                    ? ev.endCharArray.filter(v => typeof v === 'number')
                    : [];
                if (!starts.length || !ends.length) return null;
                return {
                    startChar: Math.min(...starts),
                    endChar: Math.max(...ends),
                };
            };

            const parsePlaybackRoadmap = (text) => {
                if (!text) return null;

                const decorations = [];
                const re = /!([^!\n]+)!/g;
                let match;
                while ((match = re.exec(text))) {
                    const raw = String(match[1] || '');
                    const token = raw.replace(/\s+/g, '').toLowerCase();
                    decorations.push({ index: match.index, token, raw });
                }

                if (!decorations.length) return null;

                const segno = decorations.find(d => d.token === 'segno');
                const fine = decorations.find(d => d.token === 'fine');
                const ds = [...decorations].reverse().find(d => d.token === 'd.s.' || d.token === 'ds');
                const dc = [...decorations].reverse().find(d => d.token === 'd.c.' || d.token === 'dc' || d.token === 'dacapo');

                if (ds && segno && ds.index > segno.index) {
                    return {
                        kind: 'dsalfine',
                        jumpAtChar: ds.index,
                        segmentStartChar: segno.index,
                        segmentEndChar: fine ? fine.index : Number.POSITIVE_INFINITY,
                        markers: {
                            segno: segno.index,
                            fine: fine ? fine.index : null,
                            ds: ds.index,
                        },
                    };
                }

                if (dc) {
                    return {
                        kind: 'dcalfine',
                        jumpAtChar: dc.index,
                        segmentStartChar: 0,
                        segmentEndChar: fine ? fine.index : Number.POSITIVE_INFINITY,
                        markers: {
                            fine: fine ? fine.index : null,
                            dc: dc.index,
                        },
                    };
                }

                return null;
            };

            const buildRoadmapPlaybackModel = (text, baseSequence, baseTimings) => {
                if (!baseSequence || !Array.isArray(baseSequence.tracks)) {
                    return {
                        kind: 'base',
                        key: 'base',
                        markers: null,
                        sequence: baseSequence,
                        timings: baseTimings || [],
                    };
                }

                const roadmap = parsePlaybackRoadmap(text);
                const msPerWhole = getMillisecondsPerWholeNote();
                if (!roadmap || !(msPerWhole > 0)) {
                    return {
                        kind: 'base',
                        key: 'base',
                        markers: null,
                        sequence: baseSequence,
                        timings: baseTimings || [],
                    };
                }

                const jumpAtChar = roadmap.jumpAtChar;
                const segmentStartChar = roadmap.segmentStartChar;
                const segmentEndChar = Number.isFinite(roadmap.segmentEndChar)
                    ? roadmap.segmentEndChar
                    : Number.POSITIVE_INFINITY;

                let firstPassEndWhole = 0;
                let segmentStartWhole = Number.POSITIVE_INFINITY;
                let segmentEndWhole = 0;

                baseSequence.tracks.forEach(track => {
                    if (!Array.isArray(track)) return;
                    track.forEach(ev => {
                        if (!ev || ev.cmd !== 'note') return;
                        const startChar = typeof ev.startChar === 'number' ? ev.startChar : null;
                        const noteStart = typeof ev.start === 'number' ? ev.start : 0;
                        const durationWhole = typeof ev.duration === 'number' ? ev.duration : 0;
                        const noteEnd = noteStart + durationWhole;
                        if (!(durationWhole > 0) || startChar === null) return;

                        if (startChar < jumpAtChar) {
                            firstPassEndWhole = Math.max(firstPassEndWhole, noteEnd);
                        }

                        if (startChar >= segmentStartChar && startChar < segmentEndChar) {
                            segmentStartWhole = Math.min(segmentStartWhole, noteStart);
                            segmentEndWhole = Math.max(segmentEndWhole, noteEnd);
                        }
                    });
                });

                if (!(firstPassEndWhole > 0) || !Number.isFinite(segmentStartWhole) || !(segmentEndWhole > segmentStartWhole)) {
                    return {
                        kind: 'base',
                        key: 'base',
                        markers: roadmap.markers,
                        sequence: baseSequence,
                        timings: baseTimings || [],
                    };
                }

                const appendOffsetWhole = firstPassEndWhole;
                const expandedTracks = [];

                baseSequence.tracks.forEach(track => {
                    if (!Array.isArray(track)) return;

                    const outTrack = [];
                    let pendingProgram = null;
                    let appendProgramInserted = false;

                    track.forEach(ev => {
                        if (!ev) return;

                        if (ev.cmd === 'program') {
                            pendingProgram = { ...ev };
                            if (outTrack.length) outTrack.push({ ...ev });
                            return;
                        }

                        if (ev.cmd !== 'note') return;

                        const startChar = typeof ev.startChar === 'number' ? ev.startChar : null;
                        const noteStart = typeof ev.start === 'number' ? ev.start : 0;
                        const durationWhole = typeof ev.duration === 'number' ? ev.duration : 0;
                        if (!(durationWhole > 0) || startChar === null) return;

                        const inFirstPass = startChar < jumpAtChar;
                        const inReplaySegment = startChar >= segmentStartChar && startChar < segmentEndChar;

                        if (inFirstPass) {
                            if (!outTrack.length && pendingProgram) outTrack.push({ ...pendingProgram });
                            outTrack.push({ ...ev });
                        }

                        if (inReplaySegment) {
                            if (!appendProgramInserted && pendingProgram) {
                                outTrack.push({ ...pendingProgram });
                                appendProgramInserted = true;
                            }
                            outTrack.push({
                                ...ev,
                                start: appendOffsetWhole + (noteStart - segmentStartWhole),
                            });
                        }
                    });

                    if (outTrack.length) expandedTracks.push(outTrack);
                });

                if (!expandedTracks.length) {
                    return {
                        kind: 'base',
                        key: 'base',
                        markers: roadmap.markers,
                        sequence: baseSequence,
                        timings: baseTimings || [],
                    };
                }

                const baseEvents = Array.isArray(baseTimings)
                    ? baseTimings.filter(ev => ev && ev.type === 'event')
                    : [];
                const getEventStartChar = (ev) => {
                    const range = getTimingCharRange(ev);
                    return range ? range.startChar : Number.POSITIVE_INFINITY;
                };

                const firstPassEvents = baseEvents
                    .filter(ev => getEventStartChar(ev) < jumpAtChar)
                    .map(ev => ({ ...ev }));

                const replayEvents = baseEvents.filter(ev => {
                    const startChar = getEventStartChar(ev);
                    return startChar >= segmentStartChar && startChar < segmentEndChar;
                });

                const segmentStartMs = replayEvents.length
                    ? replayEvents[0].milliseconds
                    : segmentStartWhole * msPerWhole;
                const appendOffsetMs = appendOffsetWhole * msPerWhole;

                const expandedEvents = [
                    ...firstPassEvents,
                    ...replayEvents.map(ev => ({
                        ...ev,
                        milliseconds: appendOffsetMs + (ev.milliseconds - segmentStartMs),
                    })),
                ];

                const totalDuration = appendOffsetWhole + (segmentEndWhole - segmentStartWhole);

                return {
                    kind: roadmap.kind,
                    key: [
                        roadmap.kind,
                        jumpAtChar,
                        segmentStartChar,
                        Number.isFinite(segmentEndChar) ? segmentEndChar : 'end',
                        expandedEvents.length,
                    ].join('|'),
                    markers: roadmap.markers,
                    sequence: {
                        ...baseSequence,
                        tracks: expandedTracks,
                        totalDuration,
                    },
                    timings: expandedEvents,
                };
            };

            const stopRangeTimer = () => {
                const state = rangePlaybackRef.current;
                state.running = false;
                if (state.rafId) {
                    cancelAnimationFrame(state.rafId);
                    state.rafId = null;
                }
            };

            const getFullPlaybackPayload = () => {
                const visual = visualObjRef.current;
                const sequence = sequenceRef.current;
                if (!visual || !sequence || !Array.isArray(sequence.tracks)) return null;

                const msPerMeasure = typeof visual.millisecondsPerMeasure === 'function'
                    ? visual.millisecondsPerMeasure()
                    : 0;
                const msPerWhole = getMillisecondsPerWholeNote();
                if (!(msPerMeasure > 0) || !(msPerWhole > 0)) return null;

                let totalWhole = typeof sequence.totalDuration === 'number' ? sequence.totalDuration : 0;
                if (!(totalWhole > 0)) {
                    sequence.tracks.forEach(track => {
                        if (!Array.isArray(track)) return;
                        track.forEach(ev => {
                            if (!ev || ev.cmd !== 'note') return;
                            const noteStart = typeof ev.start === 'number' ? ev.start : 0;
                            const durationWhole = typeof ev.duration === 'number' ? ev.duration : 0;
                            totalWhole = Math.max(totalWhole, noteStart + durationWhole);
                        });
                    });
                }
                if (!(totalWhole > 0)) return null;

                const fullEvents = getTimingEvents().map(ev => ({ ...ev }));
                const totalMs = Math.max(
                    totalWhole * msPerWhole,
                    fullEvents.length ? fullEvents[fullEvents.length - 1].milliseconds : 0
                );
                const tail = fullEvents.length ? fullEvents[fullEvents.length - 1] : { millisecondsPerMeasure: msPerMeasure };
                const playbackEvents = [...fullEvents, {
                    type: 'end',
                    milliseconds: totalMs,
                    millisecondsPerMeasure: tail.millisecondsPerMeasure || msPerMeasure,
                }];

                return {
                    key: ['full', playbackRoadmapRef.current?.key || 'base', Math.round(totalWhole * 1000)].join('|'),
                    sequence,
                    events: playbackEvents,
                    totalMs,
                    msPerMeasure,
                };
            };

            const getActiveRangePlayback = () => {
                const selection = rangeSelectionRef.current;
                const visual = visualObjRef.current;
                const sequence = sequenceRef.current;
                if (!selection || selection.type !== 'active' || !visual || !sequence) return null;

                const startWhole = selection.start.startWhole;
                const endWhole = selection.end.endWhole;
                const totalWhole = endWhole - startWhole;
                const msPerMeasure = typeof visual.millisecondsPerMeasure === 'function' ? visual.millisecondsPerMeasure() : 0;
                if (!(totalWhole > 0) || !(msPerMeasure > 0) || !Array.isArray(sequence.tracks)) return null;

                const slicedTracks = [];
                sequence.tracks.forEach(track => {
                    if (!Array.isArray(track)) return;

                    const outTrack = [];
                    let pendingProgram = null;

                    track.forEach(ev => {
                        if (!ev) return;

                        if (ev.cmd === 'program') {
                            pendingProgram = { ...ev };
                            if (outTrack.length) outTrack.push({ ...ev });
                            return;
                        }

                        if (ev.cmd !== 'note') return;

                        const noteStart = typeof ev.start === 'number' ? ev.start : 0;
                        const durationWhole = typeof ev.duration === 'number' ? ev.duration : 0;
                        const noteEnd = noteStart + durationWhole;
                        if (durationWhole <= 0) return;
                        if (noteEnd <= startWhole || noteStart >= endWhole) return;

                        if (!outTrack.length && pendingProgram) outTrack.push({ ...pendingProgram });

                        const clippedStart = Math.max(noteStart, startWhole);
                        const clippedEnd = Math.min(noteEnd, endWhole);
                        const shiftedDuration = Math.max(0, clippedEnd - clippedStart);
                        if (shiftedDuration <= 0) return;

                        outTrack.push({
                            ...ev,
                            start: clippedStart - startWhole,
                            duration: shiftedDuration,
                        });
                    });

                    if (outTrack.length) slicedTracks.push(outTrack);
                });

                if (!slicedTracks.length) return null;

                const rangeEvents = getTimingEvents()
                    .filter(ev => ev.milliseconds >= selection.start.startMs && ev.milliseconds <= selection.end.startMs)
                    .map(ev => ({ ...ev, milliseconds: ev.milliseconds - selection.start.startMs }));

                const totalMs = Math.max(0, selection.end.endMs - selection.start.startMs);
                const tail = rangeEvents.length ? rangeEvents[rangeEvents.length - 1] : { millisecondsPerMeasure: msPerMeasure };
                const playbackEvents = [...rangeEvents, {
                    type: 'end',
                    milliseconds: totalMs,
                    millisecondsPerMeasure: tail.millisecondsPerMeasure || msPerMeasure,
                }];

                return {
                    key: [
                        'range',
                        playbackRoadmapRef.current?.key || 'base',
                        selection.start.startChar,
                        Math.round(selection.start.startMs),
                        selection.end.startChar,
                        Math.round(selection.end.endMs),
                    ].join('|'),
                    sequence: {
                        ...sequence,
                        tracks: slicedTracks,
                        totalDuration: totalWhole,
                    },
                    events: playbackEvents,
                    totalMs,
                    msPerMeasure,
                };
            };

            const startRangeTimer = (offsetMs = 0) => {
                const state = rangePlaybackRef.current;
                const events = state.events || [];

                stopRangeTimer();

                state.currentMs = offsetMs;
                state.nextEventIndex = 0;
                while (
                    state.nextEventIndex < events.length &&
                    events[state.nextEventIndex].type === 'event' &&
                    events[state.nextEventIndex].milliseconds <= offsetMs + 0.5
                ) {
                    state.nextEventIndex++;
                }

                state.running = true;
                state.startPerfMs = performance.now() - offsetMs;

                const tick = () => {
                    if (!state.running) return;

                    const elapsed = performance.now() - state.startPerfMs;
                    state.currentMs = elapsed;

                    while (
                        state.nextEventIndex < events.length &&
                        events[state.nextEventIndex].type === 'event' &&
                        events[state.nextEventIndex].milliseconds <= elapsed + 0.5
                    ) {
                        handlePlaybackEvent(events[state.nextEventIndex]);
                        state.nextEventIndex += 1;
                    }

                    if (elapsed >= state.totalMs) {
                        state.running = false;
                        state.rafId = null;
                        if (!state.ignoreEnded) handlePreparedPlaybackEnded(loopEnabledRef.current);
                        return;
                    }

                    state.rafId = requestAnimationFrame(tick);
                };

                state.rafId = requestAnimationFrame(tick);
            };

            const preparePlaybackPayload = async (payload) => {
                if (!payload || !window.ABCJS?.synth?.CreateSynth) return null;

                rangePlaybackRef.current.events = payload.events;
                rangePlaybackRef.current.totalMs = payload.totalMs;

                if (rangePlaybackRef.current.preparedKey === payload.key && rangeSynthRef.current) {
                    return payload;
                }

                stopRangeTimer();
                rangePlaybackRef.current.ignoreEnded = true;
                rangePlaybackRef.current.pausedMs = 0;
                rangePlaybackRef.current.currentMs = 0;
                rangePlaybackRef.current.nextEventIndex = 0;
                if (rangeSynthRef.current) {
                    try { rangeSynthRef.current.stop(); } catch (e) {}
                }

                const ctx = ensureAudioContext();
                if (!ctx) return null;

                const synth = new window.ABCJS.synth.CreateSynth();
                await ctx.resume();
                await synth.init({
                    sequence: payload.sequence,
                    audioContext: ctx,
                    millisecondsPerMeasure: payload.msPerMeasure,
                    options: { chordsOff: true },
                    onEnded: () => {
                        if (rangeSynthRef.current !== synth || rangePlaybackRef.current.ignoreEnded) return;
                        handlePreparedPlaybackEnded(loopEnabledRef.current);
                    },
                });
                await synth.prime();

                rangeSynthRef.current = synth;
                rangePlaybackRef.current.preparedKey = payload.key;
                rangePlaybackRef.current.ignoreEnded = false;
                return payload;
            };

            const pausePreparedPlayback = () => {
                const state = rangePlaybackRef.current;
                stopRangeTimer();
                state.pausedMs = state.currentMs;
                state.ignoreEnded = true;
                try { rangeSynthRef.current && rangeSynthRef.current.pause(); } catch (e) {}
                setIsPlaying(false);
            };

            const stopRangePlayback = ({ destroy = false } = {}) => {
                const state = rangePlaybackRef.current;
                stopRangeTimer();
                state.pausedMs = 0;
                state.currentMs = 0;
                state.nextEventIndex = 0;
                state.ignoreEnded = true;
                state.ending = false;

                if (rangeSynthRef.current) {
                    try { rangeSynthRef.current.stop(); } catch (e) {}
                }

                if (destroy) {
                    rangeSynthRef.current = null;
                    state.preparedKey = null;
                }
            };

            const beginPreparedPlayback = async (mode, payload) => {
                if (!payload) return;

                const state = rangePlaybackRef.current;
                const canResume = state.preparedKey === payload.key && rangeSynthRef.current && state.pausedMs > 0;
                const resumeMs = canResume ? state.pausedMs : 0;

                const prepared = await preparePlaybackPayload(payload);
                if (!prepared || !rangeSynthRef.current) return;

                if (resumeMs <= 0.5) clearPlaybackHighlights();

                playbackModeRef.current = mode;
                state.ignoreEnded = false;
                state.ending = false;

                try {
                    if (resumeMs > 0.5 && typeof rangeSynthRef.current.resume === 'function') {
                        rangeSynthRef.current.resume();
                    } else {
                        rangeSynthRef.current.start();
                    }
                    startRangeTimer(resumeMs);
                    setIsPlaying(true);
                } catch (err) {
                    console.warn('Audio problem:', err);
                }
            };

            const startRangePlayback = async () => {
                if (!visualObjRef.current) {
                    try { renderSheetMusic(abcText); } catch (e) {}
                }
                if (!visualObjRef.current) return;

                const payload = getActiveRangePlayback();
                if (!payload) return;
                await beginPreparedPlayback('range', payload);
            };

            const startFullPlayback = async () => {
                if (!visualObjRef.current) {
                    try { renderSheetMusic(abcText); } catch (e) {}
                }
                if (!visualObjRef.current) return;

                const payload = getFullPlaybackPayload();
                if (!payload) return;
                await beginPreparedPlayback('full', payload);
            };

            const handlePreparedPlaybackEnded = (shouldLoop) => {
                const state = rangePlaybackRef.current;
                if (state.ending) return;
                const mode = playbackModeRef.current;
                state.ending = true;
                stopRangeTimer();

                if (shouldLoop) {
                    clearPlaybackHighlights();
                    stopRangePlayback({ destroy: true });
                    state.ending = false;

                    if (mode === 'range' && rangeSelectionRef.current && rangeSelectionRef.current.type === 'active') {
                        startRangePlayback().catch((e) => {
                            console.warn('Range loop problem:', e);
                            playbackModeRef.current = null;
                            setIsPlaying(false);
                        });
                        return;
                    }

                    if (mode === 'full') {
                        startFullPlayback().catch((e) => {
                            console.warn('Full loop problem:', e);
                            playbackModeRef.current = null;
                            setIsPlaying(false);
                        });
                        return;
                    }
                }

                removeCurrentPlaybackHighlight();
                stopRangePlayback({ destroy: true });
                playbackModeRef.current = null;
                setIsPlaying(false);
                state.ending = false;
            };

            const togglePlay = () => {
                const activeRange = rangeSelectionRef.current && rangeSelectionRef.current.type === 'active';

                if (isPlaying) {
                    pausePreparedPlayback();
                    return;
                }

                if (activeRange) {
                    startRangePlayback();
                    return;
                }

                startFullPlayback();
            };

            const stopAudio = () => {
                const sc = synthControlRef.current;
                if (sc) {
                    try { sc.pause(); } catch (e) {}
                    try { sc.restart(); } catch (e) {}
                }

                stopRangePlayback({ destroy: true });
                playbackModeRef.current = null;
                lastFullLoopBeatRef.current = -1;
                clearPlaybackHighlights();
                setIsPlaying(false);
            };

            useEffect(() => () => stopRangeTimer(), []);

            // --- HOTKEYS ---
            useEffect(() => { undoFnRef.current = handleUndo; }, [handleUndo]);
            useEffect(() => { redoFnRef.current = handleRedo; }, [handleRedo]);
            useEffect(() => { togglePlayRef.current = togglePlay; }, [togglePlay]);
            useEffect(() => { stopAudioRef.current = stopAudio; }, [stopAudio]);

            useEffect(() => {
                const isTypingTarget = (el) => {
                    if (!el) return false;
                    const tag = (el.tagName || '').toLowerCase();
                    return tag === 'textarea' || tag === 'input' || el.isContentEditable;
                };

                const onKeyDown = (e) => {
                    const key = (e.key || '').toLowerCase();
                    const isMac = /mac|iphone|ipad|ipod/i.test(navigator.platform);
                    const mod = isMac ? e.metaKey : e.ctrlKey;

                    // Undo / Redo
                    if (mod && key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        undoFnRef.current && undoFnRef.current();
                        return;
                    }
                    if ((mod && key === 'y') || (mod && e.shiftKey && key === 'z') || (isMac && e.metaKey && e.shiftKey && key === 'z')) {
                        e.preventDefault();
                        redoFnRef.current && redoFnRef.current();
                        return;
                    }

                    // --- Duration Brush hotkeys ---
                    // macOS: Ctrl+1..6 / Ctrl+. / Ctrl+0 (avoid Cmd+number which is browser tab switch)
                    // Windows/Linux: Alt+1..6 / Alt+. / Alt+0  (avoid Ctrl+number and Ctrl+± which are browser tab/zoom)
                    if (!e.isComposing) {
                        const durKeyMap = { '1': '1', '2': '2', '3': '4', '4': '8', '5': '16', '6': '32' };
                        const wantsMacCtrl = isMac && e.ctrlKey && !e.metaKey; // allow even when typing
                        const wantsWinAlt = !isMac && e.altKey && !e.metaKey && !e.ctrlKey; // avoid AltGr (Ctrl+Alt)
                        const wantsDurHotkey = wantsMacCtrl || wantsWinAlt;

                        const toastDur = (d, dotted) => `Dur: ${durationToPretty(d)}${dotted ? ' • dôi' : ''}`;

                        const commitDur = (nextDur, nextDot, { tryApplySelection = true, toastMsg = null } = {}) => {
                            const applied = tryApplySelection ? tryApplyDurationToSelection(nextDur, nextDot) : false;
                            setDuration(nextDur);
                            setIsDotted(nextDot);
                            showToast(toastMsg || (applied ? `${toastDur(nextDur, nextDot)} (applied)` : toastDur(nextDur, nextDot)));
                        };

                        if (wantsDurHotkey) {
                            // Set duration: 1..6
                            if (durKeyMap[key]) {
                                e.preventDefault();
                                commitDur(durKeyMap[key], dottedRef.current);
                                return;
                            }

                            // Reset: 0
                            if (key === '0') {
                                e.preventDefault();
                                commitDur('4', false, { toastMsg: 'Dur reset: 1/4' });
                                return;
                            }

                            // Toggle dotted: .
                            if (key === '.') {
                                e.preventDefault();
                                const nextDot = !dottedRef.current;
                                commitDur(durationRef.current, nextDot, { toastMsg: `Dôi: ${nextDot ? 'ON' : 'OFF'}` });
                                return;
                            }

                            // Step longer (x2): =
                            if (key === '=' || key === '+') {
                                e.preventDefault();
                                const cur = durationRef.current;
                                const idx = DURATION_ORDER.indexOf(cur);
                                const next = idx > 0 ? DURATION_ORDER[idx - 1] : DURATION_ORDER[0];
                                commitDur(next, dottedRef.current);
                                return;
                            }

                            // Step shorter (/2): -
                            if (key === '-' || key === '_') {
                                e.preventDefault();
                                const cur = durationRef.current;
                                const idx = DURATION_ORDER.indexOf(cur);
                                const next = (idx >= 0 && idx < DURATION_ORDER.length - 1) ? DURATION_ORDER[idx + 1] : DURATION_ORDER[DURATION_ORDER.length - 1];
                                commitDur(next, dottedRef.current);
                                return;
                            }
                        }
                    }

                    // --- Double-tap ArrowUp/ArrowDown to step duration (1 hand) ---
                    // Only when not typing (so arrows still work normally inside textarea/input)
                    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isTypingTarget(e.target)) {
                        const now = Date.now();
                        const sameKey = arrowTapRef.current.key === e.key && (now - arrowTapRef.current.t) <= 240;

                        if (sameKey) {
                            e.preventDefault(); // prevent the 2nd arrow from scrolling
                            arrowTapRef.current.key = null;
                            arrowTapRef.current.t = 0;

                            const cur = durationRef.current;
                            const idx = DURATION_ORDER.indexOf(cur);
                            let next = cur;

                            if (e.key === 'ArrowUp') next = idx > 0 ? DURATION_ORDER[idx - 1] : DURATION_ORDER[0];
                            else next = (idx >= 0 && idx < DURATION_ORDER.length - 1) ? DURATION_ORDER[idx + 1] : DURATION_ORDER[DURATION_ORDER.length - 1];

                            setDuration(next);
                            showToast(`Dur: ${durationToPretty(next)}`);
                            return;
                        } else {
                            arrowTapRef.current.key = e.key;
                            arrowTapRef.current.t = now;
                        }
                    }


                    // Background lock/unlock (Ctrl+L) - chỉ khi có background và không đang gõ
                    if (e.ctrlKey && key === 'l' && !isTypingTarget(e.target) && currentBg) {
                        // Note: Ctrl+L thường focus address bar, cố gắng chặn lại trong app
                        try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
                        setBgLocked(v => {
                            const next = !v;
                            showToast(next ? 'Background: LOCK' : 'Background: UNLOCK (kéo để di chuyển)');
                            return next;
                        });
                        return;
                    }

                    // Space / Double Space for playback (chỉ khi không đang gõ)
                    if (e.code === 'Space' && !isTypingTarget(e.target)) {
                        e.preventDefault();

                        if (spaceTimerRef.current) {
                            clearTimeout(spaceTimerRef.current);
                            spaceTimerRef.current = null;
                            stopAudioRef.current && stopAudioRef.current();
                            return;
                        }

                        spaceTimerRef.current = setTimeout(() => {
                            spaceTimerRef.current = null;
                            togglePlayRef.current && togglePlayRef.current();
                        }, 240);
                    }
                };

                document.addEventListener('keydown', onKeyDown);
                return () => document.removeEventListener('keydown', onKeyDown);
            }, []);


            // --- HÀM XỬ LÝ TEXT & CURSOR THÔNG MINH ---
            const updateTextAndSync = (newText, newPos, options = {}) => {
                // options: { skipHistory?: boolean, focus?: boolean }
                applyTextChange(newText, newPos, { skipHistory: !!options.skipHistory, focus: options.focus !== false });
            };

            const handleTextAreaChange = (e) => {
                const newText = e.target.value;
                const newPos = e.target.selectionStart;
                applyTextChange(newText, newPos, { focus: false });
                // Đồng bộ bè (2 chiều) nếu user sửa tay trong text
                syncVoicesFromText(newText);
            };

            const handleTextAreaClickOrKey = (e) => {
                const pos = e.target.selectionStart;
                setCursorPos(pos);

                const textBeforeCursor = e.target.value.substring(0, pos);
                const voiceMatches = [...textBeforeCursor.matchAll(/\[V:(\d+)\]/g)];
                if (voiceMatches.length > 0) {
                    const lastMatch = voiceMatches[voiceMatches.length - 1];
                    setActiveVoice(parseInt(lastMatch[1]));
                }
            };


            const insertSmartText = (textToInsert, targetVoiceId = activeVoice) => {
                let currentPos = cursorPos;
                const voiceMarker = `[V:${targetVoiceId}]`;
                const startIndex = abcText.indexOf(voiceMarker);

                let finalInsertPos = currentPos;

                if (startIndex !== -1) {
                    const restOfText = abcText.substring(startIndex + voiceMarker.length);
                    const nextVoiceMatch = restOfText.match(/\[V:\d+\]/);
                    let endIndex = nextVoiceMatch
                        ? startIndex + voiceMarker.length + nextVoiceMatch.index
                        : abcText.length;

                    if (currentPos < startIndex + voiceMarker.length || currentPos > endIndex) {
                        finalInsertPos = endIndex;
                        while (abcText[finalInsertPos - 1] === ' ' || abcText[finalInsertPos - 1] === '\n') {
                            finalInsertPos--;
                        }
                    }
                } else {
                    finalInsertPos = abcText.length;
                }

                // Insert text (default: thêm khoảng trắng cho dễ đọc)
                let before = abcText.substring(0, finalInsertPos);
                let after = abcText.substring(finalInsertPos);

                const insertTok = (textToInsert || '').trim();

                // Special tokens that should attach to the previous note/chord (no leading space).
                // This prevents cases like ") " being treated as a standalone token (slur close won't work).
                const attachToPrev = (insertTok === ')' || insertTok === '-');

                let insertStr = '';

                if (attachToPrev) {
                    // Remove trailing spaces/tabs before attaching.
                    before = before.replace(/[ \t]+$/g, '');

                    // Add ONE space after, unless next char already begins with whitespace or is a barline.
                    const needSpaceAfter = !(after === '' || /^\s/.test(after) || after.startsWith('|'));
                    insertStr = insertTok + (needSpaceAfter ? ' ' : '');
                } else {
                    const prefix = (before === '' || /\s$/.test(before) || before.endsWith('|')) ? '' : ' ';
                    insertStr = prefix + insertTok + ' ';
                }

                let newText = before + insertStr + after;
                let approxPos = before.length + insertStr.length;

                // --- AUTO BEAM (Pro): ghép beam theo nhóm phách của nhịp ---
                // Quy tắc:
                // - Các nốt móc (<= beat/2) trong cùng "beat-group" sẽ được viết dính liền (không space) để abcjs tự beam.
                // - Qua ranh giới beat-group sẽ chèn space để ngắt beam đúng phách.
                // - Không đụng tới barline đặc biệt |: :| [1 [2, tuplets... (an toàn)
                const parseFrac = window.AppMusicUtils.parseFraction;
                const getHeader = (field, fallback) => {
                    const m = newText.match(new RegExp(`^${field}:\\s*(.*)$`, 'm'));
                    return m ? (m[1] || '').trim() : fallback;
                };
                const getMeterNums = () => {
                    const M = getHeader('M', '4/4');
                    const mm = M.match(/^(\d+)\s*\/\s*(\d+)$/);
                    if (!mm) return { num: 4, den: 4 };
                    return { num: parseInt(mm[1], 10), den: parseInt(mm[2], 10) };
                };
                const getLWhole = () => {
                    const L = getHeader('L', '1/4');
                    const f = parseFrac(L);
                    return f ?? (1 / 4);
                };
                const parseLenSuffix = window.AppMusicUtils.parseLengthSuffix;
                const tokenDurationWhole = window.AppMusicUtils.tokenDurationWhole;

                const applyBeatGroupedBeaming = (fullText, voiceId) => {
                    const { num, den } = getMeterNums();
                    const LWhole = getLWhole();

                    // beat length in whole notes
                    const isCompound = (den === 8 && num >= 6 && num % 3 === 0);
                    const beatLen = isCompound ? (3 / den) : (1 / den);
                    const beamThresh = Math.min(1/8, (beatLen / 2)) + 1e-9;
                    const eps = 1e-9;

                    const tokenRe = /(\[[^\]]+\](?:\d+\/\d+|\d+|\/\d+|\/|\/\/)?-?|z(?:\d+\/\d+|\d+|\/\d+|\/|\/\/)?-?|(?:\^{1,2}|_{1,2}|=)?[A-Ga-g][,']*(?:\d+\/\d+|\d+|\/\d+|\/|\/\/)?-?)/g;

                    const isRest = (tok) => (tok || '').replace(/[()]/g, '').startsWith('z');
                    const isBeamable = (tok) => {
                        if (!tok) return false;
                        if (isRest(tok)) return false;
                        const d = tokenDurationWhole(tok, LWhole);
                        if (d == null) return false;
                        return d > 0 && d <= beamThresh;
                    };

                    const beamMeasure = (mea) => {
                        const raw = (mea || '');
                        // an toàn: bỏ qua nếu có slur/tuplet/decoration phức tạp
                        if (raw.includes('(') || raw.includes(')') || raw.includes('!') || raw.includes('{') || raw.includes('>') || raw.includes('<')) return raw;

                        const toks = raw.match(tokenRe) || [];
                        const remainder = raw.replace(tokenRe, '').replace(/\s+/g, '');
                        if (remainder !== '') return raw;

                        // build beat groups
                        let beatPos = 0;
                        let group = [];
                        const groups = [];

                        const flush = () => {
                            if (group.length) groups.push(group);
                            group = [];
                        };

                        for (const tok of toks) {
                            const d = tokenDurationWhole(tok, LWhole);
                            if (d == null) return raw;

                            if (d <= 0) {
                                // punctuation-like token -> keep in current group
                                group.push(tok);
                                continue;
                            }

                            if (beatPos + d > beatLen + eps) {
                                // new beat group
                                flush();
                                beatPos = 0;
                            }

                            group.push(tok);
                            beatPos += d;

                            if (Math.abs(beatPos - beatLen) <= eps) {
                                flush();
                                beatPos = 0;
                            }
                        }
                        flush();

                        const joinGroup = (g) => {
                            if (!g.length) return '';
                            let out = g[0];
                            for (let i = 1; i < g.length; i++) {
                                const prev = g[i - 1];
                                const cur = g[i];
                                if (isBeamable(prev) && isBeamable(cur)) out += cur;
                                else out += ' ' + cur;
                            }
                            return out.trim();
                        };

                        return groups.map(joinGroup).filter(Boolean).join(' ').trim();
                    };

                    const lines = fullText.split('\n');
                    const outLines = lines.map(line => {
                        const ln = line || '';
                        if (!ln.trim()) return ln;
                        if (/^[A-Za-z]:/.test(ln)) return ln; // header

                        const prefix = `[V:${voiceId}]`;
                        if (!ln.trimStart().startsWith(prefix)) return ln;

                        // an toàn: bỏ qua nếu có repeat/ending
                        if (/\|:|:\||\[\d+/.test(ln)) return ln;

                        const m = ln.match(/^(\s*\[V:\d+\])\s*(.*)$/);
                        if (!m) return ln;
                        const voiceTag = m[1] + ' ';
                        const music = (m[2] || '');

                        const hasTrailingBar = /\|\s*$/.test(music);
                        const parts = music.split('|');

                        const rebuiltParts = parts.map(seg => beamMeasure(seg.trim()));
                        let rebuilt = rebuiltParts.filter((_, i) => i < rebuiltParts.length).join(' | ').trim();
                        // normalize
                        rebuilt = rebuilt.replace(/\s+\|/g, ' |').replace(/\|\s+/g, '| ');
                        if (hasTrailingBar && !rebuilt.endsWith('|')) rebuilt = rebuilt + ' |';
                        else if (!hasTrailingBar && rebuilt.endsWith('|')) rebuilt = rebuilt.replace(/\|\s*$/, '').trimEnd();

                        return (voiceTag + rebuilt).trimEnd();
                    });

                    return outLines.join('\n');
                };

                // Only run auto-beam if token is short enough to matter (móc đơn/kép)
                const LWhole = getLWhole();
                const { num, den } = getMeterNums();
                const isCompound = (den === 8 && num >= 6 && num % 3 === 0);
                const beatLen = isCompound ? (3 / den) : (1 / den);
                const beamThresh = Math.min(1/8, (beatLen / 2)) + 1e-9;

                const insertedDur = tokenDurationWhole(insertTok, LWhole);
                const shouldBeam = insertedDur != null && insertedDur > 0 && insertedDur <= beamThresh;

                if (shouldBeam) {
                    const beamedText = applyBeatGroupedBeaming(newText, targetVoiceId);

                    // best-effort keep cursor near inserted token
                    const searchFrom = Math.max(0, approxPos - 220);
                    const searchTo = Math.min(beamedText.length, approxPos + 220);
                    const window = beamedText.slice(searchFrom, searchTo);
                    const localIdx = window.lastIndexOf(insertTok);
                    const newPos = localIdx !== -1 ? (searchFrom + localIdx + insertTok.length) : Math.min(approxPos, beamedText.length);

                    newText = beamedText;
                    approxPos = newPos;
                }

                updateTextAndSync(newText, approxPos);
            };

            const updateHeaderField = (field, value) => {
                const lines = abcText.split('\n');
                let found = false;
                const newLines = lines.map(line => {
                    if (line.startsWith(`${field}:`)) {
                        found = true;
                        return `${field}: ${value}`;
                    }
                    return line;
                });
                if (!found) newLines.splice(1, 0, `${field}: ${value}`);
                applyTextChange(newLines.join('\n'), Math.min(cursorPosRef.current, newLines.join('\n').length), { focus: false });
            };



            // --- SYNC UI META TỪ ABC (để refresh vẫn giữ đúng thông tin ở panel) ---
            const getHeaderValue = (text, field) => {
                const m = String(text || '').match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
                return m ? String(m[1] || '').trim() : '';
            };

            const parseTempoFromQ = (qVal) => {
                const s = String(qVal || '').trim();
                if (!s) return '';
                const mEq = s.match(/=\s*(\d+)/);
                if (mEq) {
                    const n = parseInt(mEq[1], 10);
                    return Number.isFinite(n) ? String(n) : '';
                }
                const mNum = s.match(/(\d+)/);
                if (mNum) {
                    const n = parseInt(mNum[1], 10);
                    return Number.isFinite(n) ? String(n) : '';
                }
                return '';
            };

            const parseKeyLine = (kVal) => {
                const raw = String(kVal || '').trim();
                if (!raw) return null;

                // Example: "Am", "Bb", "F#", "C exp ^f ^c"
                const parts = raw.split(/\s+/).filter(Boolean);
                const first = parts[0] || '';
                const isMinor = /m$/.test(first) && first.length > 1;
                const tonic = isMinor ? first.slice(0, -1) : first;

                const out = {
                    tonic: tonic,
                    mode: isMinor ? 'minor' : 'major',
                    sigInput: KEY_SIG_HINT,
                    sigDirty: false,
                };

                const expIdx = parts.findIndex(p => String(p || '').toLowerCase() === 'exp');
                if (expIdx !== -1) {
                    const tokens = parts.slice(expIdx + 1);
                    const accs = [];
                    for (const tok of tokens) {
                        const mm = String(tok || '').match(/^(\^+|_+)([a-g])$/i);
                        if (!mm) continue;
                        const sym = mm[1][0]; // '^' or '_'
                        const letter = mm[2].toUpperCase();
                        accs.push(sym === '^' ? `${letter}#` : `${letter}b`);
                    }
                    if (accs.length) {
                        const seen = new Set();
                        const uniq = accs.filter(x => (seen.has(x) ? false : (seen.add(x), true)));
                        out.sigInput = uniq.join(', ');
                        out.sigDirty = true;
                    }
                }

                return out;
            };

            const syncMetaFromAbcText = (text) => {
                const t = getHeaderValue(text, 'T');
                const c = getHeaderValue(text, 'C');
                const m = getHeaderValue(text, 'M');
                const q = getHeaderValue(text, 'Q');
                const k = getHeaderValue(text, 'K');

                if (t) setTitle(t);
                if (c) setComposer(c);
                if (m) setMeter(m);

                const bpm = parseTempoFromQ(q);
                if (bpm) setTempo(bpm);

                const keyParsed = parseKeyLine(k);
                if (keyParsed && keyParsed.tonic) {
                    setKeyTonic(keyParsed.tonic);
                    setKeyMode(keyParsed.mode);

                    // Đừng overwrite keySigInput khi user đang gõ (dirty)
                    if (keyParsed.sigDirty) {
                        setKeySigInput(keyParsed.sigInput);
                        setKeySigDirty(true);
                    } else if (!keySigDirty) {
                        setKeySigInput(KEY_SIG_HINT);
                        setKeySigDirty(false);
                    }
                }
            };

            // Whenever ABC text changes (autosave load / paste / optimize...), keep info panel synced
            useEffect(() => {
                try { syncMetaFromAbcText(abcText); } catch (e) {}
            }, [abcText]);

            const applyKeySigFromTrebleInput = (raw) => {
                // raw: "F#, C#" or "Bb,Eb" ...
                const cleaned = (raw || '')
                    .replace(/♯/g, '#')
                    .replace(/♭/g, 'b')
                    .replace(/;/g, ',')
                    .trim();

                const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
                const byLetter = {};
                for (const p of parts) {
                    const m = p.match(/([A-Ga-g])\s*([#b])?/);
                    if (!m) continue;
                    const letter = m[1].toUpperCase();
                    const acc = m[2] || (p.includes('#') ? '#' : (p.includes('b') ? 'b' : null));
                    if (acc !== '#' && acc !== 'b') continue;
                    if (!byLetter[letter]) byLetter[letter] = acc; // dedupe
                }

                const letters = Object.keys(byLetter);
                if (letters.length === 0) return;

                const accs = letters.map(l => byLetter[l]);
                const kind = accs.every(a => a === '#') ? '#' : (accs.every(a => a === 'b') ? 'b' : 'mixed');

                // If it's a standard signature (prefix of sharp/flat order) => suy ra luôn giọng (major/minor theo dropdown)
                if (kind === '#' || kind === 'b') {
                    const order = kind === '#' ? SHARP_ORDER : FLAT_ORDER;
                    const expected = order.slice(0, letters.length);
                    const setEq = (a, b) => a.length === b.length && a.every(x => b.includes(x));
                    if (setEq(expected, letters)) {
                        const table = (keyMode === 'minor')
                            ? (kind === '#' ? MINOR_BY_SHARPS : MINOR_BY_FLATS)
                            : (kind === '#' ? MAJOR_BY_SHARPS : MAJOR_BY_FLATS);

                        const tonic = table[letters.length];
                        if (tonic) {
                            setKeyTonic(tonic);
                            updateHeaderField('K', buildKeyString(tonic, keyMode));
                            return;
                        }
                    }

                    // Fallback: explicit signature bằng exp (không cần biết giọng)
                    const ordered = order.filter(n => byLetter[n] === kind);
                    const expTokens = ordered.map(n => (kind === '#' ? `^${n.toLowerCase()}` : `_${n.toLowerCase()}`));
                    updateHeaderField('K', `C exp ${expTokens.join(' ')}`);
                    return;
                }

                // Mixed #/b => fallback exp (giữ đúng bộ dấu)
                const expTokens = letters.map(n => (byLetter[n] === '#' ? `^${n.toLowerCase()}` : `_${n.toLowerCase()}`));
                updateHeaderField('K', `C exp ${expTokens.join(' ')}`);
            };


            // --- TÍNH TOÁN NỐT NHẠC ---
            const getNoteString = (baseNote, octaveObj, accidental = '') => {
                let note = baseNote;
                if (octaveObj.lowerCase) note = note.toLowerCase();

                let lengthStr = '';
                if (duration === '1') lengthStr = isDotted ? '6' : '4'; 
                else if (duration === '2') lengthStr = isDotted ? '3' : '2'; 
                else if (duration === '4') lengthStr = isDotted ? '3/2' : ''; 
                else if (duration === '8') lengthStr = isDotted ? '3/4' : '/2'; 
                else if (duration === '16') lengthStr = isDotted ? '3/8' : '/4'; 
                else if (duration === '32') lengthStr = isDotted ? '3/16' : '/8'; 

                return `${accidental}${note}${octaveObj.suffix}${lengthStr}`;
            };

            // --- SỰ KIỆN CLICK & PRESS NỐT ---
            const handleNoteDoubleClick = (baseNote, octaveObj) => {
                const noteStr = getNoteString(baseNote, octaveObj);
                insertSmartText(noteStr);
            };

            const handleMouseDown = (e, baseNote, octaveObj) => {
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                pressTimer.current = setTimeout(() => {
                    setLongPressTarget({
                        baseNote,
                        octaveObj,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 40
                    });
                }, 400); 
            };

            const handleMouseUpOrLeave = () => {
                if (pressTimer.current) {
                    clearTimeout(pressTimer.current);
                    pressTimer.current = null;
                }
            };

            const selectAccidental = (accidental) => {
                if (longPressTarget) {
                    const noteStr = getNoteString(longPressTarget.baseNote, longPressTarget.octaveObj, accidental);
                    insertSmartText(noteStr);
                    setLongPressTarget(null);
                }
            };


            // --- NHÓM CỘT NỐT (CHORD) ---
            // Cách dùng: bôi đen các nốt trong khung ABC (ví dụ: "C E G" hoặc "C2 E2 G2") rồi bấm nút "Nhóm cột nốt"
            const groupSelectedToChord = () => {
                const ta = textAreaRef.current;
                if (!ta) return;

                const start = ta.selectionStart ?? cursorPos;
                const end = ta.selectionEnd ?? cursorPos;

                if (start === end) {
                    alert('Hãy bôi đen ít nhất 2 nốt trong khung ABC rồi bấm "Nhóm cột nốt".\nVí dụ: C E G  hoặc  C2 E2 G2');
                    return;
                }

                const raw = abcText.slice(start, end);
                const selected = raw.trim();
                const tokens = selected.split(/\s+/).filter(Boolean);

                if (tokens.length < 2) {
                    alert('Hãy chọn ít nhất 2 nốt để nhóm thành cột nốt.');
                    return;
                }

                // Không cho nhóm nếu đã có chord hoặc có ký tự lạ
                if (tokens.some(t => t.includes('[') || t.includes(']') || t.includes('|'))) {
                    alert('Vùng chọn chỉ nên gồm các nốt (không gồm | hay [ ]). Ví dụ: C E G hoặc C2 E2 G2');
                    return;
                }

                const parseNote = (tok) => {
                    const m = tok.match(/^([\^_=]*[A-Ga-g][,']*)(\d+\/\d+|\d+|\/\d+|\/)?$/);
                    if (!m) return null;
                    return { head: m[1], len: m[2] || '' };
                };

                const parsed = tokens.map(parseNote);
                if (parsed.some(p => !p)) {
                    alert('Vùng chọn phải chỉ gồm các nốt hợp lệ. Ví dụ: C E G hoặc ^F A c\'');
                    return;
                }

                const len = parsed[0].len;
                if (!parsed.every(p => p.len === len)) {
                    alert('Các nốt đang chọn phải cùng trường độ (ví dụ: C2 E2 G2).');
                    return;
                }

                const chord = `[${parsed.map(p => p.head).join('')}]${len}`;

                const before = abcText.slice(0, start);
                const after = abcText.slice(end);

                let insert = chord;

                // Thêm khoảng trắng cho "đẹp" khi dán vào giữa văn bản
                if (before && !/[ \t\n|]$/.test(before)) insert = ' ' + insert;
                if (!after || !/^[ \t\n|]/.test(after)) insert = insert + ' ';
                else insert = insert + ' ';

                const newText = before + insert + after;
                const newPos = (before + insert).length;

                updateTextAndSync(newText, newPos);
            };

            // --- VOICING TABS ---
            const addVoice = (clef) => {
                if (voices.length >= 2) return;
                const newVoiceId = voices.length + 1;
                setVoices([...voices, { id: newVoiceId, clef }]);
                setShowAddVoice(false);
                setActiveVoice(newVoiceId);

                const voiceDecl = `V:${newVoiceId} clef=${clef}`;
                const lines = abcText.split('\n');
                let insertIdx = lines.findIndex(l => l.startsWith('V:'));
                if (insertIdx === -1) insertIdx = lines.findIndex(l => l.startsWith('K:'));

                if (insertIdx !== -1) {
                    let lastVIdx = insertIdx;
                    for (let i = insertIdx; i < lines.length; i++) {
                        if (lines[i].startsWith('V:')) lastVIdx = i;
                        else if (!lines[i].startsWith('V:') && i > insertIdx) break;
                    }
                    lines.splice(lastVIdx + 1, 0, voiceDecl);
                } else {
                    lines.unshift(voiceDecl);
                }

                let newText = lines.join('\n');
                newText = newText.trimEnd() + `\n[V:${newVoiceId}] `;
                updateTextAndSync(newText, newText.length);
            };

            const changeVoiceTab = (id) => {
                setActiveVoice(id);
                const voiceMarker = `[V:${id}]`;
                const matchPos = abcText.indexOf(voiceMarker);
                if (matchPos !== -1) {
                    const searchStart = matchPos + voiceMarker.length;
                    const restText = abcText.substring(searchStart);
                    const nextVoiceMatch = restText.match(/\[V:\d+\]/);
                    let endPos = nextVoiceMatch 
                        ? searchStart + nextVoiceMatch.index 
                        : abcText.length;

                    while (endPos > searchStart && (abcText[endPos - 1] === ' ' || abcText[endPos - 1] === '\n')) {
                        endPos--;
                    }

                    updateTextAndSync(abcText, endPos);
                }
            };

            // --- OPTIMIZE (Format / Clean / Validate / Auto-barline) ---
            const parseHeaderField = (field, fallback) => {
                const m = abcText.match(new RegExp(`^${field}:\\s*(.*)$`, 'm'));
                return m ? (m[1] || '').trim() : fallback;
            };

            const parseFrac = window.AppMusicUtils.parseFraction;

            const parseLenSuffix = window.AppMusicUtils.parseLengthSuffix;

            const tokenDurationWhole = window.AppMusicUtils.tokenDurationWhole;

            const getVoiceBlock = (voiceId) => {
                const marker = `[V:${voiceId}]`;
                const start = abcText.indexOf(marker);
                if (start === -1) return null;
                const afterStart = start + marker.length;
                const rest = abcText.slice(afterStart);
                const next = rest.match(/\n\[V:\d+\]/);
                const end = next ? afterStart + next.index : abcText.length;
                return { start, afterStart, end };
            };

            const getVoiceMusic = (voiceId) => {
                const blk = getVoiceBlock(voiceId);
                if (!blk) return null;
                const content = abcText.slice(blk.afterStart, blk.end);
                return content.replace(/\n/g, ' ').trim();
            };

            const formatVoiceBars = (voiceId, music, barsPerLine = 4) => {
                // normalize barlines for formatting only
                const normalized = (music || '')
                    .replace(/\|:/g, '|')
                    .replace(/:\|/g, '|')
                    .replace(/\|\|/g, '|')
                    .replace(/\|\]/g, '|');

                const measures = normalized.split('|').map(x => x.trim()).filter(Boolean);
                const tag = `[V:${voiceId}] `;
                const lines = [];
                for (let i = 0; i < measures.length; i += barsPerLine) {
                    const chunk = measures.slice(i, i + barsPerLine).join(' | ');
                    lines.push(tag + chunk + ' |');
                }
                return lines.join('\n');
            };

            const handleOptimizeFormat = () => {
                const lines = abcText.split('\n');
                const optimizedLines = [];

                lines.forEach(line => {
                    if (/^[A-Za-z]:/.test(line) || line.trim() === '') {
                        optimizedLines.push(line);
                        return;
                    }

                    const measures = line.split('|').map(m => m.trim()).filter(m => m !== '');
                    let voiceTag = '';
                    if (measures.length > 0 && measures[0].startsWith('[V:')) {
                        const match = measures[0].match(/(\[V:\d+\])(.*)/);
                        if (match) {
                            voiceTag = match[1] + ' ';
                            measures[0] = match[2].trim();
                        }
                    }

                    let currentLine = voiceTag;
                    for (let i = 0; i < measures.length; i++) {
                        currentLine += measures[i] + ' | ';
                        if ((i + 1) % 4 === 0 && i !== measures.length - 1) {
                            optimizedLines.push(currentLine.trim());
                            currentLine = voiceTag; // giữ tag cho dòng tiếp
                        }
                    }
                    if (currentLine.trim() !== '') {
                        optimizedLines.push(currentLine.trim());
                    }
                });

                applyTextChange(
                    optimizedLines.join('\n'),
                    Math.min(cursorPosRef.current, optimizedLines.join('\n').length),
                    { focus: false }
                );
            };

            const handleOptimizeCleanSpacing = () => {
                const lines = abcText.split('\n');
                const out = lines.map(line => {
                    if (/^[A-Za-z]:/.test(line) || line.trim() === '') return line.trimEnd();

                    // keep special barlines by temporarily protecting them
                    let t = line;
                    t = t.replace(/\|:/g, '§STARTREP§').replace(/:\|/g, '§ENDREP§').replace(/\|\]/g, '§END§');
                    t = t.replace(/\s+/g, ' ').trim();
                    t = t.replace(/\s*\|\s*/g, ' | ');
                    t = t.replace(/§STARTREP§/g, '|:').replace(/§ENDREP§/g, ':|').replace(/§END§/g, '|]');
                    return t;
                });

                applyTextChange(out.join('\n'), Math.min(cursorPosRef.current, out.join('\n').length), { focus: false });
            };

            const handleOptimizeBeamNotes = () => {
                try {
                    const L = parseHeaderField('L', '1/4');
                    const lFrac = parseFrac(L);
                    if (lFrac == null) throw new Error(`Không đọc được L: "${L}"`);
                    const LWhole = lFrac;
                    const BEAM_THRESH = 1/8; // quaver (móc đơn) hoặc nhỏ hơn

                    const isBeamable = (tok) => {
                        const t = (tok || '').trim();
                        if (!t) return false;
                        // đừng nối qua rest
                        if (t.replace(/[()]/g, '').startsWith('z')) return false;
                        const d = tokenDurationWhole(t, LWhole);
                        if (d == null) return false;
                        return d > 0 && d <= BEAM_THRESH + 1e-9;
                    };

                    const lines = abcText.split('\n');
                    const out = [];

                    for (const line of lines) {
                        const ln = line || '';
                        if (/^[A-Za-z]:/.test(ln) || ln.trim() === '') {
                            out.push(ln);
                            continue;
                        }

                        // bỏ qua nếu có repeat/ending đặc biệt (đỡ phá)
                        if (/\|:|:\||\[\d+/.test(ln)) {
                            out.push(ln);
                            continue;
                        }

                        let voiceTag = '';
                        let music = ln;

                        const vm = music.match(/^(\[V:\d+\])\s*(.*)$/);
                        if (vm) {
                            voiceTag = vm[1] + ' ';
                            music = vm[2] || '';
                        }

                        const hasTrailingBar = /\|\s*$/.test(music);
                        const parts = music.split('|');

                        const rebuiltParts = parts.map(seg => {
                            const tokens = seg.trim().split(/\s+/).filter(Boolean);
                            if (tokens.length <= 1) return tokens.join(' ');

                            let acc = tokens[0];
                            for (let i = 1; i < tokens.length; i++) {
                                const prev = tokens[i - 1];
                                const cur = tokens[i];
                                if (isBeamable(prev) && isBeamable(cur)) acc += cur;
                                else acc += ' ' + cur;
                            }
                            return acc;
                        });

                        let rebuilt = rebuiltParts.map(x => x.trim()).filter((_, i) => i < rebuiltParts.length - 1 ? true : true).join(' | ');
                        if (hasTrailingBar && !rebuilt.trim().endsWith('|')) rebuilt = rebuilt.trim() + ' |';

                        // normalize bar spacing
                        rebuilt = rebuilt.replace(/\s+\|/g, ' |').replace(/\|\s+/g, '| ');

                        out.push((voiceTag + rebuilt).trim());
                    }

                    applyTextChange(out.join('\n'), cursorPos, { focus: false, skipHistory: false });
                } catch (e) {
                    alert(e?.message ? String(e.message) : 'Không thể gộp móc (beaming).');
                }
            };


            const handleOptimizeValidateBars = () => {
                try {
                    const M = parseHeaderField('M', '4/4');
                    const L = parseHeaderField('L', '1/4');
                    const mFrac = parseFrac(M);
                    const lFrac = parseFrac(L);

                    if (mFrac == null) throw new Error(`Không đọc được nhịp M: "${M}"`);
                    if (lFrac == null) throw new Error(`Không đọc được L: "${L}"`);

                    const barLen = mFrac;      // whole-note fraction
                    const LWhole = lFrac;

                    const reportForVoice = (vid) => {
                        const music = getVoiceMusic(vid);
                        if (!music) return null;

                        const normalized = music.replace(/\|:/g, '|').replace(/:\|/g, '|').replace(/\|\|/g, '|').replace(/\|\]/g, '|');
                        const bars = normalized.split('|').map(x => x.trim()).filter(Boolean);
                        const issues = [];

                        bars.forEach((bar, idx) => {
                            const tokens = bar.split(/\s+/).filter(Boolean);
                            let sum = 0;
                            for (const tok of tokens) {
                                const d = tokenDurationWhole(tok, LWhole);
                                if (d == null) throw new Error(`Không parse được trường độ token: "${tok}" (voice ${vid}, bar ${idx + 1})`);
                                sum += d;
                            }
                            const diff = sum - barLen;
                            if (Math.abs(diff) > 1e-6) issues.push({ bar: idx + 1, diff });
                        });

                        return issues;
                    };

                    const v1Issues = reportForVoice(1);
                    const v2Issues = voices.some(v => v.id === 2) ? reportForVoice(2) : null;

                    const fmt = (diff) => {
                        const sign = diff > 0 ? '+' : '';
                        // show as fraction of L (approx)
                        const inL = diff / LWhole;
                        return `${sign}${inL.toFixed(3)}×L`;
                    };

                    let msg = `Kiểm tra nhịp (M=${M}, L=${L})\n\n`;

                    if (!v1Issues || v1Issues.length === 0) msg += `Voice 1: OK\n`;
                    else msg += `Voice 1 lỗi: ` + v1Issues.map(x => `bar ${x.bar} (${fmt(x.diff)})`).join(', ') + `\n`;

                    if (v2Issues != null) {
                        if (v2Issues.length === 0) msg += `Voice 2: OK\n`;
                        else msg += `Voice 2 lỗi: ` + v2Issues.map(x => `bar ${x.bar} (${fmt(x.diff)})`).join(', ') + `\n`;
                    }

                    alert(msg);
                } catch (e) {
                    alert(e?.message ? String(e.message) : 'Validate nhịp bị lỗi');
                }
            };

            const handleOptimizeAutoBarline = () => {
try {
                    const M = parseHeaderField('M', '4/4');
                    const L = parseHeaderField('L', '1/4');
                    const mFrac = parseFrac(M);
                    const lFrac = parseFrac(L);
                    if (mFrac == null) throw new Error(`Không đọc được M: "${M}"`);
                    if (lFrac == null) throw new Error(`Không đọc được L: "${L}"`);

                    const barLen = mFrac;
                    const LWhole = lFrac;

                    const abortIfSpecial = (music) => {
                        if (/\|:|:\||\[\d+/.test(music)) {
                            throw new Error('Auto Barline chưa hỗ trợ repeat/ending (|: :|, [1 [2). Hãy xoá chúng trước.');
                        }
                        if (/\(\d/.test(music)) {
                            throw new Error('Auto Barline chưa hỗ trợ tuplet (ví dụ: (3abc).');
                        }
                    };

                    const rebuildMusic = (music) => {
                        const raw = (music || '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
                        abortIfSpecial(music);

                        const tokens = raw.split(' ').filter(Boolean);
                        let sum = 0;
                        const out = [];
                        for (const tok of tokens) {
                            const d = tokenDurationWhole(tok, LWhole);
                            if (d == null) throw new Error(`Không parse được token: "${tok}"`);
                            if (d === 0) { out.push(tok); continue; }

                            if (sum + d > barLen + 1e-6) {
                                throw new Error(`Bị dư phách khi chia nhịp tại token "${tok}". (Gợi ý: kiểm tra trường độ hoặc tie)`);
                            }

                            out.push(tok);
                            sum += d;

                            if (Math.abs(sum - barLen) <= 1e-6) {
                                out.push('|');
                                sum = 0;
                            }
                        }
                        if (out.length && out[out.length - 1] !== '|') out.push('|');
                        return out.join(' ').replace(/\s+\|/g, ' |').replace(/\|\s+/g, '| ');
                    };

                    let newText = abcText;

                    // rebuild V1
                    const v1 = getVoiceMusic(1);
                    if (v1 != null) {
                        const rebuilt = rebuildMusic(v1);
                        const blk = getVoiceBlock(1);
                        const formatted = formatVoiceBars(1, rebuilt, 4);
                        newText = newText.slice(0, blk.start) + formatted + newText.slice(blk.end);
                    }

                    // rebuild V2 if present
                    if (voices.some(v => v.id === 2)) {
                        const v2 = getVoiceMusic(2);
                        if (v2 != null) {
                            const rebuilt2 = rebuildMusic(v2);
                            const blk2 = getVoiceBlock(2);
                            const formatted2 = formatVoiceBars(2, rebuilt2, 4);
                            newText = newText.slice(0, blk2.start) + formatted2 + newText.slice(blk2.end);
                        }
                    }

                    setAutoBarlineBefore(abcText);
                    setAutoBarlineAfter(newText);
                    setShowAutoBarlinePreview(true);
                } catch (e) {
                    alert(e?.message ? String(e.message) : 'Auto Barline bị lỗi');
                }
            };

            const applyAutoBarlinePreview = () => {
                const next = autoBarlineAfter || '';
                applyTextChange(next, Math.min(cursorPosRef.current, next.length), { focus: false });
                syncVoicesFromText(next);
                setShowAutoBarlinePreview(false);
            };


            // --- COPY CLIPBOARD ---
            const handleCopy = () => {
                const textArea = document.createElement("textarea");
                textArea.value = abcText;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                } catch (err) {
                    console.error('Copy failed', err);
                }
                document.body.removeChild(textArea);
            };

            // --- RESET TEXT FORM ---
            const resetEditorToDefault = useCallback(({ skipHistory = false } = {}) => {
                setTitle('New Song');
                setComposer('Composer');
                setMeter('4/4');
                setDuration('4');
                setIsDotted(false);
                setTempo('120');

                setKeyTonic('C');
                setKeyMode('major');
                setKeySigInput(KEY_SIG_HINT);
                setKeySigDirty(false);

                setVoices([{ id: 1, clef: 'treble' }]);
                setActiveVoice(1);
                setShowAddVoice(false);

                applyTextChange(DEFAULT_ABC, DEFAULT_ABC.length, { focus: false, skipHistory });
                try { localStorage.setItem('abc_quickwriter_autosave_v1', DEFAULT_ABC); } catch (e) {}
            }, [applyTextChange]);

            // --- Supabase Auth + Personal Library ---
            const {
                sessionChecked,
                currentUser,
                showAuthModal,
                showAccountMenu,
                setShowAccountMenu,
                showLibraryMenu,
                setShowLibraryMenu,
                librarySearch,
                setLibrarySearch,
                showSaveChoiceModal,
                setShowSaveChoiceModal,
                authMode,
                setAuthMode,
                authEmail,
                setAuthEmail,
                authPassword,
                setAuthPassword,
                authBusy,
                authError,
                setAuthError,
                authInfo,
                setAuthInfo,
                passwordRecoveryReady,
                setPasswordRecoveryReady,
                libraryItems,
                filteredLibraryItems,
                libraryBusy,
                currentSongId,
                cloudBusy,
                cloudDirty,
                lastCloudSavedAt,
                openAuthModal,
                closeAuthModal,
                formatLibraryTime,
                handleLibrarySelect,
                handleForgotPassword,
                handleAuthSubmit,
                handleSignOut,
                handleResetText,
                handleNewLibraryDraft,
                performSaveToLibrary,
                handleSaveToLibrary,
                handleDeleteLibrarySong,
            } = useLibraryFeature({
                supabaseClient,
                showToast,
                editorState: {
                    abcText,
                    title,
                    composer,
                    meter,
                    tempo,
                    keyTonic,
                    keyMode,
                    keySigInput,
                    keySigDirty,
                    lang,
                    theme,
                    duration,
                    isDotted,
                    activeVoice,
                    voices,
                },
                editorActions: {
                    setTitle,
                    setComposer,
                    setMeter,
                    setTempo,
                    setKeyTonic,
                    setKeyMode,
                    setKeySigInput,
                    setKeySigDirty,
                    setLang,
                    setTheme,
                    setDuration,
                    setIsDotted,
                    setActiveVoice,
                    applyTextChange,
                    syncVoicesFromText,
                },
                editorConfig: {
                    DEFAULT_ABC,
                    KEY_SIG_HINT,
                    THEMES,
                    DURATION_ORDER,
                    buildKeyString,
                    getHeaderValue,
                    parseKeyLine,
                },
                resetEditorToDefault,
            });

            useDismissibleLayer(showExportMenu, '[data-export-root]', () => setShowExportMenu(false));
            useDismissibleLayer(showOptimizeMenu, '[data-optimize-root]', () => setShowOptimizeMenu(false));
            useDismissibleLayer(showLibraryMenu, '[data-library-root]', () => setShowLibraryMenu(false));
            useDismissibleLayer(showAccountMenu, '[data-account-root]', () => setShowAccountMenu(false));
            useEscapeToClose(showHotkeysModal, () => setShowHotkeysModal(false));

            // --- EXPORT HELPERS ---
            const makeSafeFileName = (base, ext) => {
                const raw = (base || 'abc_score').trim() || 'abc_score';
                const safe = raw
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9-_ ]+/g, '')
                    .trim()
                    .replace(/\s+/g, '_')
                    .slice(0, 60) || 'abc_score';
                return safe + ext;
            };


            const getTitleFromAbc = (abc) => {
                const m = String(abc || '').match(/^T:\s*(.+)$/m);
                return m ? String(m[1] || '').trim() : '';
            };

            const getExportTitleRaw = () => {
                const abcTitle = getTitleFromAbc(abcTextRef.current);
                const st = String(title || '').trim();
                return (abcTitle || st || 'abc_score');
            };

            const getExportDocTitleSafe = () => {
                // ASCII-safe title for browser print/save-as-PDF default filename
                return makeSafeFileName(getExportTitleRaw(), '').trim() || 'abc_score';
            };

            const downloadBlob = (blob, filename) => {
                try {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 500);
                } catch (e) {
                    alert('Không thể tải file trên trình duyệt này.');
                }
            };

            const exportABC = () => {
                const fn = makeSafeFileName(getExportTitleRaw(), '.abc');
                const blob = new Blob([abcTextRef.current], { type: 'text/plain;charset=utf-8' });
                downloadBlob(blob, fn);
            };

            const exportMIDI = () => {
                if (!window.ABCJS?.synth?.getMidiFile) {
                    alert('MIDI export chưa sẵn sàng (ABCJS synth chưa tải xong).');
                    return;
                }
                try {
                    const out = window.ABCJS.synth.getMidiFile(abcTextRef.current, { midiOutputType: 'binary' });
                    const blob = Array.isArray(out) ? out[0] : out;

                    if (blob instanceof Blob) {
                        downloadBlob(blob, makeSafeFileName(getExportTitleRaw(), '.midi'));
                        return;
                    }

                    // Fallback: encoded data URI
                    const encOut = window.ABCJS.synth.getMidiFile(abcTextRef.current, { midiOutputType: 'encoded' });
                    const enc = Array.isArray(encOut) ? encOut[0] : encOut;
                    const a = document.createElement('a');
                    a.href = 'data:audio/midi,' + (enc || '');
                    a.download = makeSafeFileName(getExportTitleRaw(), '.midi');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } catch (e) {
                    alert('Xuất MIDI bị lỗi. Hãy thử Render lại rồi export.');
                }
            };

            const exportPDF = () => {
                const html = renderAreaRef.current ? renderAreaRef.current.innerHTML : '';
                if (!html || html.trim().length === 0) {
                    alert('Chưa có bản nhạc để xuất. Hãy Render trước.');
                    return;
                }
                const w = window.open('', '_blank');
                if (!w) {
                    alert('Trình duyệt chặn popup. Hãy cho phép popup rồi thử lại.');
                    return;
                }

                const docTitle = String(getExportDocTitleSafe() || 'Sheet_Music').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${docTitle}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body{margin:0;padding:18px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a;}
svg{width:100% !important;height:auto !important;display:block;}
.abcjs-page{max-width:920px;margin:0 auto;}
@media print{body{padding:0}.abcjs-page{max-width:none}}
</style>


</head>
<body>
<div class="abcjs-page">${html}</div>
<script>
window.onload=()=>{setTimeout(()=>{window.focus();window.print();},50);}
<\/script>
</body>
</html>`);
                w.document.close();
            };

            const exportMXL = async () => {
                try { await navigator.clipboard.writeText(abcTextRef.current); } catch (e) {}
                alert('Bản offline này chưa xuất MusicXML/.mxl trực tiếp (ABCJS không hỗ trợ chuyển ABC → MusicXML).\n\nMình đã copy ABC vào clipboard. Bạn có thể dán vào MuseScore hoặc công cụ khác để xuất MusicXML (.mxl).');
            };

            const t = (key) => tFor(lang, key);
            const hasRangeAnchor = !!rangeSelection;
            const hasActiveRange = !!(rangeSelection && rangeSelection.type === 'active');

            const clearSelectedRange = () => {
                closeRangeMenu();
                if (playbackModeRef.current === 'range') {
                    stopAudio();
                }
                commitRangeSelection(null);
            };

            try { setLanguage(lang); } catch (e) {}

            useEffect(() => {
                try { syncDocumentLanguage(lang, t('app_title')); } catch (e) {}
            }, [lang]);

            // --- UI RENDER ---
            return (
                <div className="qs-app flex flex-col h-screen">
                    {toast && (
                        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] px-3 py-2 rounded-xl bg-slate-900/90 text-white text-sm shadow-lg border border-white/10">
                            {toast}
                        </div>
                    )}
                    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-white border-b border-slate-200 shadow-sm min-h-14 shrink-0 relative z-[9999]">
                        <div className="flex flex-wrap items-center gap-3 min-w-0">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
                                    <Music size={20} className="text-white" />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">Liem <span className="text-indigo-600">QuickScore</span></h1>
                            </div>

                            <CloudControls
                                currentUser={currentUser}
                                cloudDirty={cloudDirty}
                                currentSongId={currentSongId}
                                libraryItems={libraryItems}
                                title={title}
                                libraryBusy={libraryBusy}
                                showLibraryMenu={showLibraryMenu}
                                setShowLibraryMenu={setShowLibraryMenu}
                                librarySearch={librarySearch}
                                setLibrarySearch={setLibrarySearch}
                                filteredLibraryItems={filteredLibraryItems}
                                handleLibrarySelect={handleLibrarySelect}
                                handleDeleteLibrarySong={handleDeleteLibrarySong}
                                cloudBusy={cloudBusy}
                                handleNewLibraryDraft={handleNewLibraryDraft}
                                handleSaveToLibrary={handleSaveToLibrary}
                                showAccountMenu={showAccountMenu}
                                setShowAccountMenu={setShowAccountMenu}
                                sessionChecked={sessionChecked}
                                lastCloudSavedAt={lastCloudSavedAt}
                                formatLibraryTime={formatLibraryTime}
                                handleSignOut={handleSignOut}
                                openAuthModal={openAuthModal}
                            />
                        </div>
                        <div className="flex items-center bg-slate-100 rounded-lg p-1 space-x-1">
                            <button onClick={togglePlay} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-indigo-600 transition-all">
                                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                            </button>
                            <button onClick={stopAudio} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all">
                                <Square size={18} />
                            </button>
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <button
                                onClick={() => setLoopEnabled(v => !v)}
                                className={`group flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-all ${loopEnabled ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_0_1px_rgba(99,102,241,0.08),0_0_18px_rgba(99,102,241,0.28)]' : 'bg-white/75 text-slate-500 border-transparent hover:bg-white hover:text-indigo-600 hover:border-slate-200 hover:shadow-sm'}`}
                                title={loopEnabled ? 'Loop đang bật' : 'Loop đang tắt'}
                            >
                                <RotateCcwIcon size={14} className={`transition-transform ${loopEnabled ? '-rotate-45' : 'opacity-70 group-hover:-rotate-45'}`} />
                                <span>Loop</span>
                            </button>
                            <button
                                onClick={() => { if (hasRangeAnchor) clearSelectedRange(); }}
                                className={`px-3 py-2 text-xs font-semibold rounded-md transition-all ${hasActiveRange ? 'bg-white text-emerald-700 shadow-sm' : hasRangeAnchor ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-400 opacity-60 hover:bg-white/60'}`}
                                title={hasActiveRange ? 'Clear range đang hoạt động' : hasRangeAnchor ? 'Clear điểm bắt đầu đã chọn' : 'Chưa chọn range'}
                            >
                                Range
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <button onClick={handleUndo} disabled={undoStack.length === 0} title="Undo (tối đa 5 bước)" className={`p-2 rounded-lg border border-slate-200 bg-white text-slate-700 transition-all ${undoStack.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 hover:shadow-sm'}`}>
                                <UndoIcon size={18} />
                            </button>
                            <button onClick={handleRedo} disabled={redoStack.length === 0} title="Redo (tối đa 5 bước)" className={`p-2 rounded-lg border border-slate-200 bg-white text-slate-700 transition-all ${redoStack.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 hover:shadow-sm'}`}>
                                <RedoIcon size={18} />
                            </button>
                            <div className="relative z-[9999]" data-export-root>
                                <button
                                    onClick={() => setShowExportMenu(v => !v)}
                                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium rounded-lg transition-colors flex items-center border border-slate-200 shadow-sm"
                                    title="Export"
                                >
                                    <DownloadIcon size={16} className="mr-2 text-slate-700" />
                                    {t('export')}
                                </button>

                                {showExportMenu && (
                                    <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[9999]">
                                        <button
                                            onClick={() => { setShowExportMenu(false); exportPDF(); }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <span className="text-slate-800">🖨️</span>
                                            <span className="text-sm font-semibold text-slate-900">{t('export_pdf')}</span>
                                        </button>

                                        <button
                                            onClick={() => { setShowExportMenu(false); exportABC(); }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                                        >
                                            <span className="text-slate-800">🧾</span>
                                            <span className="text-sm font-semibold text-slate-900">{t('export_abc')}</span>
                                        </button>

                                        <button
                                            onClick={() => { setShowExportMenu(false); exportMXL(); }}
                                            className="w-full text-left px-4 py-3 hover:bg-amber-50 flex items-center gap-2 border-t border-slate-100"
                                        >
                                            <span className="text-amber-700">⚠️</span>
                                            <span className="text-sm font-semibold text-amber-800">{t('export_mxl')}</span>
                                        </button>

                                        <button
                                            onClick={() => { setShowExportMenu(false); exportMIDI(); }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                                        >
                                            <span className="text-slate-800">🎧</span>
                                            <span className="text-sm font-semibold text-slate-900">{t('export_midi')}</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pl-1">
                                <GlobeIcon size={16} className="text-slate-500" />
                                <select
                                    value={lang}
                                    onChange={(e) => setLang(e.target.value)}
                                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 outline-none hover:bg-slate-50"
                                    title="Language"
                                >
                                    <option value="en">{t('lang_en')}</option>
                                    <option value="vi">{t('lang_vi')}</option>
                                    <option value="jp">{t('lang_jp')}</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 pl-1">
                                <PaletteIcon size={16} className="text-slate-500" />
                                <select
                                    value={theme}
                                    onChange={(e) => setTheme(e.target.value)}
                                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 outline-none hover:bg-slate-50"
                                    title="Theme"
                                >
                                    <option value="retro">Retro</option>
                                    <option value="ocean">Ocean</option>
                                    <option value="coder">Dark</option>
                                </select>
                            </div>

                            <button
                                onClick={handleImportClick}
                                disabled={importBusy}
                                className={"px-2 py-2 text-sm underline underline-offset-4 rounded-lg transition-colors " + (importBusy ? "text-slate-400 cursor-not-allowed" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100")}
                                title="Import PDF / ảnh / MXL / MIDI"
                            >
                                {importBusy ? 'Importing…' : 'Import'}
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf,image/*,.mxl,.xml,.musicxml,.mid,.midi"
                                onChange={handleImportFileChange}
                                className="hidden"
                            />

                            <button
                                onClick={() => setShowHotkeysModal(true)}
                                className="px-2 py-2 text-sm text-slate-700 underline underline-offset-4 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Xem tất cả hotkeys"
                            >
                                Hotkeys
                            </button>

<div className="relative z-[9999]" data-optimize-root>
                            <button
                                onClick={() => setShowOptimizeMenu(v => !v)}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center shadow-md shadow-slate-200"
                                title="Optimize"
                            >
                                <SparklesIcon size={16} className="mr-2" />
                                Optimize
                            </button>

                            {showOptimizeMenu && (
                                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[9999]">
                                    <button
                                        onClick={() => { setShowOptimizeMenu(false); handleOptimizeFormat(); }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3"
                                    >
                                        <div className="mt-0.5 text-slate-800">🧾</div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">Ngắt dòng đẹp (4 ô / dòng)</div>
                                            <div className="text-[11px] text-slate-500">Chỉ format lại cho dễ đọc. Không sửa nhạc.</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setShowOptimizeMenu(false); handleOptimizeCleanSpacing(); }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3 border-t border-slate-100"
                                    >
                                        <div className="mt-0.5 text-slate-800">🧼</div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">Dọn khoảng trắng</div>
                                            <div className="text-[11px] text-slate-500">Chuẩn hoá spacing quanh vạch nhịp, không đổi nội dung.</div>
                                        </div>
                                    </button>





                                    <button
                                        onClick={() => { setShowOptimizeMenu(false); handleOptimizeValidateBars(); }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3 border-t border-slate-100"
                                    >
                                        <div className="mt-0.5 text-slate-800">✅</div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">Kiểm tra nhịp (M/L)</div>
                                            <div className="text-[11px] text-slate-500">Báo ô nhịp thiếu/dư phách (cơ bản).</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setShowOptimizeMenu(false); handleOptimizeAutoBarline(); }}
                                        className="w-full text-left px-4 py-3 hover:bg-amber-50 flex items-start gap-3 border-t border-slate-100"
                                    >
                                        <div className="mt-0.5 text-amber-700">⚠️</div>
                                        <div>
                                            <div className="text-sm font-semibold text-amber-800">Tự chia nhịp lại (xoá vạch cũ)</div>
                                            <div className="text-[11px] text-amber-700">Xoá toàn bộ “|” rồi chia lại theo trường độ. Có cảnh báo.</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                        </div>
                    </header>



                    <div className="flex flex-1 overflow-hidden p-4 gap-4 w-full">
                        <div className="w-[560px] 2xl:w-[620px] flex flex-col gap-3 min-w-[360px]">
                            <div className="flex h-2/5 gap-3">
                                <div className="w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center">
                                        <Edit3 size={16} className="text-indigo-500 mr-2" />
                                        <h2 className="font-semibold text-sm">Thông tin &amp; Trường độ</h2>
                                    </div>

                                    <div className="p-3 space-y-3 overflow-y-auto">
                                        <div className="space-y-3">
                                            <input type="text" value={title} placeholder="Tên bài hát..." onChange={e => setTitle(e.target.value)} onBlur={(e) => updateHeaderField('T', e.target.value)} className="w-full text-sm border border-slate-200 p-2 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all" />
                                            <div className="flex space-x-2">
                                                <input type="text" value={composer} placeholder="Composer" onChange={e => setComposer(e.target.value)} onBlur={(e) => updateHeaderField('C', e.target.value)} className="w-1/2 text-sm border border-slate-200 p-2 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all" />
                                                <select value={meter} onChange={e => { setMeter(e.target.value); updateHeaderField('M', e.target.value); }} className="w-1/4 text-sm border border-slate-200 p-2 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400">
                                                    <option value="4/4">4/4</option>
                                                    <option value="3/4">3/4</option>
                                                    <option value="2/4">2/4</option>
                                                    <option value="6/8">6/8</option>
                                                </select>
                                                <input type="number" value={tempo} placeholder="BPM" title="Tempo (BPM)" onChange={e => setTempo(e.target.value)} onBlur={(e) => updateHeaderField('Q', `1/4=${e.target.value}`)} className="w-1/4 text-sm border border-slate-200 p-2 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all" />
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Chọn trường độ nốt</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600">
                                                        Dur: {durationToPretty(duration)}{isDotted ? ' • dôi' : ''}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowHotkeysHelp(v => !v)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                        title="Hotkeys trường độ"
                                                        aria-label="Hotkeys trường độ"
                                                    >
                                                        ?
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                                {[
                                                    { val: '1', type: 'whole', title: 'Tròn' },
                                                    { val: '2', type: 'half', title: 'Trắng' },
                                                    { val: '4', type: 'quarter', title: 'Đen' },
                                                    { val: '8', type: 'eighth', title: 'Móc đơn' },
                                                    { val: '16', type: 'sixteenth', title: 'Móc kép' },
                                                    { val: '32', type: 'thirtySecond', title: 'Móc ba' }
                                                ].map(dur => (
                                                    <button
                                                        key={dur.val}
                                                        onClick={() => setDuration(dur.val)}
                                                        title={dur.title}
                                                        aria-label={dur.title}
                                                        className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center ${duration === dur.val ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}>
                                                        <NoteIcon type={dur.type} />
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    onClick={() => setIsDotted(!isDotted)}
                                                    title="Dấu chấm dôi (.)"
                                                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all w-28 ${isDotted ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {isDotted ? 'Dôi ✓' : 'Dôi (.)'}
                                                </button>

                                                <div className="relative group flex-1">
                                                    <button
                                                        onClick={groupSelectedToChord}
                                                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                                                        title="Nhóm các nốt đã bôi đen thành 1 cột nốt (chord)"
                                                    >
                                                        Nhóm cột nốt
                                                    </button>

                                                    {/* Tooltip hover (desktop) */}
                                                    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-slate-900 text-white text-[11px] leading-snug rounded-lg px-3 py-2 shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="font-semibold mb-1">Cách dùng</div>
                                                        <div>
                                                            Bôi đen các nốt trong khung ABC (VD:
                                                            <span className="font-mono"> C E G</span> hoặc
                                                            <span className="font-mono"> C2 E2 G2</span>),
                                                            rồi bấm để gộp thành <span className="font-mono">[CEG]</span>.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {showHotkeysHelp && (
                                                <div className="mt-2 text-[11px] rounded-lg border border-slate-200 bg-white p-3 text-slate-600 leading-relaxed">
                                                    <div className="font-semibold text-slate-700 mb-1">Hotkeys trường độ</div>
                                                    <div className="space-y-1">
                                                        <div><span className="font-mono">Mac:</span> <span className="font-mono">Ctrl+1..6</span> (tròn→móc ba), <span className="font-mono">Ctrl+.</span> (dôi), <span className="font-mono">Ctrl+0</span> (reset), <span className="font-mono">Ctrl+=</span>/<span className="font-mono">Ctrl+-</span> (tăng/giảm)</div>
                                                        <div><span className="font-mono">Win/Linux:</span> <span className="font-mono">Alt+1..6</span>, <span className="font-mono">Alt+.</span>, <span className="font-mono">Alt+0</span>, <span className="font-mono">Alt+=</span>/<span className="font-mono">Alt+-</span></div>
                                                        <div><span className="font-mono">1 tay:</span> Ấn đúp <span className="font-mono">↑</span>/<span className="font-mono">↓</span> (khi KHÔNG đang gõ) để tăng/giảm trường độ</div>
                                                        <div><span className="font-mono">Selection:</span> Nếu đang bôi đen trong ô ABC, các hotkey sẽ cố gắng apply trường độ lên vùng chọn</div>
                                                    </div>
                                                </div>
                                            )}


                                        </div>

                                        {/* Key Signature */}
                                        <div className="pt-3 border-t border-slate-100">
                                            <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Bộ dấu hoá (Key Signature)</label>
                                            <div className="flex space-x-2">
                                                <select
                                                    value={keyTonic}
                                                    onChange={e => {
                                                        const v = e.target.value;
                                                        setKeyTonic(v);
                                                        updateHeaderField('K', buildKeyString(v, keyMode));
                                                    }}
                                                    className="w-1/2 text-sm border border-slate-200 p-2 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                                    title="Chọn giọng (tonic)"
                                                >
                                                    {KEY_TONICS.map(k => <option key={k} value={k}>{k}</option>)}
                                                </select>

                                                <select
                                                    value={keyMode}
                                                    onChange={e => {
                                                        const v = e.target.value;
                                                        setKeyMode(v);
                                                        updateHeaderField('K', buildKeyString(keyTonic, v));
                                                    }}
                                                    className="w-1/2 text-sm border border-slate-200 p-2 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                                    title="Major / Minor"
                                                >
                                                    <option value="major">Major</option>
                                                    <option value="minor">Minor</option>
                                                </select>
                                            </div>

                                            <div className="mt-2">
                                                <input
                                                    type="text"
                                                    value={keySigInput}
                                                    onChange={(e) => setKeySigInput(e.target.value)}
                                                    onFocus={() => {
                                                        if (!keySigDirty) {
                                                            setKeySigInput('');
                                                            setKeySigDirty(true);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const raw = (keySigInput || '').trim();
                                                            if (raw) applyKeySigFromTrebleInput(raw);
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        const raw = (keySigInput || '').trim();
                                                        if (!raw) {
                                                            setKeySigInput(KEY_SIG_HINT);
                                                            setKeySigDirty(false);
                                                            return;
                                                        }
                                                        applyKeySigFromTrebleInput(raw);
                                                    }}
                                                    className={`w-full text-[11px] border border-slate-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 ${!keySigDirty ? 'text-slate-400' : 'text-slate-700'}`}
                                                />
                                                <div className="mt-1 text-[10px] text-slate-400">
                                                    Gợi ý: nhập F#, C#, G#... hoặc Bb, Eb... (tự suy ra giọng theo Major/Minor đang chọn)
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                <div className="w-1/2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
                                    <div className="px-4 py-2 bg-slate-50 flex justify-between items-center border-b border-slate-200">
                                        <div className="flex items-center text-slate-700">
                                            <AlignLeft size={14} className="mr-2" />
                                            <span className="font-mono text-xs font-semibold">Mã nguồn ABC</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={handleCopy} className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-md transition-colors flex items-center border border-slate-200">
                                                {isCopied ? <Check size={14} className="mr-1 text-green-400" /> : <CopyIcon size={14} className="mr-1" />}
                                                {isCopied ? 'Đã copy' : 'Copy'}
                                            </button>
                                            <button onClick={handleResetText} className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold rounded-md transition-colors flex items-center border border-slate-200">
                                                <RotateCcwIcon size={14} className="mr-1" /> Reset
                                            </button>
                                        </div>
                                    </div>
                                    <textarea ref={textAreaRef} value={abcText} onChange={handleTextAreaChange} onClick={handleTextAreaClickOrKey} onKeyUp={handleTextAreaClickOrKey} className="flex-1 w-full p-3 resize-none outline-none font-mono text-sm bg-transparent text-slate-700 leading-relaxed" spellCheck="false" />
                                </div>
                            </div>

                            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
                                <div className="flex bg-slate-50 border-b border-slate-200 px-2 pt-2 gap-1">
                                    {voices.map(v => (
                                        <button key={v.id} onClick={() => changeVoiceTab(v.id)} onContextMenu={(e) => openVoiceMenu(e, v.id)} className={`px-5 py-2 text-sm font-medium rounded-t-lg flex items-center space-x-2 transition-colors ${activeVoice === v.id ? 'bg-white border-t border-l border-r border-slate-200 text-indigo-700 shadow-[0_2px_0_0_white] z-10' : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-t border-l border-r border-transparent'}`}>
                                            <span className="text-lg leading-none">{v.clef === 'treble' ? '𝄞' : '𝄢'}</span>
                                            <span>Bè {v.id}</span>
                                        </button>
                                    ))}

                                    {voices.length < 2 && (
                                        <div className="relative ml-2 flex items-end pb-1">
                                            <button onClick={() => setShowAddVoice(!showAddVoice)} className="px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md font-medium flex items-center transition-colors">
                                                <Plus size={14} className="mr-1" /> Thêm Bè
                                            </button>
                                            {showAddVoice && (
                                                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 text-sm overflow-hidden">
                                                    <button onClick={() => addVoice('treble')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center"><span className="text-lg mr-2">𝄞</span> Khóa Sol</button>
                                                    <button onClick={() => addVoice('bass')} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center"><span className="text-lg mr-2">𝄢</span> Khóa Fa</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 p-4 overflow-y-auto select-none bg-white">
                                    <div className="sticky top-0 z-10 -mx-4 px-4 pt-3 pb-4 bg-white border-b border-slate-100 overflow-x-auto">
                                        <div className="flex min-w-max gap-2">
                                            <button
                                                onPointerDown={(e) => startSymbolHold(e, barlineMenuItems)}
                                                onPointerUp={() => { cancelSymbolHold(); if (!symbolHoldOpenedRef.current) insertSmartText('|'); }}
                                                onPointerLeave={cancelSymbolHold}
                                                title="Barlines: tap |, hold for variants"
                                                className="min-w-[42px] px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                |
                                            </button>

                                            <button
                                                onPointerDown={(e) => startSymbolHold(e, repeatMenuItems)}
                                                onPointerUp={() => { cancelSymbolHold(); if (!symbolHoldOpenedRef.current) runRepeatInsert(repeatQuickToken); }}
                                                onPointerLeave={cancelSymbolHold}
                                                title="Repeats and endings: tap recent, hold for menu"
                                                className="min-w-[48px] px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                :|
                                            </button>

                                            <button
                                                onPointerDown={(e) => startSymbolHold(e, restMenuItems)}
                                                onPointerUp={() => { cancelSymbolHold(); if (!symbolHoldOpenedRef.current) insertRestDefault(); }}
                                                onPointerLeave={cancelSymbolHold}
                                                title="Rests: tap default, hold for variants"
                                                className="min-w-[42px] px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                z
                                            </button>

                                            <button
                                                onClick={() => insertSmartText('-')}
                                                title="Tie"
                                                className="min-w-[42px] px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                -
                                            </button>

                                            <button
                                                onPointerDown={(e) => startSymbolHold(e, slurMenuItems)}
                                                onPointerUp={() => {
                                                    cancelSymbolHold();
                                                    if (!symbolHoldOpenedRef.current) {
                                                        const ta = textAreaRef.current;
                                                        const hasSelection = ta && (ta.selectionStart ?? cursorPos) !== (ta.selectionEnd ?? cursorPos);
                                                        if (hasSelection) wrapSelectionWith('(', ')');
                                                        else insertSmartText('(');
                                                    }
                                                }}
                                                onPointerLeave={cancelSymbolHold}
                                                title="Slurs: tap open/wrap, hold for variants"
                                                className="min-w-[54px] px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                {'( )'}
                                            </button>

                                            <button
                                                onPointerDown={(e) => startSymbolHold(e, rhythmMenuItems)}
                                                onPointerUp={() => { cancelSymbolHold(); if (!symbolHoldOpenedRef.current) insertSmartText('>'); }}
                                                onPointerLeave={cancelSymbolHold}
                                                title="Broken rhythm: tap >, hold for > or <"
                                                className="min-w-[42px] px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                &gt;
                                            </button>

                                            <button
                                                onPointerDown={(e) => startSymbolHold(e, tupletMenuItems)}
                                                onPointerUp={() => { cancelSymbolHold(); if (!symbolHoldOpenedRef.current) insertSmartText('(3'); }}
                                                onPointerLeave={cancelSymbolHold}
                                                title="Tuplets: tap (3, hold for more"
                                                className="min-w-[48px] px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                (3
                                            </button>

                                            <button
                                                onPointerDown={(e) => startSymbolHold(e, quickDecorationMenuItems)}
                                                onPointerUp={() => { cancelSymbolHold(); if (!symbolHoldOpenedRef.current) runDecoInsert(decoQuickToken); }}
                                                onPointerLeave={cancelSymbolHold}
                                                title="Decorations: tap recent, hold for menu"
                                                className="min-w-[42px] px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                !
                                            </button>

                                            <button
                                                onPointerDown={(e) => startSymbolHold(e, moreMenuItems)}
                                                onPointerUp={(e) => { cancelSymbolHold(); if (!symbolHoldOpenedRef.current) openSymbolMenu(e.clientX, e.clientY, moreMenuItems); }}
                                                onPointerLeave={cancelSymbolHold}
                                                title="More symbols"
                                                className="min-w-[42px] px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all"
                                            >
                                                ⋯
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        {OCTAVES.map(oct => (
                                            <div key={oct.id} className="flex items-stretch bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                                                <div className="w-20 bg-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center border-r border-slate-200">
                                                    {oct.label}
                                                </div>
                                                <div className="flex flex-1 p-1 gap-1 bg-white">
                                                    {NOTES.map(note => (
                                                        <button key={`${note}-${oct.id}`} onDoubleClick={() => handleNoteDoubleClick(note, oct)} onMouseDown={(e) => handleMouseDown(e, note, oct)} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave} className="flex-1 py-3 bg-white border border-slate-200 rounded-md text-center font-mono font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 active:bg-indigo-100 active:scale-95 transition-all relative group shadow-sm">
                                                            <div className="flex flex-col items-center justify-center gap-0.5 leading-none">
    <NoteIcon type={duration === '1' ? 'whole' : duration === '2' ? 'half' : duration === '32' ? 'thirtySecond' : duration === '16' ? 'sixteenth' : duration === '8' ? 'eighth' : 'quarter'} />
    <span className="text-[11px] font-mono font-bold">
        {oct.lowerCase ? note.toLowerCase() : note}
    </span>
</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {longPressTarget && (
                                    <div className="fixed z-50 bg-slate-800 text-white rounded-lg shadow-2xl flex p-1.5 gap-1 transform -translate-x-1/2" style={{ top: longPressTarget.y, left: longPressTarget.x }}>
                                        <button onClick={() => selectAccidental('^')} className="px-4 py-1.5 hover:bg-slate-700 rounded-md text-xl font-bold transition-colors">♯</button>
                                        <div className="w-px bg-slate-600 my-1"></div>
                                        <button onClick={() => selectAccidental('_')} className="px-4 py-1.5 hover:bg-slate-700 rounded-md text-xl font-bold transition-colors">♭</button>
                                        <div className="w-px bg-slate-600 my-1"></div>
                                        <button onClick={() => selectAccidental('=')} className="px-4 py-1.5 hover:bg-slate-700 rounded-md text-xl font-bold transition-colors">♮</button>
                                        <button onClick={() => setLongPressTarget(null)} className="px-2 py-1.5 hover:bg-red-500 rounded-md ml-1 transition-colors"><XIcon size={16}/></button>
                                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-800"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center z-10">
                                <div className="flex items-center text-slate-700">
                                    <Layers size={16} className="mr-2 text-indigo-500" />
                                    <h2 className="font-semibold text-sm">Bản nhạc trực tiếp (Live Preview)</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    {bgPages.length > 0 && (
                                        <>
                                            <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-slate-200 bg-white">
                                                <span className="text-[11px] text-slate-500">BG</span>
                                                <select
                                                    value={bgPageIndex}
                                                    onChange={(e) => setBgPageIndex(parseInt(e.target.value, 10) || 0)}
                                                    className="text-[12px] border border-slate-200 rounded-md px-2 py-1 bg-white"
                                                    title="Chọn trang nền"
                                                >
                                                    {bgPages.map((_, i) => (
                                                        <option key={i} value={i}>Trang {i + 1}</option>
                                                    ))}
                                                </select>

                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.02"
                                                    value={bgOpacity}
                                                    onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                                                    title="Opacity"
                                                />

                                                <button
                                                    onClick={toggleBgLock}
                                                    className={"px-2 py-1 text-[12px] rounded-md border " + (bgLocked ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200")}
                                                    title="Ctrl+L để lock/unlock"
                                                >
                                                    {bgLocked ? 'Locked' : 'Move'}
                                                </button>

                                                <button
                                                    onClick={resetBackground}
                                                    className="px-2 py-1 text-[12px] rounded-md border border-slate-200 bg-white hover:bg-slate-50"
                                                    title="Reset vị trí/zoom nền"
                                                >
                                                    Reset
                                                </button>

                                                <button
                                                    onClick={clearBackground}
                                                    className="px-2 py-1 text-[12px] rounded-md border border-slate-200 bg-white hover:bg-slate-50"
                                                    title="Xóa nền"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                            <span className="text-[11px] text-slate-500 hidden lg:inline">Ctrl+L lock/unlock</span>
                                        </>
                                    )}

                                    {!abcjsLoaded && <span className="text-xs font-medium text-amber-500 animate-pulse">Đang tải ABCJS...</span>}
                                </div>
                            </div>

                            <div ref={previewScrollRef} className="flex-1 p-3 md:p-4 overflow-auto bg-[#F8FAFC]">
                                <div ref={previewWrapRef} className="abcjs-wrap bg-white shadow-md border border-slate-200 rounded-lg min-h-full p-0 transition-all duration-300 overflow-hidden relative">
                                    {currentBg && (
                                        <div
                                            className="absolute inset-0 z-0"
                                            style={{
                                                pointerEvents: 'none',
                                                backgroundImage: `url(${currentBg.src})`,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: `${currentBg.x || 0}px ${currentBg.y || 0}px`,
                                                backgroundSize: `${(currentBg.scale || 1) * 100}% auto`,
                                                opacity: bgOpacity,
                                            }}
                                        />
                                    )}

                                    {currentBg && !bgLocked && (
                                        <div
                                            className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
                                            onPointerDown={onBgPointerDown}
                                            onPointerMove={onBgPointerMove}
                                            onPointerUp={onBgPointerUp}
                                            onPointerCancel={onBgPointerUp}
                                            onWheel={onBgWheel}
                                            title="Kéo để di chuyển nền. Cuộn để zoom. Ctrl+L để lock."
                                        >
                                            <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-[11px]">
                                                Move background… (Ctrl+L để lock)
                                            </div>
                                        </div>
                                    )}

                                    <div ref={renderAreaRef} className="relative z-10 w-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>


                    <CloudModals
                        showSaveChoiceModal={showSaveChoiceModal}
                        setShowSaveChoiceModal={setShowSaveChoiceModal}
                        cloudBusy={cloudBusy}
                        title={title}
                        performSaveToLibrary={performSaveToLibrary}
                        showAuthModal={showAuthModal}
                        closeAuthModal={closeAuthModal}
                        authMode={authMode}
                        setAuthMode={setAuthMode}
                        setAuthError={setAuthError}
                        setAuthInfo={setAuthInfo}
                        setPasswordRecoveryReady={setPasswordRecoveryReady}
                        authEmail={authEmail}
                        setAuthEmail={setAuthEmail}
                        authPassword={authPassword}
                        setAuthPassword={setAuthPassword}
                        handleAuthSubmit={handleAuthSubmit}
                        handleForgotPassword={handleForgotPassword}
                        authBusy={authBusy}
                        authError={authError}
                        authInfo={authInfo}
                        passwordRecoveryReady={passwordRecoveryReady}
                    />


                    {showAutoBarlinePreview && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                            <div
                                className="absolute inset-0 bg-black/40"
                                onClick={() => setShowAutoBarlinePreview(false)}
                            />
                            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">Auto Barline (Preview)</div>
                                        <div className="text-[11px] text-slate-500">Sẽ xoá vạch nhịp cũ và chia lại theo M/L. Kiểm tra trước khi áp dụng.</div>
                                    </div>
                                    <button
                                        onClick={() => setShowAutoBarlinePreview(false)}
                                        className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                                        title="Close"
                                    >
                                        <XIcon size={18} className="text-slate-600" />
                                    </button>
                                </div>

                                <div className="p-5 grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs font-semibold text-slate-700 mb-2">Before</div>
                                        <textarea
                                            readOnly
                                            value={autoBarlineBefore}
                                            className="w-full h-80 resize-none border border-slate-200 rounded-xl p-3 font-mono text-[12px] leading-relaxed bg-white text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-700 mb-2">After</div>
                                        <textarea
                                            readOnly
                                            value={autoBarlineAfter}
                                            className="w-full h-80 resize-none border border-slate-200 rounded-xl p-3 font-mono text-[12px] leading-relaxed bg-white text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="px-5 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => setShowAutoBarlinePreview(false)}
                                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={applyAutoBarlinePreview}
                                        className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md shadow-amber-200"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

{showHotkeysModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowHotkeysModal(false)}
        />
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                    <div className="text-sm font-bold text-slate-900">Hotkeys</div>
                    <div className="text-[11px] text-slate-500">Tổng hợp tất cả phím tắt trong app</div>
                </div>
                <button
                    onClick={() => setShowHotkeysModal(false)}
                    className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                    title="Close"
                >
                    <XIcon size={18} className="text-slate-600" />
                </button>
            </div>

            <div className="p-5 text-sm text-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="font-semibold text-slate-900 mb-2">Chung</div>
                        <div className="space-y-2">
                            <div>
                                <div className="text-slate-600 text-[12px] mb-1">Undo / Redo</div>
                                <div className="leading-relaxed">
                                    <span className="font-mono">Mac:</span> <span className="font-mono">⌘Z</span> (undo), <span className="font-mono">⌘⇧Z</span> (redo)
                                    <br />
                                    <span className="font-mono">Win/Linux:</span> <span className="font-mono">Ctrl+Z</span> (undo), <span className="font-mono">Ctrl+Y</span> hoặc <span className="font-mono">Ctrl+Shift+Z</span> (redo)
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-600 text-[12px] mb-1">Close menu / popup</div>
                                <div className="leading-relaxed">
                                    <span className="font-mono">Esc</span>: đóng Export / Optimize / Hotkeys
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="font-semibold text-slate-900 mb-2">Playback</div>
                        <div className="leading-relaxed">
                            <div className="text-slate-600 text-[12px] mb-1">Chỉ khi KHÔNG đang gõ (không focus vào ô text)</div>
                            <div>
                                <span className="font-mono">Space</span>: Play / Pause
                            </div>
                            <div>
                                <span className="font-mono">Double Space</span>: Stop
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
                        <div className="font-semibold text-slate-900 mb-2">Trường độ (Duration Brush)</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="leading-relaxed">
                                <div className="text-slate-600 text-[12px] mb-1">Mac (dùng Ctrl để tránh Cmd+number đổi tab)</div>
                                <div><span className="font-mono">Ctrl+1..6</span>: tròn / trắng / đen / móc đơn / móc kép / móc ba</div>
                                <div><span className="font-mono">Ctrl+.</span>: dôi</div>
                                <div><span className="font-mono">Ctrl+=</span> / <span className="font-mono">Ctrl+-</span>: tăng / giảm 1 bậc</div>
                                <div><span className="font-mono">Ctrl+0</span>: reset về <span className="font-mono">1/4</span></div>
                            </div>

                            <div className="leading-relaxed">
                                <div className="text-slate-600 text-[12px] mb-1">Win/Linux</div>
                                <div><span className="font-mono">Alt+1..6</span>: tròn / trắng / đen / móc đơn / móc kép / móc ba</div>
                                <div><span className="font-mono">Alt+.</span>: dôi</div>
                                <div><span className="font-mono">Alt+=</span> / <span className="font-mono">Alt+-</span>: tăng / giảm 1 bậc</div>
                                <div><span className="font-mono">Alt+0</span>: reset về <span className="font-mono">1/4</span></div>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 text-[13px] text-slate-700 leading-relaxed">
                            <div><span className="font-mono">1 tay:</span> Ấn đúp <span className="font-mono">↑</span>/<span className="font-mono">↓</span> (khi KHÔNG đang gõ) để tăng/giảm trường độ</div>
                            <div><span className="font-mono">Selection:</span> Nếu đang bôi đen trong ô ABC, các hotkey trường độ sẽ cố gắng apply lên vùng chọn</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
)}


                    {symbolMenu.visible && (
                        <div
                            className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-lg text-sm overflow-y-auto"
                            style={{ left: symbolMenu.x, top: symbolMenu.y, minWidth: symbolMenu.items.some(it => it.previewAbc) ? 360 : 180, maxWidth: 460, maxHeight: '70vh' }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {symbolMenu.items.map((it, i) => (
                                it.header ? (
                                    <div
                                        key={i}
                                        className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 bg-slate-50 border-b border-slate-100"
                                    >
                                        {it.header}
                                    </div>
                                ) : (
                                    <button
                                        key={i}
                                        onClick={it.onClick}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-b-0"
                                        title={it.title}
                                    >
                                        {it.previewAbc ? (
                                            <MiniAbcPreview abc={it.previewAbc} />
                                        ) : (
                                            <span className="font-mono font-semibold min-w-[64px]">{it.label}</span>
                                        )}
                                        <div className="min-w-0">
                                            <div className="font-mono font-semibold text-slate-800 break-all">{it.label}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">{it.title}</div>
                                        </div>
                                    </button>
                                )
                            ))}
                        </div>
                    )}

                    {rangeMenu.visible && rangeMenu.target && (
                        <div
                            ref={rangeMenuRef}
                            className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden text-sm"
                            style={{ left: rangeMenu.x, top: rangeMenu.y, minWidth: 220 }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {!hasRangeAnchor && (
                                <button
                                    onClick={() => handleRangePick(rangeMenu.target)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <span>Set range start</span>
                                </button>
                            )}

                            {rangeSelection && rangeSelection.type === 'anchor' && (
                                <button
                                    onClick={() => handleRangePick(rangeMenu.target)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <span>Set range end</span>
                                </button>
                            )}

                            {hasRangeAnchor && (
                                <>
                                    <div className="h-px bg-slate-200" />
                                    <button
                                        onClick={clearSelectedRange}
                                        className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-700 flex items-center gap-2"
                                    >
                                        <span>Clear range</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}

{voiceMenu.visible && voiceMenu.voiceId === 2 && (
                        <div
                            className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden text-sm"
                            style={{ left: voiceMenu.x, top: voiceMenu.y, minWidth: 200 }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => toggleVoiceClef(2)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <span className="text-lg leading-none">{(voices.find(v => v.id === 2)?.clef === 'treble') ? '𝄢' : '𝄞'}</span>
                                <span>Đổi khoá: {(voices.find(v => v.id === 2)?.clef === 'treble') ? 'Fa (Bass)' : 'Sol (Treble)'}</span>
                            </button>
                            <div className="h-px bg-slate-200" />
                            <button
                                onClick={() => deleteVoice(2)}
                                className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-700 flex items-center gap-2"
                            >
                                <span>🗑️</span>
                                <span>Xoá Bè 2</span>
                            </button>
                        </div>
                    )}

                </div>
            );
        }

const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
