import { $, midiToName, uniq, showToast, debounce } from './utils.js';
import { state } from './state.js';
import { Metro } from './metronome.js';

// ---------- Parsing + step extraction (ported from your file) ----------
const getMidiFromText = (noteChar, octStr, accStr, keySig) => {
            const baseMap = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
            let pitch = 60 + baseMap[noteChar.toLowerCase()]; 
            if (noteChar === noteChar.toLowerCase()) pitch += 12; 
            if (octStr) for (let char of octStr) { if (char === ',') pitch -= 12; if (char === "'") pitch += 12; }
            let acc = keySig[noteChar.toLowerCase()] || 0; 
            if (accStr === '^^') acc = 2;
            else if (accStr === '^') acc = 1;
            else if (accStr === '__') acc = -2;
            else if (accStr === '_') acc = -1;
            else if (accStr === '=') acc = 0;      
            return pitch + acc;
        };

        // --- EXTRACT STEPS (VOICE-AWARE, TIME-MERGED) ---
// Mục tiêu:
// 1) Parse ABC -> danh sách event theo từng voice (đúng thứ tự xuất hiện).
// 2) Gộp event theo "thời điểm" (timeMs) để ra steps cho Practice (có thể gồm cả 2 tay).
// 3) Map DOM SVG note groups -> event của đúng voice dựa trên class abcjs-vN.
//    Điều này sửa lỗi "Hints lệch khi Both Hands" do trước đó map 1-1 theo index toàn cục.

const parseDuration = (durStr) => {
    // Hỗ trợ các dạng: "", "2", "/2", "3/2", "2/", "1/4"
    if (!durStr) return 1;
    if (durStr.includes('/')) {
        const [a, b] = durStr.split('/');
        const num = a === '' ? 1 : parseFloat(a);
        const den = b === '' ? 2 : parseFloat(b);
        if (!isFinite(num) || !isFinite(den) || den === 0) return 1;
        return num / den;
    }
    const v = parseFloat(durStr);
    return isFinite(v) && v > 0 ? v : 1;
};

const parseVoiceEvents = (abc) => {
    // Trả về:
    // { voiceOrder: ['1','2',...], eventsByVoice: { '1':[...], '2':[...]} }
    const lines = abc.split(/\r?\n/);

    // Key signature map (major/minor). Supports common ABC forms: K:C, K:D, K:Bb, K:F#, K:Am, K:F#m, K:Ebm ...
const KEY_SIG_NUM = {
    'C':0,'G':1,'D':2,'A':3,'E':4,'B':5,'F#':6,'C#':7,
    'F':-1,'Bb':-2,'Eb':-3,'Ab':-4,'Db':-5,'Gb':-6,'Cb':-7,
    'Am':0,'Em':1,'Bm':2,'F#m':3,'C#m':4,'G#m':5,'D#m':6,'A#m':7,
    'Dm':-1,'Gm':-2,'Cm':-3,'Fm':-4,'Bbm':-5,'Ebm':-6,'Abm':-7
};
const SHARP_ORDER = ['f','c','g','d','a','e','b'];
const FLAT_ORDER  = ['b','e','a','d','g','c','f'];

const normalizeKeyName = (raw) => {
    if (!raw) return 'C';
    let tok = String(raw).trim();
    tok = tok.replace(/^K:\s*/i, '');
    tok = tok.split(/\s+/)[0];
    tok = tok.replace(/(major|maj)$/i, '');
    tok = tok.replace(/(minor|min)$/i, 'm');

    const m = tok.match(/^([A-Ga-g])([#b]?)(m)?/);
    if (!m) return 'C';
    const letter = m[1].toUpperCase();
    const acc = (m[2] || '');
    const minor = !!m[3];
    return letter + acc + (minor ? 'm' : '');
};

const keySigFromName = (name) => {
    const keyName = normalizeKeyName(name);
    const n = (KEY_SIG_NUM[keyName] !== undefined) ? KEY_SIG_NUM[keyName] : 0;
    const out = { c:0,d:0,e:0,f:0,g:0,a:0,b:0 };
    if (n > 0) {
        for (let i=0; i<n; i++) out[SHARP_ORDER[i]] = 1;
    } else if (n < 0) {
        for (let i=0; i<Math.abs(n); i++) out[FLAT_ORDER[i]] = -1;
    }
    return out;
};

let currentKey = keySigFromName((abc.match(/^K:.*$/mi) || ['K:C'])[0]);

    const voiceOrder = [];
    const voiceCursors = {};
    const eventsByVoice = {};
    const markers = { repeat: [], endings: [] };

    // Per-voice tie carry and tuplet state (minimal ABC support for rhythm accuracy)
    const tieCarryByVoice = {}; // voice -> Set(midi)
    const tupletByVoice = {};   // voice -> { mult:number, remaining:number } | null

    const defaultTupletQ = (p) => {
        if (p === 2) return 3;
        if (p === 3) return 2;
        if (p === 4) return 3;
        return 2; // 5-7 => 2 (common default)
    };

    const setTuplet = (v, p, q=null, r=null) => {
        const P = Math.max(1, parseInt(p,10) || 1);
        const Q = (q === null || q === undefined) ? defaultTupletQ(P) : Math.max(1, parseInt(q,10) || 1);
        const R = (r === null || r === undefined) ? P : Math.max(1, parseInt(r,10) || 1);
        tupletByVoice[v] = { mult: (Q / P), remaining: R };
    };

    const applyTuplet = (v, dur) => {
        const st = tupletByVoice[v];
        if (!st || !isFinite(dur)) return dur;
        const out = dur * (st.mult || 1);
        st.remaining = (st.remaining || 0) - 1;
        if (st.remaining <= 0) tupletByVoice[v] = null;
        return out;
    };

    const ensureVoice = (v) => {
        if (!eventsByVoice[v]) eventsByVoice[v] = [];
        if (voiceCursors[v] === undefined) voiceCursors[v] = 0;
        if (!tieCarryByVoice[v]) tieCarryByVoice[v] = new Set();
        if (tupletByVoice[v] === undefined) tupletByVoice[v] = null;
        if (!voiceOrder.includes(v)) voiceOrder.push(v);
    };

    // Pre-scan voice ids from headers (V:...) so DOM voice index abcjs-v0 maps correctly.
    lines.forEach((raw) => {
        const line = String(raw || '').trim();
        if (!line) return;
        if (line.startsWith('V:')) {
            const m = line.match(/^V:\s*([^\s]+)/);
            if (m) ensureVoice(m[1]);
        }
    });

    const primaryVoice = voiceOrder.length ? voiceOrder[0] : '1';
    let currentVoice = primaryVoice;
    ensureVoice(currentVoice);

    // Tokenizer theo dòng (không dùng regex toàn cục kiểu cũ để tránh lệch khi 2 voice xen kẽ/chord)
    lines.forEach((rawLine) => {
        let line = rawLine.trim();
        if (!line) return;

        // Bỏ comment/meta
        if (line.startsWith('%')) return;
        // Key changes (K:) can appear mid-tune
        if (line.match(/^K:/i)) { currentKey = keySigFromName(line); return; }
        if (line.match(/^[A-Z]:/) && !line.startsWith('V:')) return;

        // Nếu là voice header (V:RH name=..., clef=...), ghi nhận currentVoice rồi bỏ qua phần header
        if (line.startsWith('V:') && (line.includes('clef=') || line.includes('name='))) {
            const m = line.match(/^V:\s*([^\s]+)/);
            if (m) { currentVoice = m[1]; ensureVoice(currentVoice); }
            return;
        }

        // Voice tag dạng đầu dòng: V:2 ...
        if (line.startsWith('V:')) {
            const m = line.match(/^V:\s*([^\s]+)/);
            if (m) {
                currentVoice = m[1];
                ensureVoice(currentVoice);
                line = line.replace(/^V:\s*[^\s]+/, '').trim();
                if (!line) return;
            }
        }

        // Voice tag inline: [V:2]
        // Lưu ý: chord cũng dùng [ ... ] nên phải phân biệt [V:
        // Chúng ta sẽ xử lý inline trong vòng lặp ký tự ở dưới.

        // Accidentals reset theo barline
        let barAccidentals = { ...currentKey };

        let i = 0;
        while (i < line.length) {
            const ch = line[i];

            // Bỏ whitespace
            if (ch === ' ' || ch === '\t') { i++; continue; }

            // Tuplet marker: (3, (3:2:3, ... (minimal support)
            if (ch === '(') {
                const m = line.slice(i).match(/^\((\d+)(?::(\d+)(?::(\d+))?)?/);
                if (m) {
                    const p = parseInt(m[1], 10);
                    const q = (m[2] !== undefined) ? parseInt(m[2], 10) : null;
                    const r = (m[3] !== undefined) ? parseInt(m[3], 10) : null;
                    ensureVoice(currentVoice);
                    setTuplet(currentVoice, p, q, r);
                    i += m[0].length;
                    continue;
                }
            }

            // Repeat end :| (also handles :||)
            if (ch === ':' && line[i+1] === '|') {
                ensureVoice(currentVoice);
                if (currentVoice === primaryVoice) markers.repeat.push({ type: 'end', t: Math.round(voiceCursors[currentVoice] || 0) });
                barAccidentals = { ...currentKey };
                i += 2;
                if (line[i] === '|') i++; // swallow :||
                continue;
            }

            // Barline / repeat start |: (also handles ||, |], |:)
            if (ch === '|') {
                ensureVoice(currentVoice);
                if (line[i+1] === ':') {
                    if (currentVoice === primaryVoice) markers.repeat.push({ type: 'start', t: Math.round(voiceCursors[currentVoice] || 0) });
                    barAccidentals = { ...currentKey };
                    i += 2;
                    continue;
                }
                barAccidentals = { ...currentKey };
                i++;
                // swallow double bar or end barline
                if (line[i] === '|' || line[i] === ']') i++;
                continue;
            }

            // Inline voice tag: [V:2]
            if (ch === '[' && (line.slice(i, i+3) === '[V:' || line.slice(i, i+3) === '[v:')) {
                const end = line.indexOf(']', i);
                if (end !== -1) {
                    const m = line.slice(i, end+1).match(/\[V:\s*([^\]\s]+)\]/i);
                    if (m) {
                        currentVoice = m[1];
                        ensureVoice(currentVoice);
                    }
                    i = end + 1;
                    continue;
                }
            }

            // Rest: z...
            if (ch === 'z' || ch === 'Z') {
                // read duration
                let j = i + 1;
                while (j < line.length && /[0-9\/]/.test(line[j])) j++;
                const durStr = line.slice(i+1, j);
                let dur = parseDuration(durStr);
                ensureVoice(currentVoice);
                dur = applyTuplet(currentVoice, dur);
                voiceCursors[currentVoice] += dur * 100;
                i = j;
                continue;
            }

            // Volta/ending markers: [1, [2, [[1, [[2 ... (NOT chords)
            if (ch === '[') {
                const a = line[i+1];
                const b = line[i+2];
                if (a === '[' && /[1-9]/.test(b)) {
                    ensureVoice(currentVoice);
                    if (currentVoice === primaryVoice) markers.endings.push({ num: parseInt(b, 10), t: Math.round(voiceCursors[currentVoice] || 0) });
                    i += 3;
                    continue;
                }
                if (/[1-9]/.test(a)) {
                    ensureVoice(currentVoice);
                    if (currentVoice === primaryVoice) markers.endings.push({ num: parseInt(a, 10), t: Math.round(voiceCursors[currentVoice] || 0) });
                    i += 2;
                    continue;
                }
            }

            // Chord: [CEG]2, ... (không phải [V:..])
            if (ch === '[') {
                const end = line.indexOf(']', i);
                if (end !== -1) {
                    const inside = line.slice(i+1, end);

                    // Inline field tags like [V:RH] or [K:C] (NOT chords)
                    const tag = inside.trim();
                    const vm = tag.match(/^V:\s*([^\s]+)/);
                    if (vm) { currentVoice = vm[1]; ensureVoice(currentVoice); i = end + 1; continue; }
                    if (/^K:/i.test(tag)) { currentKey = keySigFromName(tag); barAccidentals = { ...currentKey }; i = end + 1; continue; }

                    // duration nằm sau ']'
                    let j = end + 1;
                    while (j < line.length && /[0-9\/]/.test(line[j])) j++;
                    const durStr = line.slice(end+1, j);
                    let dur = parseDuration(durStr);

                    // Tie marker after the chord (e.g. [CEG]-)
                    let tieOut = false;
                    if (line[j] === '-') {
                        tieOut = true;
                        while (j < line.length && line[j] === '-') j++;
                    }

                    ensureVoice(currentVoice);
                    dur = applyTuplet(currentVoice, dur);

                    // Parse note tokens trong chord
                    const pitches = [];
                    // chord accidentals áp dụng từng nốt trong measure
                    let k = 0;
                    while (k < inside.length) {
                        // skip whitespace
                        if (inside[k] === ' ' || inside[k] === '\t') { k++; continue; }
                        let accStr = '';
                        if (inside[k] === '^' || inside[k] === '_' || inside[k] === '=') {
                            accStr = inside[k];
                            // support ^^ and __
                            if ((accStr === '^' || accStr === '_') && inside[k+1] === accStr) { accStr = accStr + accStr; k += 2; }
                            else { k++; }
                        }
                        const noteChar = inside[k];
                        if (!noteChar || !/[A-Ga-g]/.test(noteChar)) { k++; continue; }
                        k++;

                        let octStr = '';
                        while (k < inside.length && (inside[k] === ',' || inside[k] === "'")) {
                            octStr += inside[k];
                            k++;
                        }

                        // cập nhật accidental theo measure
                        if (accStr) {
                    if (accStr === '^^') barAccidentals[noteChar.toLowerCase()] = 2;
                    else if (accStr === '^') barAccidentals[noteChar.toLowerCase()] = 1;
                    else if (accStr === '__') barAccidentals[noteChar.toLowerCase()] = -2;
                    else if (accStr === '_') barAccidentals[noteChar.toLowerCase()] = -1;
                    else barAccidentals[noteChar.toLowerCase()] = 0;
                }

                        const midi = getMidiFromText(noteChar, octStr, accStr, barAccidentals);
                        pitches.push(midi);
                    }

                    if (pitches.length) {
                        ensureVoice(currentVoice);
                        const t = Math.round(voiceCursors[currentVoice]);
                        const tieCarry = tieCarryByVoice[currentVoice] || new Set();
                        const onsetPitches = pitches.filter(p => !tieCarry.has(p));

                        // Keep an event even if onsetPitches is empty (tie continuation) so DOM mapping indices stay aligned
                        eventsByVoice[currentVoice].push({ voice: currentVoice, timeMs: t, pitches: onsetPitches, durT: dur * 100 });
                        voiceCursors[currentVoice] += dur * 100;

                        // Consume tie-in then set tie-out
                        pitches.forEach(p => { if (tieCarry.has(p)) tieCarry.delete(p); });
                        if (tieOut) pitches.forEach(p => tieCarry.add(p));
                    } else {
                        // không parse được chord -> bỏ qua, tránh kẹt
                    }

                    i = j;
                    continue;
                }
            }

            // Single note: [^_=]?[A-Ga-g][,']*(duration)
            // accidental
            let accStr = '';
            let idx = i;
            if (line[idx] === '^' || line[idx] === '_' || line[idx] === '=') {
                accStr = line[idx];
                // support ^^ and __
                if ((accStr === '^' || accStr === '_') && line[idx+1] === accStr) { accStr = accStr + accStr; idx += 2; }
                else { idx++; }
            }
            const noteChar = line[idx];
            if (noteChar && /[A-Ga-g]/.test(noteChar)) {
                idx++;
                let octStr = '';
                while (idx < line.length && (line[idx] === ',' || line[idx] === "'")) {
                    octStr += line[idx];
                    idx++;
                }
                let durStart = idx;
                while (idx < line.length && /[0-9\/]/.test(line[idx])) idx++;
                const durStr = line.slice(durStart, idx);
                let dur = parseDuration(durStr);

                // Tie marker after the note (e.g. A-)
                let tieOut = false;
                if (line[idx] === '-') { tieOut = true; idx++; }

                ensureVoice(currentVoice);
                dur = applyTuplet(currentVoice, dur);

                if (accStr) {
                    if (accStr === '^^') barAccidentals[noteChar.toLowerCase()] = 2;
                    else if (accStr === '^') barAccidentals[noteChar.toLowerCase()] = 1;
                    else if (accStr === '__') barAccidentals[noteChar.toLowerCase()] = -2;
                    else if (accStr === '_') barAccidentals[noteChar.toLowerCase()] = -1;
                    else barAccidentals[noteChar.toLowerCase()] = 0;
                }

                const midi = getMidiFromText(noteChar, octStr, accStr, barAccidentals);

                const t = Math.round(voiceCursors[currentVoice]);
                const tieCarry = tieCarryByVoice[currentVoice] || new Set();
                const onsetPitches = tieCarry.has(midi) ? [] : [midi];

                // Keep an event even if onsetPitches is empty (tie continuation) so DOM mapping indices stay aligned
                eventsByVoice[currentVoice].push({ voice: currentVoice, timeMs: t, pitches: onsetPitches, durT: dur * 100 });
                voiceCursors[currentVoice] += dur * 100;

                // Consume tie-in then set tie-out
                if (tieCarry.has(midi)) tieCarry.delete(midi);
                if (tieOut) tieCarry.add(midi);

                i = idx;
                continue;
            }

            // Ký tự khác: bỏ qua
            i++;
        }
    });

    return { voiceOrder, eventsByVoice, markers };

};



// ---------- Repeat/Volta expansion (simple, single-repeat support) ----------
const lowerBoundStepsByTime = (steps, tMs) => {
  let lo = 0, hi = steps.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((steps[mid].timeMs || 0) < tMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

const expandRepeatsAndVoltas = (steps, markers, tickMsBase) => {
  try {
    if (!markers || !markers.repeat || markers.repeat.length === 0) return steps;

    const rep = (markers.repeat || []).map(r => ({ ...r, ms: Math.round((r.t || 0) * tickMsBase) }))
                                     .sort((a,b)=>a.ms-b.ms);
    const starts = rep.filter(r => r.type === 'start');
    const ends   = rep.filter(r => r.type === 'end');
    if (!starts.length || !ends.length) return steps;

    // pick the first start and the first end after it
    const startMs = starts[0].ms;
    const endObj = ends.find(e => e.ms > startMs + 1);
    if (!endObj) return steps;
    const endMs = endObj.ms;

    const startIdx = lowerBoundStepsByTime(steps, startMs);
    const endIdx   = lowerBoundStepsByTime(steps, endMs);
    if (!Number.isFinite(startIdx) || !Number.isFinite(endIdx) || endIdx <= startIdx) return steps;

    const endings = (markers.endings || []).map(e => ({ ...e, ms: Math.round((e.t || 0) * tickMsBase) }));
    const e1 = endings.find(e => e.num === 1 && e.ms >= startMs && e.ms < endMs);
    const e2 = endings.find(e => e.num === 2 && e.ms >= endMs - 1);

    const e1Idx = e1 ? lowerBoundStepsByTime(steps, e1.ms) : null;
    const e2Idx = e2 ? lowerBoundStepsByTime(steps, e2.ms) : endIdx;

    const seg2End = (e1Idx !== null && e1Idx > startIdx && e1Idx <= endIdx) ? e1Idx : endIdx;

    // Build expanded play order: pre + (repeat once) + body-only pass + post (starting at 2nd ending if present)
    const order = [];
    for (let i=0; i<startIdx; i++) order.push(i);
    for (let i=startIdx; i<endIdx; i++) order.push(i);           // pass 1: as written (includes [1)
    for (let i=startIdx; i<seg2End; i++) order.push(i);         // pass 2: skip [1 by stopping at [1 marker
    for (let i=e2Idx; i<steps.length; i++) order.push(i);       // continue from [2 (or end of repeat)

    // Clone steps and rebuild monotonic timeMs using deltas from original score order.
    const expanded = [];
    let t = 0;
    for (let k=0; k<order.length; k++) {
      const oi = order[k];
      const base = steps[oi];
      const clone = { ...base, timeMs: t, __origIdx: oi, holds: base.holds ? base.holds.slice() : base.holds };
      expanded.push(clone);

      if (k < order.length - 1) {
        const oiNext = order[k+1];
        let delta = 0;
        if (oiNext === oi + 1) delta = (steps[oiNext].timeMs || 0) - (steps[oi].timeMs || 0);
        else delta = (oi + 1 < steps.length) ? (steps[oi+1].timeMs || 0) - (steps[oi].timeMs || 0) : 0;
        if (!Number.isFinite(delta)) delta = 0;
        t += Math.max(0, delta);
      }
    }
    return expanded;
  } catch (e) {
    console.warn('expandRepeatsAndVoltas failed:', e);
    return steps;
  }
};

const extractSteps = () => {
    const abc = state.currentSong.workingABC;
    if (!abc) return [];

    // 1) Parse -> eventsByVoice + voiceOrder
    const { voiceOrder, eventsByVoice, markers } = parseVoiceEvents(abc);
    // Timing: parser uses "ticks" where 100 ticks = 1 *default note length* (L:), NOT real milliseconds.
    // Convert ticks -> real milliseconds at the song's base tempo so Rhythm mode can compare against performance.now().
    const meta = parseMetaFromAbc(abc);
    const bpmBase = (meta && meta.bpm) ? meta.bpm : (state.currentSong.baseBpm || state.settings.bpm || 80);
    const q = (meta && meta.qNum && meta.qDen) ? (meta.qNum / meta.qDen) : (1/4);   // tempo unit from Q:
    const L = (meta && meta.lNum && meta.lDen) ? (meta.lNum / meta.lDen) : (1/8);   // default note length from L:
    const unitMsBase = (60000 / Math.max(1, bpmBase)) * (L / q); // ms for 1 *L* at base tempo
    const tickMsBase = unitMsBase / 100; // ms for 1 parser tick


    // 2) Gộp theo thời điểm
    const stepsByTime = new Map(); // timeMs -> step
    const addEventToStep = (evt) => {
        const t = Math.round(evt.timeMs * tickMsBase);
        if (!stepsByTime.has(t)) stepsByTime.set(t, { timeMs: t, pitches: [], elements: [], elementPitches: [], holds: [] });
        const step = stepsByTime.get(t);
        step.pitches.push(...evt.pitches);
    };

    Object.keys(eventsByVoice).forEach(v => eventsByVoice[v].forEach(addEventToStep));

    // Dedup pitches per step
    for (const step of stepsByTime.values()) {
        step.pitches = Array.from(new Set(step.pitches));
    }

    // 3) Map DOM SVG note groups -> đúng event theo voice (abcjs-vN)
    const visualElements = document.querySelectorAll('g.abcjs-note');
    if (!visualElements || visualElements.length === 0) {
        console.error("Không tìm thấy class .abcjs-note");
        // vẫn trả về step logic để debug
        return Array.from(stepsByTime.values()).sort((a,b)=>a.timeMs-b.timeMs);
    }

    // Counter theo voiceIndex (abcjs-v0, abcjs-v1,...)
    const voiceDomCounters = {};

    // Để map DOM voiceIndex -> voiceId trong ABC: dựa vào thứ tự voice xuất hiện trong ABC sau khi apply hand-filter.
    const voiceIdForIndex = (voiceIdx) => voiceOrder[voiceIdx] || voiceOrder[0] || '1';

    // Map lần lượt: mỗi g.abcjs-note thuộc 1 voiceIndex => lấy event cùng index trong eventsByVoice[voiceId]
    visualElements.forEach((el) => {
        let voiceIdx = 0;
        el.classList.forEach(c => {
            const m = c.match(/^abcjs-v(\d+)$/);
            if (m) voiceIdx = parseInt(m[1], 10);
        });

        const voiceId = voiceIdForIndex(voiceIdx);
        const idx = voiceDomCounters[voiceIdx] || 0;
        voiceDomCounters[voiceIdx] = idx + 1;

        const evts = eventsByVoice[voiceId] || [];
        const evt = evts[idx];
        if (!evt) return;

        const t = Math.round(evt.timeMs * tickMsBase);
        const step = stepsByTime.get(t);
        if (!step) return;

        step.elements.push(el);
        // store pitches directly on the SVG group for hover tooltip fallback
        try { el.dataset.pitches = (evt.pitches || []).join(','); } catch(e) {}
        try { el.dataset.noteNames = (evt.pitches || []).filter(Number.isFinite).map(midiToName).join(' '); } catch(e) {}
        step.elementPitches.push({ el, pitches: evt.pitches });
        // sustain duration (ms) for this SVG note group
        const durMs = Math.round(((evt.durT || 0)) * tickMsBase);
        if (!step.holds) step.holds = [];
        step.holds.push({ el, durMs });
        try { el.dataset.durMs = String(durMs); } catch(e) {}

    });

    // 4) Sort + filter out steps không có pitch
    let steps = Array.from(stepsByTime.values()).sort((a, b) => a.timeMs - b.timeMs);
    steps = steps.filter(s => s.pitches && s.pitches.length > 0);

    // 5) Expand repeats/voltas so Practice/Play highlight follows the written repeat structure.
    steps = expandRepeatsAndVoltas(steps, markers, tickMsBase);

    return steps;
};


    
    // ---- ABC tempo helper (two-way with BPM slider) ----
    const setAbcTempo = (abc, bpm) => {
      const line = `Q:1/4=${bpm}`;
      if (/^Q:/m.test(abc)) return abc.replace(/^Q:.*$/m, line);
      // insert before K: if exists, else append
      const lines = abc.split('\n');
      const kIdx = lines.findIndex(l => /^K:/.test(l.trim()));
      const insertAt = kIdx >= 0 ? kIdx : lines.length;
      lines.splice(insertAt, 0, line);
      return lines.join('\n');
    };

    // ---- Normalize ABC (helpful for users who type F# / Bb / spaces in chords) ----
    const normalizeAbc = (abc) => {
      const lines = abc.split('\n');
      const out = lines.map((line) => {
        // keep header lines as-is (X:, T:, M:, L:, Q:, K:, V:, etc)
        if (/^\s*[A-Za-z]:/.test(line) && !/^\s*\[V:/.test(line)) return line;

        // protect inline field tags like [K:...], [V:...]
        const placeholders = [];
        const protectedLine = line.replace(/\[[A-Za-z]:[^\]]+\]/g, (m) => {
          placeholders.push(m);
          return `@@TAG${placeholders.length-1}@@`;
        });

        // remove spaces inside chord brackets ONLY (not field tags)
        let s = protectedLine.replace(/\[(?![A-Za-z]:)([^\]\n]+)\]/g, (m, inner) => '[' + inner.replace(/\s+/g,'') + ']');

        // convert note# => ^note (e.g., F# -> ^F)
        s = s.replace(/([A-Ga-g])#/g, '^$1');

        // convert uppercase flats like Bb -> _B (avoid touching lowercase note 'b')
        s = s.replace(/([A-G])b/g, '_$1');

        // restore inline tags
        s = s.replace(/@@TAG(\d+)@@/g, (_, i) => placeholders[parseInt(i,10)]);
        return s;
      });
      return out.join('\n');
    };


    // ---- Hover dwell tooltip on notes (replaces Hints) ----
    const elementPitchMap = new Map(); // element -> Set(pitches)
    const elementStepIndexMap = new Map(); // element -> first visible step index
    const buildElementPitchMap = (steps) => {
      elementPitchMap.clear();
      elementStepIndexMap.clear();
      (steps || []).forEach((step, stepIdx) => {
        if (!step || !step.elements || !step.pitches) return;
        const els = step.elements;
        const ps = step.pitches;
        if (!els.length || !ps.length) return;

        if (els.length === ps.length) {
          for (let i=0;i<els.length;i++){
            const el = els[i], p = ps[i];
            if (!el) continue;
            const set = elementPitchMap.get(el) || new Set();
            set.add(p);
            elementPitchMap.set(el, set);
            if (!elementStepIndexMap.has(el)) elementStepIndexMap.set(el, stepIdx);
          }
        } else {
          els.forEach(el => {
            if (!el) return;
            const set = elementPitchMap.get(el) || new Set();
            ps.forEach(p => set.add(p));
            elementPitchMap.set(el, set);
            if (!elementStepIndexMap.has(el)) elementStepIndexMap.set(el, stepIdx);
          });
        }
      });
    };

    let hoverTimer = null;
    let lastHoverEl = null;

    const hideNoteTooltip = () => {
      const tip = $('noteTooltip');
      if (!tip) return;
      tip.style.display = 'none';
      tip.textContent = '';
    };

    const showNoteTooltip = (el) => {
      const tip = $('noteTooltip');
      if (!tip || !el) return;

      const wrapRect = $('sheetWrap').getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const x = (r.left - wrapRect.left) + (r.width / 2);
      const y = (r.top - wrapRect.top);

      let mids = null;
      const set = elementPitchMap.get(el);
      if (set && set.size) {
        mids = Array.from(set);
      } else if (el.dataset && el.dataset.pitches) {
        mids = el.dataset.pitches.split(',').map(x => parseInt(x, 10)).filter(Number.isFinite);
      }
      if (!mids || mids.length === 0) return;

      // dedup + sort
      mids = Array.from(new Set(mids)).sort((a,b)=>a-b);
      let names = (el.dataset && el.dataset.noteNames) ? el.dataset.noteNames : mids.map(midiToName).join(' ');
      // Fallback: if mapping fails, show raw midi numbers
      if (!names || names.trim() === '' || names.trim() === '?') {
        const raw = mids.map(x => String(x)).join(' ');
        if (raw) names = raw;
      }
      tip.textContent = names;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
      tip.style.display = 'block';
    };

    const bindNoteHoverTooltips = () => {
      hideNoteTooltip();
      const notes = document.querySelectorAll('g.abcjs-note');
      notes.forEach(el => {
        el.addEventListener('mouseenter', () => {
          lastHoverEl = el;
          if (hoverTimer) clearTimeout(hoverTimer);
          hoverTimer = setTimeout(() => {
            if (lastHoverEl === el) showNoteTooltip(el);
          }, 450);
        });
        el.addEventListener('mouseleave', () => {
          lastHoverEl = null;
          if (hoverTimer) clearTimeout(hoverTimer);
          hideNoteTooltip();
        });
      });

      $('sheetWrap').addEventListener('scroll', hideNoteTooltip, { passive: true });
    };


    // ---- Click note on sheet -> select corresponding ABC in textarea ----
    const selectAbcRange = (start, end) => {
      const ta = $('abcInput');
      if (!ta) return;
      if (typeof start !== 'number' || typeof end !== 'number' || start < 0 || end <= start) return;
      ta.focus();
      ta.setSelectionRange(start, end);

      // scroll roughly to line
      const before = ta.value.slice(0, start);
      const line = before.split('\n').length;
      ta.scrollTop = Math.max(0, (line - 3) * 18);
    };

    const getClickCharRange = (abcelem, analysis) => {
      const candidates = [
        abcelem,
        abcelem && abcelem.abcelem,
        analysis,
        analysis && analysis.abcelem,
        analysis && analysis.elem,
      ];
      for (const o of candidates) {
        if (!o) continue;
        const s = o.startChar ?? o.start;
        const e = o.endChar ?? o.end;
        if (typeof s === 'number' && typeof e === 'number' && e > s) return {start:s, end:e};
      }
      return null;
    };

    const clearLoopMarks = () => {
      document.querySelectorAll('g.abcjs-note').forEach(el => {
        el.classList.remove('note-loop-pick','note-loop-span','note-loop-edge');
      });
    };

    const getLoopLabelForStep = (idx) => {
      const steps = state.practice.expectedSteps || [];
      const step = steps[idx];
      if (!step) return '—';
      const names = uniq(step.pitches || []).sort((a,b)=>a-b).map(midiToName).join(' ');
      const parallel = Math.max(0, uniq(step.pitches || []).length - 1);
      return `Step ${idx + 1} • ${names || '—'}${parallel > 0 ? ` • +${parallel} song song` : ''}`;
    };

    const updateLoopUI = () => {
      const btn = $('btnLoopRange');
      const sub = $('songLoopSub');
      const loop = state.looping || {};
      if (!btn || !sub) return;

      btn.classList.toggle('toggleOn', !!loop.active);
      if (loop.active && Number.isFinite(loop.startIdx) && Number.isFinite(loop.endIdx)) {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i> Looping';
        sub.textContent = `Looping: ${getLoopLabelForStep(loop.startIdx)} → ${getLoopLabelForStep(loop.endIdx)} • nốt song song được tính tự động`;
        return;
      }

      if ((loop.draft || []).length === 1) {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i> Loop Range';
        sub.textContent = `Loop pick 1/2: ${getLoopLabelForStep(loop.draft[0])}`;
        return;
      }

      btn.innerHTML = '<i class="fa-solid fa-repeat"></i> Loop Range';
      sub.textContent = 'Loop off • Ctrl/Cmd + click 2 notes để khóa đoạn';
    };

    const applyLoopMarks = () => {
      clearLoopMarks();
      const steps = state.practice.expectedSteps || [];
      const loop = state.looping || {};

      if (loop.active && Number.isFinite(loop.startIdx) && Number.isFinite(loop.endIdx)) {
        const a = Math.max(0, Math.min(loop.startIdx, loop.endIdx));
        const b = Math.min(steps.length - 1, Math.max(loop.startIdx, loop.endIdx));
        for (let i = a; i <= b; i++) {
          const st = steps[i];
          if (!st || !st.elements) continue;
          st.elements.forEach(el => el.classList.add('note-loop-span'));
        }
        [a, b].forEach(i => {
          const st = steps[i];
          if (!st || !st.elements) return;
          st.elements.forEach(el => {
            el.classList.remove('note-loop-span');
            el.classList.add('note-loop-edge');
          });
        });
      } else if ((loop.draft || []).length === 1) {
        const st = steps[loop.draft[0]];
        if (st && st.elements) st.elements.forEach(el => el.classList.add('note-loop-pick'));
      }

      updateLoopUI();
    };

    const clearLoopSelection = ({ silent=false } = {}) => {
      state.looping.draft = [];
      state.looping.active = false;
      state.looping.startIdx = null;
      state.looping.endIdx = null;
      applyLoopMarks();
      if (!silent) showToast('Loop off');
    };

    const setLoopRange = (idxA, idxB) => {
      const steps = state.practice.expectedSteps || [];
      if (!steps.length) return;
      const a = Math.max(0, Math.min(idxA, idxB));
      const b = Math.min(steps.length - 1, Math.max(idxA, idxB));
      state.looping.draft = [];
      state.looping.active = true;
      state.looping.startIdx = a;
      state.looping.endIdx = b;
      applyLoopMarks();
      showToast(`Looping steps ${a + 1} → ${b + 1}`);
    };

    const handleLoopNotePick = (noteEl) => {
      if (state.practice.running) {
        showToast('Stop practice trước khi đổi loop.');
        return;
      }
      if (!noteEl) return;
      const idx = elementStepIndexMap.get(noteEl);
      if (!Number.isFinite(idx)) return;

      if (state.looping.active) {
        clearLoopSelection({ silent: true });
      }

      const draft = Array.isArray(state.looping.draft) ? state.looping.draft.slice() : [];
      if (draft.length === 0) {
        state.looping.draft = [idx];
        applyLoopMarks();
        showToast('Loop pick 1/2');
        return;
      }

      if (draft[0] === idx) {
        state.looping.draft = [];
        applyLoopMarks();
        showToast('Loop pick cleared');
        return;
      }

      setLoopRange(draft[0], idx);
    };


    // ---------- Rendering ----------
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

    const parseTitleFromAbc = (abc) => {
      const m = abc.match(/^T:(.*)$/m);
      return (m && m[1] ? m[1].trim() : 'Untitled');
    };
    const parseMetaFromAbc = (abc) => {
      // Parse tempo Q: (supports Q:1/4=80, Q:80, Q:=80, and ignores extra text)
      const qLineMatch = abc.match(/^Q:(.*)$/m);
      const qLine = qLineMatch ? qLineMatch[1].trim() : '';
      let bpm = 80;
      let qNum = 1, qDen = 4; // tempo unit, default 1/4
      let m = qLine.match(/(\d+)\s*\/\s*(\d+)\s*=\s*(\d+)/);
      if (m) {
        qNum = parseInt(m[1], 10) || 1;
        qDen = parseInt(m[2], 10) || 4;
        bpm = parseInt(m[3], 10) || 80;
      } else {
        // try "=80" or "80"
        const mEq = qLine.match(/=\s*(\d+)/);
        const mNum = qLine.match(/(\d+)/);
        if (mEq) bpm = parseInt(mEq[1], 10) || 80;
        else if (mNum) bpm = parseInt(mNum[1], 10) || 80;
      }

      // Parse default note length L: (supports L:1/8). ABC default is often 1/8 for common meters.
      const lMatch = abc.match(/^L:\s*(\d+)\s*\/\s*(\d+)\s*$/m);
      let lNum = 1, lDen = 8;
      if (lMatch) {
        lNum = parseInt(lMatch[1], 10) || 1;
        lDen = parseInt(lMatch[2], 10) || 8;
      }

      const mLine = abc.match(/^M:(.*)$/m);
      const meter = mLine ? mLine[1].trim() : '4/4';
      const kLine = abc.match(/^K:(.*)$/m);
      const key = kLine ? kLine[1].trim() : 'C';

      return { bpm, meter, key, qNum, qDen, lNum, lDen };
    };

    const clearAllMarks = () => {
      document.querySelectorAll('g.abcjs-note').forEach(el => {
        el.classList.remove('note-current','note-correct','note-wrong','note-partial','note-had-error','note-playback');
      });
    
      try { clearActive(activePractice, 'note-current'); } catch(e) {}
      try { clearActive(activePreview, 'note-playback'); } catch(e) {}
    };
    const clearCurrentMark = () => {
      document.querySelectorAll('g.abcjs-note.note-current, g.abcjs-note.note-partial').forEach(el => {
        el.classList.remove('note-current','note-partial');
      });
    };
    const markStep = (step, cls) => {
      if (!step || !step.elements) return;
      step.elements.forEach(el => el.classList.add(cls));
    };
    const unmarkStep = (step, cls) => {
      if (!step || !step.elements) return;
      step.elements.forEach(el => el.classList.remove(cls));
    };


    // --- Sustain highlight: keep active notes colored until their duration ends ---
    const ACTIVE_EPS = 1; // ms tolerance
    const activePractice = new Map(); // el -> endMs (note-current)
    const activePreview  = new Map(); // el -> endMs (note-playback)

    const removeClassSafe = (el, cls) => {
      try { if (el && el.classList) el.classList.remove(cls); } catch(e) {}
    };

    const expireActive = (activeMap, nowMs, cls) => {
      if (!activeMap || activeMap.size === 0) return;
      for (const [el, endMs] of Array.from(activeMap.entries())) {
        if (!el || !Number.isFinite(endMs) || endMs <= (nowMs + ACTIVE_EPS)) {
          removeClassSafe(el, cls);
          activeMap.delete(el);
        }
      }
    };

    const activateStep = (activeMap, step, cls) => {
      if (!step) return;
      const start = (typeof step.timeMs === 'number') ? step.timeMs : 0;
      const holds = (step.holds && step.holds.length) ? step.holds : (step.elements || []).map(el => ({ el, durMs: 0 }));
      holds.forEach(h => {
        const el = (h && h.el) ? h.el : h;
        if (!el) return;
        const durMs = (h && Number.isFinite(h.durMs)) ? Math.max(0, h.durMs) : 0;
        const endMs = start + durMs;
        const prev = activeMap.get(el);
        if (!prev || endMs > prev) activeMap.set(el, endMs);
        try { el.classList.add(cls); } catch(e) {}
      });
    };

    const clearActive = (activeMap, cls) => {
      if (!activeMap) return;
      for (const [el] of Array.from(activeMap.entries())) removeClassSafe(el, cls);
      activeMap.clear();
    };

    // --- Auto-scroll sheet so current note is never hidden (Play & Practice) ---
    let lastAutoScrollKey = null;
    let lastAutoScrollAt = 0;

    const syncAutoScrollUI = () => {
      const btn = $('btnAutoScroll');
      if (!btn) return;
      btn.classList.toggle('toggleOn', !!state.settings.autoScroll);
      btn.title = state.settings.autoScroll ? 'Auto-scroll: ON' : 'Auto-scroll: OFF';
    };

    const ensureStepVisible = (step, key, behavior = 'smooth', opts = {}) => {
      if (!state.settings.autoScroll) return;
      const wrap = $('sheetWrap');
      if (!wrap || !step || !step.elements || step.elements.length === 0) return;

      // Guard against accidental rapid re-scroll for the same key (e.g. re-rendering)
      const now = performance.now();
      if (key && key === lastAutoScrollKey && (now - lastAutoScrollAt) < 250) return;
      lastAutoScrollKey = key || null;
      lastAutoScrollAt = now;

      const target = (opts && opts.targetEl && typeof opts.targetEl.getBoundingClientRect === 'function')
        ? opts.targetEl
        : step.elements.find(el => el && typeof el.getBoundingClientRect === 'function');
      if (!target) return;

      const wrapRect = wrap.getBoundingClientRect();
      const elRect = target.getBoundingClientRect();
      const h = Math.max(1, wrapRect.height);

      // "Look-ahead" scrolling: keep the focus note in the upper part of the viewport,
      // so the player can see upcoming notes BEFORE reaching them.
      const targetRatio = (opts && typeof opts.targetRatio === 'number') ? opts.targetRatio : 0.32; // where to place the focus note (0..1)
      const topBand = (opts && typeof opts.topBand === 'number') ? opts.topBand : 0.18;            // don't scroll while the note is inside this band
      const bottomBand = (opts && typeof opts.bottomBand === 'number') ? opts.bottomBand : 0.62;

      const elCenter = (elRect.top + elRect.bottom) / 2;
      const topBound = wrapRect.top + h * topBand;
      const bottomBound = wrapRect.top + h * bottomBand;
      const desired = wrapRect.top + h * targetRatio;

      if (elCenter >= topBound && elCenter <= bottomBound) return;

      const delta = elCenter - desired;

      const maxTop = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
      let newTop = wrap.scrollTop + delta;
      newTop = Math.max(0, Math.min(maxTop, newTop));

      if (Math.abs(newTop - wrap.scrollTop) < 2) return;

      try {
        wrap.scrollTo({ top: newTop, behavior });
      } catch (e) {
        wrap.scrollTop = newTop;
      }
    };



    const renderAbc = () => {
      let abc = $('abcInput').value.trim();
      if (!abc) return;
      const normalized = normalizeAbc(abc);
      if (normalized !== abc) {
        $('abcInput').value = normalized;
        abc = normalized;
        showToast('Normalized ABC (#→^, chord spaces removed)');
      }
      state.currentSong.originalABC = abc;
      state.currentSong.workingABC = abc;

      const meta = parseMetaFromAbc(abc);
      state.currentSong.baseBpm = meta.bpm || state.settings.bpm;
      // sync BPM UI from ABC
      state.settings.bpm = state.currentSong.baseBpm;
      $('bpmRange').value = String(state.settings.bpm);
      $('bpmVal').textContent = String(state.settings.bpm);
      if (!Number.isFinite(state.settings.bpm) || state.settings.bpm <= 0) state.settings.bpm = state.currentSong.baseBpm;

      const title = parseTitleFromAbc(abc);
      state.currentSong.title = title;
      $('songTitle').textContent = title;
      $('songSub').textContent = `Key: ${meta.key} • Meter: ${meta.meter} • Base tempo: ${state.currentSong.baseBpm} BPM`;
      // keep metronome in sync with the song
      Metro.syncToSong({ meter: meta.meter, bpm: state.settings.bpm });

      $('paper').innerHTML = '';
      // clear any preview playback highlight from previous render
      try { document.querySelectorAll('g.abcjs-note.note-playback').forEach(el => el.classList.remove('note-playback')); } catch(e) {}
      if (!window.ABCJS || !ABCJS.renderAbc) {
        showToast('ABCJS not loaded. Please use internet or GitHub Pages (https).');
        $('paper').innerHTML = '<div style="padding:14px;border:1px solid rgba(245,158,11,0.35);background:rgba(245,158,11,0.08);border-radius:14px;font-weight:900;">Library ABCJS chưa tải được. Hãy bật internet và reload trang.</div>';
        return;
      }
      try {
        const visualObjs = ABCJS.renderAbc('paper', abc, {
          add_classes: true,
          clickListener: (abcelem, tuneNumber, classes, analysis, drag, mouseEvent) => {
            const target = mouseEvent && mouseEvent.target && mouseEvent.target.closest ? mouseEvent.target.closest('g.abcjs-note') : null;
            if (mouseEvent && (mouseEvent.ctrlKey || mouseEvent.metaKey)) {
              mouseEvent.preventDefault();
              handleLoopNotePick(target);
              return;
            }

            const r = getClickCharRange(abcelem, analysis);
            if (r) {
              selectAbcRange(r.start, r.end);
              if (document.body.classList.contains('practice-focus')) {
                showToast('ABC selected (Back to edit to see highlight)');
              }
            }
          },
          responsive: 'resize',
          paddingtop: 10,
          paddingleft: 10,
          paddingright: 10,
          paddingbottom: 10,
          staffwidth: 860
        });
        state.currentSong.visualObj = visualObjs && visualObjs[0] ? visualObjs[0] : null;
      } catch (e) {
        console.error(e);
        showToast('ABC render failed. Check ABC syntax (K changes should be [K:G], chords like [CEG]).');
        return;
      }

      const steps = extractSteps();
      state.practice.expectedSteps = steps;
      buildElementPitchMap(steps);
      bindNoteHoverTooltips();

      state.looping.draft = [];
      state.looping.active = false;
      state.looping.startIdx = null;
      state.looping.endIdx = null;
      applyLoopMarks();

      state.practice.barFirstIdx = new Map();
      steps.forEach((s, idx) => {
        const b = (s.barIndex ?? s.bar ?? 0);
        if (!state.practice.barFirstIdx.has(b)) state.practice.barFirstIdx.set(b, idx);
      });

      clearAllMarks();
      showToast(`Rendered: ${steps.length} steps`);
    };

    const applyZoom = () => {
      const z = parseInt($('zoomRange').value, 10) / 100;
      $('paper').style.transform = `scale(${z})`;
    };

    // ---------- MIDI ----------
    const setMidiBadge = (status, text) => {
      const b = $('midiBadge');
      b.classList.remove('off','on','warn');
      b.classList.add(status);
      $('midiText').textContent = text;
    };

    const refreshMidiList = async () => {
      $('midiSelect').innerHTML = '';
      if (!navigator.requestMIDIAccess) {
        setMidiBadge('warn', 'No WebMIDI');
        showToast('Trình duyệt không hỗ trợ WebMIDI.');
        return;
      }
      try {
        state.midi.access = state.midi.access || await navigator.requestMIDIAccess();
      } catch(e) {
        console.error(e);
        setMidiBadge('warn', 'MIDI blocked');
        showToast('MIDI permission blocked.');
        return;
      }
      const inputs = Array.from(state.midi.access.inputs.values());
      if (inputs.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No MIDI input found';
        $('midiSelect').appendChild(opt);
        setMidiBadge('off', 'MIDI Off');
        return;
      }
      inputs.forEach((inp) => {
        const opt = document.createElement('option');
        opt.value = inp.id;
        opt.textContent = inp.name || inp.manufacturer || inp.id;
        $('midiSelect').appendChild(opt);
      });
      setMidiBadge(state.midi.connected ? 'on' : 'warn', state.midi.connected ? 'MIDI On' : 'Select MIDI');
    };

    const connectSelectedMidi = async () => {
      await refreshMidiList();
      const id = $('midiSelect').value;
      if (!id) { showToast('Không có MIDI input.'); return; }
      const inputs = Array.from(state.midi.access.inputs.values());
      const chosen = inputs.find(i => i.id === id) || inputs[0];
      if (!chosen) { showToast('MIDI input not found.'); return; }

      if (state.midi.input) state.midi.input.onmidimessage = null;
      state.midi.input = chosen;
      state.midi.input.onmidimessage = onMidiMessage;
      state.midi.connected = true;

      setMidiBadge('on', 'MIDI On');
      showToast('MIDI connected.');
      closeModal('midiModal');
    };

    const onMidiMessage = (msg) => {
      const [st, d1, d2] = msg.data;
      const cmd = st & 0xF0;
      if (cmd === 0x90 && d2 > 0) {
        state.activeKeys.add(d1);
        handleNoteOn(d1, d2);
      } else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) {
        state.activeKeys.delete(d1);
      }
    };

    // ---------- Practice logic ----------
    const getScaledTimeMs = (rawMs) => {
      const base = state.currentSong.baseBpm || state.settings.bpm || 80;
      const target = state.settings.bpm || base;
      if (!base || !target) return rawMs;
      return rawMs * (base / target);
    };

    const getActivePracticeRange = () => {
      const steps = state.practice.expectedSteps || [];
      if (!steps.length) return { start: 0, end: -1, total: 0 };
      if (state.looping && state.looping.active && Number.isFinite(state.looping.startIdx) && Number.isFinite(state.looping.endIdx)) {
        const start = Math.max(0, Math.min(state.looping.startIdx, state.looping.endIdx));
        const end = Math.min(steps.length - 1, Math.max(state.looping.startIdx, state.looping.endIdx));
        return { start, end, total: (end - start + 1) };
      }
      return { start: 0, end: steps.length - 1, total: steps.length };
    };

    const buildHud = () => {
      const m = state.mode;
      const s = state.practice.stats;

      let text = '';
      if (m === 'beginner') {
        const firstTry = Math.round((s.perfectSteps / Math.max(1, s.total)) * 100);
        text = `First-try ${firstTry}% • Done ${s.done}/${s.total} • Errors ${s.wrongSteps}`;
      } else if (m === 'flow') {
        const acc = Math.round((s.correctSteps / Math.max(1, s.done)) * 100);
        text = `Acc ${acc}% • Done ${s.done}/${s.total} • Wrong ${s.wrongSteps}`;
      } else if (m === 'structure') {
        const shape = Math.round((s.correctSteps / Math.max(1, s.done)) * 100);
        text = `Shape ${shape}% • Done ${s.done}/${s.total} • Wrong ${s.wrongSteps}`;
      } else {
        const ok = Math.round((s.correctSteps / Math.max(1, s.done)) * 100);
        text = `OK ${ok}% • Done ${s.done}/${s.total} • Miss ${s.wrongSteps}`;
      }

      const hdr = $('hdrStats');
      if (hdr) hdr.textContent = text || '—';
    };

    const updateHint = (extraText='—') => {
      const i = state.practice.stepIndex;
      const steps = state.practice.expectedSteps;
      const step = steps[i];
      const range = getActivePracticeRange();
      const total = range.total;
      const current = step ? Math.min((i - range.start) + 1, total) : total;

      $('coachStep').textContent = `${Math.max(0,current)}/${total}`;

      // Timing/quality are updated by the scoring engines (structure/rhythm/chord tiers)
      const timeEl = $('coachTime');
      const qualEl = $('coachQual');
      if (timeEl) timeEl.textContent = state.practice.lastTimingText || '—';
      if (qualEl) qualEl.textContent = state.practice.lastQualText || '—';

      if (!step) {
        $('coachPlay').textContent = '—';
        $('coachMiss').textContent = '—';
        $('coachExtra').textContent = '—';
        return;
      }

      const req = uniq(step.pitches || []).sort((a,b)=>a-b);
      const reqNames = req.map(midiToName).join(' ');
      $('coachPlay').textContent = `${reqNames || '—'}`;

      let pressed;
      if (state.mode === 'rhythm') {
        pressed = new Set([...state.practice.windowPressed, ...state.activeKeys]);
      } else if (state.mode === 'structure') {
        pressed = new Set([...state.practice.structPressed, ...state.activeKeys]);
      } else {
        pressed = new Set([...state.practice.currentPressed, ...state.activeKeys]);
      }

      const miss = req.filter(p => !pressed.has(p));
      $('coachMiss').textContent = `${miss.length ? miss.map(midiToName).join(' ') : '—'}`;
      $('coachExtra').textContent = `${extraText || '—'}`;
    };
    
    // Choose a stable scroll anchor in PRACTICE to avoid up/down jitter between treble/bass.
    // Heuristic: prefer the highest active note near the current step's vertical system.
    const pickPracticeScrollAnchor = (step, activeMap) => {
      const wrap = $('sheetWrap');
      if (!wrap || !step || !step.elements || step.elements.length === 0) return null;

      const stepEls = (step.elements || []).filter(el => el && typeof el.getBoundingClientRect === 'function');
      if (!stepEls.length) return null;

      // Current step "system" center (in viewport coords)
      let stepCenter = 0;
      try {
        const ys = stepEls.map(el => {
          const r = el.getBoundingClientRect();
          return (r.top + r.bottom) / 2;
        });
        stepCenter = ys.reduce((a,b)=>a+b,0) / Math.max(1, ys.length);
      } catch (e) {
        stepCenter = 0;
      }

      const act = activeMap ? Array.from(activeMap.keys()) : [];
      const actRects = act
        .filter(el => el && typeof el.getBoundingClientRect === 'function')
        .map(el => ({ el, r: el.getBoundingClientRect() }));

      if (!actRects.length) return stepEls[0];

      const SYSTEM_THRESH_PX = 220; // keep anchor within same staff system when possible
      let candidates = actRects.filter(o => Math.abs(((o.r.top + o.r.bottom) / 2) - stepCenter) < SYSTEM_THRESH_PX);

      // If we have no nearby active notes (e.g., long tie across a line break), follow the current step instead.
      if (!candidates.length) return stepEls[0];

      candidates.sort((a,b) => a.r.top - b.r.top); // highest = treble preference
      return candidates[0].el || stepEls[0];
    };

const highlightStep = () => {
      // Keep 'note-current' on active notes until their duration ends.
      // Only clear transient partial marks each refresh.
      try { document.querySelectorAll('g.abcjs-note.note-partial').forEach(el => el.classList.remove('note-partial')); } catch(e) {}

      const steps = state.practice.expectedSteps || [];
      const step = steps[state.practice.stepIndex];
      if (!step) return;

      const nowMs = (typeof step.timeMs === 'number') ? step.timeMs : 0;
      expireActive(activePractice, nowMs, 'note-current');
      activateStep(activePractice, step, 'note-current');

      const anchor = pickPracticeScrollAnchor(step, activePractice);
      ensureStepVisible(step, `practice:${state.practice.stepIndex}`, 'smooth', { targetRatio: 0.30, topBand: 0.12, bottomBand: 0.80, targetEl: anchor });

      if ((state.mode === 'beginner' || state.mode === 'structure') && step.pitches && step.pitches.length > 1) {
        const pressed = (state.mode === 'structure')
          ? new Set([...state.practice.structPressed, ...state.activeKeys])
          : new Set([...state.activeKeys]);
        const miss = step.pitches.filter(p => !pressed.has(p));
        if (miss.length > 0 && miss.length < step.pitches.length) {
          markStep(step, 'note-partial');
        }
      }
    };

    const openModal = (id) => { $(id).style.display = 'flex'; };
    const closeModal = (id) => { $(id).style.display = 'none'; };

    // --- Metronome Popover wiring (compact header) ---
    const wireMetroPopover = () => {
      const btn = $('btnMetroMenu');
      const pop = $('metroPopover');
      const backdrop = $('metroBackdrop');
      const closeBtn = $('btnMetroPopClose');
      if (!btn || !pop) return;

      const open = () => {
        pop.style.display = 'block';
        backdrop && (backdrop.style.display = 'block');
        requestAnimationFrame(() => pop.classList.add('open'));
      };
      const close = () => {
        pop.classList.remove('open');
        pop.style.display = 'none';
        backdrop && (backdrop.style.display = 'none');
      };
      const toggle = (e) => {
        e && e.stopPropagation();
        const isOpen = pop.style.display === 'block';
        isOpen ? close() : open();
      };

      btn.addEventListener('click', toggle);
      closeBtn && closeBtn.addEventListener('click', close);
      backdrop && backdrop.addEventListener('click', close);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });

      document.addEventListener('click', (e) => {
        if (pop.style.display !== 'block') return;
        if (pop.contains(e.target) || btn.contains(e.target)) return;
        close();
      });
    };

    const finishPractice = () => {
      try { clearActive(activePractice, 'note-current'); } catch(e) {}
      try { document.querySelectorAll('g.abcjs-note.note-partial').forEach(el => el.classList.remove('note-partial')); } catch(e) {}

      state.practice.running = false;
      state.practice.status = 'finished';
      document.body.classList.remove('practice-focus');
      $('btnPractice').style.display = '';
      $('btnFocusBack').style.display = 'none';

      const m = state.mode;
      const s = state.practice.stats;
      let sub = '';
      let statsHtml = '';

      if (m === 'beginner') {
        const firstTry = Math.round((s.perfectSteps / Math.max(1, s.total)) * 100);
        sub = `Beginner mode: First-try ${firstTry}% • Steps with errors ${s.wrongSteps} • Wrong keys ${s.wrongKeystrokes}`;
        statsHtml = `
          <div class="stat"><div class="k">First-try</div><div class="v">${firstTry}%</div></div>
          <div class="stat"><div class="k">Perfect steps</div><div class="v">${s.perfectSteps}/${s.total}</div></div>
          <div class="stat"><div class="k">Steps w/ errors</div><div class="v">${s.wrongSteps}</div></div>
          <div class="stat"><div class="k">Wrong keystrokes</div><div class="v">${s.wrongKeystrokes}</div></div>
        `;
      } else {
        const acc = Math.round((s.correctSteps / Math.max(1, s.done)) * 100);
        sub = `${m.toUpperCase()} mode: Accuracy ${acc}% • Wrong steps ${s.wrongSteps}`;
        statsHtml = `
          <div class="stat"><div class="k">Accuracy</div><div class="v">${acc}%</div></div>
          <div class="stat"><div class="k">Done</div><div class="v">${s.done}/${s.total}</div></div>
          <div class="stat"><div class="k">Correct steps</div><div class="v">${s.correctSteps}</div></div>
          <div class="stat"><div class="k">Wrong steps</div><div class="v">${s.wrongSteps}</div></div>
        `;
      }

      
      // Timing summary (only for Structure/Rhythm)
      if (m === 'rhythm' || m === 'structure') {
        const deltas = (state.practice.results || []).map(r => r && r.deltaMs).filter(v => typeof v === 'number' && isFinite(v));
        if (deltas.length) {
          const abs = deltas.map(v => Math.abs(v)).sort((a,b) => a-b);
          const medianAbs = abs[Math.floor(abs.length / 2)];
          const mean = Math.round(deltas.reduce((a,b)=>a+b,0) / deltas.length);

          statsHtml += `
            <div class="stat"><div class="k">Median |Δ|</div><div class="v">${medianAbs}ms</div></div>
            <div class="stat"><div class="k">Bias</div><div class="v">${mean}ms</div></div>
          `;
        }
      }

$('resultSub').textContent = sub;
      $('resultBody').innerHTML = statsHtml;
      openModal('resultModal');
    };

    const stopPractice = () => {
      if (!state.practice.running) return;
      state.practice.running = false;
      state.practice.status = 'finished';
      if (rhythmRAF) { try { cancelAnimationFrame(rhythmRAF); } catch(e) {} rhythmRAF = null; }
      finishPractice();
    };

    const restartCurrentBar = () => {
      if (!state.practice.running) return;
      const steps = state.practice.expectedSteps;
      const i = state.practice.stepIndex;
      const cur = steps[i];
      if (!cur) return;
      const bar = cur.barIndex ?? cur.bar ?? 0;
      const idx = state.practice.barFirstIdx.get(bar) ?? 0;
      for (let j = idx; j < steps.length; j++) {
        unmarkStep(steps[j], 'note-correct');
        unmarkStep(steps[j], 'note-wrong');
        unmarkStep(steps[j], 'note-had-error');
      }
      state.practice.stepIndex = idx;
      state.practice.currentPressed = new Set();
      
      state.practice.chordOnsets = new Map();
      if (state.practice.chordTimer) { try { clearTimeout(state.practice.chordTimer); } catch(e) {} state.practice.chordTimer = null; }
      state.practice.chordPressed = new Set();
      state.practice.windowPressed = new Set();
      state.practice.windowOnsets = new Map();
      state.practice.structPressed = new Set();
      state.practice.structOnsets = new Map();
      state.practice.structExtras = new Set();
      state.practice.structure = { barIndex: null, barStartPerf: 0, barStartExp: 0, k: null, kSamples: 0, lastPerf: null, lastExp: null };
      state.practice.lastTimingText = '—';
      state.practice.lastQualText = '—';
      state.practice.pendingQualText = null;
      state.practice.stepHadError = false;
      state.practice.stepCountedWrong = false;
      highlightStep();
      updateHint('—');
      showToast('Restart bar');
    };

    const startPractice = async () => {
      if (!state.currentSong.visualObj) renderAbc();
      if (!state.currentSong.visualObj) { showToast('Render ABC trước đã.'); return; }
      if (!state.practice.expectedSteps || state.practice.expectedSteps.length === 0) {
        showToast('Không tạo được steps. Kiểm tra ABC.');
        return;
      }
      if (!state.midi.connected) showToast('Tip: Connect MIDI để chấm đúng hơn.');

      const activeRange = getActivePracticeRange();

      clearAllMarks();
      applyLoopMarks();
      state.practice.running = true;
      state.practice.status = 'countin';
      state.practice.stepIndex = activeRange.start;
      state.practice.currentPressed = new Set();
      state.practice.chordPressed = new Set();
      
      state.practice.chordOnsets = new Map();state.practice.windowPressed = new Set();
      state.practice.windowOnsets = new Map();
      state.practice.structPressed = new Set();
      state.practice.structOnsets = new Map();
      state.practice.structExtras = new Set();
      state.practice.structure = { barIndex: null, barStartPerf: 0, barStartExp: 0, k: null, kSamples: 0, lastPerf: null, lastExp: null };
      state.practice.lastTimingText = '—';
      state.practice.lastQualText = '—';
      state.practice.stepHadError = false;
      state.practice.stepCountedWrong = false;
      state.practice.results = [];
      state.practice.loop = null;

      const s = state.practice.stats;
      s.total = activeRange.total;
      s.done = 0; s.correctSteps = 0; s.wrongSteps = 0; s.wrongKeystrokes = 0; s.perfectSteps = 0;

      document.body.classList.add('practice-focus');
      $('btnPractice').style.display = 'none';
      $('btnFocusBack').style.display = 'inline-flex';

      buildHud();
      highlightStep();
      updateHint('—');

      const bars = parseInt($('countInSel').value, 10) || 0;
      state.settings.countInBars = bars;

      // If metronome is running, re-sync it to the practice start (count-in uses the same grid)
      if (Metro.enabled) { Metro.syncToPractice({ countInBars: bars }); }

      state.practice.startPerf = performance.now();
      if ((state.mode === 'rhythm' || state.mode === 'structure') && bars > 0) {
        showToast(`Count-in: ${bars} bar(s)`);
        const msPerBeat = 60000 / state.settings.bpm;
        const meter = parseMetaFromAbc(state.currentSong.workingABC).meter || '4/4';
        const beats = parseInt((meter.split('/')[0]||'4'),10);
        const countMs = bars * beats * msPerBeat;
        setTimeout(() => {
          if (!state.practice.running) return;
          state.practice.status = 'running';
          state.practice.startPerf = performance.now();
          showToast('Go!');
          if (state.mode === 'rhythm') startRhythmLoop();
        }, Math.max(200, countMs));
      } else {
        state.practice.status = 'running';
        if (state.mode === 'rhythm') startRhythmLoop();
      }
    };

    const completeStep = (ok, missing=[], extra=[], deltaMs=null) => {
      const steps = state.practice.expectedSteps;
      const step = steps[state.practice.stepIndex];
      if (!step) return;

      unmarkStep(step, 'note-current');
      unmarkStep(step, 'note-partial');
      if (ok) {
        unmarkStep(step, 'note-wrong');
        markStep(step, 'note-correct');
        if (state.practice.stepHadError) markStep(step, 'note-had-error');
      } else {
        unmarkStep(step, 'note-correct');
        markStep(step, 'note-wrong');
        markStep(step, 'note-had-error');
      }

      const s = state.practice.stats;
      s.done += 1;
      if (ok) s.correctSteps += 1;
      else s.wrongSteps += 1;

      state.practice.results.push({
        ok, missing, extra, deltaMs,
        bar: step.barIndex ?? step.bar ?? 0
      });

      state.practice.stepIndex += 1;

      state.practice.currentPressed = new Set();
      state.practice.chordOnsets = new Map();

      // reset flow/rhythm transient windows safely
      if (state.practice.chordTimer) { try { clearTimeout(state.practice.chordTimer); } catch(e) {} state.practice.chordTimer = null; }
      state.practice.chordPressed = new Set();
      state.practice.windowPressed = new Set();
      state.practice.windowOnsets = new Map();
      state.practice.structPressed = new Set();
      state.practice.structOnsets = new Map();
      state.practice.structExtras = new Set();

      // Update coach timing feedback for the step that just completed
      if (deltaMs === null || deltaMs === undefined) {
        state.practice.lastTimingText = '—';
      } else {
        const ad = Math.abs(deltaMs);
        if (ad <= 12) state.practice.lastTimingText = 'On time';
        else state.practice.lastTimingText = (deltaMs < 0 ? `Early ${ad}ms` : `Late ${ad}ms`);
      }

      // Allow caller to override quality text (e.g., chord tier)
      if (state.practice.pendingQualText) {
        state.practice.lastQualText = state.practice.pendingQualText;
        state.practice.pendingQualText = null;
      } else {
        if (state.mode === 'structure') state.practice.lastQualText = ok ? 'Shape OK' : 'Shape off';
        else if (state.mode === 'rhythm') state.practice.lastQualText = ok ? 'OK' : 'Off';
        else if (state.mode === 'flow') state.practice.lastQualText = ok ? 'OK' : 'Wrong';
        else state.practice.lastQualText = ok ? 'OK' : 'Wrong';
      }
      state.practice.stepHadError = false;
      state.practice.stepCountedWrong = false;

      const activeRange = getActivePracticeRange();
      if (state.practice.stepIndex > activeRange.end) { stopPractice(); return; }

      highlightStep();
      updateHint('—');
      buildHud();
    };

    const getRhythmTol = (idx) => {
      // Dynamic tolerance to avoid overlapping timing windows on fast passages.
      // Cap tolerance to ~45% of the gap to the next step (scaled by current BPM).
      const steps = state.practice.expectedSteps || [];
      const baseTol = Math.max(20, Number(state.settings.toleranceMs || 160));
      const step = steps[idx];
      if (!step) return baseTol;
      const next = steps[idx + 1];
      if (!next) return baseTol;

      const t0 = getScaledTimeMs(step.timeMs || 0);
      const t1 = getScaledTimeMs(next.timeMs || 0);
      const gap = Math.max(0, t1 - t0);

      const cap = Math.max(25, Math.floor(gap * 0.45));
      return Math.min(baseTol, cap);
    };

    
    const getStructureTolMul = () => {
      const s = (state.settings.structureStrict || 'normal');
      if (s === 'tight') return 0.18;
      if (s === 'loose') return 0.45;
      return 0.30; // normal
    };

    const evalChordTogether = (spreadMs) => {
      const base = Math.max(60, Number(state.settings.chordTogetherMs || 120));
      const perfect = base;
      const ok = Math.round(base * 1.8);
      const pass = Math.round(base * 2.6);

      if (spreadMs <= perfect) return { pass: true, quality: `Chord perfect (${spreadMs}ms)`, hadError: false };
      if (spreadMs <= ok) return { pass: true, quality: `Chord OK (+${spreadMs}ms)`, hadError: true };
      if (spreadMs <= pass) return { pass: true, quality: `Chord late (+${spreadMs}ms)`, hadError: true };
      return { pass: false, quality: `Chord not together (+${spreadMs}ms)`, hadError: true };
    };

const handleNoteOn = (pitch, vel=100) => {
      if (!state.practice.running || state.practice.status !== 'running') return;
      const steps = state.practice.expectedSteps;
      const idx = state.practice.stepIndex;
      const step = steps[idx];
      if (!step) return;

      let extraText = '—';

      if (state.mode === 'beginner') {
        const reqArr = (step.pitches || []);
        const req = new Set(reqArr);
        const isChord = req.size > 1;

        if (req.has(pitch)) {
          // For single notes we keep the old "progress memory".
          // For chords we REQUIRE notes to be held together, so we track onsets separately.
          if (!isChord) state.practice.currentPressed.add(pitch);
          if (isChord && !state.practice.chordOnsets.has(pitch)) {
            state.practice.chordOnsets.set(pitch, performance.now());
          }
        } else {
          state.practice.stats.wrongKeystrokes += 1;
          extraText = midiToName(pitch);
          if (!state.practice.stepCountedWrong) {
            state.practice.stats.wrongSteps += 1;
            state.practice.stepCountedWrong = true;
          }
          state.practice.stepHadError = true;
          markStep(step, 'note-wrong');
          setTimeout(() => unmarkStep(step,'note-wrong'), 120);
          buildHud();
          updateHint(extraText);
          return;
        }

        // ---- Chord in Beginner: must be HELD together + pressed "together enough" ----
        if (isChord) {
          const held = new Set(state.activeKeys);
          const missingHeld = reqArr.filter(p => !held.has(p));

          if (missingHeld.length === 0) {
            // Check onset spread to avoid "hold one note, press the other much later"
            const times = reqArr.map(p => state.practice.chordOnsets.get(p)).filter(t => typeof t === 'number');
            const spread = (times.length === reqArr.length) ? (Math.max(...times) - Math.min(...times)) : Infinity;

            const spreadMs = (isFinite(spread) ? Math.round(spread) : 999999);
            const chordEval = evalChordTogether(spreadMs);
            state.practice.lastTimingText = '—';
            state.practice.lastQualText = chordEval.quality;

            if (chordEval.pass) {
              // Non-perfect chord counts as an "error" for beginner stats, but we still advance.
              if (chordEval.hadError) {
                state.practice.stepHadError = true;
                if (!state.practice.stepCountedWrong) {
                  state.practice.stats.wrongSteps += 1;
                  state.practice.stepCountedWrong = true;
                }
              }

              // Success
              if (!state.practice.stepHadError) state.practice.stats.perfectSteps += 1;

              state.practice.stats.done += 1;
              state.practice.stats.correctSteps += 1;

              /* keep note-current until its duration ends */ unmarkStep(step,'note-partial'); unmarkStep(step,'note-wrong');
              markStep(step,'note-correct');
              if (state.practice.stepHadError) markStep(step,'note-had-error');

              state.practice.stepIndex += 1;
              state.practice.currentPressed = new Set();
              state.practice.chordOnsets = new Map();
              state.practice.stepHadError = false;
              state.practice.stepCountedWrong = false;

              const activeRange = getActivePracticeRange();
              if (state.practice.stepIndex > activeRange.end) { stopPractice(); return; }
              highlightStep();
              buildHud();
              updateHint('—');
              return;
            }

            // Not together => count as wrong step once and force retry
            if (!state.practice.stepCountedWrong) {
              state.practice.stats.wrongSteps += 1;
              state.practice.stepCountedWrong = true;
            }
            state.practice.stepHadError = true;
            markStep(step, 'note-wrong');
            setTimeout(() => unmarkStep(step,'note-wrong'), 160);
            state.practice.chordOnsets = new Map();
            updateHint(chordEval.quality);
            buildHud();
            return;
          } else {
            // Partial (some held)
            const heldCount = reqArr.filter(p => held.has(p)).length;
            if (heldCount > 0 && heldCount < reqArr.length) {
              markStep(step,'note-partial');
            }
            buildHud();
            updateHint('—');
            return;
          }
        }

        // ---- Single note (old behavior) ----
        const pressed = new Set([...state.practice.currentPressed, ...state.activeKeys]);
        const missing = reqArr.filter(p => !pressed.has(p));
        if (missing.length === 0) {
          if (!state.practice.stepHadError) state.practice.stats.perfectSteps += 1;

          state.practice.stats.done += 1;
          state.practice.stats.correctSteps += 1;

          /* keep note-current until its duration ends */ unmarkStep(step,'note-partial'); unmarkStep(step,'note-wrong');
          markStep(step,'note-correct');
          if (state.practice.stepHadError) markStep(step,'note-had-error');

          state.practice.stepIndex += 1;
          state.practice.currentPressed = new Set();
          state.practice.chordOnsets = new Map();
          state.practice.stepHadError = false;
          state.practice.stepCountedWrong = false;

          const activeRange = getActivePracticeRange();
          if (state.practice.stepIndex > activeRange.end) { stopPractice(); return; }
          highlightStep();
        } else {
          if (reqArr.length > 1) {
            const missCount = missing.length;
            if (missCount > 0 && missCount < reqArr.length) {
              markStep(step,'note-partial');
            }
          }
        }

        buildHud();
        updateHint(extraText);
        return;
      }

      if (state.mode === 'flow') {
        const req = new Set(step.pitches || []);
        const isChord = req.size > 1;

        if (!isChord) {
          const ok = req.has(pitch);
          completeStep(ok, ok?[]:[...req], ok?[]:[pitch], null);
          return;
        }

        state.practice.chordPressed.add(pitch);

        // Chords in Flow mode:
        // - allowArpeggio = ON  => accept arpeggiated chord within chordWindowMs (old behavior)
        // - allowArpeggio = OFF => require the full chord to be HELD together (overlap) within chordWindowMs
        if (state.settings.allowArpeggio) {
          if (!state.practice.chordTimer) {
            state.practice.chordTimer = setTimeout(() => {
              const played = new Set(state.practice.chordPressed);
              state.practice.chordPressed = new Set();
              state.practice.chordTimer = null;

              const missing = [...req].filter(p => !played.has(p));
              const extra = [...played].filter(p => !req.has(p));
              const ok = (missing.length === 0 && extra.length === 0);

              completeStep(ok, missing, extra, null);
            }, state.settings.chordWindowMs);
          }
          updateHint(midiToName(pitch));
          return;
        }

        // allowArpeggio OFF: must form a real chord (all required notes held at the same time)
        const heldNow = state.activeKeys || new Set();
        const missingNow = [...req].filter(p => !heldNow.has(p));

        // If chord is formed NOW, accept immediately (still check "extra onsets" within this window)
        if (missingNow.length === 0) {
          const played = new Set(state.practice.chordPressed);
          const extra = [...played].filter(p => !req.has(p));
          const ok = (extra.length === 0);

          if (state.practice.chordTimer) { clearTimeout(state.practice.chordTimer); state.practice.chordTimer = null; }
          state.practice.chordPressed = new Set();

          completeStep(ok, [], extra, null);
          return;
        }

        // Otherwise, give a short window to finish forming the chord (notes must overlap)
        if (!state.practice.chordTimer) {
          state.practice.chordTimer = setTimeout(() => {
            const played = new Set(state.practice.chordPressed);
            state.practice.chordPressed = new Set();
            state.practice.chordTimer = null;

            const missing = [...req].filter(p => !played.has(p));
            const extra = [...played].filter(p => !req.has(p));

            // If user pressed all notes but never held them together => still wrong (chord not together)
            const pressedAll = (missing.length === 0);
            completeStep(false, pressedAll ? [] : missing, extra, null);
          }, state.settings.chordWindowMs);
        }

        updateHint(midiToName(pitch));
        return;
      }


      if (state.mode === 'structure') {
        const now = performance.now();
        const steps = state.practice.expectedSteps;
        const idx = state.practice.stepIndex;
        const step = steps[idx];
        if (!step) return;

        const expMs = getScaledTimeMs(step.timeMs || 0);

        const reqArr = (step.pitches || []);
        const req = new Set(reqArr);

        // Track what user played for THIS step (like rhythm window, but without absolute BPM window)
        if (!req.has(pitch)) {
          state.practice.stats.wrongKeystrokes += 1;
          state.practice.stepHadError = true;
          state.practice.structExtras.add(pitch);
          markStep(step, 'note-wrong');
          setTimeout(() => unmarkStep(step,'note-wrong'), 120);
          updateHint(midiToName(pitch) + ' (extra)');
          buildHud();
          return;
        }

        state.practice.structPressed.add(pitch);
        if (!state.practice.structOnsets.has(pitch)) state.practice.structOnsets.set(pitch, now);

        updateHint(midiToName(pitch));
        buildHud();

        // Complete as soon as all required pitches have been played (chord OK handled below)
        const missing = reqArr.filter(p => !state.practice.structPressed.has(p));
        if (missing.length !== 0 || reqArr.length === 0) return;

        // Step onset = earliest required onset
        const onsets = reqArr.map(p => state.practice.structOnsets.get(p)).filter(t => typeof t === 'number');
        const stepOnsetPerf = onsets.length ? Math.min(...onsets) : now;

        // ---- Chord together tier (same philosophy as Beginner) ----
        let chordOk = true;
        if (reqArr.length > 1) {
          const spread = onsets.length === reqArr.length ? Math.round(Math.max(...onsets) - Math.min(...onsets)) : 999999;
          const chordEval = evalChordTogether(spread);
          state.practice.pendingQualText = chordEval.quality;
          if (!chordEval.pass) chordOk = false;
          if (chordEval.hadError) state.practice.stepHadError = true;
        } else {
          state.practice.pendingQualText = null;
        }

        // ---- Structure timing: keep the 'shape' within a bar, allow tempo flex ----
        const st = state.practice.structure || (state.practice.structure = { barIndex: null, barStartPerf: 0, barStartExp: 0, k: null, kSamples: 0, lastPerf: null, lastExp: null });
        const bar = step.barIndex ?? step.bar ?? 0;

        const firstIdx = state.practice.barFirstIdx.get(bar) ?? idx;
        const firstStep = steps[firstIdx] || step;
        const barStartExp = getScaledTimeMs(firstStep.timeMs || 0);

        let delta = null;
        let timingOk = true;

        if (st.barIndex !== bar) {
          // New bar: reset the local tempo tracker. First note of bar defines the new reference.
          st.barIndex = bar;
          st.barStartPerf = stepOnsetPerf;
          st.barStartExp = barStartExp;
          st.k = null;
          st.kSamples = 0;
          st.lastPerf = stepOnsetPerf;
          st.lastExp = expMs;
        } else {
          // Predict current onset using the tempo estimate from previous notes
          if (st.k !== null && isFinite(st.k)) {
            const tPred = st.barStartPerf + st.k * (expMs - st.barStartExp);
            delta = Math.round(stepOnsetPerf - tPred);

            const tolMul = getStructureTolMul();
            const minMs = Math.max(30, Number(state.settings.structureMinMs || 55));

            const dtExpPrev = (st.lastExp !== null) ? (expMs - st.lastExp) : 0;
            const dtPred = Math.max(1, Math.abs(st.k * (dtExpPrev || (expMs - st.barStartExp))));
            const allowed = Math.max(minMs, Math.round(dtPred * tolMul));

            timingOk = (Math.abs(delta) <= allowed);
          }

          // Update tempo estimate AFTER judging (so delta isn't trivially zero)
          if (st.lastPerf !== null && st.lastExp !== null) {
            const dtExp = expMs - st.lastExp;
            const dtUser = stepOnsetPerf - st.lastPerf;

            if (dtExp > 0 && dtUser > 0 && isFinite(dtExp) && isFinite(dtUser)) {
              let kNew = dtUser / dtExp;
              // Clamp to ignore huge pauses / wild spikes
              kNew = Math.min(3.5, Math.max(0.35, kNew));
              st.k = (st.k === null) ? kNew : (0.7 * st.k + 0.3 * kNew);
              st.kSamples = (st.kSamples || 0) + 1;
            }
          }

          st.lastPerf = stepOnsetPerf;
          st.lastExp = expMs;
        }

        const extra = [...state.practice.structExtras];
        const ok = chordOk && timingOk && (extra.length === 0);

        completeStep(ok, [], extra, delta);
        return;
      }

      if (state.mode === 'rhythm') {
        const now = performance.now();
        const t = now - state.practice.startPerf;
        const expected = getScaledTimeMs(step.timeMs || 0);
        const tol = getRhythmTol(idx);

        const reqArr = (step.pitches || []);
        const req = new Set(reqArr);

        const inWindow = (t >= expected - tol && t <= expected + tol);

        if (!inWindow) {
          // Off-time keystroke
          state.practice.stats.wrongKeystrokes += 1;
          state.practice.stepHadError = true;
          markStep(step, 'note-wrong');
          setTimeout(() => unmarkStep(step,'note-wrong'), 120);
          updateHint(midiToName(pitch) + ' (off)');
          buildHud();
          return;
        }

        // Record what was played inside the timing window
        state.practice.windowPressed.add(pitch);
        if (!state.practice.windowOnsets.has(pitch)) state.practice.windowOnsets.set(pitch, t);

        // If it's not a required pitch, remember as error (but we still wait until the window ends or the chord is complete)
        if (!req.has(pitch)) {
          state.practice.stepHadError = true;
          markStep(step, 'note-wrong');
          setTimeout(() => unmarkStep(step,'note-wrong'), 120);
        }

        updateHint(midiToName(pitch));
        buildHud();

        // Early-complete as soon as ALL required pitches have been played within the window.
        // This prevents fast passages from getting mis-attributed to the previous step.
        const played = new Set(state.practice.windowPressed);
        const missing = reqArr.filter(p => !played.has(p));
        if (missing.length === 0 && reqArr.length > 0) {
          const extra = [...played].filter(p => !req.has(p));
          const ok = (extra.length === 0);

          if (extra.length) state.practice.stats.wrongKeystrokes += extra.length;

          let delta = null;
          const onsets = reqArr.map(p => state.practice.windowOnsets.get(p)).filter(x => typeof x === 'number');
          if (onsets.length) delta = Math.round(Math.min(...onsets) - expected);

          completeStep(ok, [], extra, delta);
        }

        return;
      }
    };

    let rhythmRAF = null;
    const startRhythmLoop = () => {
      if (rhythmRAF) cancelAnimationFrame(rhythmRAF);
      state.practice._lastRhythmHiIdx = -1;
      const tick = () => {
        if (!state.practice.running || state.practice.status !== 'running' || state.mode !== 'rhythm') return;

        const steps = state.practice.expectedSteps || [];
        if (!steps.length) { stopPractice(); return; }

        const now = performance.now();
        const t = now - state.practice.startPerf;

        // Only re-highlight when the step index changes (avoid heavy DOM work every frame)
        const curIdx = state.practice.stepIndex;
        if (state.practice._lastRhythmHiIdx !== curIdx) {
          state.practice._lastRhythmHiIdx = curIdx;
          highlightStep();
        }

        // Catch up if we've already passed one or more timing windows (e.g., user paused / lag / count-in drift)
        let safety = 0;
        while (safety++ < 12) {
          const idx = state.practice.stepIndex;
          const step = steps[idx];
          if (!step) { stopPractice(); return; }

          const expected = getScaledTimeMs(step.timeMs || 0);
          const tol = getRhythmTol(idx);

          // Window still open => wait for user input
          if (t <= expected + tol) break;

          const reqArr = (step.pitches || []);
          const req = new Set(reqArr);

          const played = new Set(state.practice.windowPressed);
          const missing = reqArr.filter(p => !played.has(p));
          const extra = [...played].filter(p => !req.has(p));
          const ok = (missing.length === 0 && extra.length === 0);

          if (extra.length) state.practice.stats.wrongKeystrokes += extra.length;

          let delta = null;
          const onsets = reqArr.map(p => state.practice.windowOnsets.get(p)).filter(x => typeof x === 'number');
          if (onsets.length) delta = Math.round(Math.min(...onsets) - expected);

          completeStep(ok, missing, extra, delta);

          if (!state.practice.running) break; // stopPractice might have been called

          // Ensure highlight reflects the new step after auto-advance
          if (state.practice._lastRhythmHiIdx !== state.practice.stepIndex) {
            state.practice._lastRhythmHiIdx = state.practice.stepIndex;
            highlightStep();
          }
        }

        rhythmRAF = requestAnimationFrame(tick);
      };

      rhythmRAF = requestAnimationFrame(tick);
    };

    // ---------- Preview playback (Play/Pause + Stop) ----------
    let previewSynth = null;
    let previewState = 'stopped'; // 'stopped' | 'playing' | 'paused'
    let previewBoundVisualObj = null;
    let previewDurationSec = 0;
    let previewTimer = null;
    let previewPlayedMs = 0;
    let previewLastStartMs = 0;

    // --- Preview -> highlight notes on the sheet as the audio plays ---
    let previewVizTimer = null;
    let previewVizLastIdx = -1;
    let previewVizLastAddedIdx = -1;

    const clearPreviewVizTimer = () => {
      if (previewVizTimer) { clearTimeout(previewVizTimer); previewVizTimer = null; }
    };

    const clearPreviewVizHighlight = () => {
      try { document.querySelectorAll('g.abcjs-note.note-playback').forEach(el => el.classList.remove('note-playback')); } catch(e) {}
      try { clearActive(activePreview, 'note-playback'); } catch(e) {}
      previewVizLastIdx = -1;
      previewVizLastAddedIdx = -1;
    };

    const getPreviewLoopBoundsMs = () => {
      const steps = (state.practice && state.practice.expectedSteps) ? state.practice.expectedSteps : [];
      const range = getActivePracticeRange();
      if (!steps.length || range.end < range.start) return null;
      const startStep = steps[range.start];
      const endStep = steps[range.end];
      if (!startStep || !endStep) return null;
      const startMs = Math.max(0, Number(startStep.timeMs || 0));
      let endMs = Number(endStep.timeMs || 0);
      const holdEnds = (endStep.holds || []).map(h => endMs + Math.max(0, Number(h && h.durMs || 0)));
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

    const findLastStepAtOrBefore = (steps, tMs) => {
      // binary search
      let lo = 0, hi = steps.length - 1, ans = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const tm = steps[mid] && typeof steps[mid].timeMs === 'number' ? steps[mid].timeMs : 0;
        if (tm <= tMs) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      return ans;
    };

    const setPreviewVizIdx = (steps, idx, nowMs) => {
      if (!steps || steps.length === 0) return;
      if (idx < 0) {
        // before first note
        clearPreviewVizHighlight();
        return;
      }

      // If playback jumps backwards, rebuild active highlights from scratch.
      if (idx < previewVizLastAddedIdx) {
        try { clearActive(activePreview, 'note-playback'); } catch(e) {}
        previewVizLastAddedIdx = -1;
      }

      // Add newly-started notes (may include multiple steps if we jumped forward).
      const from = Math.max(0, previewVizLastAddedIdx + 1);
      for (let i = from; i <= idx; i++) {
        const st = steps[i];
        if (!st) continue;
        activateStep(activePreview, st, 'note-playback');
      }
      previewVizLastAddedIdx = Math.max(previewVizLastAddedIdx, idx);

      // Expire notes whose duration ended.
      const tNow = (Number.isFinite(nowMs)) ? nowMs : ((steps[idx] && steps[idx].timeMs) ? steps[idx].timeMs : 0);
      expireActive(activePreview, tNow, 'note-playback');

      // Scroll following the current onset index (not every frame)
      if (idx !== previewVizLastIdx) {
        previewVizLastIdx = idx;
        const step = steps[idx];
        ensureStepVisible(step, `preview:${idx}`, 'smooth', { targetRatio: 0.28, topBand: 0.10, bottomBand: 0.55 });
      }
    };

    const previewVizTick = () => {
      clearPreviewVizTimer();
      if (previewState !== 'playing') return;
      if (state.practice && state.practice.running) return; // avoid fighting with practice highlighting

      const steps = (state.practice && state.practice.expectedSteps) ? state.practice.expectedSteps : [];
      if (!steps || steps.length === 0) return;

      const t = getPreviewElapsedMs();
      const idx = findLastStepAtOrBefore(steps, t);

      if (idx >= 0) setPreviewVizIdx(steps, idx, t);
      else {
        // before first note: clear highlight but keep ticking until the first onset
        setPreviewVizIdx(steps, -1, t);
      }

      // Schedule next tick at the earliest of:
      // - next onset time
      // - any active note end time (so sustained notes can expire)
      let nextT = Infinity;

      if (idx + 1 < steps.length) {
        const n = steps[idx + 1] && typeof steps[idx + 1].timeMs === 'number' ? steps[idx + 1].timeMs : Infinity;
        if (Number.isFinite(n)) nextT = Math.min(nextT, n);
      } else if (idx < 0 && steps.length > 0) {
        const n0 = steps[0] && typeof steps[0].timeMs === 'number' ? steps[0].timeMs : Infinity;
        if (Number.isFinite(n0)) nextT = Math.min(nextT, n0);
      }

      // activePreview map stores endMs values
      try {
        for (const endMs of activePreview.values()) {
          if (Number.isFinite(endMs) && endMs > t) nextT = Math.min(nextT, endMs);
        }
      } catch(e) {}

      if (!Number.isFinite(nextT) || nextT === Infinity) return;

      const delay = Math.max(0, nextT - t);
      // cap to keep UI responsive even for very long notes
      previewVizTimer = setTimeout(previewVizTick, Math.min(250, delay + 5));
    };

    const startPreviewViz = (reset=false) => {
      if (state.practice && state.practice.running) return;
      clearPreviewVizTimer();
      if (reset) {
        previewVizLastIdx = -1;
        clearPreviewVizHighlight();
      }
      previewVizTick();
    };

    const pausePreviewViz = () => {
      clearPreviewVizTimer();
      // keep the current highlight frozen
    };

    const stopPreviewViz = () => {
      clearPreviewVizTimer();
      previewVizLastIdx = -1;
      clearPreviewVizHighlight();
    };

    const clearPreviewTimer = () => {
      if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
    };

    const updatePreviewUI = () => {
      const btn = $('btnPrevPlayPause');
      const stopBtn = $('btnPrevStop');
      if (!btn || !stopBtn) return;

      if (previewState === 'playing') {
        btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        btn.title = 'Pause preview';
        stopBtn.disabled = false;
      } else if (previewState === 'paused') {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
        btn.title = 'Resume preview';
        stopBtn.disabled = false;
      } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
        btn.title = 'Play preview';
        stopBtn.disabled = true;
      }
    };

    const schedulePreviewEnd = () => {
      clearPreviewTimer();
      const loopBounds = (state.looping && state.looping.active) ? getPreviewLoopBoundsMs() : null;

      if (loopBounds) {
        const remainingMs = Math.max(0, loopBounds.endMs - previewPlayedMs);
        previewTimer = setTimeout(() => {
          if (previewState !== 'playing' || !previewSynth) return;
          try {
            previewSynth.seek(loopBounds.startMs / 1000, 'seconds');
          } catch (e) {
            console.error(e);
          }
          previewPlayedMs = loopBounds.startMs;
          previewLastStartMs = performance.now();
          startPreviewViz(true);
          schedulePreviewEnd();
        }, remainingMs + 40);
        return;
      }

      if (!previewDurationSec) return;
      const remainingMs = Math.max(0, previewDurationSec * 1000 - previewPlayedMs);
      // Add a tiny buffer so we don't flip state too early.
      previewTimer = setTimeout(() => {
        previewState = 'stopped';
        previewPlayedMs = 0;
        stopPreviewViz();
        updatePreviewUI();
      }, remainingMs + 80);
    };

    const ensurePreviewSynth = async () => {
      if (!state.currentSong.visualObj) renderAbc();
      if (!state.currentSong.visualObj) return false;
      if (!window.ABCJS || !ABCJS.synth || !ABCJS.synth.CreateSynth) {
        showToast('ABCJS audio not loaded.');
        return false;
      }

      // If tune changed while stopped, rebuild synth.
      if (!previewSynth || previewBoundVisualObj !== state.currentSong.visualObj) {
        previewSynth = new ABCJS.synth.CreateSynth();
        previewBoundVisualObj = state.currentSong.visualObj;
        previewDurationSec = 0;
        previewPlayedMs = 0;
        previewState = 'stopped';

        try {
          await previewSynth.init({
            visualObj: state.currentSong.visualObj,
            options: {
              soundFontUrl: "https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/",
              program: 0
            }
          });
          const resp = await previewSynth.prime();
          previewDurationSec = (resp && typeof resp.duration === 'number') ? resp.duration : 0;
        } catch (e) {
          console.error(e);
          showToast('Preview audio not available (browser blocked).');
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
          previewPlayedMs += (performance.now() - previewLastStartMs);
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

        // stopped -> start
        const loopBounds = (state.looping && state.looping.active) ? getPreviewLoopBoundsMs() : null;
        if (loopBounds) {
          try { previewSynth.seek(loopBounds.startMs / 1000, 'seconds'); } catch (e) { console.error(e); }
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
      } catch (e) {
        console.error(e);
        showToast('Preview audio not available (browser blocked).');
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
        previewSynth.stop(); // resets to beginning
      } catch (e) {
        console.error(e);
      }
      previewState = 'stopped';
      previewPlayedMs = 0;
      clearPreviewTimer();
      stopPreviewViz();
      updatePreviewUI();
    };

// ---------- Storage (Recent) ----------
    const STORAGE_KEY = 'liem_piano_coach_recent_v1';
    const loadRecent = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
      } catch(e) {
        return [];
      }
    };
    const saveRecent = (abc) => {
      const title = parseTitleFromAbc(abc);
      const now = Date.now();
      const item = { title, abc, ts: now };
      const list = loadRecent()
        .filter(x => x && x.abc && x.abc.trim() !== abc.trim())
        .slice(0, 9);
      list.unshift(item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      renderRecentList();
      showToast('Saved locally');
    };
    const renderRecentList = () => {
      const list = loadRecent();
      const wrap = $('recentList');
      wrap.innerHTML = '';
      if (!list.length) {
        const empty = document.createElement('div');
        empty.style.padding = '12px';
        empty.style.color = 'var(--text-light)';
        empty.style.fontWeight = '800';
        empty.textContent = 'No recent songs yet.';
        wrap.appendChild(empty);
        return;
      }
      list.forEach((it) => {
        const div = document.createElement('div');
        div.className = 'item';
        const d = new Date(it.ts);
        div.innerHTML = `
          <div style="min-width:0">
            <div class="t">${it.title || 'Untitled'}</div>
            <div class="s">${d.toLocaleString()}</div>
          </div>
          <i class="fa-solid fa-chevron-right" style="opacity:.6"></i>
        `;
        div.onclick = () => {
          $('abcInput').value = it.abc;
          switchTab('abc');
          renderAbc();
          showToast('Loaded');
        };
        wrap.appendChild(div);
      });
    };

    // ---------- Tabs ----------
    const switchTab = (name) => {
      const isRecent = (name === 'recent');
      $('tab-abc').classList.toggle('active', !isRecent);
      $('tab-recent').classList.toggle('active', isRecent);

      $('abcInput').style.display = isRecent ? 'none' : 'block';
      $('recentList').style.display = isRecent ? 'flex' : 'none';
      if (isRecent) renderRecentList();
    };

    // ---------- Mode selection ----------
    const setMode = (mode) => {
      state.mode = mode;
      if ($('modeSelect')) $('modeSelect').value = mode;

      if (mode === 'beginner') showToast('Beginner: đúng mới qua');
      if (mode === 'flow') showToast('Flow: chơi liên tục');
      if (mode === 'structure') showToast('Structure: đúng “hình dáng nhịp”');
      if (mode === 'rhythm') showToast('Rhythm: chấm theo BPM');

      if (state.practice.running) {
        showToast('Mode changed → stop practice');
        stopPractice();
      }
    };

    const setTheme = (t) => {
      document.body.classList.remove('theme-retro','theme-ocean','theme-coder');
      document.body.classList.add('theme-' + t);
      state.settings.theme = t;
    };

    const exitFocus = () => {
      if (state.practice.running) { stopPractice(); return; }
      document.body.classList.remove('practice-focus');
      $('btnPractice').style.display = '';
      $('btnFocusBack').style.display = 'none';
    };

    // ---------- Keyboard shortcuts ----------
    window.addEventListener('keydown', (e) => {
      if (!state.practice.running) return;
      
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        restartCurrentBar();
      }
    });

    // ---------- Init ----------
    const renderAbcDebounced = debounce(renderAbc, 220);

    const init = async () => {
      $('abcInput').value = DEFAULT_ABC;
      renderAbc();
      applyZoom();

      $('zoomRange').addEventListener('input', applyZoom);

      $('btnRender').onclick = renderAbc;
      $('btnReset').onclick = () => { $('abcInput').value = DEFAULT_ABC; renderAbc(); };
      $('btnPrevPlayPause').onclick = previewPlayPause;
      $('btnPrevStop').onclick = previewStop;
      updatePreviewUI();
$('tab-abc').onclick = () => switchTab('abc');
      $('tab-recent').onclick = () => switchTab('recent');

      $('btnSave').onclick = () => {
        const abc = $('abcInput').value.trim();
        if (!abc) return;
        saveRecent(abc);
      };
      $('btnCopyAbc').onclick = async () => {
        try {
          await navigator.clipboard.writeText($('abcInput').value || '');
          showToast('ABC copied');
        } catch (e) {
          const ta = $('abcInput');
          ta.focus();
          ta.select();
          document.execCommand('copy');
          showToast('ABC copied');
        }
      };

      $('btnPractice').onclick = startPractice;
      $('btnStopHdr').onclick = stopPractice;
      $('btnRestartBarHdr').onclick = restartCurrentBar;      

      $('btnFocusBack').onclick = exitFocus;

      $('modeSelect').addEventListener('change', () => setMode($('modeSelect').value));

      $('bpmRange').addEventListener('input', () => {
        const v = parseInt($('bpmRange').value, 10);
        state.settings.bpm = v;
        $('bpmVal').textContent = String(v);
        Metro.setBpm(v);
        // update ABC text tempo line so sheet/meta stay in sync
        const abc = $('abcInput').value;
        $('abcInput').value = setAbcTempo(abc, v);
        renderAbcDebounced();
      });
      $('tolSel').addEventListener('change', () => { state.settings.toleranceMs = parseInt($('tolSel').value, 10); });
      $('shapeSel').addEventListener('change', () => { state.settings.structureStrict = $('shapeSel').value; });
      $('countInSel').addEventListener('change', () => { state.settings.countInBars = parseInt($('countInSel').value, 10); });
      $('arpSel').addEventListener('change', () => { state.settings.allowArpeggio = $('arpSel').value === '1'; });
      $('chordSel').addEventListener('change', () => { state.settings.chordTogetherMs = parseInt($('chordSel').value, 10) || 120; });
      $('themeSel').addEventListener('change', () => { setTheme($('themeSel').value); });
      $('btnToggleTheme').onclick = () => {
        const next = state.settings.theme === 'retro' ? 'ocean' : (state.settings.theme === 'ocean' ? 'coder' : 'retro');
        $('themeSel').value = next;
        setTheme(next);
      };

      $('btnInstructions').onclick = () => openModal('instrModal');
      $('btnAutoScroll').onclick = () => { state.settings.autoScroll = !state.settings.autoScroll; syncAutoScrollUI(); showToast(`Auto-scroll: ${state.settings.autoScroll ? 'ON' : 'OFF'}`); };
      $('btnLoopRange').onclick = () => {
        if (state.looping.active || (state.looping.draft || []).length) {
          clearLoopSelection();
        } else {
          showToast('Ctrl/Cmd + click 2 notes để tạo loop.');
        }
      };
      $('btnInstrClose').onclick = () => closeModal('instrModal');
      wireMetroPopover();
      syncAutoScrollUI();

      $('midiBadge').onclick = async () => { openModal('midiModal'); await refreshMidiList(); };
      $('btnRefreshMidi').onclick = refreshMidiList;
      $('btnMidiClose').onclick = () => closeModal('midiModal');
      $('btnMidiConnect').onclick = connectSelectedMidi;

      $('btnResultClose').onclick = () => closeModal('resultModal');
      $('btnResultAgain').onclick = () => { closeModal('resultModal'); startPractice(); };

      $('abcInput').addEventListener('input', debounce(() => { if (!state.practice.running) renderAbc(); }, 650));

      Metro.wireUI();
      Metro.setBpm(state.settings.bpm);
      setTheme(state.settings.theme);

      if (!navigator.requestMIDIAccess) setMidiBadge('warn', 'No WebMIDI');
      else setMidiBadge('off', 'MIDI Off');

      buildHud();
      updateLoopUI();
    };

    $('midiModal').addEventListener('click', (e) => { if (e.target === $('midiModal')) closeModal('midiModal'); });
    $('resultModal').addEventListener('click', (e) => { if (e.target === $('resultModal')) closeModal('resultModal'); });
    $('instrModal').addEventListener('click', (e) => { if (e.target === $('instrModal')) closeModal('instrModal'); });

    init();
  
