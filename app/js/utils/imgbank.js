'use strict'

const IB = {
    dir: path.join(process.env.LOCALAPPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + "/.cache"), PKJSON.name, 'ImagesBank'),
    create: () => {
        try {
            fs.mkdirSync(IB.dir);
        } catch (e) {}
        try {
            IB.clean();
        } catch (e) {}
    },
    reset: () => {
        try {
            fs.removeSync(IB.dir);
        } catch(e) {}
    },
    calcSize: () => {
        return new Promise((resolve, reject) => {
            fs.readdir(IB.dir, (err, files) => {
                let total = 0;
                for (let i = 0; i < files.length; i++) total += fs.statSync(path.join(IB.dir, files[i])).size
                resolve(parseInt(total / 1024 / 1024));
            });
        });
    },
    clean: () => {
        let db = IB._load();
        let c = 0;
        for (let id in db) {
            if (Date.now() - db[id].ttl > 15 * 24 * 60 * 60 * 1000) c++ && IB.remove({
                imdb: id
            });
        }
        c && console.log('IB.clean: %d images were outdated', c);
    },

    _load: () => {
        let db = DB.get('imgBank');
        if (!db) db = {};
        return db;
    },
    _save: (db) => {
        DB.store(db, 'imgBank');
        return true;
    },

    store: (urls, ids) => {
        let id = ids.imdb;
        let db = IB._load();

        if (!db[id]) db[id] = {};
        if (urls.poster) {
            db[id].poster = urls.poster;
            Misc.downloadImage(urls.poster, path.join(IB.dir, id + 'p'));
        }
        if (urls.fanart) {
            db[id].fanart = urls.fanart;
            Misc.downloadImage(urls.fanart, path.join(IB.dir, id + 'f'));
        }

        db[id].ttl = Date.now();

        return IB._save(db);
    },
    get: (ids) => {
        if (!ids) return {};

        let id = ids.imdb;
        let db = IB._load();

        // invalidate cache every 15 days
        if (db[id] && Date.now() - db[id].ttl > 15 * 24 * 60 * 60 * 1000) {
            IB.remove(ids);
            return {};
        }
        // only return full objects
        if (db[id] && (!db[id].poster || !db[id].fanart)) {
            return {};
        }
        // locally cached
        if (db[id] && (
                fs.existsSync(path.join(IB.dir, id + 'p')) &&
                fs.existsSync(path.join(IB.dir, id + 'f'))
            )) {
            return {
                poster: 'file:///' + path.join(IB.dir, id + 'p').replace(/\\/g, '/'),
                fanart: 'file:///' + path.join(IB.dir, id + 'f').replace(/\\/g, '/')
            };
        }

        return db[id] || {};
    },
    remove: (ids) => {
        let id = ids.imdb;
        let db = IB._load();
        if (db[id]) {
            try {
                fs.unlinkSync(path.join(IB.dir, id + 'p'));
            } catch (e) {}
            try {
                fs.unlinkSync(path.join(IB.dir, id + 'f'));
            } catch (e) {}
            delete db[id];
        }

        return IB._save(db);
    }
}
