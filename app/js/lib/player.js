'use strict'

const Player = {
    config: {
        events: false,
        states: false,
        cli: [
            //'--no-sub-auto',
            '--sub-fix-timing=yes',
            Settings.player.centered ? '--geometry=50%' : '',
            '--sub-font-size=' + Settings.player.sub_size,
            '--sub-border-size=2',
            '--sub-scale=' + Settings.player.scale,
            '--contrast=' + Settings.player.contrast,
            '--saturation=' + Settings.player.saturation,
            `--script-opts=osc-layout=${Settings.player.layout},osc-seekbarstyle=${Settings.player.seekbar},osc-scalefullscreen=${Settings.player.scale},osc-valign=0.9,osc-timetotal=yes,osc-boxalpha=160`
        ]
    },

    mpv: undefined,

    play: (file, args) => {
        if (!Player.mpv) {
            console.error('No MPV player defined'); // this shouldn't happen
            return;
        }

        Player.mpv.isRunning() && Player.quit() || Player.handleEvents();

        Player.mpv.start().then(() => {
            Player.mpv.loadFile(file);
            console.info('Playing:', file);

            Player.mpv.observeProperty('percent-pos', 50);
            Player.mpv.observeProperty('seeking', 51);

            for (let prop in args) {
                Player.mpv.setProperty(prop, args[prop]);
            }
        }).catch(error => {
            console.error('MPV error', error);
        });
    },

    quit: () => {
        Trakt.scrobble('stop');
        $('#playing').hide();

        Player.mpv.quit();
        Loading.close();
    },

    handleEvents: () => {
        if (Player.config.events) return;

        Player.mpv.on('statuschange', states => {
            Player.config.states = states;
            if (states.seeking) { // triggers when player starts, and when seeking
                Trakt.scrobble('start');
            }
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
        Player.mpv = new (require('node-mpv'))({
            binary: p,
            auto_restart: false
        }, Player.config.cli);
        $('#settings .mpv #fakempvpath').val(p)
    },

    findMpv: () => {
        // should be automatic on osx/linux
        if (process.platform !== 'win32') {
            Player.setMPV();
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
    }
}