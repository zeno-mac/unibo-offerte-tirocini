import { normalizeExtra, normalizeCurricular } from './parsers.js';
import { cardHTMLExtra, cardHTMLCurricular } from './components.js';
import { Bookmarks } from './bookmarks.js';
import { collator } from './utils.js';

export const RAW_BASE = "../data/";

export const TYPE_CONFIGS = {
    extracurricular: {
        label: "Extracurriculari",
        dataUrl: RAW_BASE + "extracurricular_internship_log.json",
        normalize: normalizeExtra,
        cardHTML: cardHTMLExtra,
        categoryLabel: "Tutti i settori",
    },
    curricular: {
        label: "Curriculari",
        dataUrl: RAW_BASE + "curricular_internship_log.json",
        normalize: normalizeCurricular,
        cardHTML: cardHTMLCurricular,
        categoryLabel: "Tutti i corsi",
    },
};

export const SORT_OPTIONS = [
    { value: "az", label: "Azienda (A → Z)" },
    { value: "za", label: "Azienda (Z → A)" },
    { value: "comune", label: "Comune (A → Z)" },
    { value: "recent", label: "Più recenti" },
];

export function freshTypeState() {
    return {
        loaded: false,
        error: null,
        all: [],
        filtered: [],
        search: "",
        sort: "az",
        categories: new Set(),
        comune: "",
        onlyBookmarks: false,
    };
}

export const state = {
    activeType: "extracurricular",
    layout: localStorage.getItem('offerte_layout') || "list",
    extracurricular: freshTypeState(),
    curricular: freshTypeState(),
};

export function currentCfg() {
    return TYPE_CONFIGS[state.activeType];
}

export function currentState() {
    return state[state.activeType];
}

export function filterData() {
    const s = currentState();
    const tokens = s.search.toLowerCase().split(/\s+/).filter(Boolean);

    let list = s.all.filter((o) => {
        if (s.categories.size && !o.categories.some((c) => s.categories.has(c))) return false;
        if (s.comune && o.comune !== s.comune) return false;
        if (s.onlyBookmarks && !Bookmarks.has(o.id)) return false;
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
    return tokens;
}
