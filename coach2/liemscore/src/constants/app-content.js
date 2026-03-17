(function () {
    const DEFAULT_ABC = `X: 1
    T: CÔ HÀNG XÓM
    C: Giang Minh Sơn
    M: 4/4
    L: 1/4
    Q: 1/4=120
    K: C
    V:1 clef=treble
    [V:1] A, ( D/2E/2 ) | | A3/2 (B/2 B/2) d/2 (B/4A/4)G/2 | A3/2 (B/2 B/2) d/2 (B/4A/4)G/2 |
    A A/2(E/2 E/2)A/2 F/2E/2 | D2 A, ( A,/2C/2 ) D3/2 (E/2 E/2) A/2 ( E/8D/8)C/2
    D3/2 (E/2 E/2) A/2 (E/4D/4)C/2 | E A E/2D/2 c | B2 z d
    d3/2 e e/2 c | A3/2 A c/2 A | D E C C/2D/2
    E3/2 E A/2 E/2A/2 | B2 d d ( B/2A/2) | G A D E2 | (A4 A) z 
    e e e |: e3/2 (d/2 d/2) c/2 d/2e/2 | ( A/2 c) z B ^G A 
    E E E E3/2 E/2 | A c E D D D 
    D3/2 D/2 C D E A, D E B d ( B/2A/2)  | (B4  B) z 
    e e e :| A, D E B d B | ( A4 | A) z |] 
    `;

            const OCTAVES = [
                { id: 2, label: 'O.2', suffix: ',,' },
                { id: 3, label: 'O.3', suffix: ',' },
                { id: 4, label: 'O.4', suffix: '' },
                { id: 5, label: 'O.5', suffix: '', lowerCase: true },
                { id: 6, label: 'O.6', suffix: "'", lowerCase: true },
                { id: 7, label: 'O.7', suffix: "''", lowerCase: true },
            ];

            const NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

            // Key signature (K:)
            const KEY_TONICS = ['C','G','D','A','E','B','F#','C#','F','Bb','Eb','Ab','Db','Gb','Cb'];
            const buildKeyString = (tonic, mode) => (mode === 'minor' ? `${tonic}m` : tonic);


            // Treble key-signature input helper (user nhập theo dấu hoá nhìn thấy trên khoá Sol)
            const KEY_SIG_HINT = "Nhập dấu hoá theo khoá Sol, cách nhau dấu phẩy. Ví dụ: F#, C#  (2 dấu thăng) | Bb, Eb  (2 dấu giáng)";
            const SHARP_ORDER = ['F','C','G','D','A','E','B'];
            const FLAT_ORDER  = ['B','E','A','D','G','C','F'];
            const MAJOR_BY_SHARPS = {0:'C',1:'G',2:'D',3:'A',4:'E',5:'B',6:'F#',7:'C#'};
            const MAJOR_BY_FLATS  = {0:'C',1:'F',2:'Bb',3:'Eb',4:'Ab',5:'Db',6:'Gb',7:'Cb'};
            const MINOR_BY_SHARPS = {0:'A',1:'E',2:'B',3:'F#',4:'C#',5:'G#',6:'D#',7:'A#'};
            const MINOR_BY_FLATS  = {0:'A',1:'D',2:'G',3:'C',4:'F',5:'Bb',6:'Eb',7:'Ab'};

            // Note icons (SVG) để hiển thị trường độ ổn định trên mọi thiết bị
            const NoteIcon = ({ type }) => {
                const common = { width: 26, height: 26, viewBox: "0 0 24 24", className: "block" };
                if (type === 'whole') {
                    return (
                        <svg {...common} aria-hidden="true">
                            <ellipse cx="12" cy="12.5" rx="6.8" ry="4.6" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    );
                }
                if (type === 'half') {
                    return (
                        <svg {...common} aria-hidden="true">
                            <ellipse cx="10.2" cy="14" rx="5.8" ry="4.0" fill="none" stroke="currentColor" strokeWidth="2" />
                            <line x1="15.4" y1="14" x2="15.4" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    );
                }
                if (type === 'quarter') {
                    return (
                        <svg {...common} aria-hidden="true">
                            <ellipse cx="10.2" cy="14" rx="5.8" ry="4.0" fill="currentColor" />
                            <line x1="15.4" y1="14" x2="15.4" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    );
                }
                if (type === 'sixteenth') {
                    return (
                        <svg {...common} aria-hidden="true">
                            <ellipse cx="10.2" cy="14" rx="5.8" ry="4.0" fill="currentColor" />
                            <line x1="15.4" y1="14" x2="15.4" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M15.4 4 C19 5.1 19 7.2 15.4 8.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M15.4 8.3 C19 9.4 19 11.5 15.4 12.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    );
                }
                if (type === 'thirtySecond') {
                    return (
                        <svg {...common} aria-hidden="true">
                            <ellipse cx="10.2" cy="14" rx="5.8" ry="4.0" fill="currentColor" />
                            <line x1="15.4" y1="14" x2="15.4" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M15.4 4 C19 5.0 19 6.8 15.4 7.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M15.4 7.8 C19 8.8 19 10.6 15.4 11.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M15.4 11.6 C19 12.6 19 14.4 15.4 15.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    );
                }
                // eighth
                return (
                    <svg {...common} aria-hidden="true">
                        <ellipse cx="10.2" cy="14" rx="5.8" ry="4.0" fill="currentColor" />
                        <line x1="15.4" y1="14" x2="15.4" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M15.4 4 C19 5.4 19 8.2 15.4 9.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                );
            };



            const SYMBOLS = [
                { label: '|', val: '|', title: 'Vạch nhịp' },
                { label: '||', val: '||', title: 'Vạch kép (kết đoạn)' },
                { label: '|]', val: '|]', title: 'Kết bài (final bar)' },
                { icon: 'restQuarter', val: 'z', title: 'Lặng đen' },
                { icon: 'restEighth', val: 'z/2', title: 'Lặng đơn' },
                { icon: 'restSixteenth', val: 'z/4', title: 'Lặng móc kép' },
                { icon: 'restThirtySecond', val: 'z/8', title: 'Lặng móc ba' },
                { label: '𝄆', val: '|:', title: 'Bắt đầu lặp' },
                { label: '𝄇', val: ':|', title: 'Kết thúc lặp' },
                { label: '(', val: '(', title: 'Bắt đầu luyến (slur)' },
                { label: ')', val: ')', title: 'Kết thúc luyến (slur)' },
                { label: '-', val: '-', title: 'Nối nốt (tie)' },
                { label: '(3', val: '(3', title: 'Bộ ba (triplet)' },
                { label: '‿', val: '-', title: 'Nối nốt' },
            ];

            const buildSymbolPreviewAbc = (body, extraHeader = '') => `X:1
    M:4/4
    L:1/4
    ${extraHeader ? extraHeader + '\n' : ''}K:C
    ${body}`;

            const TUPLET_MENU_DEFS = [
                { token: '(2', title: 'Duplet', previewAbc: buildSymbolPreviewAbc('(2CD E2 |]') },
                { token: '(3', title: 'Triplet', previewAbc: buildSymbolPreviewAbc('(3CDE F2 |]') },
                { token: '(4', title: 'Quadruplet', previewAbc: buildSymbolPreviewAbc('(4CDEF G2 |]') },
                { token: '(5', title: 'Quintuplet', previewAbc: buildSymbolPreviewAbc('(5CDEFG A2 |]') },
                { token: '(6', title: 'Sextuplet', previewAbc: buildSymbolPreviewAbc('(6CDEFGA B2 |]') },
                { token: '(7', title: 'Septuplet', previewAbc: buildSymbolPreviewAbc('(7CDEFGAB c2 |]') },
                { header: 'Advanced' },
                { token: '(3:2:2', title: 'Advanced 3:2:2', previewAbc: buildSymbolPreviewAbc('(3:2:2CDE F2 |]') },
                { token: '(5:4:5', title: 'Advanced 5:4:5', previewAbc: buildSymbolPreviewAbc('(5:4:5CDEFG A2 |]') },
                { token: '(7:4:7', title: 'Advanced 7:4:7', previewAbc: buildSymbolPreviewAbc('(7:4:7CDEFGAB c2 |]') },
            ];

            const DECORATION_MENU_DEFS = [
                { header: 'Ornaments' },
                { token: '!trill!', title: 'Trill', previewAbc: buildSymbolPreviewAbc('!trill!C2 |]') },
                { token: '!trill(!', title: 'Start extended trill', previewAbc: buildSymbolPreviewAbc('!trill(!C D !trill)!E2 |]') },
                { token: '!trill)!', title: 'End extended trill', previewAbc: buildSymbolPreviewAbc('!trill(!C D !trill)!E2 |]') },
                { token: '!lowermordent!', title: 'Lower mordent', previewAbc: buildSymbolPreviewAbc('!lowermordent!C2 |]') },
                { token: '!uppermordent!', title: 'Upper mordent', previewAbc: buildSymbolPreviewAbc('!uppermordent!C2 |]') },
                { token: '!mordent!', title: 'Same glyph as lowermordent', previewAbc: buildSymbolPreviewAbc('!mordent!C2 |]') },
                { token: '!pralltriller!', title: 'Same glyph as uppermordent', previewAbc: buildSymbolPreviewAbc('!pralltriller!C2 |]') },
                { token: '!roll!', title: 'Roll', previewAbc: buildSymbolPreviewAbc('!roll!C2 |]') },
                { token: '!turn!', title: 'Turn', previewAbc: buildSymbolPreviewAbc('!turn!C2 |]') },
                { token: '!turnx!', title: 'Turn with line', previewAbc: buildSymbolPreviewAbc('!turnx!C2 |]') },
                { token: '!invertedturn!', title: 'Inverted turn', previewAbc: buildSymbolPreviewAbc('!invertedturn!C2 |]') },
                { token: '!invertedturnx!', title: 'Inverted turn with line', previewAbc: buildSymbolPreviewAbc('!invertedturnx!C2 |]') },
                { token: '!arpeggio!', title: 'Arpeggio', previewAbc: buildSymbolPreviewAbc('!arpeggio![CEGc]2 |]') },

                { header: 'Articulation / Strings' },
                { token: '!>!', title: 'Accent', previewAbc: buildSymbolPreviewAbc('!>!C2 |]') },
                { token: '!accent!', title: 'Same as !>!', previewAbc: buildSymbolPreviewAbc('!accent!C2 |]') },
                { token: '!emphasis!', title: 'Same as !>!', previewAbc: buildSymbolPreviewAbc('!emphasis!C2 |]') },
                { token: '!fermata!', title: 'Fermata', previewAbc: buildSymbolPreviewAbc('!fermata!C2 |]') },
                { token: '!invertedfermata!', title: 'Inverted fermata', previewAbc: buildSymbolPreviewAbc('!invertedfermata!C2 |]') },
                { token: '!tenuto!', title: 'Tenuto', previewAbc: buildSymbolPreviewAbc('!tenuto!C2 |]') },
                { token: '!+!', title: 'Left-hand pizzicato / plus', previewAbc: buildSymbolPreviewAbc('!+!C2 |]') },
                { token: '!plus!', title: 'Same as !+!', previewAbc: buildSymbolPreviewAbc('!plus!C2 |]') },
                { token: '!snap!', title: 'Snap pizzicato', previewAbc: buildSymbolPreviewAbc('!snap!C2 |]') },
                { token: '!slide!', title: 'Slide', previewAbc: buildSymbolPreviewAbc('!slide!C2 |]') },
                { token: '!wedge!', title: 'Wedge', previewAbc: buildSymbolPreviewAbc('!wedge!C2 |]') },
                { token: '!upbow!', title: 'Up bow', previewAbc: buildSymbolPreviewAbc('!upbow!C2 |]') },
                { token: '!downbow!', title: 'Down bow', previewAbc: buildSymbolPreviewAbc('!downbow!C2 |]') },
                { token: '!open!', title: 'Open string / harmonic', previewAbc: buildSymbolPreviewAbc('!open!C2 |]') },
                { token: '!thumb!', title: 'Thumb', previewAbc: buildSymbolPreviewAbc('!thumb!C2 |]') },
                { token: '!breath!', title: 'Breath mark', previewAbc: buildSymbolPreviewAbc('C!breath! D2 |]') },
                { token: '!shortphrase!', title: 'Short phrase mark', previewAbc: buildSymbolPreviewAbc('!shortphrase!C2 |]') },
                { token: '!mediumphrase!', title: 'Medium phrase mark', previewAbc: buildSymbolPreviewAbc('!mediumphrase!C2 |]') },
                { token: '!longphrase!', title: 'Long phrase mark', previewAbc: buildSymbolPreviewAbc('!longphrase!C2 |]') },

                { header: 'Fingerings' },
                { token: '!0!', title: 'Fingering 0', previewAbc: buildSymbolPreviewAbc('!0!C2 |]') },
                { token: '!1!', title: 'Fingering 1', previewAbc: buildSymbolPreviewAbc('!1!C2 |]') },
                { token: '!2!', title: 'Fingering 2', previewAbc: buildSymbolPreviewAbc('!2!C2 |]') },
                { token: '!3!', title: 'Fingering 3', previewAbc: buildSymbolPreviewAbc('!3!C2 |]') },
                { token: '!4!', title: 'Fingering 4', previewAbc: buildSymbolPreviewAbc('!4!C2 |]') },
                { token: '!5!', title: 'Fingering 5', previewAbc: buildSymbolPreviewAbc('!5!C2 |]') },

                { header: 'Dynamics / Hairpins' },
                { token: '!pppp!', title: 'pppp', previewAbc: buildSymbolPreviewAbc('!pppp!C2 |]') },
                { token: '!ppp!', title: 'ppp', previewAbc: buildSymbolPreviewAbc('!ppp!C2 |]') },
                { token: '!pp!', title: 'pp', previewAbc: buildSymbolPreviewAbc('!pp!C2 |]') },
                { token: '!p!', title: 'p', previewAbc: buildSymbolPreviewAbc('!p!C2 |]') },
                { token: '!mp!', title: 'mp', previewAbc: buildSymbolPreviewAbc('!mp!C2 |]') },
                { token: '!mf!', title: 'mf', previewAbc: buildSymbolPreviewAbc('!mf!C2 |]') },
                { token: '!f!', title: 'f', previewAbc: buildSymbolPreviewAbc('!f!C2 |]') },
                { token: '!ff!', title: 'ff', previewAbc: buildSymbolPreviewAbc('!ff!C2 |]') },
                { token: '!fff!', title: 'fff', previewAbc: buildSymbolPreviewAbc('!fff!C2 |]') },
                { token: '!ffff!', title: 'ffff', previewAbc: buildSymbolPreviewAbc('!ffff!C2 |]') },
                { token: '!sfz!', title: 'sfz', previewAbc: buildSymbolPreviewAbc('!sfz!C2 |]') },
                { token: '!crescendo(!', title: 'Start crescendo', previewAbc: buildSymbolPreviewAbc('!crescendo(!C D E !crescendo)!F |]') },
                { token: '!<(!', title: 'Same as !crescendo(!', previewAbc: buildSymbolPreviewAbc('!<(!C D E !<)!F |]') },
                { token: '!crescendo)!', title: 'End crescendo', previewAbc: buildSymbolPreviewAbc('!crescendo(!C D E !crescendo)!F |]') },
                { token: '!<)!', title: 'Same as !crescendo)!', previewAbc: buildSymbolPreviewAbc('!<(!C D E !<)!F |]') },
                { token: '!diminuendo(!', title: 'Start diminuendo', previewAbc: buildSymbolPreviewAbc('!diminuendo(!C D E !diminuendo)!F |]') },
                { token: '!>(!', title: 'Same as !diminuendo(!', previewAbc: buildSymbolPreviewAbc('!>(!C D E !>)!F |]') },
                { token: '!diminuendo)!', title: 'End diminuendo', previewAbc: buildSymbolPreviewAbc('!diminuendo(!C D E !diminuendo)!F |]') },
                { token: '!>)!', title: 'Same as !diminuendo)!', previewAbc: buildSymbolPreviewAbc('!>(!C D E !>)!F |]') },

                { header: 'Navigation' },
                { token: '!segno!', title: 'Segno', previewAbc: buildSymbolPreviewAbc('!segno!C2 |]') },
                { token: '!coda!', title: 'Coda', previewAbc: buildSymbolPreviewAbc('!coda!C2 |]') },
                { token: '!D.S.!', title: 'D.S.', previewAbc: buildSymbolPreviewAbc('!D.S.!C2 |]') },
                { token: '!D.C.!', title: 'D.C.', previewAbc: buildSymbolPreviewAbc('!D.C.!C2 |]') },
                { token: '!dacoda!', title: 'Da Coda', previewAbc: buildSymbolPreviewAbc('!dacoda!C2 |]') },
                { token: '!dacapo!', title: 'Da Capo', previewAbc: buildSymbolPreviewAbc('!dacapo!C2 |]') },
                { token: '!fine!', title: 'Fine', previewAbc: buildSymbolPreviewAbc('!fine!C2 |]') },
            ];

    window.AppConstants = {
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
        NoteIcon,
        SYMBOLS,
        TUPLET_MENU_DEFS,
        DECORATION_MENU_DEFS,
    };
})();
