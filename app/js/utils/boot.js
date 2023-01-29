'use strict'

const Boot = {

  // STARTUP: load app: ui,settings,features
  load: () => {
    Boot.checkVisible() // main window
    Localization.setupLocalization() // localize
    Boot.tray() // setup the tray
    Cache.create() // create tmp dir
    IB.create() // create ImagesBank folder
    Themes.setup() // set up theme
    Plugins.load() // load search plugins
    Boot.setupSettings() // setup settings popup
    Boot.setupScreens() // nwjs screen listener
    Boot.setupInputs() // browse button
    Keyboard.setupShortcuts() // keyboard shortcuts
    Player.findMpv() // player
    Update.check() // update
    Boot.setupVersion() // version number
    Boot.online() // check if online
    Dragdrop.setup() // allow drag&drop
    Subtitles.opensubReLogin() // opensubtitles login if needed
    Interface.buildSwitch() // switch trakt account screen
    // Gamepad.init(); // gamepad support
    Boot.idle() // periodically update

    // right clicks
    document.addEventListener('contextmenu', (e) => e.preventDefault())
    Interface.rightClickNav()
    Boot.setupRightClicks('input[type=text], textarea')
  },

  // STARTUP: setup network connexion
  online: () => {
    const localip = require('ip').address() || '127.0.0.1'
    DB.app.store(localip, 'localip')
    $('#localip input').val(localip)

    /* TODO check if online or not
        let online = window.navigator.onLine;
        if (online) {
            !DB.app.get('online') && DB.app.store(true, 'online') && console.info('App is online');
        } else {
            DB.app.get('online') && DB.app.store(false, 'online') && console.info('No internet connection');
        }
        setTimeout(() => {
            Boot.online()
        }, 5000); */
  },

  setupScreens: () => {
    nw.Screen.Init()
    sessionStorage.screens = Object.keys(nw.Screen.screens).length

    if (sessionStorage.screens > 1) {
      console.info('Multiple monitors (%s) detected', sessionStorage.screens)
    }

    nw.Screen.on('displayAdded', () => {
      sessionStorage.screens = Object.keys(nw.Screen.screens).length
      console.info('Multiple monitors (%s) detected', sessionStorage.screens)
      Player.setMPV(DB.app.get('mpv'))
    })
    nw.Screen.on('displayRemoved', (screen) => {
      console.info('A monitor was removed')
      sessionStorage.screens = Object.keys(nw.Screen.screens).length
      Player.setMPV(DB.app.get('mpv'))
    })
  },

  // STARTUP: builds right click menu
  setupRightClicks: (toFind) => {
    const inputs = $(toFind)
    inputs.each((i) => {
      // right click event
      inputs[i].addEventListener('contextmenu', (e) => {
        // force stop default rightclick event
        e.preventDefault()
        let menu

        if ($(inputs[i]).attr('readonly')) {
          // copy only on readonly fields
          if (e.target.value !== '') {
            menu = Misc.contextMenu(null, i18n.__('Copy'), null, e.target.id)
          } else {
            return
          }
        } else {
          // cut-copy-paste on other
          menu = Misc.contextMenu(i18n.__('Cut'), i18n.__('Copy'), i18n.__('Paste'), e.target.id)
        }
        // show our custom menu
        menu.popup(parseInt(e.x), parseInt(e.y))
        return false
      }, false)
    })
  },

  // STARTUP: nwjs sometimes can be out of the screen
  checkVisible: (options) => {
    const screen = window.screen
    const defaultWidth = PKJSON.window.width
    const defaultHeight = PKJSON.window.height

    // check stored settings or use package.json values
    const width = parseInt(DB.app.get('width') ? DB.app.get('width') : defaultWidth)
    const height = parseInt(DB.app.get('height') ? DB.app.get('height') : defaultHeight)
    let x = parseInt(DB.app.get('posX') ? DB.app.get('posX') : -1)
    let y = parseInt(DB.app.get('posY') ? DB.app.get('posY') : -1)

    // reset x
    if (x < 0 || (x + width) > screen.width) {
      x = Math.round((screen.availWidth - width) / 2)
    }

    // reset y
    if (y < 0 || (y + height) > screen.height) {
      y = Math.round((screen.availHeight - height) / 2)
    }

    // move nwjs in sight
    win.moveTo(x, y)
    // set win size
    win.width = width
    win.height = height
    DB.app.get('wasMaximized') && win.maximize()

    // remember positionning
    win.on('move', (x, y) => {
      if (DB && x && y) {
        DB.app.store(Math.round(x), 'posX')
        DB.app.store(Math.round(y), 'posY')
      }
    })

    // remember if the app was maximized or not
    win.on('maximize', () => {
      DB.app.store(true, 'wasMaximized')
    })
    win.on('restore', () => {
      if (!win.isMaximized) DB.app.store(false, 'wasMaximized')
    })
    win.on('minimize', () => {
      win.isMaximized = DB.app.get('wasMaximized')
      if (DB.app.get('minimizeToTray')) win.hide()
    })
  },

  // STARTUP: set up version number and repository link
  setupVersion: () => {
    console.info('Running app version', PKJSON.version)
    $('#about .version').text(PKJSON.version)
    $('#about .repolink').on('click', () => {
      Misc.openExternal(PKJSON.homepage)
    })
  },

  // STARTUP: set up values in settings popup
  setupSettings: () => {
    // lang dropdown
    Localization.setupDropdown()
    Subtitles.defaultLanguage()

    // search paths for locals
    Local.setupPaths()

    // what view to load first
    Boot.startScreen()

    // prepare for default details page
    Details.default = $('#details').html()

    // look for updates
    if (DB.app.get('lookForUpdates') !== false) {
      DB.app.store(true, 'lookForUpdates')
      document.querySelector('#lookForUpdates').checked = true
    }

    // is mpv shipped?
    if (process.platform === 'win32' && fs.existsSync('./mpv/mpv.exe')) {
      $('#mpvexec').hide()
    }

    // items size
    if (DB.app.get('small_items')) {
      document.querySelector('#items-size').checked = true
    }

    // translate overview button
    if (DB.app.get('translateOverviews')) {
      document.querySelector('#tro-button').checked = true
    }

    // big picture button visibility
    if (DB.app.get('bp_button')) {
      document.querySelector('#bp-button').checked = true
      $('#disablezoom').show()
    } else {
      $('.nav.bigpicture').hide()
      $('#disablezoom').hide()
    }

    if (DB.app.get('bpzoomdisable')) {
      document.querySelector('#bpzoomdisable-button').checked = true
    }

    if (DB.app.get('playerPopup')) {
      document.querySelector('#allowplayerpopup-button').checked = true
    }

    // minimze to tray
    if (DB.app.get('minimizeToTray')) {
      document.querySelector('#tray').checked = true
    }

    // use mpv for trailers
    if (DB.app.get('trailers_use_mpv')) {
      document.querySelector('#trailers_use_mpv').checked = true
    }

    // allow local network sharing
    if (DB.app.get('localsharing')) {
      document.querySelector('#allow_localsharing').checked = true
      $('#settings .resumeplayback').show()
    }

    // allow direct playback feature on local network
    if (DB.app.get('localplayback')) {
      document.querySelector('#allow_resumeplayback').checked = true
    }

    // start minimized
    if (DB.app.get('startminimized')) {
      document.querySelector('#startminimized').checked = true
    }

    // auto-launch on start up
    if (DB.app.get('autolaunch')) {
      document.querySelector('#autolaunch').checked = true
      $('#autolaunchminimized').show()
    }

    // default player options
    let playerOptions = DB.app.get('player_options')
    const _poptions = Settings.player
    playerOptions = Object.assign(_poptions, playerOptions)
    DB.app.store(playerOptions, 'player_options')

    // setup player options
    for (const o in playerOptions) {
      const c = o.match('centered|fullscreen|sub_auto|multimonitor') ? 'checked' : 'value'
      document.querySelector(`#${o}`)[c] = playerOptions[o]

      if (o.match('multimonitor') && playerOptions[o]) {
        $('#mpvmonitoroption').show()
      }
    }

    // default streamer options
    let streamerOptions = DB.app.get('streamer_options')
    const _soptions = Settings.streamer
    streamerOptions = Object.assign(_soptions, streamerOptions)
    DB.app.store(streamerOptions, 'streamer_options')

    // setup streamer options
    for (const o in streamerOptions) {
      const c = document.querySelector(`#${o}`)
      if (!c) continue
      c.value = streamerOptions[o]

      if (o === 'announce') {
        c.value = streamerOptions[o].join(',\n')
      }
    }

    // size of image cache
    IB.calcSize().then(s => $('#imagecachesize').text(s)).catch(console.log)

    // size of video cache
    Cache.calcSize().then(s => $('#videocachesize').text(s)).catch(console.log)
  },

  setupInputs: () => {
    document.querySelector('#lookForUpdates').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'lookForUpdates')
      Update.check()
    })

    document.querySelector('#hidden-input-local').addEventListener('change', (evt) => {
      const directory = $('#hidden-input-local').val()
      Local.addPath(directory)
    }, false)

    document.querySelector('#mpvpath').addEventListener('change', (evt) => {
      const p = $('#mpvpath').val()
      Player.setMPV(p)
    })

    document.querySelector('#trailers_use_mpv').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'trailers_use_mpv')
    })

    document.querySelector('#allow_localsharing').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'localsharing')
      if (evt.target.checked) {
        Network.init()
        $('#settings .resumeplayback').show()
      } else {
        Network.disconnect()
        $('#settings .resumeplayback').hide()
      }
    })

    document.querySelector('#allow_resumeplayback').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'localplayback')
      Network.disconnect()
      Network.init()
    })

    document.querySelector('#bp-button').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'bp_button')
      if (evt.target.checked) {
        $('.nav.bigpicture').show()
        $('#disablezoom').show()
      } else {
        $('.nav.bigpicture').hide()
        $('#disablezoom').hide()
      }
    })

    document.querySelector('#tro-button').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'translateOverviews')
    })

    document.querySelector('#bpzoomdisable-button').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'bpzoomdisable')
    })
    document.querySelector('#allowplayerpopup-button').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'playerPopup')
    })

    document.querySelector('#tray').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'minimizeToTray')
    })

    document.querySelector('#autolaunch').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'autolaunch')
      Misc.autoLaunch(evt.target.checked)

      $('#autolaunchminimized')[evt.target.checked ? 'show' : 'hide']()
    })

    document.querySelector('#startminimized').addEventListener('click', (evt) => {
      DB.app.store(evt.target.checked, 'startminimized')
      Misc.autoLaunch(true)
    })

    document.querySelector('#items-size').addEventListener('click', (evt) => {
      const isSmall = evt.target.checked
      DB.app.store(isSmall, 'small_items')
      Interface.switchCollectionSize(isSmall)
    }, false)

    const playerOptions = DB.app.get('player_options')
    for (const o in playerOptions) {
      const c = o.match('centered|fullscreen|sub_auto|multimonitor') ? 'checked' : 'value'

      document.querySelector(`#${o}`).addEventListener('change', (evt) => {
        playerOptions[o] = document.querySelector(`#${o}`)[c]
        console.log('Player setting `%s` changed to:', o, playerOptions[o])
        DB.app.store(playerOptions, 'player_options')

        if (o.match('multimonitor')) {
          if (playerOptions[o]) {
            $('#mpvmonitoroption').show()
          } else {
            $('#mpvmonitoroption').hide()
          }
        }
        Player.setMPV(DB.app.get('mpv'))
      })
    }

    const streamerOptions = DB.app.get('streamer_options')
    for (const o in streamerOptions) {
      const c = document.querySelector(`#${o}`)
      if (!c) continue

      c.addEventListener('change', (evt) => {
        streamerOptions[o] = c.value

        if (o === 'announce') {
          streamerOptions[o] = c.value.replace(/\s/gm, '').split(',')
        }
        console.log('Streamer setting `%s` changed to:', o, streamerOptions[o])
        DB.app.store(streamerOptions, 'streamer_options')
      })
    }

    $('#discover .disc-search input').on('keypress', (e) => {
      if (e.which === 13) $('#discover .disc-search .search').trigger('click')
    })
  },

  startScreen: () => {
    const def = 'shows'
    const opt = DB.app.get('startscreen') || def
    let start = opt
    if (start === 'last') start = DB.app.get('last_tab') || def

    // set active
    $(`#navbar .nav.${start}`).click()

    // prepare settings
    const $setting = $('#startscreen')
    $setting.val(opt).on('change', () => {
      const selected = $setting.val()
      DB.app.store(selected, 'startscreen')
    })
  },

  tray: () => {
    win.tray = new nw.Tray({
      title: PKJSON.releaseName,
      icon: './app/images/frak-tray.png'
    })

    const openFromTray = () => {
      win.show()
    }
    const closeFromTray = () => {
      win.close()
    }
    const debugFromTray = () => {
      win.showDevTools()
    }

    win.tray.tooltip = PKJSON.releaseName

    const menu = new nw.Menu()
    menu.append(new nw.MenuItem({
      type: 'normal',
      label: i18n.__('Restore'),
      click: openFromTray
    }))
    menu.append(new nw.MenuItem({
      type: 'separator'
    }))
    menu.append(new nw.MenuItem({
      type: 'normal',
      label: i18n.__('Refresh Trakt (F5)'),
      click: Trakt.reload
    }))
    menu.append(new nw.MenuItem({
      type: 'normal',
      label: i18n.__('Open cache (F10)'),
      click: () => Misc.openExternal(Cache.dir)
    }))
    menu.append(new nw.MenuItem({
      type: 'normal',
      label: i18n.__('DevTools (Ctrl+R)'),
      click: debugFromTray
    }))
    menu.append(new nw.MenuItem({
      type: 'separator'
    }))
    menu.append(new nw.MenuItem({
      type: 'normal',
      label: i18n.__('Close'),
      click: closeFromTray
    }))

    win.tray.menu = menu

    win.tray.on('click', openFromTray)
    nw.App.on('open', openFromTray)

    console.debug('Created tray menu for the application')
  },

  idle: () => {
    setInterval(Trakt.reload, 1000 * 60 * 60 * 12) // refresh trakt every 12 hours;
    setInterval(Collection.get.local, 1000 * 60 * 60 * 2) // refresh local library every 2 hours;
    setInterval(Update.check, 1000 * 60 * 60 * 24 * 7) // check for updates every 7 days;
  }
}
