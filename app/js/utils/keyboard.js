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
    },
};