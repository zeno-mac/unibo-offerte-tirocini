import { esc, escHl, webHref } from './utils.js';
import { Bookmarks } from './bookmarks.js';

export function cardHTMLExtra(o, tokens = []) {
    const isBookmarked = Bookmarks.has(o.id);
    
    const sectorsText = o.sectors.join(" • ");
    const sectors = sectorsText ? `<p class="prose dim card-sectors">${escHl(sectorsText, tokens)}</p>` : "";
    
    const locationStr = [o.comune, o.province && o.province !== o.comune ? o.province : ""].filter(Boolean).join(" - ").toUpperCase();
    
    const metaRowsArray = [
        locationStr && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Località"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>${escHl(locationStr, tokens)}</div>`,
        o.address && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Indirizzo"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>${escHl(o.address, tokens)}</div>`,
        o.referent && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Referente"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>${escHl(o.referent, tokens)}</div>`,
        o.phone && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Telefono"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg><a href="tel:${esc(o.phone)}">${escHl(o.phone, tokens)}</a></div>`,
        o.email && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Email"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg><a href="mailto:${esc(o.email)}">${escHl(o.email, tokens)}</a></div>`,
        o.web && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Sito web"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg><a href="${esc(webHref(o.web))}" target="_blank" rel="noopener">${escHl(o.web, tokens)}</a></div>`
    ].filter(Boolean);
    const metaRows = metaRowsArray.join("");

    let autoExpand = false;
    const fullText = (o.description + "\n\n" + o.note).trim();
    if (tokens.length > 0 && (tokens.some(t => fullText.toLowerCase().includes(t)) || tokens.some(t => sectorsText.toLowerCase().includes(t)))) {
        autoExpand = true;
    }

    return `<article class="card has-more ${autoExpand ? 'expanded' : ''}" id="offer-${esc(o.id)}">
        <div class="card-layout">
            <div class="card-col-left">
                <div class="card-title-wrap">
                    <h3 class="card-title">${escHl(o.company, tokens)}</h3>
                    <button type="button" class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-id="${esc(o.id)}" aria-label="Salva preferito" title="Salva nei preferiti">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" class="icon-outline"/><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" class="icon-filled"/></svg>
                    </button>
                </div>
                ${sectors}
            </div>
            
            <div class="card-col-center">
                <div class="card-desc">
                    <div class="prose">${escHl(o.description, tokens)}</div>
                    ${o.note ? `<div class="card-section-title mt-3">Note</div><div class="prose">${escHl(o.note, tokens)}</div>` : ''}
                </div>
                <div class="show-more-wrap"><button type="button" class="show-more-btn pill-btn">${autoExpand ? 'Mostra meno &#8963;' : 'Mostra tutto &#8964;'}</button></div>
            </div>
            
            <div class="card-col-right">
                <div class="meta-rows">${metaRows}</div>
                ${o.url ? `<a class="details-link" href="${esc(o.url)}" target="_blank" rel="noopener">Apri offerta &nearr;</a>` : ''}
            </div>
        </div>
    </article>`;
}

export function cardHTMLCurricular(o, tokens = []) {
    const isBookmarked = Bookmarks.has(o.id);
    
    const corsiText = o.corsi.join(" • ");
    const sectors = corsiText ? `<p class="prose dim card-sectors">${escHl(corsiText, tokens)}</p>` : "";
    
    const locationStr = [o.comune, o.province && o.province !== o.comune ? o.province : ""].filter(Boolean).join(" - ").toUpperCase();
    
    const metaRowsArray = [
        o.tipoTirocinio && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Tipologia"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>${escHl(o.tipoTirocinio, tokens)}</div>`,
        locationStr && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Località"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>${escHl(locationStr, tokens)}</div>`,
        o.address && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Indirizzo"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>${escHl(o.address, tokens)}</div>`,
        o.tutor && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Tutor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>${escHl(o.tutor, tokens)}</div>`,
        o.numTirocinanti && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Numero tirocinanti"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>${escHl(o.numTirocinanti, tokens)} posti</div>`,
        o.durata && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Durata"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>${escHl(o.durata, tokens)}</div>`,
        o.dataScadenza && `<div class="meta-row"><svg viewBox="0 0 24 24" class="meta-icon" title="Scadenza"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>Scade il ${escHl(o.dataScadenza, tokens)}</div>`
    ].filter(Boolean);
    const metaRows = metaRowsArray.join("");

    let autoExpand = false;
    const fullText = (o.oggetto + "\n" + o.obiettivi + "\n" + o.attivita + "\n" + o.conoscenze + "\n" + o.note).trim();
    if (tokens.length > 0 && (tokens.some(t => fullText.toLowerCase().includes(t)) || tokens.some(t => corsiText.toLowerCase().includes(t)))) {
        autoExpand = true;
    }

    return `<article class="card has-more ${autoExpand ? 'expanded' : ''}" id="offer-${esc(o.id)}">
        <div class="card-layout">
            <div class="card-col-left">
                <div class="card-title-wrap">
                    <h3 class="card-title">${escHl(o.company, tokens)}</h3>
                    <button type="button" class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-id="${esc(o.id)}" aria-label="Salva preferito" title="Salva nei preferiti">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" class="icon-outline"/><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" class="icon-filled"/></svg>
                    </button>
                </div>
                ${sectors}
            </div>
            
            <div class="card-col-center">
                <div class="card-desc">
                    ${o.oggetto ? `<div class="prose">${escHl(o.oggetto, tokens)}</div>` : ''}
                    ${o.obiettivi ? `<div class="card-section-title mt-3">Obiettivi</div><div class="prose">${escHl(o.obiettivi, tokens)}</div>` : ''}
                    ${o.attivita ? `<div class="card-section-title mt-3">Attività</div><div class="prose">${escHl(o.attivita, tokens)}</div>` : ''}
                    ${o.conoscenze ? `<div class="card-section-title mt-3">Conoscenze richieste</div><div class="prose">${escHl(o.conoscenze, tokens)}</div>` : ''}
                    ${o.note ? `<div class="card-section-title mt-3">Note</div><div class="prose">${escHl(o.note, tokens)}</div>` : ''}
                </div>
                <div class="show-more-wrap"><button type="button" class="show-more-btn pill-btn">${autoExpand ? 'Mostra meno &#8963;' : 'Mostra tutto &#8964;'}</button></div>
            </div>
            
            <div class="card-col-right">
                <div class="meta-rows">${metaRows}</div>
                ${o.url ? `<a class="details-link" href="${esc(o.url)}" target="_blank" rel="noopener">Apri offerta &nearr;</a>` : ''}
            </div>
        </div>
    </article>`;
}
