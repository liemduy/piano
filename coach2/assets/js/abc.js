// ABC parsing and score-to-step conversion.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const getMidiFromText = (noteChar, octaveText, accidentalText, keySignature) => {
  const baseMap = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  let pitch = 60 + baseMap[noteChar.toLowerCase()];

  if (noteChar === noteChar.toLowerCase()) pitch += 12;
  if (octaveText) {
    for (const token of octaveText) {
      if (token === ',') pitch -= 12;
      if (token === "'") pitch += 12;
    }
  }

  let accidental = keySignature[noteChar.toLowerCase()] || 0;
  if (accidentalText === '^^') accidental = 2;
  else if (accidentalText === '^') accidental = 1;
  else if (accidentalText === '__') accidental = -2;
  else if (accidentalText === '_') accidental = -1;
  else if (accidentalText === '=') accidental = 0;

  return pitch + accidental;
};

const parseDuration = (durationText) => {
  if (!durationText) return 1;
  if (durationText.includes('/')) {
    const [left, right] = durationText.split('/');
    const numerator = left === '' ? 1 : parseFloat(left);
    const denominator = right === '' ? 2 : parseFloat(right);
    if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0) return 1;
    return numerator / denominator;
  }

  const value = parseFloat(durationText);
  return isFinite(value) && value > 0 ? value : 1;
};

const parseVoiceEvents = (abc) => {
  const lines = abc.split(/\r?\n/);
  const KEY_SIG_NUM = {
    C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
    F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
    Am: 0, Em: 1, Bm: 2, 'F#m': 3, 'C#m': 4, 'G#m': 5, 'D#m': 6, 'A#m': 7,
    Dm: -1, Gm: -2, Cm: -3, Fm: -4, Bbm: -5, Ebm: -6, Abm: -7,
  };
  const SHARP_ORDER = ['f', 'c', 'g', 'd', 'a', 'e', 'b'];
  const FLAT_ORDER = ['b', 'e', 'a', 'd', 'g', 'c', 'f'];

  const normalizeKeyName = (raw) => {
    if (!raw) return 'C';
    let token = String(raw).trim();
    token = token.replace(/^K:\s*/i, '');
    token = token.split(/\s+/)[0];
    token = token.replace(/(major|maj)$/i, '');
    token = token.replace(/(minor|min)$/i, 'm');

    const match = token.match(/^([A-Ga-g])([#b]?)(m)?/);
    if (!match) return 'C';

    const letter = match[1].toUpperCase();
    const accidental = match[2] || '';
    const minor = !!match[3];
    return letter + accidental + (minor ? 'm' : '');
  };

  const keySigFromName = (name) => {
    const keyName = normalizeKeyName(name);
    const count = KEY_SIG_NUM[keyName] !== undefined ? KEY_SIG_NUM[keyName] : 0;
    const signature = { c: 0, d: 0, e: 0, f: 0, g: 0, a: 0, b: 0 };
    if (count > 0) {
      for (let index = 0; index < count; index += 1) signature[SHARP_ORDER[index]] = 1;
    } else if (count < 0) {
      for (let index = 0; index < Math.abs(count); index += 1) signature[FLAT_ORDER[index]] = -1;
    }
    return signature;
  };

  let currentKey = keySigFromName((abc.match(/^K:.*$/mi) || ['K:C'])[0]);
  let barAccidentals = { ...currentKey };

  const voiceOrder = [];
  const voiceCursors = {};
  const voiceBars = {};
  const eventsByVoice = {};
  const markers = { repeat: [], endings: [] };
  const tieCarryByVoice = {};
  const tupletByVoice = {};

  const defaultTupletQ = (count) => {
    if (count === 2) return 3;
    if (count === 3) return 2;
    if (count === 4) return 3;
    return 2;
  };

  const ensureVoice = (voiceId) => {
    if (!eventsByVoice[voiceId]) eventsByVoice[voiceId] = [];
    if (voiceCursors[voiceId] === undefined) voiceCursors[voiceId] = 0;
    if (voiceBars[voiceId] === undefined) voiceBars[voiceId] = 0;
    if (!tieCarryByVoice[voiceId]) tieCarryByVoice[voiceId] = new Set();
    if (tupletByVoice[voiceId] === undefined) tupletByVoice[voiceId] = null;
    if (!voiceOrder.includes(voiceId)) voiceOrder.push(voiceId);
  };

  const setTuplet = (voiceId, p, q = null, r = null) => {
    const count = Math.max(1, parseInt(p, 10) || 1);
    const tempoCount = q === null || q === undefined ? defaultTupletQ(count) : Math.max(1, parseInt(q, 10) || 1);
    const noteCount = r === null || r === undefined ? count : Math.max(1, parseInt(r, 10) || 1);
    tupletByVoice[voiceId] = { mult: tempoCount / count, remaining: noteCount };
  };

  const applyTuplet = (voiceId, duration) => {
    const tuplet = tupletByVoice[voiceId];
    if (!tuplet || !isFinite(duration)) return duration;
    const output = duration * (tuplet.mult || 1);
    tuplet.remaining = (tuplet.remaining || 0) - 1;
    if (tuplet.remaining <= 0) tupletByVoice[voiceId] = null;
    return output;
  };

  const resetMeasureAccidentals = () => {
    barAccidentals = { ...currentKey };
  };

  const advanceBar = (voiceId) => {
    ensureVoice(voiceId);
    voiceBars[voiceId] += 1;
    resetMeasureAccidentals();
  };

  lines.forEach((raw) => {
    const line = String(raw || '').trim();
    if (!line) return;
    if (!line.startsWith('V:')) return;

    const match = line.match(/^V:\s*([^\s]+)/);
    if (match) ensureVoice(match[1]);
  });

  const primaryVoice = voiceOrder.length ? voiceOrder[0] : '1';
  let currentVoice = primaryVoice;
  ensureVoice(currentVoice);

  lines.forEach((rawLine) => {
    let line = String(rawLine || '').trim();
    if (!line || line.startsWith('%')) return;

    if (line.match(/^K:/i)) {
      currentKey = keySigFromName(line);
      resetMeasureAccidentals();
      return;
    }

    if (line.match(/^[A-Z]:/) && !line.startsWith('V:')) return;

    if (line.startsWith('V:') && (line.includes('clef=') || line.includes('name='))) {
      const headerMatch = line.match(/^V:\s*([^\s]+)/);
      if (headerMatch) {
        currentVoice = headerMatch[1];
        ensureVoice(currentVoice);
      }
      return;
    }

    if (line.startsWith('V:')) {
      const inlineVoice = line.match(/^V:\s*([^\s]+)/);
      if (inlineVoice) {
        currentVoice = inlineVoice[1];
        ensureVoice(currentVoice);
        line = line.replace(/^V:\s*[^\s]+/, '').trim();
        if (!line) return;
      }
    }

    resetMeasureAccidentals();

    let index = 0;
    while (index < line.length) {
      const char = line[index];

      if (char === ' ' || char === '\t') {
        index += 1;
        continue;
      }

      if (char === '(') {
        const tupletMatch = line.slice(index).match(/^\((\d+)(?::(\d+)(?::(\d+))?)?/);
        if (tupletMatch) {
          setTuplet(currentVoice, tupletMatch[1], tupletMatch[2], tupletMatch[3]);
          index += tupletMatch[0].length;
          continue;
        }
      }

      if (char === ':' && line[index + 1] === '|') {
        if (currentVoice === primaryVoice) {
          markers.repeat.push({ type: 'end', t: Math.round(voiceCursors[currentVoice] || 0) });
        }
        advanceBar(currentVoice);
        index += line[index + 2] === '|' ? 3 : 2;
        continue;
      }

      if (char === '|') {
        if (line[index + 1] === ':') {
          if (currentVoice === primaryVoice) {
            markers.repeat.push({ type: 'start', t: Math.round(voiceCursors[currentVoice] || 0) });
          }
          advanceBar(currentVoice);
          index += 2;
          continue;
        }

        advanceBar(currentVoice);
        index += 1;
        if (line[index] === '|' || line[index] === ']') index += 1;
        continue;
      }

      if (char === '[' && (line.slice(index, index + 3) === '[V:' || line.slice(index, index + 3) === '[v:')) {
        const end = line.indexOf(']', index);
        if (end !== -1) {
          const voiceMatch = line.slice(index, end + 1).match(/\[V:\s*([^\]\s]+)\]/i);
          if (voiceMatch) {
            currentVoice = voiceMatch[1];
            ensureVoice(currentVoice);
            resetMeasureAccidentals();
          }
          index = end + 1;
          continue;
        }
      }

      if (char === 'z' || char === 'Z') {
        let end = index + 1;
        while (end < line.length && /[0-9/]/.test(line[end])) end += 1;

        let duration = parseDuration(line.slice(index + 1, end));
        duration = applyTuplet(currentVoice, duration);
        voiceCursors[currentVoice] += duration * 100;
        index = end;
        continue;
      }

      if (char === '[') {
        const first = line[index + 1];
        const second = line[index + 2];
        if (first === '[' && /[1-9]/.test(second)) {
          if (currentVoice === primaryVoice) {
            markers.endings.push({ num: parseInt(second, 10), t: Math.round(voiceCursors[currentVoice] || 0) });
          }
          index += 3;
          continue;
        }
        if (/[1-9]/.test(first)) {
          if (currentVoice === primaryVoice) {
            markers.endings.push({ num: parseInt(first, 10), t: Math.round(voiceCursors[currentVoice] || 0) });
          }
          index += 2;
          continue;
        }
      }

      if (char === '[') {
        const end = line.indexOf(']', index);
        if (end !== -1) {
          const inside = line.slice(index + 1, end);
          const tag = inside.trim();
          const voiceMatch = tag.match(/^V:\s*([^\s]+)/);
          if (voiceMatch) {
            currentVoice = voiceMatch[1];
            ensureVoice(currentVoice);
            resetMeasureAccidentals();
            index = end + 1;
            continue;
          }
          if (/^K:/i.test(tag)) {
            currentKey = keySigFromName(tag);
            resetMeasureAccidentals();
            index = end + 1;
            continue;
          }

          let durationEnd = end + 1;
          while (durationEnd < line.length && /[0-9/]/.test(line[durationEnd])) durationEnd += 1;
          let duration = parseDuration(line.slice(end + 1, durationEnd));

          let tieOut = false;
          if (line[durationEnd] === '-') {
            tieOut = true;
            while (durationEnd < line.length && line[durationEnd] === '-') durationEnd += 1;
          }

          duration = applyTuplet(currentVoice, duration);

          const pitches = [];
          let innerIndex = 0;
          while (innerIndex < inside.length) {
            if (inside[innerIndex] === ' ' || inside[innerIndex] === '\t') {
              innerIndex += 1;
              continue;
            }

            let accidentalText = '';
            if (inside[innerIndex] === '^' || inside[innerIndex] === '_' || inside[innerIndex] === '=') {
              accidentalText = inside[innerIndex];
              if ((accidentalText === '^' || accidentalText === '_') && inside[innerIndex + 1] === accidentalText) {
                accidentalText += accidentalText;
                innerIndex += 2;
              } else {
                innerIndex += 1;
              }
            }

            const noteChar = inside[innerIndex];
            if (!noteChar || !/[A-Ga-g]/.test(noteChar)) {
              innerIndex += 1;
              continue;
            }
            innerIndex += 1;

            let octaveText = '';
            while (innerIndex < inside.length && (inside[innerIndex] === ',' || inside[innerIndex] === "'")) {
              octaveText += inside[innerIndex];
              innerIndex += 1;
            }

            if (accidentalText) {
              if (accidentalText === '^^') barAccidentals[noteChar.toLowerCase()] = 2;
              else if (accidentalText === '^') barAccidentals[noteChar.toLowerCase()] = 1;
              else if (accidentalText === '__') barAccidentals[noteChar.toLowerCase()] = -2;
              else if (accidentalText === '_') barAccidentals[noteChar.toLowerCase()] = -1;
              else barAccidentals[noteChar.toLowerCase()] = 0;
            }

            pitches.push(getMidiFromText(noteChar, octaveText, accidentalText, barAccidentals));
          }

          if (pitches.length) {
            const barIndex = voiceBars[currentVoice] || 0;
            const timeMs = Math.round(voiceCursors[currentVoice]);
            const tieCarry = tieCarryByVoice[currentVoice] || new Set();
            const onsetPitches = pitches.filter((pitch) => !tieCarry.has(pitch));

            eventsByVoice[currentVoice].push({
              voice: currentVoice,
              timeMs,
              pitches: onsetPitches,
              durT: duration * 100,
              barIndex,
            });
            voiceCursors[currentVoice] += duration * 100;

            pitches.forEach((pitch) => {
              if (tieCarry.has(pitch)) tieCarry.delete(pitch);
            });
            if (tieOut) pitches.forEach((pitch) => tieCarry.add(pitch));
          }

          index = durationEnd;
          continue;
        }
      }

      let accidentalText = '';
      let noteIndex = index;
      if (line[noteIndex] === '^' || line[noteIndex] === '_' || line[noteIndex] === '=') {
        accidentalText = line[noteIndex];
        if ((accidentalText === '^' || accidentalText === '_') && line[noteIndex + 1] === accidentalText) {
          accidentalText += accidentalText;
          noteIndex += 2;
        } else {
          noteIndex += 1;
        }
      }

      const noteChar = line[noteIndex];
      if (noteChar && /[A-Ga-g]/.test(noteChar)) {
        noteIndex += 1;
        let octaveText = '';
        while (noteIndex < line.length && (line[noteIndex] === ',' || line[noteIndex] === "'")) {
          octaveText += line[noteIndex];
          noteIndex += 1;
        }

        const durationStart = noteIndex;
        while (noteIndex < line.length && /[0-9/]/.test(line[noteIndex])) noteIndex += 1;
        let duration = parseDuration(line.slice(durationStart, noteIndex));

        let tieOut = false;
        if (line[noteIndex] === '-') {
          tieOut = true;
          noteIndex += 1;
        }

        duration = applyTuplet(currentVoice, duration);

        if (accidentalText) {
          if (accidentalText === '^^') barAccidentals[noteChar.toLowerCase()] = 2;
          else if (accidentalText === '^') barAccidentals[noteChar.toLowerCase()] = 1;
          else if (accidentalText === '__') barAccidentals[noteChar.toLowerCase()] = -2;
          else if (accidentalText === '_') barAccidentals[noteChar.toLowerCase()] = -1;
          else barAccidentals[noteChar.toLowerCase()] = 0;
        }

        const pitch = getMidiFromText(noteChar, octaveText, accidentalText, barAccidentals);
        const tieCarry = tieCarryByVoice[currentVoice] || new Set();
        const onsetPitches = tieCarry.has(pitch) ? [] : [pitch];

        eventsByVoice[currentVoice].push({
          voice: currentVoice,
          timeMs: Math.round(voiceCursors[currentVoice]),
          pitches: onsetPitches,
          durT: duration * 100,
          barIndex: voiceBars[currentVoice] || 0,
        });
        voiceCursors[currentVoice] += duration * 100;

        if (tieCarry.has(pitch)) tieCarry.delete(pitch);
        if (tieOut) tieCarry.add(pitch);

        index = noteIndex;
        continue;
      }

      index += 1;
    }
  });

  return { voiceOrder, eventsByVoice, markers };
};

const lowerBoundStepsByTime = (steps, timeMs) => {
  let lo = 0;
  let hi = steps.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((steps[mid].timeMs || 0) < timeMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

const cloneStep = (step, timeMs, originalIndex) => ({
  ...step,
  timeMs,
  __origIdx: originalIndex,
  pitches: Array.isArray(step.pitches) ? step.pitches.slice() : [],
  elements: Array.isArray(step.elements) ? step.elements.slice() : [],
  elementPitches: Array.isArray(step.elementPitches) ? step.elementPitches.slice() : [],
  holds: Array.isArray(step.holds) ? step.holds.slice() : [],
});

const expandRepeatsAndVoltas = (steps, markers, tickMsBase) => {
  try {
    if (!markers || !markers.repeat || markers.repeat.length === 0) return steps;

    const repeats = (markers.repeat || [])
      .map((entry) => ({ ...entry, ms: Math.round((entry.t || 0) * tickMsBase) }))
      .sort((left, right) => left.ms - right.ms);

    const starts = repeats.filter((entry) => entry.type === 'start');
    const ends = repeats.filter((entry) => entry.type === 'end');
    if (!starts.length || !ends.length) return steps;

    const startMs = starts[0].ms;
    const endMarker = ends.find((entry) => entry.ms > startMs + 1);
    if (!endMarker) return steps;

    const endMs = endMarker.ms;
    const startIdx = lowerBoundStepsByTime(steps, startMs);
    const endIdx = lowerBoundStepsByTime(steps, endMs);
    if (!Number.isFinite(startIdx) || !Number.isFinite(endIdx) || endIdx <= startIdx) return steps;

    const endings = (markers.endings || []).map((entry) => ({
      ...entry,
      ms: Math.round((entry.t || 0) * tickMsBase),
    }));
    const firstEnding = endings.find((entry) => entry.num === 1 && entry.ms >= startMs && entry.ms < endMs);
    const secondEnding = endings.find((entry) => entry.num === 2 && entry.ms >= endMs - 1);
    const firstEndingIdx = firstEnding ? lowerBoundStepsByTime(steps, firstEnding.ms) : null;
    const secondEndingIdx = secondEnding ? lowerBoundStepsByTime(steps, secondEnding.ms) : endIdx;
    const secondPassEnd = firstEndingIdx !== null && firstEndingIdx > startIdx && firstEndingIdx <= endIdx
      ? firstEndingIdx
      : endIdx;

    const order = [];
    for (let index = 0; index < startIdx; index += 1) order.push(index);
    for (let index = startIdx; index < endIdx; index += 1) order.push(index);
    for (let index = startIdx; index < secondPassEnd; index += 1) order.push(index);
    for (let index = secondEndingIdx; index < steps.length; index += 1) order.push(index);

    const expanded = [];
    let runningTime = 0;
    for (let index = 0; index < order.length; index += 1) {
      const originalIndex = order[index];
      expanded.push(cloneStep(steps[originalIndex], runningTime, originalIndex));

      if (index < order.length - 1) {
        const currentOriginal = order[index];
        const nextOriginal = order[index + 1];
        let delta = 0;
        if (nextOriginal === currentOriginal + 1) {
          delta = (steps[nextOriginal].timeMs || 0) - (steps[currentOriginal].timeMs || 0);
        } else if (currentOriginal + 1 < steps.length) {
          delta = (steps[currentOriginal + 1].timeMs || 0) - (steps[currentOriginal].timeMs || 0);
        }
        if (!Number.isFinite(delta)) delta = 0;
        runningTime += Math.max(0, delta);
      }
    }

    return expanded;
  } catch (error) {
    console.warn('expandRepeatsAndVoltas failed:', error);
    return steps;
  }
};

const parseTitleFromAbc = (abc) => {
  const match = abc.match(/^T:(.*)$/m);
  return match && match[1] ? match[1].trim() : PianoApp.t('common.untitled');
};

const parseMetaFromAbc = (abc) => {
  const tempoLine = abc.match(/^Q:(.*)$/m);
  const qLine = tempoLine ? tempoLine[1].trim() : '';

  let bpm = 80;
  let qNum = 1;
  let qDen = 4;
  let tempoMatch = qLine.match(/(\d+)\s*\/\s*(\d+)\s*=\s*(\d+)/);
  if (tempoMatch) {
    qNum = parseInt(tempoMatch[1], 10) || 1;
    qDen = parseInt(tempoMatch[2], 10) || 4;
    bpm = parseInt(tempoMatch[3], 10) || 80;
  } else {
    tempoMatch = qLine.match(/=\s*(\d+)/) || qLine.match(/(\d+)/);
    if (tempoMatch) bpm = parseInt(tempoMatch[1], 10) || 80;
  }

  const lengthMatch = abc.match(/^L:\s*(\d+)\s*\/\s*(\d+)\s*$/m);
  let lNum = 1;
  let lDen = 8;
  if (lengthMatch) {
    lNum = parseInt(lengthMatch[1], 10) || 1;
    lDen = parseInt(lengthMatch[2], 10) || 8;
  }

  const meterMatch = abc.match(/^M:(.*)$/m);
  const keyMatch = abc.match(/^K:(.*)$/m);
  return {
    bpm,
    meter: meterMatch ? meterMatch[1].trim() : '4/4',
    key: keyMatch ? keyMatch[1].trim() : 'C',
    qNum,
    qDen,
    lNum,
    lDen,
  };
};

const normalizeAbc = (abc) => {
  const lines = abc.split('\n');
  const output = lines.map((line) => {
    if (/^\s*[A-Za-z]:/.test(line) && !/^\s*\[V:/.test(line)) return line;

    const placeholders = [];
    const protectedLine = line.replace(/\[[A-Za-z]:[^\]]+\]/g, (match) => {
      placeholders.push(match);
      return `@@TAG${placeholders.length - 1}@@`;
    });

    let normalized = protectedLine.replace(/\[(?![A-Za-z]:)([^\]\n]+)\]/g, (_, inner) => `[${inner.replace(/\s+/g, '')}]`);
    normalized = normalized.replace(/([A-Ga-g])#/g, '^$1');
    normalized = normalized.replace(/([A-G])b/g, '_$1');
    normalized = normalized.replace(/@@TAG(\d+)@@/g, (_, index) => placeholders[parseInt(index, 10)]);
    return normalized;
  });

  return output.join('\n');
};

const buildBaseStepsFromEvents = ({ eventsByVoice, tickMsBase }) => {
  const stepsByTime = new Map();

  const addEventToStep = (event) => {
    const timeMs = Math.round(event.timeMs * tickMsBase);
    if (!stepsByTime.has(timeMs)) {
      stepsByTime.set(timeMs, {
        timeMs,
        pitches: [],
        elements: [],
        elementPitches: [],
        holds: [],
        barIndex: event.barIndex ?? 0,
      });
    }

    const step = stepsByTime.get(timeMs);
    step.pitches.push(...event.pitches);
    step.barIndex = Math.max(step.barIndex ?? 0, event.barIndex ?? 0);
  };

  Object.keys(eventsByVoice).forEach((voiceId) => {
    eventsByVoice[voiceId].forEach(addEventToStep);
  });

  const steps = Array.from(stepsByTime.values()).sort((left, right) => left.timeMs - right.timeMs);
  steps.forEach((step) => {
    step.pitches = Array.from(new Set(step.pitches));
  });

  return steps.filter((step) => step.pitches && step.pitches.length > 0);
};

const extractAbcData = (abc, { fallbackBpm = 80 } = {}) => {
  const meta = parseMetaFromAbc(abc);
  const { voiceOrder, eventsByVoice, markers } = parseVoiceEvents(abc);
  const baseBpm = meta.bpm || fallbackBpm || 80;
  const tempoUnit = meta.qNum && meta.qDen ? meta.qNum / meta.qDen : 1 / 4;
  const defaultLength = meta.lNum && meta.lDen ? meta.lNum / meta.lDen : 1 / 8;
  const unitMsBase = (60000 / Math.max(1, baseBpm)) * (defaultLength / tempoUnit);
  const tickMsBase = unitMsBase / 100;

  return {
    meta,
    voiceOrder,
    eventsByVoice,
    markers,
    tickMsBase,
    baseSteps: buildBaseStepsFromEvents({ eventsByVoice, tickMsBase }),
  };
};

PianoApp.getMidiFromText = getMidiFromText;
PianoApp.parseDuration = parseDuration;
PianoApp.parseVoiceEvents = parseVoiceEvents;
PianoApp.lowerBoundStepsByTime = lowerBoundStepsByTime;
PianoApp.expandRepeatsAndVoltas = expandRepeatsAndVoltas;
PianoApp.parseTitleFromAbc = parseTitleFromAbc;
PianoApp.parseMetaFromAbc = parseMetaFromAbc;
PianoApp.normalizeAbc = normalizeAbc;
PianoApp.extractAbcData = extractAbcData;
