const Boot = {

    // STARTUP: load app: ui,settings,features
    load: () => {
        Localization.setupLocalization();                   // localize
        Cache.create();                                     // create tmp dir
        try{Player.findMpv()}catch(e){}                     // player
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

    // STARTUP: set up version number and repository link
    setupVersion: () => {
        $('#about .version').text(PKJSON.version);
        $('#about .repolink').on('click', () => {
            Misc.openExternal(PKJSON.homepage);
        });
    },

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

        // what view to load first
        Boot.startScreen();

        // prepare for default details page
        Details.default = $('#details').html();

        // is mpv shipped?
        if (PKJSON.portable) {
            $('#mpvexec').hide();
        }

        // items size
        if (DB.get('small_items')) {
            document.querySelector('#items-size').checked = true;
        }

        // use mpv for trailers
        if (DB.get('trailers_use_mpv')) {
            document.querySelector('#trailers_use_mpv').checked = true;
        }

        // default player options
        let player_options = DB.get('player_options');
        let _poptions = Settings.player;
        player_options = Object.assign(_poptions, player_options);
        DB.store(player_options, 'player_options');

        // setup player options
        for (let o in player_options) {
            let c = o.match('centered|fullscreen') ? 'checked' : 'value';
            document.querySelector(`#${o}`)[c] = player_options[o];
        }
    },

    setupInputs: () => {
        document.querySelector('#hidden-input-local').addEventListener('change', (evt) => {
            let directory = $('#hidden-input-local').val();
            Local.addPath(directory);
        }, false);

        document.querySelector('#mpvpath').addEventListener('change', (evt) => {
            let p = $('#mpvpath').val();
            Player.setMPV(p);
        });

        document.querySelector('#trailers_use_mpv').addEventListener('click', (evt) => {
            DB.store(evt.toElement.checked, 'trailers_use_mpv');
        });

        document.querySelector('#items-size').addEventListener('click', (evt) => {
            let isSmall = evt.toElement.checked;
            DB.store(isSmall, 'small_items');
            Interface.switchCollectionSize(isSmall);
        }, false);

        let player_options = DB.get('player_options');
        for (let o in player_options) {
            let c = o.match('centered|fullscreen') ? 'checked' : 'value';

            document.querySelector(`#${o}`).addEventListener('change', (evt) => {
                player_options[o] = document.querySelector(`#${o}`)[c];
                console.log('Player setting `%s` changed to:', o, player_options[o]);
                DB.store(player_options, 'player_options');

                Player.setMPV(DB.get('mpv'));
            });
        }

        $('#discover .disc-search input').keypress((e) => {
            if (e.which === 13) $('#discover .disc-search .search').click();
        });
    },

    startScreen: () => {
        let def = 'shows';
        let opt = DB.get('startscreen') || def;
        let start = opt;
        if (start === 'last') start = DB.get('last_tab') || def;

        // set active
        $(`#navbar .nav.${start}`).addClass('active');
        $(`#collection #${start}`).show();

        // prepare settings
        let $setting = $('#startscreen');
        $setting.val(opt).on('change', () => {
            let selected = $setting.val();
            DB.store(selected, 'startscreen');
        });
    }
};