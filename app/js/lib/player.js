'use strict'

const Player = {
    config: {
        events: false,
        states: false
    },

    mpv: undefined,

    play: (file) => {
        if (!Player.mpv) return;

        Player.handleEvents();

        console.info('Playing:', file)

        /* =node-mpv v1= */
        Player.mpv.loadFile(file);
        Player.mpv.observeProperty('percent-pos', 50);

        /* =node-mpv v2=
        Player.mpv.start().then(() => {
            Player.mpv.loadFile(file);
            Player.mpv.observeProperty('percent-pos', 50);
        }).catch(error => {
            console.error('MPV error', error);
        });*/
    },

    handleEvents: () => {
        if (Player.config.events) return;

        Player.mpv.on('statuschange', states => {
            Player.config.states = states;
        });
        Player.mpv.on('paused', () => {
            console.log('MPV paused at %s%', Player.config.states['percent-pos']);
        });
        Player.mpv.on('resumed', () => {
            console.log('MPV resumed at %s%', Player.config.states['percent-pos']);
        });
        Player.mpv.on('stopped', () => {
            console.log('MPV stopped')
        });
        Player.mpv.on('quit', () => {
            console.log('MPV quitted at %s%', Player.config.states['percent-pos']);
        });

        Player.config.events = true;
    },

    findMpv: () => {
        // automatic on osx/linux
        if (process.platform !== 'win32') {
            Player.mpv = new (require('node-mpv'))({
                auto_restart: false
            });
            return;
        }

        // did we store it?
        let found = DB.get('mpv');
        if (found && fs.existsSync(found)) {
            Player.mpv = new (require('node-mpv'))({
                binary: found,
                auto_restart: false
            });
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

                    Player.mpv = new (require('node-mpv'))({
                        binary: found,
                        auto_restart: false
                    });
                }
            });
        }

        setTimeout(() => {
            if (!found || !Player.mpv) {
                Notify.snack(i18n.__('No MPV player found, please set it in the Settings'), 10000);
            }
        }, 10000)
    }
}