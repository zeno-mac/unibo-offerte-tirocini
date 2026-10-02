"use strict";

/* ---------- Data sources ---------- */
const RAW_BASE = "../data/";

const collator = new Intl.Collator("it", { sensitivity: "base", numeric: true });

/* ---------- Generic helpers ---------- */
function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
}

function escHl(text) {
    if (text == null) return "";
    const str = String(text);
    const s = typeof state !== "undefined" && state.activeType ? currentState() : null;
    const tokens = s && s.search ? s.search.toLowerCase().split(/\s+/).filter(Boolean) : [];
    
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

// Some records in the source come double/triple mis-encoded (UTF-8 read as
// Latin-1). Re-decode a few times, but only when tell-tale sequences appear so
// correctly encoded accents are left untouched.
function fixText(s) {
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
    // Collapse the internal whitespace runs (tabs/newlines from source HTML
    // formatting) that show up in some field labels/values.
    return out.replace(/[ \t\n]+/g, " ").trim();
}

function cleanCompany(s) {
    return fixText(s).replace(/^["'\s]+|["'\s]+$/g, "") || "—";
}

function offerId(url) {
    const m = /[?&]select=(\d+)/.exec(url || "");
    return m ? m[1] : null;
}

function webHref(w) {
    if (!w) return "";
    return /^https?:\/\//i.test(w) ? w : "https://" + w.replace(/^\/+/, "");
}

function infoRow(label, valueHtml) {
    return valueHtml ? `<dt>${esc(label)}</dt><dd>${valueHtml}</dd>` : "";
}

function section(title, innerHtml) {
    return innerHtml ? `<div class="card-section"><h4>${esc(title)}</h4>${innerHtml}</div>` : "";
}

const MAX_TEXT_LENGTH = 300;

function expandableProse(text, className = "prose", maxLen = MAX_TEXT_LENGTH) {
    if (!text) return "";
    
    const s = typeof state !== "undefined" && state.activeType ? currentState() : null;
    const tokens = s && s.search ? s.search.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const hasMatch = tokens.length > 0 && tokens.some(t => text.toLowerCase().includes(t));

    if (text.length <= maxLen) return `<p class="${className}">${escHl(text)}</p>`;
    
    const short = text.slice(0, maxLen).trim() + "…";
    const isExpanded = hasMatch;

    return `<div class="expandable">
        <div class="summary" ${isExpanded ? 'hidden' : ''}><p class="${className}">${escHl(short)}</p></div>
        <div class="full" ${isExpanded ? '' : 'hidden'}><p class="${className}">${escHl(text)}</p></div>
        <button type="button" class="show-more-btn link-btn">${isExpanded ? 'Mostra meno' : 'Mostra altro'}</button>
    </div>`;
}

function expandableProseParts(parts, maxLen = MAX_TEXT_LENGTH) {
    const valid = parts.filter(p => p.text);
    if (!valid.length) return "";
    
    const s = typeof state !== "undefined" && state.activeType ? currentState() : null;
    const tokens = s && s.search ? s.search.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const hasMatch = tokens.length > 0 && valid.some(p => tokens.some(t => p.text.toLowerCase().includes(t)));

    const totalLen = valid.reduce((acc, p) => acc + p.text.length, 0);
    const fullHtml = valid.map(p => `<p class="${p.className}">${escHl(p.text)}</p>`).join("");
    
    if (totalLen <= maxLen) return fullHtml;
    
    let summaryHtml = "";
    let len = 0;
    for (const p of valid) {
        if (len >= maxLen) break;
        const rem = maxLen - len;
        if (p.text.length <= rem) {
            summaryHtml += `<p class="${p.className}">${escHl(p.text)}</p>`;
            len += p.text.length;
        } else {
            summaryHtml += `<p class="${p.className}">${escHl(p.text.slice(0, rem).trim() + "…")}</p>`;
            break;
        }
    }
    
    const isExpanded = hasMatch;

    return `<div class="expandable">
        <div class="summary" ${isExpanded ? 'hidden' : ''}>${summaryHtml}</div>
        <div class="full" ${isExpanded ? '' : 'hidden'}>${fullHtml}</div>
        <button type="button" class="show-more-btn link-btn">${isExpanded ? 'Mostra meno' : 'Mostra altro'}</button>
    </div>`;
}

// Field labels scraped from the site sometimes carry embedded newlines/extra
// spaces (an artifact of the source HTML markup). Look records up by a
// whitespace-normalized version of the label so both shapes match.
function normalizeKey(k) {
    return String(k || "").replace(/\s+/g, " ").trim();
}

function keyedRecord(rec) {
    const m = {};
    for (const k of Object.keys(rec)) m[normalizeKey(k)] = rec[k];
    return m;
}

/* ================= Bookmarks ================= */
const Bookmarks = {
    get: function() {
        try {
            return new Set(JSON.parse(localStorage.getItem('offerte_bookmarks') || '[]'));
        } catch(e) {
            return new Set();
        }
    },
    toggle: function(id) {
        const b = this.get();
        if (b.has(id)) b.delete(id);
        else b.add(id);
        localStorage.setItem('offerte_bookmarks', JSON.stringify([...b]));
        return b.has(id);
    },
    has: function(id) {
        return this.get().has(id);
    }
};

/* ================= Extracurricular ================= */
const EXTRA_FIELDS = {
    url: "Indirizzo dell'offerta:",
    company: "Ragione Sociale:",
    type: "Tipo Azienda/Ente:",
    description: "Descrizione:",
    sectors: "Settori di attività:",
    country: "Nazione:",
    province: "Provincia:",
    comune: "Comune:",
    frazione: "Frazione:",
    address: "Indirizzo:",
    cap: "CAP:",
    refFirst: "Nome referente:",
    refLast: "Cognome referente:",
    phone: "Telefono:",
    email: "Email:",
    web: "Sito web:",
    note: "Note:",
};

function normalizeExtra(rec, idx) {
    const r = keyedRecord(rec);
    const url = r[EXTRA_FIELDS.url] || "";
    const first = fixText(r[EXTRA_FIELDS.refFirst]);
    const last = fixText(r[EXTRA_FIELDS.refLast]);
    const o = {
        _raw: rec,
        idx,
        id: offerId(url) || "e" + idx,
        url,
        company: cleanCompany(r[EXTRA_FIELDS.company]),
        type: fixText(r[EXTRA_FIELDS.type]),
        description: fixText(r[EXTRA_FIELDS.description]),
        sectors: fixText(r[EXTRA_FIELDS.sectors]),
        country: fixText(r[EXTRA_FIELDS.country]),
        province: fixText(r[EXTRA_FIELDS.province]),
        comune: fixText(r[EXTRA_FIELDS.comune]),
        frazione: fixText(r[EXTRA_FIELDS.frazione]),
        address: fixText(r[EXTRA_FIELDS.address]),
        cap: fixText(r[EXTRA_FIELDS.cap]),
        referent: [first, last].filter(Boolean).join(" "),
        phone: fixText(r[EXTRA_FIELDS.phone]),
        email: fixText(r[EXTRA_FIELDS.email]),
        web: fixText(r[EXTRA_FIELDS.web]),
        note: fixText(r[EXTRA_FIELDS.note]),
    };
    o.categories = o.type ? [o.type] : [];
    o.haystack = [
        o.company, o.type, o.description, o.sectors,
        o.comune, o.frazione, o.address, o.referent, o.email, o.web, o.note,
    ].join("  ").toLowerCase();
    return o;
}

function cardHTMLExtra(o) {
    const isBookmarked = Bookmarks.has(o.id);
    
    const sectors = o.sectors ? `<p class="prose dim card-sectors">${escHl(o.sectors)}</p>` : "";
    
    const s = typeof state !== "undefined" && state.activeType ? currentState() : null;
    const tokens = s && s.search ? s.search.toLowerCase().split(/\s+/).filter(Boolean) : [];

    let hasMore = false;
    let autoExpand = false;
    const fullText = (o.description + "\\n\\n" + o.note).trim();
    if (fullText.length > 300) {
        hasMore = true;
        if (tokens.length > 0 && tokens.some(t => fullText.toLowerCase().includes(t))) {
            autoExpand = true;
        }
    }
    
    const locationStr = [o.comune, o.province && o.province !== o.comune ? o.province : ""].filter(Boolean).join(" - ").toUpperCase();
    
    const metaRows = [
        locationStr && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>${escHl(locationStr)}</div>`,
        o.email && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg><a href="mailto:${esc(o.email)}">${escHl(o.email)}</a></div>`
    ].filter(Boolean).join("");

    return `<article class="card ${hasMore ? 'has-more' : ''} ${autoExpand ? 'expanded' : ''}" id="offer-${esc(o.id)}">
        <div class="card-layout">
            <div class="card-col-left">
                <div class="card-title-wrap">
                    <h3 class="card-title">${escHl(o.company)}</h3>
                    <button type="button" class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-id="${esc(o.id)}" aria-label="Salva preferito" title="Salva nei preferiti">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" class="icon-outline"/><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" class="icon-filled"/></svg>
                    </button>
                </div>
                ${sectors}
            </div>
            
            <div class="card-col-center">
                <div class="card-desc">
                    <div class="prose">${escHl(o.description)}</div>
                    ${o.note ? `<div class="card-section-title mt-3">Note</div><div class="prose">${escHl(o.note)}</div>` : ''}
                </div>
                ${hasMore ? `<div class="show-more-wrap"><button type="button" class="show-more-btn pill-btn">${autoExpand ? 'Mostra meno &#8963;' : 'Mostra tutto &#8964;'}</button></div>` : ''}
            </div>
            
            <div class="card-col-right">
                <div class="meta-rows">${metaRows}</div>
                ${o.url ? `<a class="details-link" href="${esc(o.url)}" target="_blank" rel="noopener">Apri offerta &nearr;</a>` : ''}
            </div>
        </div>
    </article>`;
}

/* ================= Curricular ================= */
const CURR_FIELDS = {
    url: "Indirizzo dell'offerta:",
    company: "Azienda/Ente:",
    tipoTirocinio: "Tipologia di tirocinio:",
    oggetto: "Oggetto del tirocinio:",
    struttura: "Stabilimento/reparto/ufficio/scuola:",
    obiettivi: "Obiettivi formativi del tirocinio:",
    attivita: "Attività da svolgere in azienda/ente:",
    conoscenze: "Conoscenze teoriche e applicative, abilità trasversali (capacità organizzative, lavoro di gruppo, ecc) o obiettivi della classe di laurea:",
    numTirocinanti: "Numero di tirocinanti:",
    durata: "Durata:",
    dataInizio: "Data d'inizio prevista:",
    dataFine: "Data di fine prevista:",
    country: "Nazione:",
    province: "Provincia:",
    comune: "Comune:",
    address: "Indirizzo:",
    indennita: "Sono previste indennità/rimborsi spese/borse di studio/premi:",
    dataPubblicazione: "Data inizio pubblicazione:",
    dataScadenza: "Data di scadenza della pubblicazione:",
    tutorFirst: "Nome del tutor del soggetto ospitante:",
    tutorLast: "Cognome del tutor del soggetto ospitante:",
    tutorRuolo: "Ruolo del tutor del soggetto ospitante:",
    linguistiche: "Eventuali conoscenze linguistiche richieste:",
    informatiche: "Eventuali conoscenze informatiche richieste:",
    note: "Note:",
    corsi: "Corsi:",
    cycle: "Ciclo:",
};

// Current data stores course labels as an array. Keep parsing the legacy
// encoded string format so older downloaded logs remain usable.
function parseCorsi(value) {
    if (Array.isArray(value)) {
        return value.map((course) => fixText(course)).filter(Boolean);
    }

    const s = fixText(value);
    if (!s) return [];

    const re = /\(\s*\d+\s*\)\s*([^()]+?)\s*-\s*[^()]+?(?=\s*\(|$)/g;
    const out = [];
    let m;
    while ((m = re.exec(s))) {
        const name = m[1].trim();
        if (name && !out.includes(name)) out.push(name);
    }
    return out;
}

function normalizeCurricular(rec, idx) {
    const r = keyedRecord(rec);
    const url = r[CURR_FIELDS.url] || "";
    const tutorFirst = fixText(r[CURR_FIELDS.tutorFirst]);
    const tutorLast = fixText(r[CURR_FIELDS.tutorLast]);
    const indennita = fixText(r[CURR_FIELDS.indennita]);
    const corsiRaw = r[CURR_FIELDS.corsi];
    const o = {
        _raw: rec,
        idx,
        id: offerId(url) || "c" + idx,
        url,
        company: cleanCompany(r[CURR_FIELDS.company]),
        tipoTirocinio: fixText(r[CURR_FIELDS.tipoTirocinio]),
        oggetto: fixText(r[CURR_FIELDS.oggetto]),
        struttura: fixText(r[CURR_FIELDS.struttura]),
        obiettivi: fixText(r[CURR_FIELDS.obiettivi]),
        attivita: fixText(r[CURR_FIELDS.attivita]),
        conoscenze: fixText(r[CURR_FIELDS.conoscenze]),
        numTirocinanti: fixText(r[CURR_FIELDS.numTirocinanti]),
        durata: fixText(r[CURR_FIELDS.durata]),
        dataInizio: fixText(r[CURR_FIELDS.dataInizio]),
        dataFine: fixText(r[CURR_FIELDS.dataFine]),
        country: fixText(r[CURR_FIELDS.country]),
        province: fixText(r[CURR_FIELDS.province]),
        comune: fixText(r[CURR_FIELDS.comune]),
        address: fixText(r[CURR_FIELDS.address]),
        indennita,
        indennitaBool: /^s/i.test(indennita),
        dataPubblicazione: fixText(r[CURR_FIELDS.dataPubblicazione]),
        dataScadenza: fixText(r[CURR_FIELDS.dataScadenza]),
        tutor: [tutorFirst, tutorLast].filter(Boolean).join(" "),
        tutorRuolo: fixText(r[CURR_FIELDS.tutorRuolo]),
        linguistiche: fixText(r[CURR_FIELDS.linguistiche]),
        informatiche: fixText(r[CURR_FIELDS.informatiche]),
        note: fixText(r[CURR_FIELDS.note]),
        corsi: parseCorsi(corsiRaw),
        cycles: fixText(r[CURR_FIELDS.cycle]).split(",").map((s) => s.trim()).filter(Boolean),
    };
    o.categories = o.corsi;
    o.haystack = [
        o.company, o.tipoTirocinio, o.oggetto, o.struttura, o.obiettivi, o.attivita,
        o.conoscenze, o.comune, o.address, o.tutor, o.linguistiche, o.informatiche,
        o.note, o.corsi.join(" "), o.cycles.join(" "),
    ].join("  ").toLowerCase();
    return o;
}

function cardHTMLCurricular(o) {
    const isBookmarked = Bookmarks.has(o.id);
    
    const corsiText = o.corsi.join(" • ");
    const sectors = corsiText ? `<p class="prose dim card-sectors">${escHl(corsiText)}</p>` : "";
    
    const s = typeof state !== "undefined" && state.activeType ? currentState() : null;
    const tokens = s && s.search ? s.search.toLowerCase().split(/\s+/).filter(Boolean) : [];

    let hasMore = false;
    let autoExpand = false;
    const fullText = (o.oggetto + "\\n" + o.obiettivi + "\\n" + o.attivita).trim();
    if (fullText.length > 300) {
        hasMore = true;
        if (tokens.length > 0 && tokens.some(t => fullText.toLowerCase().includes(t))) {
            autoExpand = true;
        }
    }
    
    const locationStr = [o.comune, o.province && o.province !== o.comune ? o.province : ""].filter(Boolean).join(" - ").toUpperCase();
    
    const metaRows = [
        locationStr && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>${escHl(locationStr)}</div>`,
        o.tutor && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>${escHl(o.tutor)}</div>`
    ].filter(Boolean).join("");

    return `<article class="card ${hasMore ? 'has-more' : ''} ${autoExpand ? 'expanded' : ''}" id="offer-${esc(o.id)}">
        <div class="card-layout">
            <div class="card-col-left">
                <div class="card-title-wrap">
                    <h3 class="card-title">${escHl(o.company)}</h3>
                    <button type="button" class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-id="${esc(o.id)}" aria-label="Salva preferito" title="Salva nei preferiti">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" class="icon-outline"/><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" class="icon-filled"/></svg>
                    </button>
                </div>
                ${sectors}
            </div>
            
            <div class="card-col-center">
                <div class="card-desc">
                    ${o.oggetto ? `<div class="prose">${escHl(o.oggetto)}</div>` : ''}
                    ${o.obiettivi ? `<div class="card-section-title mt-3">Obiettivi</div><div class="prose">${escHl(o.obiettivi)}</div>` : ''}
                    ${o.attivita ? `<div class="card-section-title mt-3">Attività</div><div class="prose">${escHl(o.attivita)}</div>` : ''}
                </div>
                ${hasMore ? `<div class="show-more-wrap"><button type="button" class="show-more-btn pill-btn">${autoExpand ? 'Mostra meno &#8963;' : 'Mostra tutto &#8964;'}</button></div>` : ''}
            </div>
            
            <div class="card-col-right">
                <div class="meta-rows">${metaRows}</div>
                ${o.url ? `<a class="details-link" href="${esc(o.url)}" target="_blank" rel="noopener">Apri offerta &nearr;</a>` : ''}
            </div>
        </div>
    </article>`;
}

/* ================= Type registry & shared state ================= */
const TYPE_CONFIGS = {
    extracurricular: {
        label: "Extracurriculari",
        dataUrl: RAW_BASE + "extracurricular_internship_log.json",
        normalize: normalizeExtra,
        cardHTML: cardHTMLExtra,
        categoryLabel: "Tutti i settori",
        otherFilters: [],
    },
    curricular: {
        label: "Curriculari",
        dataUrl: RAW_BASE + "curricular_internship_log.json",
        normalize: normalizeCurricular,
        cardHTML: cardHTMLCurricular,
        categoryLabel: "Tutti i corsi",
        otherFilters: [],
    },
};

const SORT_OPTIONS = [
    { value: "az", label: "Azienda (A → Z)" },
    { value: "za", label: "Azienda (Z → A)" },
    { value: "comune", label: "Comune (A → Z)" },
    { value: "recent", label: "Più recenti" },
];

function freshTypeState(cfg) {
    const other = {};
    if (cfg.otherFilters) {
        for (const f of cfg.otherFilters) other[f.key] = false;
    }
    return {
        loaded: false,
        error: null,
        all: [],
        filtered: [],
        search: "",
        sort: "az",
        categories: new Set(),
        categorySearch: "",
        showAllCategories: false,
        comune: "",
        comuneSearch: "",
        other,
        onlyBookmarks: false,
    };
}

const state = {
    activeType: "extracurricular",
    extracurricular: freshTypeState(TYPE_CONFIGS.extracurricular),
    curricular: freshTypeState(TYPE_CONFIGS.curricular),
};

function currentCfg() {
    return TYPE_CONFIGS[state.activeType];
}
function currentState() {
    return state[state.activeType];
}

/* ---------- Filtering / sorting ---------- */
function applyFilters() {
    const cfg = currentCfg();
    const s = currentState();
    const tokens = s.search.toLowerCase().split(/\s+/).filter(Boolean);

    let list = s.all.filter((o) => {
        if (s.categories.size && !o.categories.some((c) => s.categories.has(c))) return false;
        if (s.comune && o.comune !== s.comune) return false;
        if (s.onlyBookmarks && !Bookmarks.has(o.id)) return false;
        if (cfg.otherFilters) {
            for (const f of cfg.otherFilters) {
                if (s.other[f.key] && !f.test(o)) return false;
            }
        }
        if (tokens.length && !tokens.every((t) => o.haystack.includes(t))) return false;
        return true;
    });

    list.sort((a, b) => {
        switch (s.sort) {
            case "za":
                return collator.compare(b.company, a.company);
            case "comune":
                return collator.compare(a.comune, b.comune) || collator.compare(a.company, b.company);
            case "recent":
                return (parseInt(b.id, 10) || 0) - (parseInt(a.id, 10) || 0);
            default:
                return collator.compare(a.company, b.company);
        }
    });

    s.filtered = list;
    renderCards();
}

/* ---------- Rendering ---------- */
function renderCards() {
    const cfg = currentCfg();
    const s = currentState();
    const grid = document.getElementById("card-grid");
    const notice = document.getElementById("notice");
    const count = document.getElementById("count");

    if (s.error) {
        grid.innerHTML = "";
        notice.hidden = false;
        notice.textContent = s.error;
        count.textContent = "";
        return;
    }

    const n = s.filtered.length;
    const total = s.all.length;
    count.textContent = n === total
        ? `${total} offerte`
        : `${n} ${n === 1 ? "offerta" : "offerte"} su ${total}`;

    if (!n) {
        grid.innerHTML = "";
        notice.hidden = false;
        notice.textContent = s.loaded
            ? "Nessuna offerta corrisponde ai criteri."
            : "Caricamento…";
        return;
    }
    notice.hidden = true;
    grid.innerHTML = s.filtered.map(cfg.cardHTML).join("");
}

/* ---------- Filter controls ---------- */
function buildFilterControls() {
    const cfg = currentCfg();
    const s = currentState();

    const catCounts = new Map();
    const comuni = new Set();
    for (const o of s.all) {
        for (const c of o.categories) catCounts.set(c, (catCounts.get(c) || 0) + 1);
        if (o.comune) comuni.add(o.comune);
    }

    const categories = [...catCounts.entries()]
        .sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]))
    const categorySelect = document.getElementById("category");
    categorySelect.innerHTML = `<option value="">${esc(cfg.categoryLabel)}</option>` + categories
        .map(([name, count]) => `<option value="${esc(name)}">${esc(name)} (${count})</option>`)
        .join("");
    categorySelect.value = [...s.categories][0] || "";

    const comuneSelect = document.getElementById("comune");
    comuneSelect.innerHTML = '<option value="">Tutti i comuni</option>' + [...comuni].sort(collator.compare)
        .map((name) => `<option value="${esc(name)}">${esc(name)}</option>`)
        .join("");
    comuneSelect.value = s.comune;

    const bookmarkToggle = document.getElementById("only-bookmarks");
    if (bookmarkToggle) {
        bookmarkToggle.checked = !!s.onlyBookmarks;
    }

    document.getElementById("search").value = s.search;
    document.getElementById("sort").innerHTML = SORT_OPTIONS
        .map((option) => `<option value="${option.value}">${option.label}</option>`)
        .join("");
    document.getElementById("sort").value = s.sort;
}

function refreshTypeUI() {
    document.querySelectorAll(".type-tab").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.type === state.activeType);
    });
    buildFilterControls();
    applyFilters();
}

/* ---------- Events ---------- */
function wireEvents() {
    const mobileFiltersBtn = document.getElementById("mobile-filters-btn");
    const filterBar = document.getElementById("filter-bar");
    if (mobileFiltersBtn && filterBar) {
        mobileFiltersBtn.addEventListener("click", () => {
            filterBar.classList.toggle("open");
        });
    }
    const searchInput = document.getElementById("search");
    let t;
    searchInput.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => {
            currentState().search = searchInput.value.trim();
            applyFilters();
        }, 120);
    });

    document.getElementById("sort").addEventListener("change", (e) => {
        currentState().sort = e.target.value;
        applyFilters();
    });

    document.getElementById("comune").addEventListener("change", (e) => {
        currentState().comune = e.target.value;
        applyFilters();
    });

    document.getElementById("category").addEventListener("change", (e) => {
        const s = currentState();
        s.categories.clear();
        if (e.target.value) s.categories.add(e.target.value);
        applyFilters();
    });

    const onlyBookmarksToggle = document.getElementById("only-bookmarks");
    if (onlyBookmarksToggle) {
        onlyBookmarksToggle.addEventListener("change", (e) => {
            currentState().onlyBookmarks = e.target.checked;
            applyFilters();
        });
    }

    document.getElementById("card-grid").addEventListener("click", (e) => {
        const bookmarkBtn = e.target.closest(".bookmark-btn");
        if (bookmarkBtn) {
            const id = bookmarkBtn.dataset.id;
            const isNowBookmarked = Bookmarks.toggle(id);
            bookmarkBtn.classList.toggle("active", isNowBookmarked);
            if (currentState().onlyBookmarks && !isNowBookmarked) {
                applyFilters();
            }
            return;
        }

        const showMoreBtn = e.target.closest(".show-more-btn");
        if (showMoreBtn) {
            const card = showMoreBtn.closest(".card");
            card.classList.toggle("expanded");
            showMoreBtn.innerHTML = card.classList.contains("expanded") ? "Mostra meno &#8963;" : "Mostra tutto &#8964;";
        }
    });

    document.getElementById("clear-filters").addEventListener("click", () => {
        const cfg = currentCfg();
        state[state.activeType] = Object.assign(freshTypeState(cfg), {
            loaded: currentState().loaded,
            error: currentState().error,
            all: currentState().all,
        });
        refreshTypeUI();
    });

    document.getElementById("type-tabs").addEventListener("click", (e) => {
        const btn = e.target.closest(".type-tab");
        if (!btn || btn.dataset.type === state.activeType) return;
        state.activeType = btn.dataset.type;
        refreshTypeUI();
    });

    document.getElementById("download-json").addEventListener("click", () => {
        const s = currentState();
        const data = s.filtered.map(o => o._raw);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `offerte-${state.activeType}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    document.querySelectorAll(".filter-dropdown").forEach((dropdown) => {
        dropdown.addEventListener("toggle", () => {
            if (!dropdown.open) return;
            document.querySelectorAll(".filter-dropdown").forEach((other) => {
                if (other !== dropdown) other.open = false;
            });
        });
    });

}

/* ---------- Boot ---------- */
async function loadType(type) {
    const cfg = TYPE_CONFIGS[type];
    const s = state[type];
    try {
        const res = await fetch(cfg.dataUrl);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        s.all = (Array.isArray(data) ? data : []).map(cfg.normalize);
    } catch (err) {
        console.error(err);
        s.error = "Impossibile caricare i dati (" + cfg.dataUrl +
            "). Servi il progetto con un server locale, ad es. l'estensione Live Server, e apri viewer/index.html da lì.";
    }
    s.loaded = true;
    if (state.activeType === type) refreshTypeUI();
}

async function main() {
    wireEvents();
    refreshTypeUI();

    await Promise.all(Object.keys(TYPE_CONFIGS).map(loadType));

    const hashId = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (hashId) {
        const el = document.getElementById("offer-" + hashId);
        if (el) el.scrollIntoView({ block: "start" });
    }
}

document.addEventListener("DOMContentLoaded", main);
