'use strict'

const Subtitles = {
    client: new (require('opensubtitles-api'))({
        useragent: `${Settings.apikeys.opensubtitles} v${PKJSON.version}`
    }),

    getData: (elm) => {
        // extract json from data div
        let id = $(elm).context.id;
        let data = JSON.parse($(`#${id} .data`).text());

        return data;
    },

    search: (opts) => {
        console.info('Looking for subtitles', opts);
        return Subtitles.client.search(opts);
    },

    addSubtitle: (sub) => {
        let item = `<div class="sub tooltipped i18n" title="${i18n.__('Load this subtitle')}" id="${sub.id}" onClick="Subtitles.select(this)">`+
            `<div class="data">${JSON.stringify(sub)}</div>`+
            `<div class="sublang">${Localization.nativeNames[sub.langcode] || sub.lang}</div>`+
        `</div>`;

        $('#subtitles .subs').append(item);
    },
    select: (elm) => {
        let sub = Subtitles.getData(elm);
        let id = sub.id;

        let subtitle = path.join(Cache.dir, sub.filename);

        let selectSubtitle = () => {
            Player.mpv.addSubtitles(subtitle, 'cached', sub.filename, sub.langcode);
            $('#subtitles .sub').removeClass('active');
            $(`#${id}`).addClass('active');

            console.info('Subtitle selected:', sub.langcode);
        }

        if (fs.existsSync(subtitle)) {
            selectSubtitle();
        } else {
            got.stream(sub.url).pipe(fs.createWriteStream(subtitle)).on('finish', selectSubtitle);
        }
    }
}