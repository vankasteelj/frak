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
    }
}
