import { state, currentCfg, currentState, filterData, SORT_OPTIONS, freshTypeState } from './state.js';
import { Bookmarks } from './bookmarks.js';
import { collator, esc } from './utils.js';

export function applyFiltersAndRender() {
    const tokens = filterData();
    renderCards(tokens);
}

export function renderCards(tokens = []) {
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
    grid.innerHTML = s.filtered.map(o => cfg.cardHTML(o, tokens)).join("");

    const cards = grid.querySelectorAll('.card.has-more');
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const wasExpanded = card.classList.contains('expanded');
        if (wasExpanded) card.classList.remove('expanded');
        
        const desc = card.querySelector('.card-desc');
        const sectors = card.querySelector('.card-sectors');
        const metaRows = card.querySelector('.meta-rows');
        
        let isOverflowing = false;
        if (desc && desc.scrollHeight > desc.clientHeight + 2) isOverflowing = true;
        if (sectors && sectors.scrollHeight > sectors.clientHeight + 2) isOverflowing = true;
        if (metaRows && metaRows.scrollHeight > metaRows.clientHeight + 2) isOverflowing = true;
        
        if (!isOverflowing) {
            card.classList.remove('has-more');
            const btn = card.querySelector('.show-more-wrap');
            if (btn) btn.style.display = 'none';
        } else if (wasExpanded) {
            card.classList.add('expanded');
        }
    }
    
    fillGridGaps();
}

export function fillGridGaps() {
    if (state.layout !== 'grid') {
        document.querySelectorAll('.card-desc').forEach(desc => {
            desc.style.maxHeight = '';
            desc.style.maskImage = '';
            desc.style.webkitMaskImage = '';
        });
        document.querySelectorAll('.card.dynamically-fits').forEach(c => c.classList.remove('dynamically-fits'));
        return;
    }
    
    const expandedCards = document.querySelectorAll('#card-grid .card.expanded');
    expandedCards.forEach(card => {
        const desc = card.querySelector('.card-desc');
        if (desc) {
            desc.style.maxHeight = '';
            desc.style.maskImage = '';
            desc.style.webkitMaskImage = '';
        }
        card.classList.remove('dynamically-fits');
    });

    const collapsedCards = document.querySelectorAll('#card-grid .card:not(.expanded)');
    collapsedCards.forEach(card => {
        const desc = card.querySelector('.card-desc');
        if (desc) {
            desc.style.maxHeight = '200px';
            desc.style.maskImage = '';
            desc.style.webkitMaskImage = '';
        }
        card.classList.remove('dynamically-fits');
    });
    
    document.body.offsetHeight; // Force layout
    
    collapsedCards.forEach(card => {
        if (!card.classList.contains('has-more')) return;
        
        const center = card.querySelector('.card-col-center');
        const desc = card.querySelector('.card-desc');
        const showMoreWrap = card.querySelector('.show-more-wrap');
        
        if (center && desc && showMoreWrap) {
            const availableHeight = center.clientHeight - showMoreWrap.offsetHeight;
            
            if (availableHeight > 200) {
                desc.style.maxHeight = availableHeight + 'px';
                desc.style.maskImage = `linear-gradient(to bottom, black ${availableHeight - 50}px, transparent ${availableHeight}px)`;
                desc.style.webkitMaskImage = `linear-gradient(to bottom, black ${availableHeight - 50}px, transparent ${availableHeight}px)`;
                
                const isDescOverflowing = desc.scrollHeight > availableHeight + 2;
                const sectors = card.querySelector('.card-sectors');
                const metaRows = card.querySelector('.meta-rows');
                const isSectorsOverflowing = sectors && sectors.scrollHeight > sectors.clientHeight + 2;
                const isMetaOverflowing = metaRows && metaRows.scrollHeight > metaRows.clientHeight + 2;
                
                if (!isDescOverflowing && !isSectorsOverflowing && !isMetaOverflowing) {
                    card.classList.add('dynamically-fits');
                    desc.style.maxHeight = center.clientHeight + 'px';
                }
            }
        }
    });
}

export function buildFilterControls() {
    const cfg = currentCfg();
    const s = currentState();

    const catCounts = new Map();
    const comuni = new Set();
    for (const o of s.all) {
        for (const c of o.categories) catCounts.set(c, (catCounts.get(c) || 0) + 1);
        if (o.comune) comuni.add(o.comune);
    }

    const categories = [...catCounts.entries()]
        .sort((a, b) => b[1] - a[1] || collator.compare(a[0], b[0]));
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

export function refreshTypeUI() {
    document.querySelectorAll(".type-tab").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.type === state.activeType);
    });
    buildFilterControls();
    applyFiltersAndRender();
}

export function wireEvents() {
    const layoutBtns = document.querySelectorAll(".layout-btn");
    const cardGrid = document.getElementById("card-grid");

    function updateLayout(layout) {
        state.layout = layout;
        localStorage.setItem('offerte_layout', layout);
        layoutBtns.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.layout === layout);
        });
        if (layout === "grid") {
            cardGrid.classList.add("is-grid");
        } else {
            cardGrid.classList.remove("is-grid");
        }
        if (currentState().loaded) {
            applyFiltersAndRender();
        }
    }

    if (layoutBtns.length > 0) {
        updateLayout(state.layout);
        layoutBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                if (state.layout !== btn.dataset.layout) {
                    updateLayout(btn.dataset.layout);
                }
            });
        });
    }

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
            applyFiltersAndRender();
        }, 120);
    });

    document.getElementById("sort").addEventListener("change", (e) => {
        currentState().sort = e.target.value;
        applyFiltersAndRender();
    });

    document.getElementById("comune").addEventListener("change", (e) => {
        currentState().comune = e.target.value;
        applyFiltersAndRender();
    });

    document.getElementById("category").addEventListener("change", (e) => {
        const s = currentState();
        s.categories.clear();
        if (e.target.value) s.categories.add(e.target.value);
        applyFiltersAndRender();
    });

    const onlyBookmarksToggle = document.getElementById("only-bookmarks");
    if (onlyBookmarksToggle) {
        onlyBookmarksToggle.addEventListener("change", (e) => {
            currentState().onlyBookmarks = e.target.checked;
            applyFiltersAndRender();
        });
    }

    document.getElementById("card-grid").addEventListener("click", (e) => {
        const bookmarkBtn = e.target.closest(".bookmark-btn");
        if (bookmarkBtn) {
            const id = bookmarkBtn.dataset.id;
            const isNowBookmarked = Bookmarks.toggle(id);
            bookmarkBtn.classList.toggle("active", isNowBookmarked);
            if (currentState().onlyBookmarks && !isNowBookmarked) {
                applyFiltersAndRender();
            }
            return;
        }

        const showMoreBtn = e.target.closest(".show-more-btn");
        if (showMoreBtn) {
            const card = showMoreBtn.closest(".card");
            const isExpanding = !card.classList.contains("expanded");
            
            if (isExpanding && state.layout === "grid") {
                const otherExpanded = document.querySelectorAll("#card-grid .card.expanded");
                otherExpanded.forEach(c => {
                    if (c !== card) {
                        c.classList.remove("expanded");
                        const btn = c.querySelector(".show-more-btn");
                        if (btn) btn.innerHTML = "Mostra tutto &#8964;";
                    }
                });
            }

            card.classList.toggle("expanded");
            showMoreBtn.innerHTML = card.classList.contains("expanded") ? "Mostra meno &#8963;" : "Mostra tutto &#8964;";
            
            if (state.layout === "grid") {
                requestAnimationFrame(() => fillGridGaps());
            }
        }
    });

    document.getElementById("clear-filters").addEventListener("click", () => {
        state[state.activeType] = Object.assign(freshTypeState(), {
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

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (state.layout === "grid") fillGridGaps();
        }, 100);
    });
}
