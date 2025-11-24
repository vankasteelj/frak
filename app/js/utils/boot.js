'use strict'

const Boot = {

  // STARTUP: load app: ui,settings,features
  preload: () => {
    Boot.checkVisible() // main window
    Themes.setup() // set up theme
    Localization.setupLocalization() // localize
    Boot.online() // check if online
    Boot.startScreen() // what view to load first
    Misc.events = new (require('node:events'))() // set up events
    scheduler.postTask(Boot.tray, { priority: 'background' }) // setup the tray
    scheduler.postTask(Cache.create, { priority: 'background' }) // create tmp dir
    scheduler.postTask(IB.create, { priority: 'background' }) // create ImagesBank folder
    scheduler.postTask(Boot.setupSettings, { priority: 'background' }) // setup settings popup
    document.addEventListener('contextmenu', (e) => e.preventDefault()) // remove default right clicks
  },
  postload: () => {
    scheduler.postTask(Interface.buildSwitch, { priority: 'background' }) // switch trakt account screen
    scheduler.postTask(Player.findMpv, { priority: 'background' }) // player
    scheduler.postTask(Keyboard.setupShortcuts, { priority: 'background' }) // keyboard shortcuts
    // Gamepad.init(); // gamepad support - needs work
    scheduler.postTask(Boot.setupScreens, { priority: 'background' }) // nwjs screen listener
    scheduler.postTask(Dragdrop.setup, { priority: 'background' }) // allow drag&drop
    scheduler.postTask(Subtitles.opensubReLogin, { priority: 'background' }) // opensubtitles login if needed
    scheduler.postTask(Ratings.setupDropdown, { priority: 'background' }) // ratings init
    scheduler.postTask(Boot.setupVersion, { priority: 'background' }) // version number

    // right clicks
    scheduler.postTask(Interface.rightClickNav, { priority: 'background' })
    scheduler.postTask(() => Boot.setupRightClicks('input[type=text], textarea'), { priority: 'background' })

    // plugins
    scheduler.postTask(Plugins.load, { priority: 'background' }) // load search plugins

    // network
    scheduler.postTask(Collection.get.local, { priority: 'background' }) // local sharing

    // non critical interface
    scheduler.postTask(Boot.setupInputs, { priority: 'background' }) // browse button
    scheduler.postTask(Update.check, { priority: 'background' }) // update

    // periodical tasks
    scheduler.postTask(Boot.cleanup, { priority: 'background' }) // periodically cleanup
    scheduler.postTask(Boot.idle, { priority: 'background' }) // periodically update
  },

  // STARTUP: setup network connexion
  online: () => {
    const ifaces = os.networkInterfaces()
    const values = [].concat.apply([], Object.keys(ifaces).map(n => ifaces[n])).filter(v => v.family === 'IPv4' && v.internal === false)
    const localip = values.length ? values[0].address : '127.0.0.1'

    DB.sync.store(localip, 'localip')
    $('#localip input').val(localip)

    /* TODO check if online or not
        let online = window.navigator.onLine;
        if (online) {
            !DB.sync.get('online') && DB.sync.store(true, 'online') && console.info('App is online');
        } else {
            DB.sync.get('online') && DB.sync.store(false, 'online') && console.info('No internet connection');
        }
        setTimeout(() => {
            Boot.online()
        }, 5000); */
  },

  cleanup: () => {
    // clean the pinned magnets' library every 30 days
    let count = 0
    DB.app.get('pinned_magnets').then(library => {
      const maxAge = 60 * 60 * 24 * 30
      const now = Date.now()
      for (const i in library) {
        if (library[i].added_at + maxAge < now) {
          count++
          library.splice(i, 1)
        }
      }
      return DB.app.store(library, 'pinned_magnets')
    }).then(() => {
      (count) && console.log('Boot.cleanup: %d pinned magnets were removed from the cache', count)
    })
  },

  setupScreens: () => {
    NwjsApi.screens.setup()
    if (NwjsApi.screens.connected > 1) {
      console.info('Multiple monitors (%s) detected', NwjsApi.screens.connected)
    }
  },

  // STARTUP: builds right click menu
  setupRightClicks: (toFind) => {
    const inputs = $(toFind)
    for (let i = 0; i < inputs.length; i++) {
      NwjsApi.menus.buildRightClick(inputs[i])
    }
  },

  // STARTUP: app sometimes can be out of the screen
  checkVisible: (options) => {
    const screen = window.screen
    const defaultWidth = PKJSON.window.width
    const defaultHeight = PKJSON.window.height

    // check stored settings or use package.json values
    const width = parseInt(DB.sync.get('width') ? DB.sync.get('width') : defaultWidth)
    const height = parseInt(DB.sync.get('height') ? DB.sync.get('height') : defaultHeight)
    let x = parseInt(DB.sync.get('posX') ? DB.sync.get('posX') : -1)
    let y = parseInt(DB.sync.get('posY') ? DB.sync.get('posY') : -1)

    // reset x
    if (x < 0 || (x + width) > screen.width) {
      x = Math.round((screen.availWidth - width) / 2)
    }

    // reset y
    if (y < 0 || (y + height) > screen.height) {
      y = Math.round((screen.availHeight - height) / 2)
    }

    // move app in sight
    NwjsApi.mainWindow.moveTo(x, y)
    // set win size
    NwjsApi.mainWindow.resizeTo(width, height)
    // restore maximized state
    DB.sync.get('wasMaximized') && NwjsApi.mainWindow.maximize()
  },

  // STARTUP: set up version number and repository link
  setupVersion: () => {
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

    // prepare for default details page
    Details.default = $('#details').html()

    // look for updates
    if (DB.sync.get('lookForUpdates') !== false) {
      DB.sync.store(true, 'lookForUpdates')
      document.querySelector('#lookForUpdates').checked = true
    }

    // auto-rate feature
    if (DB.sync.get('auto-rate-feature') !== false) {
      DB.sync.store(true, 'auto-rate-feature')
      document.querySelector('#auto-rate-feature').checked = true
    }

    // is mpv shipped?
    if (process.platform === 'win32' && fs.existsSync('./mpv/mpv.exe')) {
      $('#mpvexec').hide()
    }

    // items size
    if (DB.sync.get('small_items')) {
      document.querySelector('#items-size').checked = true
    }

    // items size
    if (DB.sync.get('dyslexic')) {
      document.querySelector('#dyslexic').checked = true
    }

    // translate overview button
    if (DB.sync.get('translateOverviews')) {
      document.querySelector('#tro-button').checked = true
    }

    // big picture button visibility
    if (DB.sync.get('bp_button')) {
      document.querySelector('#bp-button').checked = true
      $('#disablezoom').show()
    } else {
      $('.nav.bigpicture').hide()
      $('#disablezoom').hide()
    }

    if (DB.sync.get('bpzoomdisable')) {
      document.querySelector('#bpzoomdisable-button').checked = true
    }

    // minimze to tray
    if (DB.sync.get('minimizeToTray')) {
      document.querySelector('#tray').checked = true
    }

    // allow local network sharing
    if (DB.sync.get('localsharing')) {
      document.querySelector('#allow_localsharing').checked = true
      $('#settings .resumeplayback').show()
    }

    // allow DLNA search
    if (DB.sync.get('dlnacasting')) {
      document.querySelector('#allow_dlnacasting').checked = true
      scheduler.postTask(Cast.scan, { priority: 'background' })
    }

    // allow direct playback feature on local network
    if (DB.sync.get('localplayback')) {
      document.querySelector('#allow_resumeplayback').checked = true
    }

    // start minimized
    if (DB.sync.get('startminimized')) {
      document.querySelector('#startminimized').checked = true
    }

    // auto-launch on start up
    if (DB.sync.get('autolaunch')) {
      document.querySelector('#autolaunch').checked = true
      $('#autolaunchminimized').show()
    }

    // default player options
    let playerOptions = DB.sync.get('player_options')
    const _poptions = Settings.player
    playerOptions = Object.assign(_poptions, playerOptions)
    DB.sync.store(playerOptions, 'player_options')

    // setup player options
    for (const o in playerOptions) {
      const c = o.match('centered|fullscreen|sub_auto|multimonitor') ? 'checked' : 'value'
      const doc = document.querySelector(`#${o}`)
      if (doc) doc[c] = playerOptions[o]

      if (o.match('multimonitor') && playerOptions[o]) {
        $('#mpvmonitoroption').show()
      }
    }

    // default streamer options
    let streamerOptions = DB.sync.get('streamer_options')
    const _soptions = Settings.streamer
    streamerOptions = Object.assign(_soptions, streamerOptions)
    DB.sync.store(streamerOptions, 'streamer_options')

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
    scheduler.postTask(() => {
      IB.calcSize().then(s => $('#imagecachesize').text(s)).catch(console.log)
    }, { priority: 'background' })

    // size of video cache
    scheduler.postTask(() => {
      Cache.calcSize().then(s => $('#videocachesize').text(s)).catch(console.log)
    }, { priority: 'background' })
  },

  setupInputs: () => {
    document.querySelector('#lookForUpdates').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'lookForUpdates')
      Update.check()
    })

    document.querySelector('#auto-rate-feature').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'auto-rate-feature')
    })

    document.querySelector('#mpvpath').addEventListener('change', (evt) => {
      const p = $('#mpvpath').val()
      Player.setMPV(p)
    })

    document.querySelector('#allow_localsharing').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'localsharing')
      if (evt.target.checked) {
        Network.init()
        $('#settings .resumeplayback').show()
      } else {
        Network.disconnect()
        $('#settings .resumeplayback').hide()
      }
    })

    document.querySelector('#allow_dlnacasting').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'dlnacasting')
      if (evt.target.checked) {
        Cast.scan()
      }
    })

    document.querySelector('#allow_resumeplayback').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'localplayback')
      Network.disconnect()
      Network.init()
    })

    document.querySelector('#bp-button').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'bp_button')
      if (evt.target.checked) {
        $('.nav.bigpicture').show()
        $('#disablezoom').show()
      } else {
        $('.nav.bigpicture').hide()
        $('#disablezoom').hide()
      }
    })

    document.querySelector('#tro-button').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'translateOverviews')
    })

    document.querySelector('#bpzoomdisable-button').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'bpzoomdisable')
    })

    document.querySelector('#tray').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'minimizeToTray')
    })

    document.querySelector('#autolaunch').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'autolaunch')
      Misc.autoLaunch(evt.target.checked)

      $('#autolaunchminimized')[evt.target.checked ? 'show' : 'hide']()
    })

    document.querySelector('#startminimized').addEventListener('click', (evt) => {
      DB.sync.store(evt.target.checked, 'startminimized')
      Misc.autoLaunch(true)
    })

    document.querySelector('#items-size').addEventListener('click', (evt) => {
      const isSmall = evt.target.checked
      DB.sync.store(isSmall, 'small_items')
      Interface.switchCollectionSize(isSmall)
    }, false)

    document.querySelector('#dyslexic').addEventListener('click', (evt) => {
      const isActive = evt.target.checked
      DB.sync.store(isActive, 'dyslexic')
      Themes.dyslexic(isActive)
    }, false)

    const playerOptions = DB.sync.get('player_options')
    for (const o in playerOptions) {
      const c = o.match('centered|fullscreen|sub_auto|multimonitor') ? 'checked' : 'value'
      const doc = document.querySelector(`#${o}`)
      if (!doc) return
      doc.addEventListener('change', (evt) => {
        playerOptions[o] = document.querySelector(`#${o}`)[c]
        console.log('Player setting `%s` changed to:', o, playerOptions[o])
        DB.sync.store(playerOptions, 'player_options')

        if (o.match('multimonitor')) {
          if (playerOptions[o]) {
            $('#mpvmonitoroption').show()
          } else {
            $('#mpvmonitoroption').hide()
          }
        }
        Player.setMPV(DB.sync.get('mpv'))
      })
    }

    const streamerOptions = DB.sync.get('streamer_options')
    for (const o in streamerOptions) {
      const c = document.querySelector(`#${o}`)
      if (!c) continue

      c.addEventListener('change', (evt) => {
        streamerOptions[o] = c.value

        if (o === 'announce') {
          streamerOptions[o] = c.value.replace(/\s/gm, '').split(',')
        }
        console.log('Streamer setting `%s` changed to:', o, streamerOptions[o])
        DB.sync.store(streamerOptions, 'streamer_options')
      })
    }

    $('#discover .disc-search input').on('keypress', (e) => {
      if (e.which === 13) $('#discover .disc-search .search').click()
    })
  },

  startScreen: () => {
    const def = 'shows'
    const opt = DB.sync.get('startscreen') || def
    let start = opt
    if (start === 'last') start = DB.sync.get('last_tab') || def

    // set active
    $(`#navbar .nav.${start}`).click()

    // prepare settings
    const $setting = $('#startscreen')
    $setting.val(opt).on('change', () => {
      const selected = $setting.val()
      DB.sync.store(selected, 'startscreen')
    })
  },

  tray: () => {
    NwjsApi.tray.create({
      title: PKJSON.releaseName,
      icon: './app/images/frak-tray.png',
      tooltip: PKJSON.releaseName,
      action: () => {
            NwjsApi.mainWindow.show()
            Interface.focus(true)
      },
      menu: [
        {
          type: 'normal',
          label: i18n.__('Restore'),
          action: () => {
            NwjsApi.mainWindow.show()
            Interface.focus(true)
          }
        },
        {
          type: 'separator'
        },
        {
          type: 'normal',
          label: i18n.__('Refresh Trakt (F5)'),
          action: () => Trakt.reload()
        },
        {
          type: 'normal',
          label: i18n.__('Open cache (F10)'),
          action: () => Misc.openExternal(Cache.dir)
        },
        {
          type: 'normal',
          label: i18n.__('DevTools (Ctrl+R)'),
          action: () => NwjsApi.showDevTools()
        },
        {
          type: 'separator'
        },
        {
          type: 'normal',
          label: i18n.__('Close'),
          action: () => NwjsApi.mainWindow.close()
        }
      ]
    })
    console.debug('Created tray menu for the application')
  },

  idle: () => {
    setInterval(Trakt.reload, 1000 * 60 * 60 * 12) // refresh trakt every 12 hours;
    setInterval(Collection.get.local, 1000 * 60 * 60 * 2) // refresh local library every 2 hours;
    setInterval(Update.check, 1000 * 60 * 60 * 24 * 7) // check for updates every 7 days;
  }
}
