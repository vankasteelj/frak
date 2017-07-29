const Boot = {

    // STARTUP: load app: ui,settings,features
    load: () => {
        Localization.setupLocalization();   // localize
        Themes.loadTheme();                 // display theme
        Boot.setupSettings();               // setup settings popup
        Boot.checkVisible();                // nwjs window position
        Boot.setupRightClicks();            // right click menus
        Keyboard.setupShortcuts();          // keyboard shortcuts
        Update.checkUpdates();              // update
        Boot.setupTooltips();               // tooltips
        Boot.setupVersion();                // version number

        // on app open, load file if used 'open with'
        // let file = gui.App.argv.slice(-1).pop();
    },

    // STARTUP: builds right click menu
    setupRightClicks: () => {
        const inputs = $('input[type=text], textarea');
        inputs.each((i) => {
            // right click event
            inputs[i].addEventListener('contextmenu', (ev) => {
                // force stop default rightclick event
                ev.preventDefault();
                let menu;

                if ($(inputs[i]).attr('readonly')) {
                    // copy only on readonly fields
                    if (ev.target.value !== '') {
                        menu = Misc.contextMenu(null, i18n.__('Copy'), null, ev.target.id);
                    } else {
                        return;
                    }
                } else {
                    // cut-copy-paste on other
                    menu = Misc.contextMenu(i18n.__('Cut'), i18n.__('Copy'), i18n.__('Paste'), ev.target.id);
                }
                // show our custom menu
                menu.popup(ev.x, ev.y);
                return false;
            }, false);
        });
    },

    // STARTUP: nwjs sometimes can be out of the screen
    checkVisible: (options) => {
        const screen = window.screen;
        const defaultWidth = PKJSON.window.width;
        const defaultHeight = PKJSON.window.height;

        // check stored settings or use package.json values
        const width = parseInt(localStorage.width ? localStorage.width : defaultWidth);
        const height = parseInt(localStorage.height ? localStorage.height : defaultHeight);
        let x = parseInt(localStorage.posX ? localStorage.posX : -1);
        let y = parseInt(localStorage.posY ? localStorage.posY : -1);

        // reset x
        if (x < 0 || (x + width) > screen.width) {
            x = Math.round((screen.availWidth - width) / 2);
        }

        // reset y
        if (y < 0 || (y + height) > screen.height) {
            y = Math.round((screen.availHeight - height) / 2);
        }

        // move nwjs in sight
        win.moveTo(x, y);

        // remember positionning
        win.on('move', (x, y) => {
            if (localStorage && x && y) {
                localStorage.posX = Math.round(x);
                localStorage.posY = Math.round(y);
            }
        });
    },

    // STARTUP: set up tooltips
    setupTooltips: () => {
        $('.tooltipped').tooltip({
            'show': {
                duration: 500,
                delay: 400
            },
            'hide': 500
        });
    },

    // STARTUP: set up version number in bottom-right corner
    setupVersion: () => $('.version').text(PKJSON.version),

    // STARTUP: set up values in settings popup
    setupSettings: () => {
        // autoupdate
        Update.setupCheckbox();

        // theme dropdown
        Themes.setupDropdown();

        // lang dropdown
        Localization.setupDropdown();
    }
};