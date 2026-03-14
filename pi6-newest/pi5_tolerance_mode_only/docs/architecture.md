# Architecture

## Runtime model

- The app still runs on classic browser scripts, not ES modules.
- Shared runtime APIs live on `window.PianoApp`.
- `assets/js/app.js` is now bootstrap and UI wiring only.
- Feature and engine files register their public API onto `PianoApp`.

## File structure

- `index.html`: app shell, controls, modals, script/style wiring.
- `assets/css/main.css`: stylesheet manifest.
- `assets/css/themes.css`: theme tokens and theme-specific overrides.
- `assets/css/base.css`: base element defaults.
- `assets/css/layout.css`: app shell and panel layout.
- `assets/css/components.css`: reusable UI/state classes.
- `assets/js/dom.js`: DOM helpers.
- `assets/js/utils.js`: shared utilities and toast helper.
- `assets/js/state.js`: central app state.
- `assets/js/storage.js`: recent songs and persistent preferences.
- `assets/js/theme.js`: theme switching.
- `assets/js/abc.js`: ABC normalization, metadata parsing, event parsing, repeat expansion.
- `assets/js/render.js`: ABCJS render flow, note mapping, tooltip, loop visuals, auto-scroll.
- `assets/js/practice.js`: practice session state machine, scoring, restart-bar, rhythm timeline.
- `assets/js/metronome.js`: metronome audio/flash logic.
- `assets/js/midi.js`: MIDI discovery, connection, note input.
- `assets/js/preview.js`: preview playback and playback highlighting.
- `tools/static_check.py`: static selector/reference validation without a browser.

## Load order

Script order in `index.html` still matters because the app intentionally stays on classic scripts:

1. `dom.js`
2. `utils.js`
3. `state.js`
4. `storage.js`
5. `theme.js`
6. `abc.js`
7. `render.js`
8. `practice.js`
9. `metronome.js`
10. `midi.js`
11. `preview.js`
12. `app.js`

The rule is simple: lower-level helpers first, engine before feature adapters, bootstrap last.

## Data flow

1. `app.js` reads controls, restores preferences, and calls `renderCurrentSong()`.
2. `abc.js` parses ABC into metadata, voice events, and base steps.
3. `render.js` calls ABCJS, maps rendered note DOM back to parsed steps, and builds practice-ready steps.
4. `practice.js` owns session flow:
   `idle -> countin -> running -> finished`
5. `midi.js` forwards note-on events into `practice.js`.
6. `preview.js` and `metronome.js` consume the same shared song/settings state.

## State rules

- `state.settings.practiceBpm` mirrors the current `Q:` tempo in the ABC source.
- `state.currentSong.baseBpm` is the parsed tempo from ABC after the latest render.
- Changing BPM from the slider rewrites the `Q:` line, rerenders the score, and updates both preview and practice tempo.
- `state.practice.range` is computed once at practice start and reused during that session.
- `restartCurrentBar()` must realign the rhythm timeline, not just reset note colors.

## Persistence

`storage.js` persists:

- recent songs
- theme
- mode
- practice BPM
- tolerance
- count-in bars
- auto-scroll
- editor collapsed state

## Validation

- Run `python tools/static_check.py` for static checks.
- Use `docs/manual-smoke-checklist.md` for browser/manual verification after refactors.

## Guardrails

- Keep `app.js` focused on bootstrap and event wiring.
- Keep parser logic free of direct DOM work.
- Keep render logic separate from practice scoring.
- Add new features under `PianoApp` with explicit exported functions instead of free globals.
