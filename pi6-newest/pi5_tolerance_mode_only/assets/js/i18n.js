// Language selection and runtime translations.

var PianoApp = window.PianoApp || (window.PianoApp = {});

const TRANSLATIONS = {
  vi: {
    'app.title': 'Liem Piano Coach',
    'app.brand': 'Liem Piano Coach',
    'header.mode.title': 'Chế độ luyện',
    'header.mode.label': 'Chế độ',
    'mode.beginner': 'Đúng nốt',
    'mode.rhythm': 'Theo BPM',
    'midi.badge.connect_title': 'Bấm để kết nối MIDI',
    'midi.badge.off': 'MIDI tắt',
    'midi.badge.on': 'MIDI bật',
    'midi.badge.select': 'Chọn MIDI',
    'midi.badge.blocked': 'MIDI bị chặn',
    'midi.badge.no_webmidi': 'Không có WebMIDI',
    'metro.cluster.title': 'Máy đếm nhịp. Bấm BPM để bật hoặc tắt, dùng menu để mở tuỳ chọn.',
    'metro.button.title': 'Bật hoặc tắt máy đếm nhịp',
    'metro.menu.title': 'Tuỳ chọn máy đếm nhịp',
    'metro.popover.title': 'Máy đếm nhịp',
    'metro.close': 'Đóng',
    'metro.subdivision': 'Chia nhịp',
    'metro.tick': 'Âm tick',
    'metro.tick.title': 'Bật hoặc tắt âm tick',
    'metro.tick.sound_title': 'Âm tick',
    'metro.flash': 'Nháy',
    'metro.flash.title': 'Bật hoặc tắt nháy',
    'metro.accent': 'Nhấn mạnh',
    'metro.accent.title': 'Nhấn mạnh phách 1',
    'metro.accent.sound_title': 'Âm nhấn phách 1',
    'metro.hint_html': 'Bấm <b>BPM</b> trên header để bật hoặc tắt. Nhịp và BPM luôn đồng bộ với bài. Ở chế độ <b>Theo BPM</b>, khi bắt đầu luyện thì timeline sẽ được canh lại để phách 1 khớp đúng.',
    'sound.click': 'Click',
    'sound.beep': 'Beep',
    'sound.wood': 'Wood',
    'sound.hihat': 'HiHat',
    'sound.clave': 'Clave',
    'sound.random': 'Ngẫu nhiên',
    'button.theme.title': 'Đổi giao diện',
    'button.instructions': 'Hướng dẫn',
    'button.instructions.title': 'Hướng dẫn',
    'button.autoscroll.title': 'Tự cuộn sheet theo nốt hiện tại',
    'button.loop.title': 'Giữ Ctrl/Cmd rồi bấm 2 nốt để khoá đoạn',
    'button.back': 'Quay lại',
    'button.restart_bar': 'Ô nhịp',
    'button.restart_bar.title': 'Về đầu ô nhịp',
    'button.stop': 'Dừng',
    'button.stop.title': 'Dừng luyện',
    'button.practice': 'Luyện',
    'button.render': 'Render',
    'button.copy_abc': 'Chép ABC',
    'button.copy_abc.title': 'Chép ABC vào clipboard',
    'button.save': 'Lưu',
    'button.save.title': 'Lưu cục bộ',
    'button.listen': 'Nghe',
    'button.listen.title': 'Nghe hoặc tạm dừng nghe thử',
    'button.listen_pause': 'Tạm dừng',
    'button.listen_resume': 'Nghe tiếp',
    'button.stop_preview.title': 'Dừng nghe thử',
    'button.reset.title': 'Trả về bài mẫu',
    'button.refresh': 'Làm mới',
    'button.close': 'Đóng',
    'button.connect': 'Kết nối',
    'button.try_again': 'Luyện lại',
    'button.ok': 'OK',
    'button.toggle_editor_expand': 'Mở rộng khung ABC',
    'button.toggle_editor_collapse': 'Thu gọn khung ABC',
    'button.loop_range': 'Loop đoạn',
    'local.status': 'Cục bộ',
    'recent.empty': 'Chưa có bản nhạc đã lưu.',
    'tab.abc': 'ABC',
    'tab.recent': 'Gần đây',
    'song.default_sub': 'Dán ABC → Render → Luyện (mặc định: Đúng nốt)',
    'song.meta': 'Giọng: {key} • Nhịp: {meter} • Tempo: {tempo} BPM',
    'loop.button.off': 'Loop đoạn',
    'loop.button.active': 'Đang loop',
    'loop.off_sub': 'Tắt loop • Ctrl/Cmd + bấm 2 nốt để khoá đoạn',
    'loop.active_sub': 'Đang loop: {start} → {end} • nốt song song được tính tự động',
    'loop.draft_sub': 'Chọn mốc loop 1/2: {label}',
    'loop.step_label': 'Bước {index} • {names}{parallel}',
    'loop.step_parallel': ' • +{count} nốt song song',
    'coach.step': 'BƯỚC',
    'coach.play': 'CHƠI',
    'coach.missing': 'THIẾU',
    'coach.extra': 'THỪA',
    'coach.timing': 'NHỊP',
    'coach.quality': 'CHẤT',
    'zoom.label': 'Thu phóng',
    'settings.count_in': 'Đếm vào',
    'settings.count_in.0': '0 ô',
    'settings.count_in.1': '1 ô',
    'settings.count_in.2': '2 ô',
    'settings.tolerance': 'Độ lệch',
    'settings.tolerance.loose': 'Rộng',
    'settings.tolerance.normal': 'Bình thường',
    'settings.tolerance.tight': 'Chặt',
    'settings.theme': 'Giao diện',
    'settings.language': 'Ngôn ngữ',
    'settings.language.vi': 'Tiếng Việt',
    'settings.language.en': 'English (US)',
    'settings.language.jpn': '日本語',
    'midi.modal.title': 'Kết nối MIDI',
    'midi.modal.body': 'Chọn thiết bị MIDI input. (WebMIDI hoạt động tốt trên Chrome/Edge.)',
    'midi.modal.input': 'Nguồn MIDI',
    'midi.modal.no_input_option': 'Không tìm thấy MIDI input',
    'result.title': 'Kết quả luyện',
    'instruction.title': 'Hướng dẫn',
    'instruction.intro_html': 'Dán ABC → Render → chọn 1 trong 2 chế độ → Luyện. Nếu muốn khoá một đoạn, giữ <b>Ctrl/Cmd</b> rồi bấm 2 nốt để bật <b>Loop đoạn</b>.',
    'instruction.quick.title': 'Luồng dùng nhanh',
    'instruction.quick_html': '<li>Dán hoặc sửa ABC ở panel trái.</li><li>Ấn <b>Render</b> để cập nhật sheet nhạc.</li><li>Chọn <b>Đúng nốt</b> hoặc <b>Theo BPM</b> ở menu trên header.</li><li>Kết nối MIDI nếu muốn chấm trực tiếp từ đàn.</li><li>Ấn <b>Luyện</b> để bắt đầu luyện.</li>',
    'instruction.beginner.title': 'Đúng nốt',
    'instruction.beginner.sub': 'Đúng nốt rồi mới qua step tiếp theo.',
    'instruction.beginner.body_html': 'Dùng khi muốn học đọc nốt và vị trí tay thật chắc. App sẽ đứng lại ở step hiện tại cho tới khi bạn bấm đúng nốt cần chơi.<ul><li>Nốt đơn: đúng mới qua step tiếp theo.</li><li>Hợp âm: cần đủ nốt; nếu lệch nhẹ vẫn có thể qua nhưng sẽ bị tính là chưa đẹp.</li><li>Bấm sai nốt: note hiện tại highlight đỏ và bạn phải sửa đúng mới đi tiếp.</li></ul>',
    'instruction.rhythm.title': 'Theo BPM',
    'instruction.rhythm.sub': 'Timeline chạy theo BPM, app không chờ bạn.',
    'instruction.rhythm.body_html': 'Dùng khi muốn luyện timing thật với metronome. Timeline sẽ tiếp tục chạy theo BPM hiện tại dù bạn chơi đúng hay sai.<ul><li>Đúng pitch trong cửa sổ timing: step được tính đúng.</li><li>Sai pitch hoặc bấm lệch cửa sổ timing: note hiện tại highlight đỏ.</li><li>Hết cửa sổ mà chưa chơi đúng: app tính miss và tiếp tục theo timeline.</li></ul>',
    'instruction.loop.title': 'Loop đoạn & thao tác nhanh',
    'instruction.loop.sub': 'Khoá một đoạn để chỉ luyện hoặc phát đúng đoạn đó.',
    'instruction.loop.body_html': '<ul><li>Giữ <b>Ctrl/Cmd</b> rồi bấm nốt thứ nhất, sau đó bấm nốt thứ hai để tạo loop.</li><li>App sẽ lấy theo <b>step thời gian</b>, nên nếu cùng thời điểm có nốt song song ở tay còn lại thì nó cũng được tính vào range.</li><li>Khi loop đang bật, <b>Nghe</b> sẽ phát lặp đúng đoạn đó và <b>Luyện</b> chỉ chấm trong đoạn đó.</li><li>Ấn nút <b>Loop đoạn</b> một lần nữa để tắt loop.</li><li><b>R</b>: về đầu phần hiện tại • <b>Chép ABC</b>: chép nhanh toàn bộ ABC • <b>Lưu</b>: lưu cục bộ.</li></ul>',
    'toast.copy_abc': 'Đã chép ABC',
    'toast.bpm_changed': 'Đã đổi BPM, hãy bắt đầu lại.',
    'toast.auto_scroll_on': 'Tự cuộn: BẬT',
    'toast.auto_scroll_off': 'Tự cuộn: TẮT',
    'toast.loop_pick_start': 'Giữ Ctrl/Cmd rồi bấm 2 nốt để tạo loop.',
    'toast.loop_disabled': 'Đã tắt loop',
    'toast.loop_set': 'Đã bật loop bước {start} → {end}',
    'toast.loop_delete_mark': 'Đã xoá mốc loop',
    'toast.loop_stop_practice': 'Hãy dừng luyện trước khi đổi loop.',
    'toast.loop_pick_progress': 'Chọn mốc loop 1/2',
    'toast.abc_selected': 'Đã chọn đoạn ABC tương ứng.',
    'toast.abc_normalized': 'Đã chuẩn hoá ABC (#→^, bỏ khoảng trắng trong hợp âm)',
    'toast.render_failed': 'Render ABC thất bại. Hãy kiểm tra cú pháp ABC.',
    'toast.rendered_steps': 'Đã render {count} bước',
    'toast.abcjs_missing': 'ABCJS chưa tải được.',
    'toast.render_first': 'Hãy render ABC trước đã.',
    'toast.no_steps': 'Không tạo được steps. Hãy kiểm tra ABC.',
    'toast.midi_hint': 'Gợi ý: kết nối MIDI để chấm chính xác hơn.',
    'toast.restart_bar': 'Đã tua lại đầu ô nhịp',
    'toast.count_in': 'Đếm vào: {bars} ô nhịp',
    'toast.start': 'Bắt đầu',
    'toast.mode_beginner': 'Đúng nốt: đúng mới qua',
    'toast.mode_rhythm': 'Theo BPM: timeline chạy theo BPM',
    'toast.mode_changed_stop': 'Đã đổi mode, dừng phiên hiện tại.',
    'toast.saved_local': 'Đã lưu cục bộ',
    'toast.loaded_song': 'Đã nạp bản nhạc',
    'toast.browser_no_webmidi': 'Trình duyệt không hỗ trợ WebMIDI.',
    'toast.midi_blocked': 'Quyền MIDI đã bị chặn.',
    'toast.midi_connected': 'Đã kết nối MIDI.',
    'toast.no_midi_input': 'Không có MIDI input.',
    'toast.midi_not_found': 'Không tìm thấy MIDI input.',
    'toast.preview_audio_unavailable': 'ABCJS audio chưa sẵn sàng.',
    'toast.preview_browser_unavailable': 'Không thể bật nghe thử trong trình duyệt này.',
    'toast.preview_play_error': 'Không thể phát phần nghe thử.',
    'toast.metro_audio_unavailable': 'Không có WebAudio, máy đếm nhịp sẽ chỉ nháy.',
    'practice.hud.beginner': 'Đúng nốt {firstTry}% đúng ngay • {done}/{total} • Lỗi {wrongSteps}',
    'practice.hud.rhythm': 'Theo BPM {accuracy}% đúng • {done}/{total} • Trượt {wrongSteps}',
    'practice.result.beginner.sub': 'Đúng nốt: đúng ngay {firstTry}% • bước lỗi {wrongSteps} • phím sai {wrongKeys}',
    'practice.result.rhythm.sub': 'Theo BPM: chính xác {accuracy}% • bước lỗi {wrongSteps}',
    'practice.result.first_try': 'Đúng ngay',
    'practice.result.perfect_steps': 'Bước hoàn hảo',
    'practice.result.wrong_steps': 'Bước lỗi',
    'practice.result.wrong_keys': 'Phím sai',
    'practice.result.accuracy': 'Chính xác',
    'practice.result.done': 'Đã chấm',
    'practice.result.correct_steps': 'Bước đúng',
    'practice.result.median_delta': 'Median |Δ|',
    'practice.result.mean_bias': 'Lệch trung bình',
    'practice.quality.chord_perfect': 'Hợp âm chuẩn ({spread}ms)',
    'practice.quality.chord_ok': 'Hợp âm ổn (+{spread}ms)',
    'practice.quality.chord_late': 'Hợp âm hơi lệch (+{spread}ms)',
    'practice.quality.chord_fail': 'Hợp âm chưa cùng lúc (+{spread}ms)',
    'practice.quality.ok': 'Ổn',
    'practice.quality.off': 'Lệch',
    'practice.quality.wrong': 'Sai',
    'practice.timing.on_time': 'Đúng nhịp',
    'practice.timing.early': 'Sớm {abs}ms',
    'practice.timing.late': 'Trễ {abs}ms',
    'practice.pitch.off': '{note} (lệch nhịp)',
    'render.abcjs_alert': 'ABCJS chưa tải được. Hãy bật internet rồi tải lại trang.',
    'common.untitled': 'Chưa đặt tên',
    'common.empty': '—',
  },
  'en-US': {
    'app.title': 'Liem Piano Coach',
    'app.brand': 'Liem Piano Coach',
    'header.mode.title': 'Practice mode',
    'header.mode.label': 'Mode',
    'mode.beginner': 'Correct Notes',
    'mode.rhythm': 'Follow BPM',
    'midi.badge.connect_title': 'Click to connect MIDI',
    'midi.badge.off': 'MIDI Off',
    'midi.badge.on': 'MIDI On',
    'midi.badge.select': 'Select MIDI',
    'midi.badge.blocked': 'MIDI Blocked',
    'midi.badge.no_webmidi': 'No WebMIDI',
    'metro.cluster.title': 'Metronome. Click BPM to start or stop, then use the menu for settings.',
    'metro.button.title': 'Toggle metronome',
    'metro.menu.title': 'Metronome settings',
    'metro.popover.title': 'Metronome',
    'metro.close': 'Close',
    'metro.subdivision': 'Subdivision',
    'metro.tick': 'Tick',
    'metro.tick.title': 'Toggle tick sound',
    'metro.tick.sound_title': 'Tick sound',
    'metro.flash': 'Flash',
    'metro.flash.title': 'Toggle flash',
    'metro.accent': 'Accent',
    'metro.accent.title': 'Accent beat 1',
    'metro.accent.sound_title': 'Accent sound',
    'metro.hint_html': 'Click <b>BPM</b> on the header to start or stop. Meter and BPM always sync to the song. In <b>Follow BPM</b> mode, starting practice re-aligns the timeline so beat 1 lands correctly.',
    'sound.click': 'Click',
    'sound.beep': 'Beep',
    'sound.wood': 'Wood',
    'sound.hihat': 'HiHat',
    'sound.clave': 'Clave',
    'sound.random': 'Random',
    'button.theme.title': 'Change theme',
    'button.instructions': 'Instructions',
    'button.instructions.title': 'Instructions',
    'button.autoscroll.title': 'Auto-scroll the score to the current note',
    'button.loop.title': 'Hold Ctrl/Cmd and click 2 notes to lock a range',
    'button.back': 'Back',
    'button.restart_bar': 'Bar',
    'button.restart_bar.title': 'Restart current bar',
    'button.stop': 'Stop',
    'button.stop.title': 'Stop practice',
    'button.practice': 'Practice',
    'button.render': 'Render',
    'button.copy_abc': 'Copy ABC',
    'button.copy_abc.title': 'Copy ABC to clipboard',
    'button.save': 'Save',
    'button.save.title': 'Save locally',
    'button.listen': 'Listen',
    'button.listen.title': 'Play or pause preview',
    'button.listen_pause': 'Pause',
    'button.listen_resume': 'Resume',
    'button.stop_preview.title': 'Stop preview',
    'button.reset.title': 'Reset to sample',
    'button.refresh': 'Refresh',
    'button.close': 'Close',
    'button.connect': 'Connect',
    'button.try_again': 'Practice Again',
    'button.ok': 'OK',
    'button.toggle_editor_expand': 'Expand ABC panel',
    'button.toggle_editor_collapse': 'Collapse ABC panel',
    'button.loop_range': 'Loop Range',
    'local.status': 'Local',
    'recent.empty': 'No saved songs yet.',
    'tab.abc': 'ABC',
    'tab.recent': 'Recent',
    'song.default_sub': 'Paste ABC → Render → Practice (default: Correct Notes)',
    'song.meta': 'Key: {key} • Meter: {meter} • Tempo: {tempo} BPM',
    'loop.button.off': 'Loop Range',
    'loop.button.active': 'Looping',
    'loop.off_sub': 'Loop off • Ctrl/Cmd + click 2 notes to lock a range',
    'loop.active_sub': 'Looping: {start} → {end} • parallel notes are included automatically',
    'loop.draft_sub': 'Loop pick 1/2: {label}',
    'loop.step_label': 'Step {index} • {names}{parallel}',
    'loop.step_parallel': ' • +{count} parallel notes',
    'coach.step': 'STEP',
    'coach.play': 'PLAY',
    'coach.missing': 'MISSING',
    'coach.extra': 'EXTRA',
    'coach.timing': 'TIMING',
    'coach.quality': 'QUALITY',
    'zoom.label': 'Zoom',
    'settings.count_in': 'Count-in',
    'settings.count_in.0': '0 bars',
    'settings.count_in.1': '1 bar',
    'settings.count_in.2': '2 bars',
    'settings.tolerance': 'Tolerance',
    'settings.tolerance.loose': 'Loose',
    'settings.tolerance.normal': 'Normal',
    'settings.tolerance.tight': 'Tight',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.language.vi': 'Tiếng Việt',
    'settings.language.en': 'English (US)',
    'settings.language.jpn': '日本語',
    'midi.modal.title': 'MIDI Connection',
    'midi.modal.body': 'Choose a MIDI input device. (WebMIDI works best in Chrome/Edge.)',
    'midi.modal.input': 'MIDI Input',
    'midi.modal.no_input_option': 'No MIDI input found',
    'result.title': 'Practice Result',
    'instruction.title': 'Instructions',
    'instruction.intro_html': 'Paste ABC → Render → choose 1 of 2 modes → Practice. To lock a range, hold <b>Ctrl/Cmd</b> and click 2 notes to enable <b>Loop Range</b>.',
    'instruction.quick.title': 'Quick flow',
    'instruction.quick_html': '<li>Paste or edit ABC in the left panel.</li><li>Press <b>Render</b> to update the score.</li><li>Choose <b>Correct Notes</b> or <b>Follow BPM</b> from the header menu.</li><li>Connect MIDI if you want live judging from the keyboard.</li><li>Press <b>Practice</b> to start.</li>',
    'instruction.beginner.title': 'Correct Notes',
    'instruction.beginner.sub': 'Advance only after the right note is played.',
    'instruction.beginner.body_html': 'Use this when you want to learn note reading and hand placement carefully. The app stays on the current step until you play the required note correctly.<ul><li>Single notes: the next step unlocks only after the correct note.</li><li>Chords: all notes are required; slight spread can still pass, but quality is reduced.</li><li>Wrong notes: the current note flashes red and you must correct it before advancing.</li></ul>',
    'instruction.rhythm.title': 'Follow BPM',
    'instruction.rhythm.sub': 'The timeline runs at BPM and does not wait for you.',
    'instruction.rhythm.body_html': 'Use this when you want real timing practice with the metronome. The timeline keeps moving at the current BPM whether you play correctly or not.<ul><li>Correct pitch inside the timing window counts as correct.</li><li>Wrong pitch or out-of-window timing highlights the current note red.</li><li>If the window passes without a correct hit, the app counts a miss and continues.</li></ul>',
    'instruction.loop.title': 'Loop Range & shortcuts',
    'instruction.loop.sub': 'Lock a passage so only that passage is played and judged.',
    'instruction.loop.body_html': '<ul><li>Hold <b>Ctrl/Cmd</b>, click the first note, then click the second note to create a loop.</li><li>The app locks by <b>time step</b>, so parallel notes at the same moment are included automatically.</li><li>When loop is active, <b>Listen</b> repeats that range and <b>Practice</b> judges only inside that range.</li><li>Press <b>Loop Range</b> again to clear the loop.</li><li><b>R</b>: restart the current passage • <b>Copy ABC</b>: copy the full ABC quickly • <b>Save</b>: save locally.</li></ul>',
    'toast.copy_abc': 'ABC copied',
    'toast.bpm_changed': 'BPM changed. Start again to continue.',
    'toast.auto_scroll_on': 'Auto-scroll: ON',
    'toast.auto_scroll_off': 'Auto-scroll: OFF',
    'toast.loop_pick_start': 'Hold Ctrl/Cmd and click 2 notes to create a loop.',
    'toast.loop_disabled': 'Loop cleared',
    'toast.loop_set': 'Loop enabled for steps {start} → {end}',
    'toast.loop_delete_mark': 'Loop marker removed',
    'toast.loop_stop_practice': 'Stop practice before changing the loop.',
    'toast.loop_pick_progress': 'Loop pick 1/2',
    'toast.abc_selected': 'Matching ABC range selected.',
    'toast.abc_normalized': 'ABC normalized (#→^, spaces removed inside chords)',
    'toast.render_failed': 'ABC render failed. Please check the ABC syntax.',
    'toast.rendered_steps': 'Rendered {count} steps',
    'toast.abcjs_missing': 'ABCJS is unavailable.',
    'toast.render_first': 'Render the ABC first.',
    'toast.no_steps': 'Could not build steps. Please check the ABC.',
    'toast.midi_hint': 'Tip: connect MIDI for more accurate judging.',
    'toast.restart_bar': 'Restarted from the beginning of the bar',
    'toast.count_in': 'Count-in: {bars} bars',
    'toast.start': 'Start',
    'toast.mode_beginner': 'Correct Notes: advance only after the right note',
    'toast.mode_rhythm': 'Follow BPM: the timeline keeps moving',
    'toast.mode_changed_stop': 'Mode changed. The current session was stopped.',
    'toast.saved_local': 'Saved locally',
    'toast.loaded_song': 'Song loaded',
    'toast.browser_no_webmidi': 'This browser does not support WebMIDI.',
    'toast.midi_blocked': 'MIDI permission was blocked.',
    'toast.midi_connected': 'MIDI connected.',
    'toast.no_midi_input': 'No MIDI input available.',
    'toast.midi_not_found': 'MIDI input not found.',
    'toast.preview_audio_unavailable': 'ABCJS audio is not ready.',
    'toast.preview_browser_unavailable': 'Preview audio is not available in this browser.',
    'toast.preview_play_error': 'Could not play the preview.',
    'toast.metro_audio_unavailable': 'No WebAudio available. Metronome will flash only.',
    'practice.hud.beginner': 'Correct Notes {firstTry}% first-try • {done}/{total} • Errors {wrongSteps}',
    'practice.hud.rhythm': 'Follow BPM {accuracy}% correct • {done}/{total} • Misses {wrongSteps}',
    'practice.result.beginner.sub': 'Correct Notes: {firstTry}% first-try • error steps {wrongSteps} • wrong keys {wrongKeys}',
    'practice.result.rhythm.sub': 'Follow BPM: {accuracy}% accuracy • error steps {wrongSteps}',
    'practice.result.first_try': 'First-try',
    'practice.result.perfect_steps': 'Perfect steps',
    'practice.result.wrong_steps': 'Error steps',
    'practice.result.wrong_keys': 'Wrong keys',
    'practice.result.accuracy': 'Accuracy',
    'practice.result.done': 'Done',
    'practice.result.correct_steps': 'Correct steps',
    'practice.result.median_delta': 'Median |Δ|',
    'practice.result.mean_bias': 'Mean bias',
    'practice.quality.chord_perfect': 'Chord perfect ({spread}ms)',
    'practice.quality.chord_ok': 'Chord OK (+{spread}ms)',
    'practice.quality.chord_late': 'Chord loose (+{spread}ms)',
    'practice.quality.chord_fail': 'Chord not together (+{spread}ms)',
    'practice.quality.ok': 'OK',
    'practice.quality.off': 'Off',
    'practice.quality.wrong': 'Wrong',
    'practice.timing.on_time': 'On time',
    'practice.timing.early': 'Early {abs}ms',
    'practice.timing.late': 'Late {abs}ms',
    'practice.pitch.off': '{note} (off time)',
    'render.abcjs_alert': 'ABCJS could not be loaded. Turn on internet access and reload the page.',
    'common.untitled': 'Untitled',
    'common.empty': '—',
  },
  jpn: {
    'app.title': 'Liem Piano Coach',
    'app.brand': 'Liem Piano Coach',
    'header.mode.title': '練習モード',
    'header.mode.label': 'モード',
    'mode.beginner': '正しい音',
    'mode.rhythm': 'BPMに合わせる',
    'midi.badge.connect_title': 'クリックしてMIDIを接続',
    'midi.badge.off': 'MIDI オフ',
    'midi.badge.on': 'MIDI オン',
    'midi.badge.select': 'MIDIを選択',
    'midi.badge.blocked': 'MIDIがブロックされました',
    'midi.badge.no_webmidi': 'WebMIDIなし',
    'metro.cluster.title': 'メトロノーム。BPMを押して開始または停止し、メニューから設定を開きます。',
    'metro.button.title': 'メトロノームを切り替え',
    'metro.menu.title': 'メトロノーム設定',
    'metro.popover.title': 'メトロノーム',
    'metro.close': '閉じる',
    'metro.subdivision': '分割',
    'metro.tick': 'クリック音',
    'metro.tick.title': 'クリック音を切り替え',
    'metro.tick.sound_title': 'クリック音',
    'metro.flash': 'フラッシュ',
    'metro.flash.title': 'フラッシュを切り替え',
    'metro.accent': 'アクセント',
    'metro.accent.title': '1拍目を強調',
    'metro.accent.sound_title': 'アクセント音',
    'metro.hint_html': 'ヘッダーの <b>BPM</b> を押すと開始または停止できます。拍子とBPMは常に曲と同期します。<b>BPMに合わせる</b> モードでは、練習開始時にタイムラインが再整列され、1拍目が正しく合います。',
    'sound.click': 'クリック',
    'sound.beep': 'ビープ',
    'sound.wood': 'ウッド',
    'sound.hihat': 'ハイハット',
    'sound.clave': 'クラーベ',
    'sound.random': 'ランダム',
    'button.theme.title': 'テーマを変更',
    'button.instructions': '使い方',
    'button.instructions.title': '使い方',
    'button.autoscroll.title': '現在の音符へ自動スクロール',
    'button.loop.title': 'Ctrl/Cmd を押しながら2つの音符をクリックして範囲を固定',
    'button.back': '戻る',
    'button.restart_bar': '小節',
    'button.restart_bar.title': '現在の小節をやり直す',
    'button.stop': '停止',
    'button.stop.title': '練習を停止',
    'button.practice': '練習',
    'button.render': 'レンダー',
    'button.copy_abc': 'ABCをコピー',
    'button.copy_abc.title': 'ABCをクリップボードにコピー',
    'button.save': '保存',
    'button.save.title': 'ローカル保存',
    'button.listen': '試聴',
    'button.listen.title': 'プレビューを再生または一時停止',
    'button.listen_pause': '一時停止',
    'button.listen_resume': '再開',
    'button.stop_preview.title': 'プレビュー停止',
    'button.reset.title': 'サンプルに戻す',
    'button.refresh': '更新',
    'button.close': '閉じる',
    'button.connect': '接続',
    'button.try_again': 'もう一度練習',
    'button.ok': 'OK',
    'button.toggle_editor_expand': 'ABCパネルを広げる',
    'button.toggle_editor_collapse': 'ABCパネルをたたむ',
    'button.loop_range': 'ループ範囲',
    'local.status': 'ローカル',
    'recent.empty': '保存した曲はまだありません。',
    'tab.abc': 'ABC',
    'tab.recent': '最近',
    'song.default_sub': 'ABCを貼り付け → レンダー → 練習（既定: 正しい音）',
    'song.meta': '調: {key} • 拍子: {meter} • テンポ: {tempo} BPM',
    'loop.button.off': 'ループ範囲',
    'loop.button.active': 'ループ中',
    'loop.off_sub': 'ループなし • Ctrl/Cmd を押しながら2つの音符をクリックして範囲を固定',
    'loop.active_sub': 'ループ中: {start} → {end} • 同時の音も自動で含まれます',
    'loop.draft_sub': 'ループ選択 1/2: {label}',
    'loop.step_label': 'ステップ {index} • {names}{parallel}',
    'loop.step_parallel': ' • 同時音 +{count}',
    'coach.step': 'STEP',
    'coach.play': 'PLAY',
    'coach.missing': 'MISSING',
    'coach.extra': 'EXTRA',
    'coach.timing': 'TIMING',
    'coach.quality': 'QUALITY',
    'zoom.label': 'ズーム',
    'settings.count_in': 'カウントイン',
    'settings.count_in.0': '0小節',
    'settings.count_in.1': '1小節',
    'settings.count_in.2': '2小節',
    'settings.tolerance': '許容幅',
    'settings.tolerance.loose': '広い',
    'settings.tolerance.normal': '標準',
    'settings.tolerance.tight': '厳しい',
    'settings.theme': 'テーマ',
    'settings.language': '言語',
    'settings.language.vi': 'Tiếng Việt',
    'settings.language.en': 'English (US)',
    'settings.language.jpn': '日本語',
    'midi.modal.title': 'MIDI接続',
    'midi.modal.body': 'MIDI入力デバイスを選択してください。（WebMIDI は Chrome / Edge で最適に動作します。）',
    'midi.modal.input': 'MIDI入力',
    'midi.modal.no_input_option': 'MIDI入力が見つかりません',
    'result.title': '練習結果',
    'instruction.title': '使い方',
    'instruction.intro_html': 'ABCを貼り付け → レンダー → 2つのモードから1つ選択 → 練習。範囲を固定したい場合は <b>Ctrl/Cmd</b> を押しながら2つの音符をクリックして <b>ループ範囲</b> を有効にします。',
    'instruction.quick.title': 'クイックフロー',
    'instruction.quick_html': '<li>左パネルで ABC を貼り付けるか編集します。</li><li><b>レンダー</b> を押して譜面を更新します。</li><li>ヘッダーメニューで <b>正しい音</b> または <b>BPMに合わせる</b> を選びます。</li><li>キーボードから判定したい場合は MIDI を接続します。</li><li><b>練習</b> を押して開始します。</li>',
    'instruction.beginner.title': '正しい音',
    'instruction.beginner.sub': '正しい音を弾くまで次へ進みません。',
    'instruction.beginner.body_html': '音読みや手の位置をしっかり覚えたいときに使います。必要な音を正しく弾くまでアプリは現在のステップで止まります。<ul><li>単音: 正しい音を弾いた後に次のステップへ進みます。</li><li>和音: すべての音が必要です。少しずれても通る場合がありますが、品質は下がります。</li><li>間違った音: 現在の音が赤く光り、正しく直すまで進みません。</li></ul>',
    'instruction.rhythm.title': 'BPMに合わせる',
    'instruction.rhythm.sub': 'タイムラインはBPMで進み、待ってくれません。',
    'instruction.rhythm.body_html': 'メトロノームに合わせて実際のタイミング練習をしたいときに使います。正しく弾いても間違ってもタイムラインは現在のBPMで進み続けます。<ul><li>タイミングウィンドウ内で正しい音高なら正解として判定されます。</li><li>音高が違うかタイミングが外れると、現在の音が赤く表示されます。</li><li>ウィンドウを過ぎても正しく弾けなければ miss と判定され、そのまま続きます。</li></ul>',
    'instruction.loop.title': 'ループ範囲とショートカット',
    'instruction.loop.sub': '一部分だけ再生・判定したいときに範囲を固定します。',
    'instruction.loop.body_html': '<ul><li><b>Ctrl/Cmd</b> を押しながら最初の音符をクリックし、次に2つ目の音符をクリックしてループを作成します。</li><li>アプリは <b>時間ステップ</b> で範囲を固定するため、同じタイミングの並行音も自動的に含まれます。</li><li>ループが有効なとき、<b>試聴</b> はその範囲を繰り返し、<b>練習</b> はその範囲だけ判定します。</li><li><b>ループ範囲</b> ボタンをもう一度押すとループを解除します。</li><li><b>R</b>: 現在の区間の先頭へ戻る • <b>ABCをコピー</b>: ABC 全体をすばやくコピー • <b>保存</b>: ローカル保存。</li></ul>',
    'toast.copy_abc': 'ABCをコピーしました',
    'toast.bpm_changed': 'BPMを変更しました。続けるには開始し直してください。',
    'toast.auto_scroll_on': '自動スクロール: ON',
    'toast.auto_scroll_off': '自動スクロール: OFF',
    'toast.loop_pick_start': 'Ctrl/Cmd を押しながら2つの音符をクリックしてループを作成します。',
    'toast.loop_disabled': 'ループを解除しました',
    'toast.loop_set': 'ステップ {start} → {end} をループに設定しました',
    'toast.loop_delete_mark': 'ループマーカーを削除しました',
    'toast.loop_stop_practice': 'ループを変更する前に練習を停止してください。',
    'toast.loop_pick_progress': 'ループ選択 1/2',
    'toast.abc_selected': '対応する ABC 範囲を選択しました。',
    'toast.abc_normalized': 'ABC を正規化しました (#→^, 和音内の空白を除去)',
    'toast.render_failed': 'ABC のレンダーに失敗しました。ABC の構文を確認してください。',
    'toast.rendered_steps': '{count} ステップをレンダーしました',
    'toast.abcjs_missing': 'ABCJS が利用できません。',
    'toast.render_first': '先に ABC をレンダーしてください。',
    'toast.no_steps': 'ステップを作成できませんでした。ABC を確認してください。',
    'toast.midi_hint': 'ヒント: より正確に判定したい場合は MIDI を接続してください。',
    'toast.restart_bar': '小節の先頭へ戻しました',
    'toast.count_in': 'カウントイン: {bars} 小節',
    'toast.start': '開始',
    'toast.mode_beginner': '正しい音: 正解するまで進みません',
    'toast.mode_rhythm': 'BPMに合わせる: タイムラインは進み続けます',
    'toast.mode_changed_stop': 'モードを変更したため、現在のセッションを停止しました。',
    'toast.saved_local': 'ローカルに保存しました',
    'toast.loaded_song': '曲を読み込みました',
    'toast.browser_no_webmidi': 'このブラウザは WebMIDI に対応していません。',
    'toast.midi_blocked': 'MIDI 権限がブロックされました。',
    'toast.midi_connected': 'MIDI を接続しました。',
    'toast.no_midi_input': 'MIDI 入力がありません。',
    'toast.midi_not_found': 'MIDI 入力が見つかりません。',
    'toast.preview_audio_unavailable': 'ABCJS オーディオの準備ができていません。',
    'toast.preview_browser_unavailable': 'このブラウザでは試聴を再生できません。',
    'toast.preview_play_error': '試聴を再生できませんでした。',
    'toast.metro_audio_unavailable': 'WebAudio がないため、メトロノームは点滅のみになります。',
    'practice.hud.beginner': '正しい音 {firstTry}% 初回成功 • {done}/{total} • エラー {wrongSteps}',
    'practice.hud.rhythm': 'BPMに合わせる {accuracy}% 正解 • {done}/{total} • ミス {wrongSteps}',
    'practice.result.beginner.sub': '正しい音: 初回成功 {firstTry}% • エラーステップ {wrongSteps} • 誤鍵盤 {wrongKeys}',
    'practice.result.rhythm.sub': 'BPMに合わせる: 正確さ {accuracy}% • エラーステップ {wrongSteps}',
    'practice.result.first_try': '初回成功',
    'practice.result.perfect_steps': '完璧なステップ',
    'practice.result.wrong_steps': 'エラーステップ',
    'practice.result.wrong_keys': '誤鍵盤',
    'practice.result.accuracy': '正確さ',
    'practice.result.done': '判定済み',
    'practice.result.correct_steps': '正解ステップ',
    'practice.result.median_delta': '中央値 |Δ|',
    'practice.result.mean_bias': '平均偏差',
    'practice.quality.chord_perfect': '和音が揃っています ({spread}ms)',
    'practice.quality.chord_ok': '和音は良好 (+{spread}ms)',
    'practice.quality.chord_late': '和音が少しずれています (+{spread}ms)',
    'practice.quality.chord_fail': '和音が同時ではありません (+{spread}ms)',
    'practice.quality.ok': '良好',
    'practice.quality.off': 'ずれ',
    'practice.quality.wrong': '誤り',
    'practice.timing.on_time': 'ぴったり',
    'practice.timing.early': '{abs}ms 早い',
    'practice.timing.late': '{abs}ms 遅い',
    'practice.pitch.off': '{note} (タイミングずれ)',
    'render.abcjs_alert': 'ABCJS を読み込めませんでした。インターネットを有効にしてページを再読み込みしてください。',
    'common.untitled': '無題',
    'common.empty': '—',
  },
};

const HTML_LANG_MAP = {
  vi: 'vi',
  'en-US': 'en',
  jpn: 'ja',
};

const LOCALE_TAG_MAP = {
  vi: 'vi-VN',
  'en-US': 'en-US',
  jpn: 'ja-JP',
};

const DEFAULT_LANGUAGE = 'vi';

const resolveLanguage = (language) => (TRANSLATIONS[language] ? language : DEFAULT_LANGUAGE);

const interpolate = (template, params = {}) => String(template).replace(/\{(\w+)\}/g, (_, key) => {
  if (params[key] === undefined || params[key] === null) return '';
  return String(params[key]);
});

const getActiveLanguage = () => resolveLanguage(PianoApp.state?.settings?.language || DEFAULT_LANGUAGE);

const t = (key, params = {}) => {
  const language = getActiveLanguage();
  const catalog = TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANGUAGE];
  const fallback = TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
  return interpolate(catalog[key] ?? fallback, params);
};

const getLocaleTag = (language = PianoApp.state?.settings?.language || DEFAULT_LANGUAGE) => (
  LOCALE_TAG_MAP[resolveLanguage(language)] || 'vi-VN'
);

const setText = (selector, key, params) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = t(key, params);
};

const setHtml = (selector, key, params) => {
  const element = document.querySelector(selector);
  if (element) element.innerHTML = t(key, params);
};

const setAttr = (selector, attr, key, params) => {
  const element = document.querySelector(selector);
  if (element) element.setAttribute(attr, t(key, params));
};

const setSelectOptionText = (selectId, value, key) => {
  const element = document.querySelector(`#${selectId} option[value="${value}"]`);
  if (element) element.textContent = t(key);
};

const setButtonHtml = (selector, iconClass, key) => {
  const element = document.querySelector(selector);
  if (!element) return;
  element.innerHTML = `<i class="${iconClass}"></i> ${t(key)}`;
};

const setInstructionSection = (index, prefix) => {
  const sections = document.querySelectorAll('#instrModal .instrItem');
  const section = sections[index];
  if (!section) return;

  const titleEl = section.querySelector('summary > div > div:first-child');
  const subEl = section.querySelector('.sumSub');
  const bodyEl = section.querySelector('.instrBody');
  if (titleEl) titleEl.textContent = t(`instruction.${prefix}.title`);
  if (subEl) subEl.textContent = t(`instruction.${prefix}.sub`);
  if (bodyEl) bodyEl.innerHTML = t(`instruction.${prefix}.body_html`);
};

const applyInstructionTranslations = () => {
  setText('#instrModal h2', 'instruction.title');
  setHtml('#instrModal .modal > p', 'instruction.intro_html');
  setText('#instrModal .hint-title', 'instruction.quick.title');
  setHtml('#instrModal .instr-list', 'instruction.quick_html');
  setInstructionSection(0, 'beginner');
  setInstructionSection(1, 'rhythm');
  setInstructionSection(2, 'loop');
};

const applyStaticTranslations = () => {
  const language = getActiveLanguage();
  document.documentElement.lang = HTML_LANG_MAP[language] || 'vi';
  document.body.dataset.language = language;
  document.title = t('app.title');

  setText('header .brand .title', 'app.brand');
  setAttr('.mode-select-wrap', 'title', 'header.mode.title');
  setText('.mode-select-wrap .lbl', 'header.mode.label');
  setSelectOptionText('modeSelect', 'beginner', 'mode.beginner');
  setSelectOptionText('modeSelect', 'rhythm', 'mode.rhythm');

  setAttr('#midiBadge', 'title', 'midi.badge.connect_title');
  setAttr('#metroCluster', 'title', 'metro.cluster.title');
  setAttr('#btnMetro', 'title', 'metro.button.title');
  setAttr('#btnMetroMenu', 'title', 'metro.menu.title');
  setAttr('#metroPopover', 'aria-label', 'metro.popover.title');
  const metroTitle = document.querySelector('#metroPopover .metroPopTitle');
  if (metroTitle) metroTitle.innerHTML = `<i class="fa-solid fa-stopwatch"></i> ${t('metro.popover.title')}`;
  setAttr('#btnMetroPopClose', 'title', 'button.close');
  setText('#metroPopover .metroPopRow:nth-child(1) .lbl', 'metro.subdivision');
  setAttr('#metroSubdiv', 'title', 'metro.subdivision');
  setText('#metroPopover .metroPopRow:nth-child(2) .lbl', 'metro.tick');
  setAttr('#btnMetroTick', 'title', 'metro.tick.title');
  setAttr('#metroSound', 'title', 'metro.tick.sound_title');
  setText('#metroPopover .metroPopRow:nth-child(3) .lbl', 'metro.flash');
  setAttr('#btnMetroFlash', 'title', 'metro.flash.title');
  setText('#metroPopover .metroPopRow:nth-child(4) .lbl', 'metro.accent');
  setAttr('#btnMetroAccent', 'title', 'metro.accent.title');
  setAttr('#metroAccentSound', 'title', 'metro.accent.sound_title');
  setHtml('#metroPopover .hint', 'metro.hint_html');
  ['click', 'beep', 'wood', 'hihat', 'clave', 'random'].forEach((value) => {
    setSelectOptionText('metroSound', value, `sound.${value}`);
    setSelectOptionText('metroAccentSound', value, `sound.${value}`);
  });

  setAttr('#btnToggleTheme', 'title', 'button.theme.title');
  setButtonHtml('#btnInstructions', 'fa-solid fa-circle-info', 'button.instructions');
  setAttr('#btnInstructions', 'title', 'button.instructions.title');
  setAttr('#btnAutoScroll', 'title', 'button.autoscroll.title');
  setAttr('#btnLoopRange', 'title', 'button.loop.title');
  setButtonHtml('#btnFocusBack', 'fa-solid fa-arrow-left', 'button.back');
  setButtonHtml('#btnRestartBarHdr', 'fa-solid fa-rotate-left', 'button.restart_bar');
  setAttr('#btnRestartBarHdr', 'title', 'button.restart_bar.title');
  setButtonHtml('#btnStopHdr', 'fa-solid fa-stop', 'button.stop');
  setAttr('#btnStopHdr', 'title', 'button.stop.title');
  setButtonHtml('#btnPractice', 'fa-solid fa-play', 'button.practice');

  setButtonHtml('#tab-abc', 'fa-solid fa-code', 'tab.abc');
  setButtonHtml('#tab-recent', 'fa-solid fa-clock-rotate-left', 'tab.recent');
  setButtonHtml('#btnCopyAbc', 'fa-solid fa-copy', 'button.copy_abc');
  setAttr('#btnCopyAbc', 'title', 'button.copy_abc.title');
  setButtonHtml('#btnSave', 'fa-solid fa-bookmark', 'button.save');
  setAttr('#btnSave', 'title', 'button.save.title');
  setButtonHtml('#btnRender', 'fa-solid fa-wand-magic-sparkles', 'button.render');
  setAttr('#btnPrevStop', 'title', 'button.stop_preview.title');
  setAttr('#btnReset', 'title', 'button.reset.title');
  setText('.local-status-label', 'local.status');

  setText('#coachStrip .coachRow:nth-child(1) .coachInline:nth-child(1) .lab', 'coach.step');
  setText('#coachStrip .coachRow:nth-child(1) .coachInline:nth-child(2) .lab', 'coach.play');
  setText('#coachStrip .coachRow:nth-child(2) .coachInline:nth-child(1) .lab', 'coach.missing');
  setText('#coachStrip .coachRow:nth-child(2) .coachInline:nth-child(2) .lab', 'coach.extra');
  setText('#coachStrip .coachRow:nth-child(3) .coachInline:nth-child(1) .lab', 'coach.timing');
  setText('#coachStrip .coachRow:nth-child(3) .coachInline:nth-child(2) .lab', 'coach.quality');
  setText('#zoomCtrl label', 'zoom.label');

  setText('#labelCountIn', 'settings.count_in');
  setText('#labelTolerance', 'settings.tolerance');
  setText('#labelTheme', 'settings.theme');
  setText('#labelLanguage', 'settings.language');
  setSelectOptionText('countInSel', '0', 'settings.count_in.0');
  setSelectOptionText('countInSel', '1', 'settings.count_in.1');
  setSelectOptionText('countInSel', '2', 'settings.count_in.2');
  setSelectOptionText('tolSel', '240', 'settings.tolerance.loose');
  setSelectOptionText('tolSel', '160', 'settings.tolerance.normal');
  setSelectOptionText('tolSel', '90', 'settings.tolerance.tight');
  setSelectOptionText('languageSel', 'vi', 'settings.language.vi');
  setSelectOptionText('languageSel', 'en-US', 'settings.language.en');
  setSelectOptionText('languageSel', 'jpn', 'settings.language.jpn');

  setText('#midiModal h2', 'midi.modal.title');
  setText('#midiModal .modal > p', 'midi.modal.body');
  setText('#midiModal .field-label', 'midi.modal.input');
  setButtonHtml('#btnRefreshMidi', 'fa-solid fa-rotate', 'button.refresh');
  setText('#btnMidiClose', 'button.close');
  setButtonHtml('#btnMidiConnect', 'fa-solid fa-plug-circle-check', 'button.connect');

  setText('#resultModal h2', 'result.title');
  setText('#btnResultClose', 'button.back');
  setButtonHtml('#btnResultAgain', 'fa-solid fa-rotate-right', 'button.try_again');

  applyInstructionTranslations();
  setText('#btnInstrClose', 'button.ok');

  if (PianoApp.syncEditorPanelUI) PianoApp.syncEditorPanelUI();
  if (PianoApp.updatePreviewUI) PianoApp.updatePreviewUI();
  if (PianoApp.syncAutoScrollUI) PianoApp.syncAutoScrollUI();
  if (PianoApp.updateLoopUI) PianoApp.updateLoopUI();
  if (PianoApp.refreshSongMeta) PianoApp.refreshSongMeta();
  if (PianoApp.buildHud) PianoApp.buildHud();
  if (PianoApp.updateHint) PianoApp.updateHint(PianoApp.t('common.empty'));
  if (PianoApp.renderRecentList) PianoApp.renderRecentList();
  if (PianoApp.setMidiBadge) {
    const badgeStatus = PianoApp.state?.midi?.badgeStatus || 'off';
    const badgeKey = PianoApp.state?.midi?.badgeLabelKey || null;
    PianoApp.setMidiBadge(badgeStatus, badgeKey);
  }
  const languageSelect = document.querySelector('#languageSel');
  if (languageSelect) languageSelect.value = language;
};

const setLanguage = (language, { persist = true } = {}) => {
  const nextLanguage = resolveLanguage(language);
  if (!PianoApp.state?.settings) return nextLanguage;
  PianoApp.state.settings.language = nextLanguage;
  applyStaticTranslations();
  if (persist && PianoApp.savePreferences) PianoApp.savePreferences();
  return nextLanguage;
};

PianoApp.t = t;
PianoApp.getLocaleTag = getLocaleTag;
PianoApp.applyTranslations = applyStaticTranslations;
PianoApp.setLanguage = setLanguage;
PianoApp.translations = TRANSLATIONS;
