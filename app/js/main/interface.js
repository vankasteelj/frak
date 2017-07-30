'use strict';

const Interface = {

    // USERINTERACTION: switch between light/dark themes
    switchTheme: () => {
        // switch stored setting on click
        localStorage.theme = !localStorage || (localStorage && localStorage.theme === 'light') ? 'dark' : 'light';
        // reload to let loadTheme do the job
        win.reload();
    },

    // USERINTERACTION: on "browse" button click, invoke hidden input action
    browse: (type) => {
        console.info('Opening File Browser');
        document.querySelector('#' + type + '-file-path-hidden').click();
    },

    // AUTO: from lib/trakt
    traktLogin: (poll) => {
        Misc.openExternal(poll.verification_url);
        win.focus();
        $('#traktAuth').hide();
        $('#traktCode').val(poll.user_code).show();
    },

    // AUTO: from lib/trakt or boot
    traktConnected: (info) => {
        $('#traktinit').hide();
        $('#traktwelcome').show();

        if (info) {
            //console.log('trakt welcome from db');
            $('#welcomeprofile .welcomemessage').text(i18n.__('Welcome back'));
            $('#welcomeprofile img').attr('src', info.images.avatar.full);
            $('#welcomeprofile .username').text(info.username);
        } else {
            //console.log('trakt welcome from GET profile')
            Trakt.client.users.profile({
                username: 'me',
                extended: 'full'
            }).then(profile => {
                DB.store(profile, 'trakt_profile');
                $('#welcomeprofile .welcomemessage').text(i18n.__('Welcome'));
                $('#welcomeprofile img').attr('src', profile.images.avatar.full);
                $('#welcomeprofile .username').text(profile.username);
            })
        }
        $('#welcomeprofile').show();
        $('#traktwelcome .spinner').show();
    },

    showMain: () => {
        $('#traktwelcome').hide();
        $('#collection').show();
    },

    constructMovieItem: (movie) => {
        let item = `<div class="grid-item col-sm-6" id="${Collection.slugify(movie.title)}">`+
            `<span class="data" style="display:none">${JSON.stringify(movie)}</span>`+
            `<div class="fanart">`+
                `<img class="base" src="images/placeholder.png">`+
                `<img class="real" src="${Images.reduce(movie.images.fanart)}">`+
                `<div class="shadow"></div>`+
                `<div class="titles">`+
                    `<h3>${movie.title}<span class="year">${movie.year}</span></h3>`+
                `</div>`+
            `</div>`+
            `<div class="quick-icons">`+
                `<div class="actions">`+
                    `seen | play | trailer`+
                `</div>`+
                `<div class="metadata">`+
                    `ratings`+
                `</div>`+
            `</div>`+
        `</div>`

        return item;
    },
    constructShowItem: (show) => {
        let item = `<div class="grid-item col-sm-6" id="${Collection.slugify(show.show.title)}">`+
            `<span class="data" style="display:none">${JSON.stringify(show)}</span>`+
            `<div class="fanart">`+
                `<img class="base" src="images/placeholder.png">`+
                `<img class="real" src="${Images.reduce(show.show.images.fanart)}">`+
                `<div class="shadow"></div>`+
                `<div class="titles">`+
                    `<h4>`+
                        `<span class="sxe">s${Collection.pad(show.next_episode.season)}e${Collection.pad(show.next_episode.number)}</span>`+
                        `<span class="eptitle">${show.next_episode.title}</span>`+
                    `</h4><br/>`+
                    `<h3>${show.show.title}<span class="year">${show.show.year}</span></h3>`+
                `</div>`+
            `</div>`+
            `<div class="quick-icons">`+
                `<div class="actions">`+
                    `seen | play | trailer`+
                `</div>`+
                `<div class="metadata">`+
                    `ratings`+
                `</div>`+
            `</div>`+
        `</div>`

        return item;
    },

    showMovies: () => {
        $('#collection #movies').show();
        $('#collection #shows').hide();
        $('#collection #locals').hide();
        window.scrollTo(0,0);
    },
    showShows: () => {
        $('#collection #shows').show();
        $('#collection #movies').hide();
        $('#collection #locals').hide();
        window.scrollTo(0,0);
    },
    showLocals: () => {
        $('#collection #locals').show();
        $('#collection #shows').hide();
        $('#collection #movies').hide();
        window.scrollTo(0,0);
    }
};