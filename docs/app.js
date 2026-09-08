"use strict";

/* ---------- Data source ---------- */
// Served from the project root (e.g. Live Server) the JSON sits one level up.
const DATA_URL = "../files/log.json";

const FIELDS = {
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

const collator = new Intl.Collator("it", { sensitivity: "base", numeric: true });

const state = {
    all: [],
    filtered: [],
    search: "",
    sort: "az",
    types: new Set(),
    comune: "",
    onlyNote: false,
    onlyWeb: false,
    onlyEmail: false,
};

/* ---------- Helpers ---------- */
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
    return out.trim();
}

function cleanCompany(s) {
    return fixText(s).replace(/^["'\s]+|["'\s]+$/g, "") || "—";
}

function offerId(url) {
    const m = /[?&]select=(\d+)/.exec(url || "");
    return m ? m[1] : null;
}

function normalize(rec, idx) {
    const url = rec[FIELDS.url] || "";
    const first = fixText(rec[FIELDS.refFirst]);
    const last = fixText(rec[FIELDS.refLast]);
    const o = {
        idx,
        id: offerId(url) || "i" + idx,
        url,
        company: cleanCompany(rec[FIELDS.company]),
        type: fixText(rec[FIELDS.type]),
        description: fixText(rec[FIELDS.description]),
        sectors: fixText(rec[FIELDS.sectors]),
        country: fixText(rec[FIELDS.country]),
        province: fixText(rec[FIELDS.province]),
        comune: fixText(rec[FIELDS.comune]),
        frazione: fixText(rec[FIELDS.frazione]),
        address: fixText(rec[FIELDS.address]),
        cap: fixText(rec[FIELDS.cap]),
        referent: [first, last].filter(Boolean).join(" "),
        phone: fixText(rec[FIELDS.phone]),
        email: fixText(rec[FIELDS.email]),
        web: fixText(rec[FIELDS.web]),
        note: fixText(rec[FIELDS.note]),
    };
    o.haystack = [
        o.company, o.type, o.description, o.sectors,
        o.comune, o.frazione, o.address, o.referent, o.email, o.web, o.note,
    ].join("  ").toLowerCase();
    return o;
}

function webHref(w) {
    if (!w) return "";
    return /^https?:\/\//i.test(w) ? w : "https://" + w.replace(/^\/+/, "");
}

/* ---------- Filtering / sorting ---------- */
function applyFilters() {
    const tokens = state.search.toLowerCase().split(/\s+/).filter(Boolean);

    let list = state.all.filter((o) => {
        if (state.types.size && !state.types.has(o.type)) return false;
        if (state.comune && o.comune !== state.comune) return false;
        if (state.onlyNote && !o.note) return false;
        if (state.onlyWeb && !o.web) return false;
        if (state.onlyEmail && !o.email) return false;
        if (tokens.length && !tokens.every((t) => o.haystack.includes(t))) return false;
        return true;
    });

    list.sort((a, b) => {
        switch (state.sort) {
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

    state.filtered = list;
    renderCards();
}

/* ---------- Rendering ---------- */
function infoRow(label, valueHtml) {
    return valueHtml ? `<dt>${esc(label)}</dt><dd>${valueHtml}</dd>` : "";
}

function section(title, innerHtml) {
    return innerHtml ? `<div class="card-section"><h4>${esc(title)}</h4>${innerHtml}</div>` : "";
}

function cardHTML(o) {
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

function renderCards() {
    const grid = document.getElementById("card-grid");
    const notice = document.getElementById("notice");
    const count = document.getElementById("count");

    const n = state.filtered.length;
    const total = state.all.length;
    count.textContent = n === total
        ? `${total} offerte`
        : `${n} ${n === 1 ? "offerta" : "offerte"} su ${total}`;

    if (!n) {
        grid.innerHTML = "";
        notice.hidden = false;
        notice.textContent = "Nessuna offerta corrisponde ai criteri.";
        return;
    }
    notice.hidden = true;
    grid.innerHTML = state.filtered.map(cardHTML).join("");
}

/* ---------- Filter controls ---------- */
function buildFilterControls() {
    const typeCounts = new Map();
    const comuni = new Set();
    for (const o of state.all) {
        if (o.type) typeCounts.set(o.type, (typeCounts.get(o.type) || 0) + 1);
        if (o.comune) comuni.add(o.comune);
    }

    document.getElementById("tipo-checks").innerHTML = [...typeCounts.entries()]
        .sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]))
        .map(([t, c]) => `<label class="check"><input type="checkbox" value="${esc(t)}"><span>${esc(t)}</span><span class="c">${c}</span></label>`)
        .join("");

    const comuneSel = document.getElementById("comune");
    for (const c of [...comuni].sort(collator.compare)) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        comuneSel.appendChild(opt);
    }
}

function wireEvents() {
    const searchInput = document.getElementById("search");
    let t;
    searchInput.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => {
            state.search = searchInput.value.trim();
            applyFilters();
        }, 120);
    });

    document.getElementById("sort").addEventListener("change", (e) => {
        state.sort = e.target.value;
        applyFilters();
    });

    document.getElementById("comune").addEventListener("change", (e) => {
        state.comune = e.target.value;
        applyFilters();
    });

    document.getElementById("tipo-checks").addEventListener("change", (e) => {
        const cb = e.target;
        if (!cb.matches("input[type=checkbox]")) return;
        if (cb.checked) state.types.add(cb.value);
        else state.types.delete(cb.value);
        applyFilters();
    });

    const toggles = { "f-note": "onlyNote", "f-web": "onlyWeb", "f-email": "onlyEmail" };
    for (const [id, key] of Object.entries(toggles)) {
        document.getElementById(id).addEventListener("change", (e) => {
            state[key] = e.target.checked;
            applyFilters();
        });
    }

    document.getElementById("clear-filters").addEventListener("click", () => {
        state.search = "";
        state.sort = "az";
        state.types.clear();
        state.comune = "";
        state.onlyNote = state.onlyWeb = state.onlyEmail = false;
        searchInput.value = "";
        document.getElementById("sort").value = "az";
        document.getElementById("comune").value = "";
        document.querySelectorAll('#sidebar input[type=checkbox]').forEach((c) => (c.checked = false));
        applyFilters();
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
async function main() {
    const notice = document.getElementById("notice");
    try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        state.all = (Array.isArray(data) ? data : []).map(normalize);
    } catch (err) {
        console.error(err);
        notice.hidden = false;
        notice.textContent = "Impossibile caricare i dati (" + DATA_URL +
            "). Servi il progetto con un server locale, ad es. l'estensione Live Server, e apri viewer/index.html da lì.";
        return;
    }

    buildFilterControls();
    wireEvents();
    applyFilters();

    const hashId = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (hashId) {
        const el = document.getElementById("offer-" + hashId);
        if (el) el.scrollIntoView({ block: "start" });
    }
}

document.addEventListener("DOMContentLoaded", main);
