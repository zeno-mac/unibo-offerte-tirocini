import { fixText, cleanCompany, offerId, keyedRecord } from './utils.js';

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

function parseSectors(s) {
    if (!s) return [];
    const parts = String(s).split(/\s+(?=[A-ZÀ-Ú])/);
    const merged = [];
    for (const part of parts) {
        const p = part.trim();
        if (!p) continue;
        if (/^(Industriale|Residenziale|Commerciale|Istituti)/.test(p) && merged.length > 0) {
            merged[merged.length - 1] += " " + p;
        } else {
            merged.push(p);
        }
    }
    return merged;
}

export function normalizeExtra(rec, idx) {
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
        sectors: parseSectors(fixText(r[EXTRA_FIELDS.sectors])),
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
    o.categories = o.sectors;
    o.haystack = [
        o.company, o.type, o.description, o.sectors.join(" "),
        o.comune, o.frazione, o.address, o.referent, o.email, o.web, o.note,
    ].join("  ").toLowerCase();
    return o;
}

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

export function normalizeCurricular(rec, idx) {
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
        durata: fixText(r[CURR_FIELDS.durata]) === "(Ore)" ? "" : fixText(r[CURR_FIELDS.durata]),
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
