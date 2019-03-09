'use strict'

const DB = {
    store: (data, key) => {
        if (typeof data !== 'string') data = JSON.stringify(data);
        localStorage[key] = data;
        return true;
    },
    get: (key) => {
        let data = localStorage[key];
        try {
            data = JSON.parse(data)
        } catch (e) {}

        return data;
    },
    reset: () => {
        localStorage.clear();
        IB.reset();
        Cache.delete();
        win.reload();
    }
}
