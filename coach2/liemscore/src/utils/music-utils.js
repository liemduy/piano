(function () {
    function parseFraction(value) {
        const text = String(value || '').trim();
        if (!text) return null;
        const match = text.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (!match) return null;

        const numerator = parseInt(match[1], 10);
        const denominator = parseInt(match[2], 10);
        if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
            return null;
        }

        return numerator / denominator;
    }

    function parseLengthSuffix(lengthText) {
        const text = String(lengthText || '').trim();
        if (!text) return 1;
        if (text === '/') return 0.5;
        if (text === '//') return 0.25;
        if (/^\d+$/.test(text)) return parseInt(text, 10);
        if (/^\/\d+$/.test(text)) return 1 / parseInt(text.slice(1), 10);
        if (/^\d+\/\d+$/.test(text)) {
            const parts = text.split('/');
            return parseInt(parts[0], 10) / parseInt(parts[1], 10);
        }
        if (/^\d+\/$/.test(text)) return parseInt(text, 10) / 2;
        return null;
    }

    function tokenDurationWhole(token, baseLengthWhole) {
        const raw = String(token || '').trim();
        if (!raw) return 0;

        const normalized = raw.replace(/[()]/g, '').replace(/-+$/g, '');
        let match = normalized.match(/^\[[^\]]+\]([0-9\/]+|\/\/|\/)?$/);
        if (match) {
            const factor = parseLengthSuffix(match[1] || '');
            return factor == null ? null : (baseLengthWhole * factor);
        }

        match = normalized.match(/^z([0-9\/]+|\/\/|\/)?$/);
        if (match) {
            const factor = parseLengthSuffix(match[1] || '');
            return factor == null ? null : (baseLengthWhole * factor);
        }

        match = normalized.match(/^(?:\^{1,2}|_{1,2}|=)?[A-Ga-g][,']*([0-9\/]+|\/\/|\/)?$/);
        if (match) {
            const factor = parseLengthSuffix(match[1] || '');
            return factor == null ? null : (baseLengthWhole * factor);
        }

        return 0;
    }

    window.AppMusicUtils = {
        parseFraction,
        parseLengthSuffix,
        tokenDurationWhole,
    };
})();
