const Boot = {

    // STARTUP: load app: ui,settings,features
    load: () => {
        Localization.setupLocalization();                   // localize
        Cache.create();                                     // create tmp dir
        try{Player.findMpv()}catch(e){};                    // player
        Plugins.load();                                     // load search plugins
        Boot.setupSettings();                               // setup settings popup
        Boot.checkVisible();                                // nwjs window position
        Boot.setupInputs();                                 // browse button
        Keyboard.setupShortcuts();                          // keyboard shortcuts
        Update.checkUpdates();                              // update
        //Boot.setupTooltips();                             // tooltips - use default visual
        Boot.setupVersion();                                // version number
        Boot.online();                                      // check if online

        // right clicks
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        Boot.setupRightClicks('input[type=text], textarea');

        // on app open, load file if used 'open with'
        // let file = gui.App.argv.slice(-1).pop();
    },

    // STARTUP: check if online
    online: () => {
        let online = window.navigator.onLine;
        let localip = '127.0.0.1';
        
        require('dns').lookup(require('os').hostname(), function (err, add, fam) {
            if (!err) localip = add;
            DB.store(localip, 'localip');
        });

        if (online) {
            !DB.get('online') && DB.store(true, 'online') && console.info('App is online');
        } else {
            DB.get('online') && DB.store(false, 'online') && console.info('No internet connection');
        }
        setTimeout(() => {Boot.online()}, 3000);
    },

    // STARTUP: builds right click menu
    setupRightClicks: (toFind) => {
        let inputs = $(toFind);
        inputs.each((i) => {
            // right click event
            inputs[i].addEventListener('contextmenu', (e) => {
                // force stop default rightclick event
                e.preventDefault();
                let menu;

                if ($(inputs[i]).attr('readonly')) {
                    // copy only on readonly fields
                    if (e.target.value !== '') {
                        menu = Misc.contextMenu(null, i18n.__('Copy'), null, e.target.id);
                    } else {
                        return;
                    }
                } else {
                    // cut-copy-paste on other
                    menu = Misc.contextMenu(i18n.__('Cut'), i18n.__('Copy'), i18n.__('Paste'), e.target.id);
                }
                // show our custom menu
                menu.popup(e.x, e.y);
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

        // lang dropdown
        Localization.setupDropdown();

        // username
        $('#settings .trakt .username').text(DB.get('trakt_profile') && DB.get('trakt_profile').username);

        // search paths for locals
        Local.setupPaths();

        // items size
        if (DB.get('small_items')) {
            document.querySelector('#items-size').checked = true;
        }

        Boot.startScreen();

        Details.default = $('#details').html();
    },

    setupInputs: () => {
        document.querySelector('#hidden-input-local').addEventListener('change', (evt) => {
            let directory = $('#hidden-input-local').val();
            Local.addPath(directory);
        }, false);

        document.querySelector('#mpvpath').addEventListener('change', (evt) => {
            let p = $('#mpvpath').val();
            Player.setMPV(p);
        })

        document.querySelector('#items-size').addEventListener('click', (evt) => {
            let isSmall = evt.toElement.checked;
            DB.store(isSmall, 'small_items');
            Interface.switchCollectionSize(isSmall);
        }, false);
    },

    startScreen: () => {
        let start = DB.get('startscreen') || 'shows';

        // set active
        $(`#navbar .nav.${start}`).addClass('active');
        $(`#collection #${start}`).show();

        // prepare settings
        let $setting = $('#startscreen');
        $setting.val(start).on('change', () => {
            let selected = $setting.val();
            DB.store(selected, 'startscreen');
        });
    }
};