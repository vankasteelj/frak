'use strict'

const Player = {
    config: {
        events: false,
        states: false,
        cli: [
            '--no-sub-auto',
            '--geometry=50%',
            '--sub-font-size=45',
            '--sub-border-size=2',
            '--sub-scale=0.7',
            '--sub-fix-timing=yes',
            '--contrast=5',
            '--saturation=2',
            '--script-opts=osc-layout=box,osc-seekbarstyle=knob,osc-scalefullscreen=0.7,osc-scalewindowed=1,osc-valign=0.9,osc-timetotal=yes,osc-boxalpha=160'
        ]
    },

    mpv: undefined,

    play: (file) => {
        if (!Player.mpv) {
            console.error('No MPV player defined'); // this shouldn't happen
            return;
        }

        Player.mpv.isRunning() && Player.quit() || Player.handleEvents();

        console.info('Playing:', file)

        Player.mpv.start().then(() => {
            Player.mpv.loadFile(file);
            Player.mpv.observeProperty('percent-pos', 50);
        }).catch(error => {
            console.error('MPV error', error);
        });
    },

    quit: () => {
        console.log('MPV quitted at %s%', Player.config.states['percent-pos']);
        Player.mpv.quit();
        Loading.close();
    },

    handleEvents: () => {
        if (Player.config.events) return;

        Player.mpv.on('statuschange', states => {
            Player.config.states = states;
        });
        Player.mpv.on('paused', () => {
            console.log('MPV paused at %s%', Player.config.states['percent-pos']);
            $('#streaminfo .control .play').addClass('fa-play').removeClass('fa-pause');
        });
        Player.mpv.on('resumed', () => {
            console.log('MPV resumed at %s%', Player.config.states['percent-pos']);
            $('#streaminfo .control .play').addClass('fa-pause').removeClass('fa-play');
        });
        Player.mpv.on('stopped', () => {
            console.log('MPV stopped');
            Player.quit();
        });
        Player.mpv.on('crashed', () => {
            console.log('MPV crashed');
            Player.quit();
        });
        Player.mpv.on('quit', () => {
            console.log('MPV has been closed');
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