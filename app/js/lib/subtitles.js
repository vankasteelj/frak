'use strict';

const Subtitles = {
    client: new(require('opensubtitles-api'))({
        useragent: `${Settings.apikeys.opensubtitles} v${PKJSON.version}`
    }),

    getData: (elm) => {
        // extract json from data div
        let id = $(elm).context.id;
        let data = JSON.parse($(`#${id}`).find('.data').text());

        return data;
    },

    search: (opts) => {
        console.info('Looking for subtitles', opts);
        return Subtitles.client.search(opts);
    },

    addSubtitles: (subs, lang) => {
        let language = `<div class="sublanguage tooltipped i18n" title="${i18n.__('Select this language')}">` +
                `<div class="sublang" onClick="Subtitles.expand('${lang}')">${Localization.nativeNames[lang] || subs[0].lang}</div>` +
                `<div class="sublangmenu" id="sub-${lang}"></div>` +
            `</div>`;

        $('#subtitles .subs').append(language);

        for (let n in subs) {
            let id = subs[n].id;
            if ($(`#${id}`)[0]) continue;

            let subtitle = `<div class="sub tooltipped i18n" title="${i18n.__('Load this subtitle')}" id="${id}" onClick="Subtitles.select(this)">` +
                    `<div class="data">${JSON.stringify(subs[n])}</div>` +
                    `<div class="subname">${subs[n].filename}</div>` +
                `</div>`;
            $(`#sub-${lang}`).append(subtitle);

            if (document.getElementById(id).offsetWidth < document.getElementById(id).scrollWidth) {
                $(`#${id}`).addClass('scrolltext');
            }
        }

        $('.sublangmenu').hide();
    },
    expand: (lang) => {
        let $elm = $(`#sub-${lang}`);
        $elm.is(':visible') ? $elm.hide() : $elm.show();
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
        };

        if (fs.existsSync(subtitle)) {
            selectSubtitle();
        } else {
            got.stream(sub.url).pipe(fs.createWriteStream(subtitle)).on('finish', selectSubtitle);
        }
    },
    defaultLanguage: () => {
        const langs = require('langs');
        const available = langs.all();
        let defaultsublocale = DB.get('defaultsublocale');

        for (let i in available) {
            // insert element in dropdown
            let native = available[i].local;
            let lang2B = available[i]['2B'];
            let lang1 = available[i]['1'];
            $('#sub-language').append('<option value="' + lang2B + '">' + native + '</option>');

            // select if active
            if (defaultsublocale == lang2B) {
                $('#sub-language').val(lang2B);
            }
        }
        
        if (!defaultsublocale) {
            let lang2B = langs.where('1', i18n.getLocale())['2B'];
            $('#sub-language').val(lang2B);
            DB.store(lang2B, 'defaultsublocale');
        }

        // on dropdown click, change lang
        $('#sub-language').on('change', (e) => {
            // store new lang
            DB.store(e.target.value, 'defaultsublocale');
            // reload to use new lang
            Player.setMPV();
        });
    },
    opensubLogin: (username, password) => {
        if (!username) username = $('#opensub_login').val();
        if (!password) password = crypt.createHash('MD5').update($('#opensub_password').val()).digest('hex');

        if (!username || password === 'd41d8cd98f00b204e9800998ecf8427e') {
            console.error('You need a username & password to log in to Opensubtitles.org');
            Notify.snack('You need a username & password to log in to Opensubtitles.org');
            return;
        }

        Subtitles.client = new(require('opensubtitles-api'))({
            useragent: `${Settings.apikeys.opensubtitles} v${PKJSON.version}`,
            username: username,
            password: password
        });

        Subtitles.client.login().then((res) => {
            DB.store(username, 'os_username');
            DB.store(password, 'os_password');
            Subtitles.opensubLogged(res);
        }).catch((err) => {
            console.error('Opensubtitles.org login error', err);
            const display_err = (err.message === '401 Unauthorized') ? i18n.__('Wrong username or password') : (err.message || err);
            Notify.snack(display_err);
        });
    },
    opensubLogged: (res) => {
        $('#oslogin').hide();
        $('#oslogout').show();
        $('#oslogout .username').text(res.userinfo.UserNickName);
        console.info('Logged in Opensubtitles.org');
    },
    opensubLogout: () => {
        DB.remove('os_username');
        DB.remove('os_password');
        Subtitles.client = new(require('opensubtitles-api'))({
            useragent: `${Settings.apikeys.opensubtitles} v${PKJSON.version}`
        });

        $('#oslogout .username').text('');
        $('#opensub_login').val('');
        $('#opensub_password').val('');

        $('#oslogout').hide();
        $('#oslogin').show();
        console.info('Logged out of Opensubtitles.org');
    },
    opensubReLogin: () => {
        const username = DB.get('os_username');
        const password = DB.get('os_password');
        if (!username || !password) return;

        Subtitles.opensubLogin(username, password);
    }
};