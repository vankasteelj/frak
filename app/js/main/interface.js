'use strict';

const Interface = {
    // USERINTERACTION: on "browse" button click, invoke hidden input action
    browse: (type) => {
        console.info('Opening File Browser');
        document.querySelector('#' + type + '-file-path-hidden').click();
    },

    // AUTO: from lib/trakt
    traktLogin: (poll) => {
        Misc.openExternal(poll.verification_url);
        Interface.focus(true);
        $('#traktAuth, #traktinit a').hide();
        $('#traktinit p').text(i18n.__('Enter the code below in your browser'));
        $('#traktCode').val(poll.user_code).show();
        gui.Clipboard.get().set(poll.user_code); //ctrl+v easy hack
    },

    // AUTO: from lib/trakt or boot
    traktConnected: (info) => {
        $('#traktinit').hide();
        $('#init').show();
        $('#traktwelcome').show();

        if (info) {
            // we already have a profile
            $('#welcomeprofile .welcomemessage').text(i18n.__('Welcome back'));
            $('#welcomeprofile img').attr('src', info.images.avatar.full);
            $('#welcomeprofile .username').text(info.username);
        } else {
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

    // AUTO: from welcome page
    requireMPV: () => {
        $('#traktwelcome').hide();
        $('#requirempv').show();
    },

    focus: (force) => {
        force && win.setAlwaysOnTop(true);
        win.focus(true);
        force && win.setAlwaysOnTop(false);
    },

    // AUTO: from welcome page
    showMain: () => {
        $('#traktwelcome').hide();
        $('#requirempv').hide();
        !$('#details').is(':visible') && $('#collection').show();
        $('#navbar').show();
    },

    // USER INTERACTION: click navbar
    showMovies: () => {
        $('#navbar .nav').removeClass('active');
        $('#collection #movies').show();
        $('#collection #shows').hide();
        $('#collection #locals').hide();
        $('#trakt #history').hide();
        $('#trakt #discover').hide();
        $('#settings').hide();
        $('#navbar .movies').addClass('active');
        DB.store('movies', 'last_tab');
        window.scrollTo(0,0);
    },
    // USER INTERACTION: click navbar
    showShows: () => {
        $('#navbar .nav').removeClass('active');
        $('#collection #shows').show();
        $('#collection #movies').hide();
        $('#collection #locals').hide();
        $('#trakt #history').hide();
        $('#trakt #discover').hide();
        $('#settings').hide();
        $('#navbar .shows').addClass('active');
        DB.store('shows', 'last_tab');
        window.scrollTo(0,0);
    },
    // USER INTERACTION: click navbar
    showLocals: () => {
        $('#navbar .nav').removeClass('active');
        $('#collection #locals').show();
        $('#collection #shows').hide();
        $('#collection #movies').hide();
        $('#trakt #history').hide();
        $('#trakt #discover').hide();
        $('#settings').hide();
        $('#navbar .locals').addClass('active');
        $('#locals .categories').show();
        $('#locals .items').hide();
        DB.store('locals', 'last_tab');
        window.scrollTo(0,0);
    },
    // USER INTERACTION: click navbar
    showSettings: () => {
        $('#navbar .nav').removeClass('active');
        $('#settings').show();
        $('#trakt #history').hide();
        $('#collection #shows').hide();
        $('#collection #locals').hide();
        $('#collection #movies').hide();
        $('#trakt #discover').hide();
        $('#navbar .settings').addClass('active');
    },
    // USER INTERACTION: click navbar
    showHistory: () => {
        Collection.get.history().then(() => {
            window.scrollTo(0,0);
            setTimeout(() => {
				$('#navbar .nav').removeClass('active');
				$('#navbar .history').addClass('active');
				$('#collection #shows').hide();
				$('#collection #locals').hide();
				$('#collection #movies').hide();
				$('#settings').hide();
                $('#trakt #discover').hide();
				$('#trakt #history').show();
			}, 0);
        });
        $('#navbar .nav').removeClass('active');
        $('#navbar .history').addClass('active');
        $('#collection #shows').hide();
        $('#collection #locals').hide();
        $('#collection #movies').hide();
        $('#trakt #discover').hide();
        $('#settings').hide();
    },

    // USER INTERACTION: click navbar
    showDiscover: () => {
        Discover.load.trending().then(() => {
            window.scrollTo(0,0);
            setTimeout(() => {
                $('#navbar .nav').removeClass('active');
                $('#collection #shows').hide();
                $('#collection #locals').hide();
                $('#collection #movies').hide();
                $('#settings').hide();
                $('#trakt #history').hide();
                $('#trakt #discover').show();
                $('#navbar .discover').addClass('active');
            }, 0);
        });
        $('#navbar .nav').removeClass('active');
        $('#collection #shows').hide();
        $('#collection #locals').hide();
        $('#collection #movies').hide();
        $('#settings').hide();
        $('#trakt #history').hide();
        $('#trakt #discover').show();
        $('#navbar .discover').addClass('active');
    },

    // USER INTERACTION: click trailer item button
    playTrailer: (url) => {
        let ytc = url.split('=')[1];

        if (DB.get('trailers_use_mpv')) {
            Player.play(url);
            return;
        }

        let iframe = $('<iframe>')
            .attr('src', `http://www.youtube.com/embed/${ytc}?autoplay=1&VQ=HD720`)
            .attr('frameborder', '0')
            .attr('allowfullscreen', '1')
            .css({'width': '100%', 'height': '100%'});

        $('#trailer .video').append(iframe);
        $('#trailer').show();
    },
    // USER INTERACTION: click out of the trailer popup
    closeTrailer: () => {
        $('#trailer').hide();
        $('#trailer .video').html('');
    },

    locals: {
        // USER INTERACTION: click show
        showSeasons: (id) => {
            let opened = $(`#${id}`).hasClass('active');

            $('#locals .local-item').removeClass('active');
            $('#locals .seasons').hide();

            if (opened) return;
            $(`#${id}`).addClass('active');
            $(`#${id} .seasons`).show();
        },
        // USER INTERACTION: click season
        showEpisodes: (id, s) => {
            event && event.stopPropagation();
            let opened = $(`#${id} .s${s}`).hasClass('active');

            $(`#${id} .season`).removeClass('active');
            $(`#${id} .episode`).hide();

            if (opened) return;
            $(`#${id} .s${s}`).addClass('active');
            $(`#${id} .s${s} .episode`).show();
        },
        // USER INTERACTION: click one of the local categories
        show: (cl) => {
            $(`#locals .${cl}`).show();
            $('#locals .categories').hide();
        }
    },

    addLocalPath: () => {
        document.querySelector('#hidden-input-local').click();
    },
    removeLocalPath: () => {
        let selected = $('#settings .locals .option .paths li.selected');
        if (!selected.length) return;
        Local.removePath(selected.text());
    },

    switchCollectionSize: (wasBig) => {
        console.info('Switching to %s items', wasBig ? 'smaller':'bigger');

        let size = {
            from: wasBig ? {sm: 12, md: 6, lg: 4} : {sm: 6, md: 4, lg: 3},
            to: wasBig ? {sm: 6, md: 4, lg: 3} : {sm: 12, md: 6, lg: 4}
        }

        $(`.col-sm-${size.from.sm}`).addClass(`col-sm-${size.to.sm}`).removeClass(`col-sm-${size.from.sm}`);
        $(`.col-md-${size.from.md}`).addClass(`col-md-${size.to.md}`).removeClass(`col-md-${size.from.md}`);
        $(`.col-lg-${size.from.lg}`).addClass(`col-lg-${size.to.lg}`).removeClass(`col-lg-${size.from.lg}`);
    },
    
    setMPVPath: () => {
        document.querySelector('#mpvpath').click();
    },

    showAbout: () => {
        $('#about').show();
    },
    closeAbout: () => {
        $('#about').hide();
    },

    showWarning: () => {
        if (DB.get('legal_notice_read')) return;
        
        $('#legal').show();
    },
    hideWarning: () => {
        $('#legal').hide();
        DB.store(true, 'legal_notice_read');
    },

    bigPictureScale: {
        '1': {
            zoomLevel: 4,
            osc: 1.5
        },
        '1.25': {
            zoomLevel: 3,
            osc: 1.3
        },
        '1.5': {
            zoomLevel: 2,
            osc: 1.1
        },
        '1.75': {
            zoomLevel: 1,
            osc: 1.0
        },
        '2': {
            zoomLevel: 0,
            osc: 1.2
        },
        '2.25': {
            zoomLevel: 0,
            osc: 1.5
        },
    },

    bigPicture: (onStart) => {
        if (!DB.get('bigPicture')) {
            console.info('Entering Big Picture mode', Interface.bigPictureScale[nw.Screen.screens[0].scaleFactor]);
            win.zoomLevel = Interface.bigPictureScale[nw.Screen.screens[0].scaleFactor] ? Interface.bigPictureScale[nw.Screen.screens[0].scaleFactor].zoomLevel : 4;
            win.enterFullscreen();
            $('.nav.bigpicture > div').addClass('fa-compress').removeClass('fa-arrows-alt');
            DB.store(true, 'bigPicture');

            if (onStart) {
                $('.nav.bigpicture').hide();
                $('.nav.exitapp').show();
                DB.store(false, 'bigPicture');
            }
        } else {
            console.info('Exiting Big Picture mode');
            win.zoomLevel = 0;
            win.leaveFullscreen();
            $('.nav.bigpicture > div').addClass('fa-arrows-alt').removeClass('fa-compress');
            DB.store(false, 'bigPicture');
        }

        setTimeout(() => Player.setMPV(DB.get('mpv')), 400);
    },
    playerPopup: () => {
        nw.Window.open('app/playerPopup.html', {
            width: 250,
            height: 100,
            always_on_top: true,
            resizable: false,
            show: false,
            frame: false,
            show_in_taskbar: false,
            transparent: true
        }, function (new_win) {
            //new_win.showDevTools();
            console.debug('Player popup spawned');

            nw.global.playerAPI = Player;

            nw.global.playerPopup = new_win;
            nw.global.playerPopup.blur();
            nw.global.playerPopup.x = screen.availWidth - 250;
            nw.global.playerPopup.y = 0;
            nw.global.playerPopup.on('closed', () => {
                delete nw.global.playerAPI;
                delete nw.global.playerPopup;
                console.debug('Player popup closed');
            });
        });
    }
};