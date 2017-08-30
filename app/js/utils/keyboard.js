'use strict';

const Keyboard = {

    // STARTUP: setup keyboard shortcuts
    setupShortcuts: () => {
        document.addEventListener('keypress', (key) => {
            if (key.ctrlKey && key.charCode === 4) { // ctrl+d
                console.info('Opening devtools');
                gui.Window.get().showDevTools();
            } else if (key.ctrlKey && key.charCode === 18) { // ctrl+r
                Misc.restartApp();
            }
        });
		
        document.addEventListener('keydown', (key) => {
            if (key.key === 'Escape') { // escape
                if ($('#details').is(':visible')) {
                    $('#details-back').click();
                } else if ($('#locals').is(':visible')) {
                    $('.locals').click();
                } else if ($('#settings').is(':visible')) {
                    $(`.${DB.get('last_tab')}`).click();
                } else if ($('#trailer').is(':visible')) {
                    Interface.closeTrailer();
                } else if ($('#about').is(':visible')) {
                    Interface.closeAbout();
                }
            } else if (key.key === 'Tab') { // tab
                if ($('#details').is(':visible')) return;

                let tabs = ['movies', 'shows', 'locals'];
                let active = DB.get('last_tab');

                let next = tabs.indexOf(active);
                if (key.shiftKey) { // go previous
                    next -= 1;
                    if (next < 0) next = tabs.length - 1;
                } else { // go next
                    next += 1;
                    if (next > tabs.length - 1) next = 0;
                }

                $(`.${tabs[next]}`).click();
            }
        });
    },
};