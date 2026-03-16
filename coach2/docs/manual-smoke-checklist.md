# Manual Smoke Checklist

Run this checklist in the browser after any change to parser, render, practice, MIDI, or metronome code.

## 1. Boot and render

- Open `index.html`.
- Confirm the default sample renders automatically.
- Confirm title, key, meter, and base tempo appear in the sheet header.
- Change the ABC text and wait for auto-render.
- Press `Render` and confirm the sheet updates without duplicate highlights.

## 2. Editor and layout

- Click the `<` button and confirm the ABC panel collapses.
- Click it again and confirm the panel expands.
- Reload the page and confirm the collapsed/expanded state is restored.
- Switch between `ABC` and `Gần đây` tabs and confirm the correct panel is shown.

## 3. Preferences

- Change theme, BPM, tolerance, count-in, and auto-scroll.
- Confirm dragging BPM updates the `Q:` line in the ABC editor.
- Confirm dragging BPM rerenders the score header and sheet.
- Reload the page.
- Confirm all of those settings persist.

## 4. Preview

- Change BPM before pressing `Nghe` and confirm preview uses the new tempo.
- Press `Nghe` and confirm playback starts.
- Confirm the button changes to `Tạm dừng`.
- Pause, resume, then stop.
- Confirm playback highlights move with the score and clear on stop.

## 5. Loop range

- Hold `Ctrl` or `Cmd` and click one note.
- Click a second note and confirm loop state is shown in the header.
- Start preview and confirm only the selected range loops.
- Start practice and confirm only the selected range is judged.
- Click `Loop đoạn` again and confirm loop is cleared.

## 6. Practice: Đúng nốt

- Choose `Đúng nốt`.
- Start practice.
- Play a wrong note and confirm the current note flashes red and does not advance.
- Play the correct note and confirm the step advances.
- Test a chord and confirm all notes are required.
- Finish the session and confirm the result modal shows beginner stats.

## 7. Practice: Theo BPM

- Choose `Theo BPM`.
- Start practice with count-in enabled.
- Confirm count-in happens before judging starts.
- Play correct notes inside the timing window and confirm steps turn green.
- Play wrong notes or late notes and confirm the current step turns red but the timeline keeps moving.
- Press `R` during practice and confirm it restarts from the beginning of the current bar with the timeline realigned.
- Finish the session and confirm the result modal shows rhythm stats.

## 8. MIDI

- Open the MIDI modal.
- Refresh the list and connect an input.
- Confirm the badge changes to the connected state.
- Use the keyboard and confirm note input affects practice.

## 9. Metronome

- Toggle BPM in the header and confirm metronome starts/stops.
- Open the metronome popover and change subdivision, tick, flash, and accent.
- Start `Theo BPM` practice and confirm phase is re-synced at practice start.

## 10. Regression watch list

- No modal stays stuck open after close.
- No stray note highlight remains after stop/render/reset.
- Changing BPM does not rewrite the ABC source text.
- Recent songs still save/load correctly.
