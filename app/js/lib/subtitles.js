'use strict'

const Subtitles = {
    client: new (require('opensubtitles-api'))({
        useragent: `${Settings.apikeys.opensubtitles} v${PKJSON.version}`
    }),

    search: (opts) => {
        console.info('Looking for subtitles', opts);
        return Subtitles.client.search(opts);
    },
    searchLocal: (filepath) => {
        
    },
    addSubtitle: (sub) => {
        let item = `<div class="sub" id="${sub.id}">`+
            `<div class="data">${JSON.stringify(sub)}</div>`+
            `<div class="sublang">${sub.lang}</div>`+
        `</div>`;

        $('#subtitles .subs').append(item);
    }
}