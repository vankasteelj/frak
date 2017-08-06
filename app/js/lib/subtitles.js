'use strict'

const Subtitles = {
    client: new (require('opensubtitles-api'))({
        useragent: 'OSTestUserAgentTemp' //todo: use own
    }),

    search: (opts) => {
        console.info('Looking for subtitles');
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