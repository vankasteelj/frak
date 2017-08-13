'use strict';

const Cache = {
    dir: path.join(require('os').tmpDir(), PKJSON.releaseName),
    create: () => {
        try {
            fs.mkdirSync(Cache.dir);
        } catch(e) {}
    },
    delete: () => {
        try {
            fs.removeSync(Cache.dir);
        } catch(e) {}
    }
}
