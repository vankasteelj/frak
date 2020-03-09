const Boot = {

    // STARTUP: load app: ui,settings,features
    load: () => {
        Boot.checkVisible();                    // main window
        Localization.setupLocalization();       // localize
        Boot.tray();                            // setup the tray
        Cache.create();                         // create tmp dir
        IB.create();                            // create ImagesBank folder
        Themes.setup();                         // set up theme
        Plugins.load();                         // load search plugins
        Boot.setupSettings();                   // setup settings popup
        Boot.setupScreens();                    // nwjs screen listener
        Boot.setupInputs();                     // browse button
        Keyboard.setupShortcuts();              // keyboard shortcuts
        Player.findMpv();                       // player
        Update.check();                         // update
        Boot.setupVersion();                    // version number
        Boot.online();                          // check if online
        Dragdrop.setup();                       // allow drag&drop
        //Gamepad.init();                       // gamepad support
        Boot.idle();                            // periodically update

        // right clicks
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        Interface.rightClickNav();
        Boot.setupRightClicks('input[type=text], textarea');
    },

    // STARTUP: setup network connexion
    online: () => {
        let localip = '127.0.0.1';

        dns.lookup(os.hostname(), function (err, add, fam) {
            if (!err) localip = add;
            DB.store(localip, 'localip');
            $('#localip input').val(localip);
        });

        /* TODO check if online or not
        let online = window.navigator.onLine;
        if (online) {
            !DB.get('online') && DB.store(true, 'online') && console.info('App is online');
        } else {
            DB.get('online') && DB.store(false, 'online') && console.info('No internet connection');
        }
        setTimeout(() => {
            Boot.online()
        }, 5000); */
    },

    setupScreens: () => {
        nw.Screen.Init();
        sessionStorage.screens = Object.keys(nw.Screen.screens).length;

        if (sessionStorage.screens > 1) {
            console.info('Multiple monitors (%s) detected', sessionStorage.screens);
        }

        nw.Screen.on('displayAdded', () => {
            sessionStorage.screens = Object.keys(nw.Screen.screens).length;
            console.info('Multiple monitors (%s) detected', sessionStorage.screens);
            Player.setMPV(DB.get('mpv'));
        });
        nw.Screen.on('displayRemoved', (screen) => {
            console.info('A monitor was removed');
            sessionStorage.screens = Object.keys(nw.Screen.screens).length;
            Player.setMPV(DB.get('mpv'));
        });
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
        const width = parseInt(DB.get('width') ? DB.get('width') : defaultWidth);
        const height = parseInt(DB.get('height') ? DB.get('height') : defaultHeight);
        let x = parseInt(DB.get('posX') ? DB.get('posX') : -1);
        let y = parseInt(DB.get('posY') ? DB.get('posY') : -1);

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
        // set win size
        win.width = width;
        win.height = height;
        DB.get('wasMaximized') && win.maximize();

        // remember positionning
        win.on('move', (x, y) => {
            if (DB && x && y) {
                DB.store(Math.round(x), 'posX');
                DB.store(Math.round(y), 'posY');
            }
        });

        // remember if the app was maximized or not
        win.on('maximize', () => {
            DB.store(true, 'wasMaximized');
        });
        win.on('restore', () => {
            if (!win.isMaximized) DB.store(false, 'wasMaximized');
        });
        win.on('minimize', () => {
            win.isMaximized = DB.get('wasMaximized');
            if (DB.get('minimizeToTray')) win.hide();
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

        // look for updates
        if (DB.get('lookForUpdates') !== false) {
            DB.store(true, 'lookForUpdates');
            document.querySelector('#lookForUpdates').checked = true;
        }

        // is mpv shipped?
        if (process.platform == 'win32' && fs.existsSync('./mpv/mpv.exe')) {
            $('#mpvexec').hide();
        }

        // items size
        if (DB.get('small_items')) {
            document.querySelector('#items-size').checked = true;
        }

        // big picture button visibility
        if (DB.get('bp_button')) {
            document.querySelector('#bp-button').checked = true;
        } else {
            $('.nav.bigpicture').hide();
        }

        // minimze to tray
        if (DB.get('minimizeToTray')) {
            document.querySelector('#tray').checked = true;
        }

        // use mpv for trailers
        if (DB.get('trailers_use_mpv')) {
            document.querySelector('#trailers_use_mpv').checked = true;
        }

        // allow local network sharing
        if (DB.get('localsharing')) {
            document.querySelector('#allow_localsharing').checked = true;
            $('#settings .resumeplayback').show();
        }

        // allow direct playback feature on local network
        if (DB.get('localplayback')) {
            document.querySelector('#allow_resumeplayback').checked = true;
        }

        // start minimized
        if (DB.get('startminimized')) {
            document.querySelector('#startminimized').checked = true;
        }

        // auto-launch on start up
        if (DB.get('autolaunch')) {
            document.querySelector('#autolaunch').checked = true;
            $('#autolaunchminimized').show();
        }

        // default player options
        let player_options = DB.get('player_options');
        let _poptions = Settings.player;
        player_options = Object.assign(_poptions, player_options);
        DB.store(player_options, 'player_options');

        // setup player options
        for (let o in player_options) {
            let c = o.match('centered|fullscreen|sub_auto|multimonitor') ? 'checked' : 'value';
            document.querySelector(`#${o}`)[c] = player_options[o];

            if (o.match('multimonitor') && player_options[o]) {
                $('#mpvmonitoroption').show();
            }
        }

        // default streamer options
        let streamer_options = DB.get('streamer_options');
        let _soptions = Settings.streamer;
        streamer_options = Object.assign(_soptions, streamer_options);
        DB.store(streamer_options, 'streamer_options');

        // setup streamer options
        for (let o in streamer_options) {
            let c = o.match('webSeeds') ? 'checked' : 'value';
            document.querySelector(`#${o}`)[c] = streamer_options[o];

            if (o == 'announce') {
                document.querySelector(`#${o}`)[c] = streamer_options[o].join(',\n');
            }
        }

        // size of image cache
        IB.calcSize().then(s => $('#imagecachesize').text(s)).catch(console.log);
        
        // size of video cache
        Cache.calcSize().then(s => $('#videocachesize').text(s)).catch(console.log);
    },

    setupInputs: () => {
        document.querySelector('#lookForUpdates').addEventListener('click', (evt) => {
            DB.store(evt.toElement.checked, 'lookForUpdates');
            Update.check();
        });

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

        document.querySelector('#allow_localsharing').addEventListener('click', (evt) => {
            DB.store(evt.toElement.checked, 'localsharing');
            if (evt.toElement.checked) {
                Network.init();
                $('#settings .resumeplayback').show();
            } else {
                Network.disconnect();
                $('#settings .resumeplayback').hide();
            }
        });

        document.querySelector('#allow_resumeplayback').addEventListener('click', (evt) => {
            DB.store(evt.toElement.checked, 'localplayback');
            Network.disconnect();
            Network.init();
        });

        document.querySelector('#bp-button').addEventListener('click', (evt) => {
            DB.store(evt.toElement.checked, 'bp_button');
            if (evt.toElement.checked) {
                $('.nav.bigpicture').show();
            } else {
                $('.nav.bigpicture').hide();
            }
        });

        document.querySelector('#tray').addEventListener('click', (evt) => {
            DB.store(evt.toElement.checked, 'minimizeToTray');
        });

        document.querySelector('#autolaunch').addEventListener('click', (evt) => {
            DB.store(evt.toElement.checked, 'autolaunch');
            Misc.autoLaunch(evt.toElement.checked);

            $('#autolaunchminimized')[evt.toElement.checked ? 'show' : 'hide']();
        });

        document.querySelector('#startminimized').addEventListener('click', (evt) => {
            DB.store(evt.toElement.checked, 'startminimized');
            Misc.autoLaunch(true);
        });

        document.querySelector('#items-size').addEventListener('click', (evt) => {
            let isSmall = evt.toElement.checked;
            DB.store(isSmall, 'small_items');
            Interface.switchCollectionSize(isSmall);
        }, false);

        let player_options = DB.get('player_options');
        for (let o in player_options) {
            let c = o.match('centered|fullscreen|sub_auto|multimonitor') ? 'checked' : 'value';

            document.querySelector(`#${o}`).addEventListener('change', (evt) => {
                player_options[o] = document.querySelector(`#${o}`)[c];
                console.log('Player setting `%s` changed to:', o, player_options[o]);
                DB.store(player_options, 'player_options');

                if (o.match('multimonitor')) {
                    if (player_options[o]) {
                        $('#mpvmonitoroption').show();
                    } else {
                        $('#mpvmonitoroption').hide();
                    }
                }
                Player.setMPV(DB.get('mpv'));
            });
        }

        let streamer_options = DB.get('streamer_options');
        for (let o in streamer_options) {
            let c = o.match('webSeeds') ? 'checked' : 'value';

            document.querySelector(`#${o}`).addEventListener('change', (evt) => {
                streamer_options[o] = document.querySelector(`#${o}`)[c];

                if (o == 'announce') {
                    streamer_options[o] = document.querySelector(`#${o}`)[c].replace(/\s/gm, '').split(',');
                }
                console.log('Streamer setting `%s` changed to:', o, streamer_options[o]);
                DB.store(streamer_options, 'streamer_options');
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
    },

    tray: () => {
        win.tray = new nw.Tray({
            title: PKJSON.releaseName,
            icon: './app/images/frak-tray.png'
        });

        const openFromTray = () => {
            win.show();
        };

        win.tray.tooltip = PKJSON.releaseName;

        let menu = new nw.Menu();
        menu.append(new nw.MenuItem({
            type: 'normal',
            label: i18n.__('Restore'),
            click: openFromTray
        }));
        menu.append(new nw.MenuItem({
            type: 'separator',
        }));
        menu.append(new nw.MenuItem({
            type: 'normal',
            label: i18n.__('Refresh Trakt (F5)'),
            click: Trakt.reload
        }));
        menu.append(new nw.MenuItem({
            type: 'normal',
            label: i18n.__('Open cache (F10)'),
            click: () => Misc.openExternal(Cache.dir)
        }));
        menu.append(new nw.MenuItem({
            type: 'normal',
            label: i18n.__('DevTools (Ctrl+R)'),
            click: win.showDevTools
        }));
        menu.append(new nw.MenuItem({
            type: 'separator',
        }));
        menu.append(new nw.MenuItem({
            type: 'normal',
            label: i18n.__('Close'),
            click: win.close
        }));

        win.tray.menu = menu;

        win.tray.on('click', openFromTray);
        nw.App.on('open', openFromTray);
    },

    idle: () => {
        setInterval(Trakt.reload, 1000*60*60*12); // refresh trakt every 12 hours;
        setInterval(Collection.get.local, 1000*60*60*2); // refresh local library every 2 hours;
        setInterval(Update.check, 1000*60*60*24*7); // check for updates every 7 days;
    }
};
