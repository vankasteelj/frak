'use strict'

const Player = {
    config: {
        events: false,
        states: false
    },

    mpv: undefined,

    play: (file, args) => {
        if (!Player.mpv) {
            console.error('No MPV player defined'); // this shouldn't happen
            return;
        }

        Player.mpv.isRunning() && Player.quit() || Player.handleEvents();

        Player.mpv.start().then(() => Player.mpv.load(file)).then(() => {
            console.info('Playing:', file);
			Trakt.scrobble('start');

            Player.mpv.observeProperty('percent-pos', 50);

            for (let prop in args) {
                Player.mpv.setProperty(prop, args[prop]);
            }
        }).catch(error => {
            console.error('MPV error', error);
            Notify.snack('MPV error: ' + error.message)
        });
    },

    quit: () => {
        Trakt.scrobble('stop');
        $('#playing').hide();

        Player.mpv.quit();
        Loading.close();

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
    },

    getOptions: () => {
        let options = DB.get('player_options');

        return [
            //'--no-sub-auto',
            '--sub-fix-timing=yes',
            options.centered ? '--geometry=50%' : '',
            '--sub-font-size=' + options.sub_size,
            '--sub-color=' + options.sub_color,
            '--sub-border-size=2',
            '--sub-scale=' + options.scale,
            '--contrast=' + options.contrast,
            '--saturation=' + options.saturation,
            `--script-opts=osc-layout=${options.layout},osc-seekbarstyle=${options.seekbar},osc-scalewindowed=${options.scale},osc-valign=0.9,osc-timetotal=yes,osc-boxalpha=160,osc-vidscale=no`
        ];
    },

    findMpv: () => {
        // should be automatic on osx/linux
        if (process.platform !== 'win32') {
            Player.setMPV();
            return;
        }

        // is it a portable win32?
        if (process.platform == 'win32' && PKJSON.portable) {
            Player.setMPV('./mpv/mpv.exe');
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