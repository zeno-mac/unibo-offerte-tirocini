export const Bookmarks = {
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
