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
    const badges = [o.type, o.comune]
        .filter(Boolean)
        .map((b) => `<span class="badge">${esc(b)}</span>`)
        .join("");

    const addr = [
        o.address,
        o.frazione && "fraz. " + o.frazione,
        [o.cap, o.comune].filter(Boolean).join(" "),
        o.province && o.province !== o.comune ? "(" + o.province + ")" : "",
        o.country,
    ].filter(Boolean).join(", ");

    const mapsQuery = encodeURIComponent([o.address, o.cap, o.comune, o.province, o.country].filter(Boolean).join(", "));

    const actions = [
        o.url && `<a class="action primary" href="${esc(o.url)}" target="_blank" rel="noopener">Apri offerta ↗</a>`,
        o.web && `<a class="action" href="${esc(webHref(o.web))}" target="_blank" rel="noopener">Sito web ↗</a>`,
        addr && `<a class="action" href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" target="_blank" rel="noopener">Mappa ↗</a>`,
    ].filter(Boolean).join("");

    const contactRows = [
        infoRow("Referente", o.referent && esc(o.referent)),
        infoRow("Telefono", o.phone && `<a href="tel:${esc(o.phone.replace(/\s+/g, ""))}">${esc(o.phone)}</a>`),
        infoRow("Email", o.email && `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>`),
        infoRow("Sito web", o.web && `<a href="${esc(webHref(o.web))}" target="_blank" rel="noopener">${esc(o.web)}</a>`),
        infoRow("Indirizzo", addr && esc(addr)),
    ].join("");

    return `<article class="card" id="offer-${esc(o.id)}">
        <h3 class="card-title">${esc(o.company)}</h3>
        <div class="badges">${badges}</div>
        ${actions ? `<div class="actions">${actions}</div>` : ""}
        ${section("Descrizione", o.description && `<p class="prose">${esc(o.description)}</p>`)}
        ${section("Note sul tirocinio", o.note && `<p class="prose">${esc(o.note)}</p>`)}
        ${section("Contatti", contactRows && `<dl class="info">${contactRows}</dl>`)}
        ${section("Settori di attività", o.sectors && `<p class="prose dim">${esc(o.sectors)}</p>`)}
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

// "Corsi:" is a run of "( id ) NOME CORSO - AREA" chunks with no separator;
// pull out the distinct course names.
function parseCorsi(s) {
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
    const corsiRaw = fixText(r[CURR_FIELDS.corsi]);
    const o = {
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
    const badges = [...o.cycles, o.tipoTirocinio, o.comune]
        .filter(Boolean)
        .map((b) => `<span class="badge">${esc(b)}</span>`)
        .join("");

    const addr = [
        o.address,
        [o.comune].filter(Boolean).join(" "),
        o.province && o.province !== o.comune ? "(" + o.province + ")" : "",
        o.country,
    ].filter(Boolean).join(", ");

    const mapsQuery = encodeURIComponent([o.address, o.comune, o.province, o.country].filter(Boolean).join(", "));

    const actions = [
        o.url && `<a class="action primary" href="${esc(o.url)}" target="_blank" rel="noopener">Apri offerta ↗</a>`,
        addr && `<a class="action" href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" target="_blank" rel="noopener">Mappa ↗</a>`,
    ].filter(Boolean).join("");

    const descriptionParts = [
        o.oggetto && `<p class="prose">${esc(o.oggetto)}</p>`,
        o.obiettivi && `<p class="prose dim">${esc(o.obiettivi)}</p>`,
        o.attivita && `<p class="prose dim">${esc(o.attivita)}</p>`,
    ].filter(Boolean).join("");

    const requisiti = [
        infoRow("Conoscenze/abilità", o.conoscenze && esc(o.conoscenze)),
        infoRow("Lingue richieste", o.linguistiche && esc(o.linguistiche)),
        infoRow("Informatica richiesta", o.informatiche && esc(o.informatiche)),
    ].join("");

    const dettagli = [
        infoRow("Durata", o.durata && esc(o.durata)),
        infoRow("Tirocinanti", o.numTirocinanti && esc(o.numTirocinanti)),
        infoRow("Inizio previsto", o.dataInizio && esc(o.dataInizio)),
        infoRow("Fine prevista", o.dataFine && esc(o.dataFine)),
        infoRow("Indennità/borsa", o.indennita && esc(o.indennita)),
        infoRow("Scadenza domanda", o.dataScadenza && esc(o.dataScadenza)),
        infoRow("Struttura", o.struttura && esc(o.struttura)),
    ].join("");

    const contactRows = [
        infoRow("Tutor", o.tutor && esc(o.tutor)),
        infoRow("Ruolo tutor", o.tutorRuolo && esc(o.tutorRuolo)),
        infoRow("Indirizzo", addr && esc(addr)),
    ].join("");

    const corsiBadges = o.corsi.map((c) => `<span class="badge">${esc(c)}</span>`).join("");

    return `<article class="card" id="offer-${esc(o.id)}">
        <h3 class="card-title">${esc(o.company)}</h3>
        <div class="badges">${badges}</div>
        ${actions ? `<div class="actions">${actions}</div>` : ""}
        ${section("Descrizione", descriptionParts)}
        ${section("Note sul tirocinio", o.note && `<p class="prose">${esc(o.note)}</p>`)}
        ${section("Requisiti", requisiti && `<dl class="info">${requisiti}</dl>`)}
        ${section("Dettagli tirocinio", dettagli && `<dl class="info">${dettagli}</dl>`)}
        ${section("Contatti", contactRows && `<dl class="info">${contactRows}</dl>`)}
        ${section("Corsi di laurea", corsiBadges && `<div class="badges">${corsiBadges}</div>`)}
    </article>`;
}

/* ================= Type registry & shared state ================= */
const TYPE_CONFIGS = {
    extracurricular: {
        label: "Extracurriculari",
        dataUrl: RAW_BASE + "extracurricular_internship_log.json",
        normalize: normalizeExtra,
        cardHTML: cardHTMLExtra,
        categoryLabel: "Tipo azienda/ente",
        otherFilters: [
            { key: "onlyNote", label: "Solo con note", test: (o) => !!o.note },
            { key: "onlyWeb", label: "Solo con sito web", test: (o) => !!o.web },
            { key: "onlyEmail", label: "Solo con email", test: (o) => !!o.email },
        ],
    },
    curricular: {
        label: "Curriculari",
        dataUrl: RAW_BASE + "curricular_internship_log.json",
        normalize: normalizeCurricular,
        cardHTML: cardHTMLCurricular,
        categoryLabel: "Corso di laurea",
        otherFilters: [
            { key: "onlyTriennale", label: "Solo laurea triennale", test: (o) => o.cycles.some((c) => /triennal/i.test(c)) },
            { key: "onlyMagistrale", label: "Solo laurea magistrale", test: (o) => o.cycles.some((c) => /magistral/i.test(c)) },
            { key: "onlyNote", label: "Solo con note", test: (o) => !!o.note },
            { key: "onlyIndennita", label: "Solo con indennità/borsa", test: (o) => o.indennitaBool },
        ],
    },
};

function freshTypeState(cfg) {
    const other = {};
    for (const f of cfg.otherFilters) other[f.key] = false;
    return {
        loaded: false,
        error: null,
        all: [],
        filtered: [],
        search: "",
        sort: "az",
        categories: new Set(),
        comune: "",
        other,
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
        for (const f of cfg.otherFilters) {
            if (s.other[f.key] && !f.test(o)) return false;
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

    document.getElementById("category-label").textContent = cfg.categoryLabel;

    const catCounts = new Map();
    const comuni = new Set();
    for (const o of s.all) {
        for (const c of o.categories) catCounts.set(c, (catCounts.get(c) || 0) + 1);
        if (o.comune) comuni.add(o.comune);
    }

    document.getElementById("category-checks").innerHTML = [...catCounts.entries()]
        .sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]))
        .map(([t, c]) => `<label class="check"><input type="checkbox" value="${esc(t)}" ${s.categories.has(t) ? "checked" : ""}><span>${esc(t)}</span><span class="c">${c}</span></label>`)
        .join("");

    const comuneSel = document.getElementById("comune");
    comuneSel.innerHTML = '<option value="">Tutti i comuni</option>';
    for (const c of [...comuni].sort(collator.compare)) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        comuneSel.appendChild(opt);
    }
    comuneSel.value = s.comune;

    document.getElementById("other-checks").innerHTML = cfg.otherFilters
        .map((f) => `<label class="check"><input type="checkbox" data-key="${esc(f.key)}" ${s.other[f.key] ? "checked" : ""}> <span>${esc(f.label)}</span></label>`)
        .join("");

    document.getElementById("search").value = s.search;
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

    document.getElementById("category-checks").addEventListener("change", (e) => {
        const cb = e.target;
        if (!cb.matches("input[type=checkbox]")) return;
        const s = currentState();
        if (cb.checked) s.categories.add(cb.value);
        else s.categories.delete(cb.value);
        applyFilters();
    });

    document.getElementById("other-checks").addEventListener("change", (e) => {
        const cb = e.target;
        if (!cb.matches("input[type=checkbox]")) return;
        currentState().other[cb.dataset.key] = cb.checked;
        applyFilters();
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
        document.body.classList.remove("filters-open");
    });

    document.getElementById("toggle-filters").addEventListener("click", () => {
        document.body.classList.toggle("filters-open");
    });
    document.getElementById("scrim").addEventListener("click", () => {
        document.body.classList.remove("filters-open");
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") document.body.classList.remove("filters-open");
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
