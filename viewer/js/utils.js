export const collator = new Intl.Collator("it", { sensitivity: "base", numeric: true });

export function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
}

export function escHl(text, tokens = []) {
    if (text == null) return "";
    const str = String(text);
    
    if (!tokens.length) return esc(str);
    
    const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
    
    const parts = str.split(re);
    return parts.map((part, i) => {
        if (i % 2 === 1) {
            return `<mark>${esc(part)}</mark>`;
        }
        return esc(part);
    }).join("");
}

export function fixText(s) {
    let out = String(s || "").replace(/\r\n?/g, "\n");
    for (let i = 0; i < 3; i++) {
        if (!/[ÃÂâ]/.test(out)) break;
        try {
            const dec = decodeURIComponent(escape(out));
            if (dec === out) break;
            out = dec;
        } catch (_) {
            break;
        }
    }
    return out.replace(/[ \t\n]+/g, " ").trim();
}

export function cleanCompany(s) {
    return fixText(s).replace(/^["'\s]+|["'\s]+$/g, "") || "—";
}

export function offerId(url) {
    const m = /[?&]select=(\d+)/.exec(url || "");
    return m ? m[1] : null;
}

export function webHref(w) {
    if (!w) return "";
    return /^https?:\/\//i.test(w) ? w : "https://" + w.replace(/^\/+/, "");
}

export function normalizeKey(k) {
    return String(k || "").replace(/\s+/g, " ").trim();
}

export function keyedRecord(rec) {
    const m = {};
    for (const k of Object.keys(rec)) m[normalizeKey(k)] = rec[k];
    return m;
}
