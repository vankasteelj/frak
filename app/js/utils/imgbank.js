'use strict'

const IB = {
    _load: () => {
        let db = localStorage['imgBank'];
        if (db) {
            db = JSON.parse(db);
        } else {
            db = {};
        }
        return db;
    },
    _save: (db) => {
        localStorage['imgBank'] = JSON.stringify(db);
        return true;
    },

    store: (urls, ids) => {
        let id = ids.imdb;
        let db = IB._load();

        if (!db[id]) db[id] = {};
        if (urls.poster) db[id].poster = urls.poster;
        if (urls.fanart) db[id].fanart = urls.fanart;

        db[id].ttl = Date.now();

        return IB._save(db);
    },
    get: (ids) => {
        if (!ids) return {};

        let id = ids.imdb;
        let db = IB._load();

        if (db[id] && Date.now() - db[id].ttl > 15 * 24 * 60 * 60 * 1000) {
            return {}; // invalidate cache every 15 days
        }
        if (db[id] && (!db[id].poster || !db[id].fanart)) {
            return {}; // only return full objects
        }

        return db[id] || {};
    },
    remove: (ids) => {
        let id = ids.imdb;
        let db = IB._load();
        if (db[id]) delete db[id];

        return IB._save(db);
    }
}
