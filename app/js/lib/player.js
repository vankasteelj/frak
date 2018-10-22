'use strict'

const Player = {
    config: {
        events: false,
        popup: false,
        states: undefined,
        model: undefined
    },
    mpv: undefined,

    play: (file, args = {}, model) => {
        if (!Player.mpv) {
            console.error('No MPV player defined'); // this shouldn't happen
            return;
        }

        Player.mpv.isRunning() && Player.quit() || Player.handleEvents();

        // player popup
        Interface.playerPopup();

        Player.mpv.start().then(() => Player.mpv.load(file)).then(() => {
            console.info('Playing:', file);

            // mpv properties setup
            Player.mpv.observeProperty('percent-pos', 50);
            Player.mpv.observeProperty('fullscreen', 51);
            for (let prop in args) {
                Player.mpv.setProperty(prop, args[prop]);
            }

            // trakt
            Player.config.model = model;
			Trakt.scrobble('start');
        }).catch(error => {
            console.error('MPV error', error);
            Notify.snack('MPV error: ' + error.message || error.verbose);
        });
    },

    quit: () => {
        // trakt
        Trakt.scrobble('stop');

        $('#playing').hide();

        Player.mpv.quit();
        Loading.close();
        nw.global.playerPopup && nw.global.playerPopup.close(true);

        Player.config.model = undefined;
        Player.config.states = undefined;
        Player.config.popup = false;

        // reset details window
        Details.previous = {
            id: undefined,
            html: undefined
        }
    },

    handleEvents: () => {
        if (Player.config.events) return;

        Player.mpv.on('statuschange', states => {
            Player.config.states = states;

            if (states.fullscreen && !Player.config.popup && sessionStorage.screens <= 1) {
                console.log('Player popup shown');
                nw.global.playerPopup.show();
                Player.config.popup = true;
            } else if (!states.fullscreen && Player.config.popup) {
                console.log('Player popup hidden');
                nw.global.playerPopup.hide();
                Player.config.popup = false;
            }
        });
		Player.mpv.on('seek', timepositions => {
			if (!Player.config.states.pause) Trakt.scrobble('start');
		});
        Player.mpv.on('paused', () => {
            Trakt.scrobble('pause');
            $('#streaminfo .control .play').addClass('fa-play').removeClass('fa-pause');
        });
        Player.mpv.on('resumed', () => {
            Trakt.scrobble('start');
            $('#streaminfo .control .play').addClass('fa-pause').removeClass('fa-play');
        });
        Player.mpv.on('stopped', () => {
            console.info('MPV stopped');
            Player.quit();
        });
        Player.mpv.on('crashed', () => {
            console.error('MPV crashed');
            Player.quit();
        });
        Player.mpv.on('quit', () => {
            console.info('MPV has been closed');
            Player.quit();
        });

        Player.config.events = true;
    },

    setMPV: (p) => {
        let binary = p || DB.get('mpv');
        let options = Player.getOptions();

        Player.mpv = new (require('node-mpv'))({
            binary: binary,
            auto_restart: false,
			debug: true
        }, options);

        $('#settings .mpv #fakempvpath').val(binary);
        Player.config.events = false;
        console.debug('MPV player ready', options);
    },

    getOptions: () => {
        let options = DB.get('player_options');

        return [
            //'--log-file=output.txt',
            '--save-position-on-quit',
            options.multimonitor && (sessionStorage.screens >= options.monitor) ? '--screen=' + (options.monitor - 1) : '', 
            (options.fullscreen || win.isFullscreen) ? '--fs' : '',
            options.fullscreen && options.multimonitor && (sessionStorage.screens >= options.monitor) ? '--fs-screen=' + (options.monitor - 1) : '',
            options.sub_auto ? '' : '--sid=no',
            options.centered ? '--geometry=50%' : '',
            '--sub-font-size=' + options.sub_size,
            '--sub-color=' + options.sub_color,
            '--sub-border-size=2',
            '--sub-scale=' + options.scale,
            '--contrast=' + options.contrast,
            '--saturation=' + options.saturation,
            `--script-opts=osc-layout=${options.layout},osc-seekbarstyle=${options.seekbar},osc-scalewindowed=${options.scale},osc-scalefullscreen=${options.scale*1.2},osc-valign=0.9,osc-timetotal=yes,osc-boxalpha=160,osc-vidscale=no`
        ].filter(n => n);
    },

    findMpv: () => {
        // should be automatic on osx/linux
        if (process.platform !== 'win32') {
            Player.setMPV();
            return;
        }

        // is it a portable win32?
        if (process.platform == 'win32' && fs.existsSync('./mpv/mpv.exe')) {
            DB.store('./mpv/mpv.exe', 'mpv');
            Player.setMPV('./mpv/mpv.exe');
            return;
        }

        // did we store it?
        let found = DB.get('mpv');
        if (found && fs.existsSync(found)) {
            Player.setMPV(found);
            return;
        } else {
            found = undefined;
        }

        // lets go for a search then
        let readdirp = require('readdirp');
        let searchPaths = [];
        let addPath = (path) => {
            if (fs.existsSync(path)) {
                searchPaths.push(path);
            }
        };

        addPath(process.env.SystemDrive + '\\Program Files\\');
        addPath(process.env.SystemDrive + '\\Program Files (x86)\\');
        addPath(process.env.HOME);

        for (let folderName of searchPaths) {
            if (found) break;
            
            console.info('Looking for mpv in', folderName);

            let fileStream = readdirp({
                root: path.resolve(folderName),
                depth: 3
            });

            fileStream.on('data', (d) => {
                let app = d.name.replace('.app', '').replace('.exe', '').toLowerCase();

                if ('mpv' === app) {
                    console.info('Found mpv in', d.fullParentDir);

                    found = d.fullPath.replace(/\\/g, '/');
                    DB.store(found, 'mpv');

                    Player.setMPV(found);
                }
            });
        }
    },

    subFontSize: (n) => {
        let saved = DB.get('player_options');
        saved.sub_size += n;

        Player.mpv.setProperty('sub-font-size', saved.sub_size);

        DB.store(saved, 'player_options');
        $('#sub_size').val(saved.sub_size);
    },
}