'use strict'

const Player = {
    config: {
        events: false,
        states: false
    },

    mpv: new (require('node-mpv'))({
        binary: 'C:\\Users\\vanka\\Desktop\\mpv\\mpv.exe',
        auto_restart: false
    }),

    play: (file) => {
        Player.handleEvents();

        console.info('Playing:', file)

        Player.mpv.start().then(() => {
            Player.mpv.loadFile(file);
            Player.mpv.observeProperty('percent-pos', 50);
        }).catch(error => {
            console.error('MPV error', error);
        });
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
    }
}