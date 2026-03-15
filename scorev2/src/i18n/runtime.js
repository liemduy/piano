(function () {
    const I18N = {
      "vi": {
        "export": "Export",
        "export_pdf": "PDF",
        "export_abc": ".abc",
        "export_mxl": ".mxl",
        "export_midi": ".midi",
        "lang_vi": "Vi",
        "lang_en": "En-US",
        "lang_jp": "Jp",
        "language": "Ngôn ngữ",
        "app_title": "Liem QuickScore"
      },
      "en": {
        "export": "Export",
        "export_pdf": "PDF",
        "export_abc": ".abc",
        "export_mxl": ".mxl",
        "export_midi": ".midi",
        "lang_vi": "Vi",
        "lang_en": "En-US",
        "lang_jp": "Jp",
        "language": "Language",
        "app_title": "Liem QuickScore"
      },
      "jp": {
        "export": "エクスポート",
        "export_pdf": "PDF",
        "export_abc": ".abc",
        "export_mxl": ".mxl",
        "export_midi": ".midi",
        "lang_vi": "Vi",
        "lang_en": "En-US",
        "lang_jp": "Jp",
        "language": "言語",
        "app_title": "Liem QuickScore"
      }
    };

                // Phrase-level translation (Vietnamese -> other languages)
                const I18N_PHRASES = {
      "en": {
        "(tên nốt + số octave + dấu": "(note name + octave number + accidental",
        ") rồi bấm nút": ") then click the button",
        "+ độ dài).": "+ duration).",
        ". Thêm": ". Add",
        ".\\nVí dụ: C E G  hoặc  C2 E2 G2": ".\nExample: C E G or C2 E2 G2",
        "Auto Barline bị lỗi": "Auto Barline failed",
        "Auto Barline chưa hỗ trợ repeat/ending (|: :|, [1 [2). Hãy xoá chúng trước.": "Auto Barline doesn't support repeats/endings yet (|: :|, [1 [2). Remove them first.",
        "Auto Barline chưa hỗ trợ tuplet (ví dụ: (3abc).": "Auto Barline doesn't support tuplets yet (e.g. (3abc).",
        "Barline: ấn đúp để chèn |, giữ để chọn || |] |: :|": "Barline: double‑tap to insert |, hold to choose || |] |: :|",
        "New Song": "New Song",
        "Báo ô nhịp thiếu/dư phách (cơ bản).": "Report bars with missing/extra beats (basic).",
        "Bôi đen các nốt trong khung ABC (VD:": "Select notes in the ABC box (e.g.:",
        "Bản nhạc trực tiếp (Live Preview)": "Live sheet (Live Preview)",
        "Bắt đầu luyến (slur)": "Start slur",
        "Bắt đầu lặp": "Start repeat",
        "Bọc đoạn đã bôi đen": "Wrap selection",
        "Bộ ba (triplet)": "Triplet",
        "Bộ dấu hoá (Key Signature)": "Key Signature",
        "Chuẩn hoá spacing quanh vạch nhịp, không đổi nội dung.": "Normalize spacing around barlines without changing content.",
        "Chưa có bản nhạc để xuất. Hãy Render trước.": "Nothing to export yet. Please render first.",
        "Chưa có nội dung. Hãy paste vào ô hoặc dùng ví dụ trong placeholder.": "No content yet. Paste into the box or use the example in the placeholder.",
        "Chỉ format lại cho dễ đọc. Không sửa nhạc.": "Only reformat for readability. Doesn't change the music.",
        "Chọn giọng (tonic)": "Choose key (tonic)",
        "Chọn trường độ nốt": "Choose note duration",
        "Copy ví dụ": "Copy example",
        "Các nốt đang chọn phải cùng trường độ (ví dụ: C2 E2 G2).": "Selected notes must have the same duration (e.g. C2 E2 G2).",
        "Cách dùng": "How to use",
        "Dán vào ô": "Paste into the box",
        "Dán ví dụ vào ô nhập": "Paste example into the input",
        "Dán “ngôn ngữ người dùng” → bấm Sync để sinh ABC": "Paste 'natural language' → press Sync to generate ABC",
        "Dôi (.)": "Dot (.)",
        "Dôi ✓": "Dotted ✓",
        "Dùng dấu phẩy": "Use commas",
        "Dấu chấm dôi (.)": "Dotted note (.)",
        "Dọn khoảng trắng": "Clean whitespace",
        "Gợi ý: nhập F#, C#, G#... hoặc Bb, Eb... (tự suy ra giọng theo Major/Minor đang chọn)": "Tip: enter F#, C#, G#... or Bb, Eb... (key is inferred from the selected Major/Minor).",
        "Hãy bôi đen ít nhất 2 nốt trong khung ABC rồi bấm": "Select at least 2 notes in the ABC box, then click",
        "Hãy chọn ít nhất 2 nốt để nhóm thành cột nốt.": "Select at least 2 notes to group into a chord.",
        "Hướng dẫn nhập nhanh": "Quick input guide",
        "Hợp âm (bấm nhiều phím cùng lúc): viết trong ngoặc vuông, ví dụ": "Chord (press multiple keys): write in brackets, e.g.",
        "Khóa Fa": "Bass clef",
        "Khóa Sol": "Treble clef",
        "Không thể gộp móc (beaming).": "Can't create beaming.",
        "Không thể tải file trên trình duyệt này.": "Can't download on this browser.",
        "Kiểm tra nhịp (M/L)": "Validate meter (M/L)",
        "Kết bài": "Final bar",
        "Kết bài (final bar)": "Final bar",
        "Kết thúc luyến (slur)": "End slur",
        "Kết thúc lặp": "End repeat",
        "Luyến: ấn đúp để bọc đoạn (nếu bôi đen) hoặc chèn (, giữ để chọn ( / ) / wrap": "Slur: double‑tap to wrap selection (if selected) or insert (, hold to choose ( / ) / wrap",
        "Lặng móc ba": "32nd rest",
        "Lặng móc kép": "16th rest",
        "Lặng đen": "Quarter rest",
        "Lặng đơn": "Eighth rest",
        "MIDI export chưa sẵn sàng (ABCJS synth chưa tải xong).": "MIDI export not ready (ABCJS synth not loaded yet).",
        "Mã nguồn ABC": "ABC source",
        "Móc ba": "32nd",
        "Móc kép": "16th",
        "Móc đơn": "8th",
        "Mỗi nốt viết dạng": "Each note format",
        "Mở": "Open",
        "Mở luyến": "Start slur",
        "Nghỉ (dấu lặng): dùng": "Rest: use",
        "Nghỉ móc ba": "32nd rest",
        "Nghỉ móc kép": "16th rest",
        "Nghỉ móc đơn": "8th rest",
        "Nghỉ đen": "Quarter rest",
        "Nghỉ: ấn đúp để chèn nghỉ theo trường độ, giữ để chọn loại nghỉ": "Rest: double‑tap to insert a rest with current duration, hold to choose rest type",
        "Ngắt dòng đẹp (4 ô / dòng)": "Pretty line breaks (4 bars / line)",
        "Nhóm các nốt đã bôi đen thành 1 cột nốt (chord)": "Group selected notes into a chord",
        "Nhóm cột nốt": "Make chord",
        "Nhập nhạc cho": "Enter music for",
        "Nối nốt": "Tie",
        "Nối nốt (tie)": "Tie",
        "Redo (tối đa 5 bước)": "Redo (up to 5 steps)",
        "Reset toàn bộ ABC về mặc định? (Hành động này sẽ ghi đè nội dung hiện tại)": "Reset ABC to defaults? (This will overwrite current content.)",
        "Sẽ xoá vạch nhịp cũ và chia lại theo M/L. Kiểm tra trước khi áp dụng.": "This will remove existing barlines and re‑bar based on M/L. Review before applying.",
        "Bè": "Voice",
        "Thêm Bè": "Add voice",
        "Thông tin & Trường độ": "Info & Duration",
        "Tie (nối trường độ): -": "Tie (extend duration): -",
        "Liem QuickScore": "Liem QuickScore",
        "Trình duyệt chặn popup. Hãy cho phép popup rồi thử lại.": "Popup blocked. Allow popups and try again.",
        "Tròn": "Whole",
        "Trắng": "Half",
        "Tác giả": "Composer",
        "Tên bài hát...": "Song title...",
        "Tự chia nhịp lại (xoá vạch cũ)": "Re-bar (remove old barlines)",
        "Undo (tối đa 5 bước)": "Undo (up to 5 steps)",
        "Validate nhịp bị lỗi": "Meter validation failed",
        "Ví dụ (copy được)": "Example (copyable)",
        "Vùng chọn chỉ nên gồm các nốt (không gồm | hay [ ]). Ví dụ: C E G hoặc C2 E2 G2": "Selection should contain only notes (no | or [ ]). Example: C E G or C2 E2 G2",
        "Vùng chọn phải chỉ gồm các nốt hợp lệ. Ví dụ: C E G hoặc ^F A c\\": "Selection must contain only valid notes. Example: C E G or ^F A c'",
        "Vạch kép": "Double bar",
        "Vạch kép (kết đoạn)": "Double bar (section end)",
        "Vạch nhịp": "Barline",
        "Xoá Bè 2": "Delete Voice 2",
        "Xoá toàn bộ “|” rồi chia lại theo trường độ. Có cảnh báo.": "Remove all “|” and re‑bar by duration. Warnings included.",
        "Xuất MIDI bị lỗi. Hãy thử Render lại rồi export.": "MIDI export failed. Try rendering again, then export.",
        "hoặc": "or",
        "lệch": "off",
        "và (nếu có)": "and (if any)",
        "Đang chờ người dùng nhập đúng cú pháp...": "Waiting for valid syntax...",
        "Đang tải ABCJS...": "Loading ABCJS...",
        "Đen": "Quarter",
        "Điền thông tin bài hát (có thể thiếu cũng được):": "Fill song info (optional):",
        "Đã copy": "Copied",
        "Close": "Close",
        "Đóng luyến": "End slur",
        "Độ dài hợp lệ:": "Valid lengths:",
        "để chấm dôi (VD:": "to dot (e.g.:",
        "để ngăn cách các nốt. Dùng dấu chấm phẩy": "to separate notes. Use semicolons",
        "để xuống ô nhịp.": "to end the bar.",
        "Ẩn": "Hide",
        "✓ Đã copy ví dụ": "✓ Example copied",
        "Bản offline này chưa xuất MusicXML/.mxl trực tiếp (ABCJS không hỗ trợ chuyển ABC → MusicXML).\n\nMình đã copy ABC vào clipboard. Bạn có thể dán vào MuseScore hoặc công cụ khác để xuất MusicXML (.mxl).": "This offline build can't export MusicXML/.mxl directly (ABCJS doesn't support ABC → MusicXML).\n\nABC has been copied to your clipboard. Paste it into MuseScore or another tool to export MusicXML (.mxl)."
      },
      "jp": {
        "(tên nốt + số octave + dấu": "（音名 + オクターブ番号 + 臨時記号",
        ") rồi bấm nút": "）してからボタンを押す",
        "+ độ dài).": "+ 長さ）。",
        ". Thêm": "。追加",
        ".\\nVí dụ: C E G  hoặc  C2 E2 G2": "。\n例: C E G または C2 E2 G2",
        "Auto Barline bị lỗi": "自動小節線でエラー",
        "Auto Barline chưa hỗ trợ repeat/ending (|: :|, [1 [2). Hãy xoá chúng trước.": "自動小節線は繰り返し/エンディング（|: :|, [1 [2）に未対応です。先に削除してください。",
        "Auto Barline chưa hỗ trợ tuplet (ví dụ: (3abc).": "自動小節線は連符（例: (3abc）に未対応です。",
        "Barline: ấn đúp để chèn |, giữ để chọn || |] |: :|": "小節線: ダブルタップで | を挿入、長押しで || |] |: :| を選択",
        "New Song": "新しい曲",
        "Báo ô nhịp thiếu/dư phách (cơ bản).": "小節の拍数不足/超過を報告（基本）",
        "Bôi đen các nốt trong khung ABC (VD:": "ABC欄で音符を選択（例:",
        "Bản nhạc trực tiếp (Live Preview)": "ライブ譜面（プレビュー）",
        "Bắt đầu luyến (slur)": "スラー開始",
        "Bắt đầu lặp": "繰り返し開始",
        "Bọc đoạn đã bôi đen": "選択範囲を囲む",
        "Bộ ba (triplet)": "三連符",
        "Bộ dấu hoá (Key Signature)": "調号（Key Signature）",
        "Chuẩn hoá spacing quanh vạch nhịp, không đổi nội dung.": "小節線周りの空白を整形（内容は変更しない）",
        "Chưa có bản nhạc để xuất. Hãy Render trước.": "書き出す譜面がありません。先にRenderしてください。",
        "Chưa có nội dung. Hãy paste vào ô hoặc dùng ví dụ trong placeholder.": "内容がありません。貼り付けるか、プレースホルダーの例を使ってください。",
        "Chỉ format lại cho dễ đọc. Không sửa nhạc.": "読みやすく整形するだけ。音楽内容は変更しません。",
        "Chọn giọng (tonic)": "主音（キー）を選択",
        "Chọn trường độ nốt": "音価を選択",
        "Copy ví dụ": "例をコピー",
        "Các nốt đang chọn phải cùng trường độ (ví dụ: C2 E2 G2).": "選択した音符は同じ音価である必要があります（例: C2 E2 G2）。",
        "Cách dùng": "使い方",
        "Dán vào ô": "欄に貼り付け",
        "Dán ví dụ vào ô nhập": "入力欄に例を貼り付け",
        "Dán “ngôn ngữ người dùng” → bấm Sync để sinh ABC": "自然言語を貼り付け → Sync でABC生成",
        "Dôi (.)": "付点（.）",
        "Dôi ✓": "付点 ✓",
        "Dùng dấu phẩy": "カンマ区切り",
        "Dấu chấm dôi (.)": "付点（.）",
        "Dọn khoảng trắng": "空白を整理",
        "Gợi ý: nhập F#, C#, G#... hoặc Bb, Eb... (tự suy ra giọng theo Major/Minor đang chọn)": "ヒント: F#, C#, G#... または Bb, Eb... を入力（Major/Minorからキーを推定）",
        "Hãy bôi đen ít nhất 2 nốt trong khung ABC rồi bấm": "ABC欄で少なくとも2音を選択してから押してください：",
        "Hãy chọn ít nhất 2 nốt để nhóm thành cột nốt.": "少なくとも2音を選択して和音にしてください。",
        "Hướng dẫn nhập nhanh": "クイック入力ガイド",
        "Hợp âm (bấm nhiều phím cùng lúc): viết trong ngoặc vuông, ví dụ": "和音（同時に複数キー）: [] で書く。例:",
        "Khóa Fa": "ヘ音記号（バス）",
        "Khóa Sol": "ト音記号",
        "Không thể gộp móc (beaming).": "連桁にできません。",
        "Không thể tải file trên trình duyệt này.": "このブラウザではダウンロードできません。",
        "Kiểm tra nhịp (M/L)": "拍子チェック（M/L）",
        "Kết bài": "終止線",
        "Kết bài (final bar)": "終止線",
        "Kết thúc luyến (slur)": "スラー終了",
        "Kết thúc lặp": "繰り返し終了",
        "Luyến: ấn đúp để bọc đoạn (nếu bôi đen) hoặc chèn (, giữ để chọn ( / ) / wrap": "スラー: ダブルタップで選択範囲を囲む/「(」挿入、長押しで ( / ) / wrap を選択",
        "Lặng móc ba": "32分休符",
        "Lặng móc kép": "16分休符",
        "Lặng đen": "4分休符",
        "Lặng đơn": "8分休符",
        "MIDI export chưa sẵn sàng (ABCJS synth chưa tải xong).": "MIDI書き出し準備中（ABCJS synth未読込）",
        "Mã nguồn ABC": "ABCソース",
        "Móc ba": "32分音符",
        "Móc kép": "16分音符",
        "Móc đơn": "8分音符",
        "Mỗi nốt viết dạng": "各音符の形式",
        "Mở": "開く",
        "Mở luyến": "スラー開始",
        "Nghỉ (dấu lặng): dùng": "休符: 使用",
        "Nghỉ móc ba": "32分休符",
        "Nghỉ móc kép": "16分休符",
        "Nghỉ móc đơn": "8分休符",
        "Nghỉ đen": "4分休符",
        "Nghỉ: ấn đúp để chèn nghỉ theo trường độ, giữ để chọn loại nghỉ": "休符: ダブルタップで現在の音価の休符、長押しで種類選択",
        "Ngắt dòng đẹp (4 ô / dòng)": "改行整形（1行4小節）",
        "Nhóm các nốt đã bôi đen thành 1 cột nốt (chord)": "選択した音を和音にまとめる",
        "Nhóm cột nốt": "和音化",
        "Nhập nhạc cho": "入力（対象）",
        "Nối nốt": "タイ",
        "Nối nốt (tie)": "タイ",
        "Redo (tối đa 5 bước)": "やり直し（最大5）",
        "Reset toàn bộ ABC về mặc định? (Hành động này sẽ ghi đè nội dung hiện tại)": "ABCを初期化しますか？（現在の内容を上書きします）",
        "Sẽ xoá vạch nhịp cũ và chia lại theo M/L. Kiểm tra trước khi áp dụng.": "既存の小節線を削除し、M/Lに基づいて再分割します。適用前に確認してください。",
        "Bè": "声部",
        "Thêm Bè": "声部追加",
        "Thông tin & Trường độ": "情報 & 音価",
        "Tie (nối trường độ): -": "タイ（音価を延長）: -",
        "Liem QuickScore": "Liem QuickScore",
        "Trình duyệt chặn popup. Hãy cho phép popup rồi thử lại.": "ポップアップがブロックされました。許可して再試行してください。",
        "Tròn": "全音符",
        "Trắng": "2分音符",
        "Tác giả": "作曲者",
        "Tên bài hát...": "曲名...",
        "Tự chia nhịp lại (xoá vạch cũ)": "再小節化（旧小節線削除）",
        "Undo (tối đa 5 bước)": "元に戻す（最大5）",
        "Validate nhịp bị lỗi": "拍子チェック失敗",
        "Ví dụ (copy được)": "例（コピー可）",
        "Vùng chọn chỉ nên gồm các nốt (không gồm | hay [ ]). Ví dụ: C E G hoặc C2 E2 G2": "選択範囲は音符のみ（| や [ ] なし）。例: C E G または C2 E2 G2",
        "Vùng chọn phải chỉ gồm các nốt hợp lệ. Ví dụ: C E G hoặc ^F A c\\": "選択範囲は有効な音符のみ。例: C E G または ^F A c'",
        "Vạch kép": "二重小節線",
        "Vạch kép (kết đoạn)": "二重小節線（区切り）",
        "Vạch nhịp": "小節線",
        "Xoá Bè 2": "声部2を削除",
        "Xoá toàn bộ “|” rồi chia lại theo trường độ. Có cảnh báo.": "「|」を全削除して音価で再分割（警告あり）",
        "Xuất MIDI bị lỗi. Hãy thử Render lại rồi export.": "MIDI書き出しエラー。再Renderしてから試してください。",
        "hoặc": "または",
        "lệch": "ずれ",
        "và (nếu có)": "（あれば）と",
        "Đang chờ người dùng nhập đúng cú pháp...": "正しい形式を待機中...",
        "Đang tải ABCJS...": "ABCJSを読み込み中...",
        "Đen": "4分音符",
        "Điền thông tin bài hát (có thể thiếu cũng được):": "曲情報を入力（省略可）:",
        "Đã copy": "コピーしました",
        "Close": "閉じる",
        "Đóng luyến": "スラー終了",
        "Độ dài hợp lệ:": "有効な長さ:",
        "để chấm dôi (VD:": "付点（例:",
        "để ngăn cách các nốt. Dùng dấu chấm phẩy": "音符の区切り。セミコロンを使用",
        "để xuống ô nhịp.": "小節を区切る。",
        "Ẩn": "非表示",
        "✓ Đã copy ví dụ": "✓ 例をコピーしました",
        "Bản offline này chưa xuất MusicXML/.mxl trực tiếp (ABCJS không hỗ trợ chuyển ABC → MusicXML).\n\nMình đã copy ABC vào clipboard. Bạn có thể dán vào MuseScore hoặc công cụ khác để xuất MusicXML (.mxl).": "このオフライン版はMusicXML/.mxlを直接書き出せません（ABCJSはABC→MusicXMLに未対応）。\n\nABCをクリップボードにコピーしました。MuseScore等に貼り付けてMusicXML（.mxl）を書き出してください。"
      }
    };

                const VN_DIACRITIC_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

                const translateText = (input, lang) => {
                    try {
                        if (typeof input !== 'string') return input;
                        const L = (lang || 'vi');
                        if (L === 'vi') return input;

                        const map = (I18N_PHRASES && I18N_PHRASES[L]) || {};
                        if (map[input]) return map[input];

                        // Substring replacements for longer messages
                        let out = input;
                        const entries = Object.entries(map).sort((a, b) => (b[0] || '').length - (a[0] || '').length);
                        for (const [from, to] of entries) {
                            if (!from) continue;
                            if (out.includes(from)) out = out.split(from).join(to);
                        }

                        // Generic rule-based fallback for dynamic errors
                        if (L === 'en') {
                            out = out
                                .replace(/Không đọc được/g, 'Cannot parse')
                                .replace(/Không parse được/g, 'Cannot parse')
                                .replace(/không hợp lệ/g, 'is invalid')
                                .replace(/Dùng:/g, 'Use:')
                                .replace(/đúng format:/g, 'expected format:')
                                .replace(/Trường độ/g, 'Duration')
                                .replace(/trường độ/g, 'duration')
                                .replace(/nhịp/g, 'meter')
                                .replace(/Bị dư phách/g, 'Too many beats')
                                .replace(/Bị thiếu phách/g, 'Not enough beats')
                                .replace(/Hãy thử/g, 'Try')
                                .replace(/chưa hỗ trợ/g, "not supported yet");
                        } else if (L === 'jp') {
                            out = out
                                .replace(/Không đọc được/g, '解析できません')
                                .replace(/Không parse được/g, '解析できません')
                                .replace(/không hợp lệ/g, 'が不正です')
                                .replace(/Dùng:/g, '使用:')
                                .replace(/đúng format:/g, '期待する形式:')
                                .replace(/Trường độ/g, '音価')
                                .replace(/trường độ/g, '音価')
                                .replace(/nhịp/g, '拍子')
                                .replace(/Bị dư phách/g, '拍数が多すぎます')
                                .replace(/Bị thiếu phách/g, '拍数が足りません')
                                .replace(/Hãy thử/g, '試してください')
                                .replace(/chưa hỗ trợ/g, '未対応です');
                        }

                        return out;
                    } catch (e) {
                        return input;
                    }
                };

    function tFor(lang, key) {
        return (I18N[lang] && I18N[lang][key]) || I18N.vi[key] || key;
    }

    function setLanguage(lang) {
        try { window.__APP_LANG = lang; } catch (error) {}
    }

    function syncDocumentLanguage(lang, title) {
        try { document.documentElement.lang = (lang === 'jp' ? 'ja' : lang); } catch (error) {}
        try { document.title = title || tFor(lang, 'app_title'); } catch (error) {}
    }

    function installI18nRuntime() {
        if (window.__I18N_CREATE_ELEMENT_PATCHED__) return;

        window.__I18N_CREATE_ELEMENT_PATCHED__ = true;
        const originalCreateElement = React.createElement;
        const translatedPropKeys = ['title', 'placeholder', 'aria-label', 'alt', 'label'];

        React.createElement = function (type, props, ...children) {
            const lang = window.__APP_LANG || 'vi';
            if (lang !== 'vi') {
                if (props && typeof props === 'object') {
                    let changed = false;
                    const nextProps = {};
                    for (const key in props) nextProps[key] = props[key];

                    for (const key of translatedPropKeys) {
                        const value = nextProps[key];
                        if (typeof value === 'string' && (VN_DIACRITIC_RE.test(value) || (I18N_PHRASES[lang] && I18N_PHRASES[lang][value]))) {
                            nextProps[key] = translateText(value, lang);
                            changed = true;
                        }
                    }

                    if (changed) props = nextProps;
                }

                if (children && children.length) {
                    children = children.map((child) => {
                        if (typeof child === 'string' && (VN_DIACRITIC_RE.test(child) || (I18N_PHRASES[lang] && I18N_PHRASES[lang][child]))) {
                            return translateText(child, lang);
                        }
                        return child;
                    });
                }
            }

            return originalCreateElement.call(React, type, props, ...children);
        };

        const originalAlert = window.alert;
        window.alert = function (message) {
            const lang = window.__APP_LANG || 'vi';
            const nextMessage = (typeof message === 'string' && lang !== 'vi') ? translateText(message, lang) : message;
            return originalAlert(nextMessage);
        };

        const originalConfirm = window.confirm;
        window.confirm = function (message) {
            const lang = window.__APP_LANG || 'vi';
            const nextMessage = (typeof message === 'string' && lang !== 'vi') ? translateText(message, lang) : message;
            return originalConfirm(nextMessage);
        };
    }

    installI18nRuntime();

    window.AppI18n = {
        I18N,
        I18N_PHRASES,
        VN_DIACRITIC_RE,
        translateText,
        tFor,
        setLanguage,
        syncDocumentLanguage,
        installI18nRuntime,
    };
})();
