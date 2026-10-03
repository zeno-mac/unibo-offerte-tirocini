import { TYPE_CONFIGS, state } from './state.js';
import { wireEvents, refreshTypeUI } from './ui.js';

async function loadType(type) {
    const cfg = TYPE_CONFIGS[type];
    const s = state[type];
    try {
        const res = await fetch(cfg.dataUrl);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        s.all = (Array.isArray(data) ? data : []).map((rec, i) => cfg.normalize(rec, i));
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
