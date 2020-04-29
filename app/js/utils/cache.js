'use strict';

const Cache = {
    dir: path.join(os.tmpdir(), PKJSON.releaseName),
    create: () => {
        try {
            fs.mkdirSync(Cache.dir);
        } catch (e) {}
    },
    delete: () => {
        try {
            fs.removeSync(Cache.dir);
        } catch (e) {}
    },
    calcSize: () => {
        return new Promise((resolve, reject) => {
            fs.readdir(Cache.dir, (err, files) => {
                let total = 0;
                for (let i = 0; i < files.length; i++) total += fs.statSync(path.join(Cache.dir, files[i])).size;
                resolve(parseFloat(total / 1024 / 1024 / 1024).toFixed(2));
            });
        });
    }
};