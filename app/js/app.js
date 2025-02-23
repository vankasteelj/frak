'use strict'

console.info('Running app version', PKJSON.version)

// setup window's content and start the app
try {
  // if started with gulp, open devtools
  if (NwjsApi.argv.indexOf('--development') !== -1) {
    console.debug('Running in development')
    NwjsApi.showDevTools()
  }

  // Set up everything
  Boot.preload()
  Trakt.reconnect()

  if (NwjsApi.argv.indexOf('--bp') !== -1) {
    Interface.bigPicture(true)
  }

  requestIdleCallback(() => {
    Boot.postload()
    console.timeEnd('Application ready')
    if (NwjsApi.argv.indexOf('--hidden') === -1) {
      NwjsApi.mainWindow.show(true)
      Interface.focus(true)
    }
    if (NwjsApi.splashScreen.window) {
      NwjsApi.splashScreen.window.close()
    }
  })
} catch (err) {
  // if things go south on startup, just display devtools and log error
  console.error(err)
  NwjsApi.showDevTools()
}

// if app is already running
const onOpenApp = (command) => {
  NwjsApi.mainWindow.restore()
  console.debug('App already running but another instance tried to launch', command)
  if (!command) { return }

  /* inject file if used 'open with' - not used atm

  let file
  let cmd = command[0]
  if (process.platform.match('win32')) {
    file = cmd.split('"')
    file = file[file.length - 2]
  } else {
    file = cmd.split(' /')
    file = file[file.length - 1]
    file = '/' + file
  }

  if (file) {
    console.info('Opened from file', file)
    // maybe do stuff here
  }
  */
}

// cleanup before closing
const onCloseApp = () => {
  Cache.delete()
  NwjsApi.tray.remove()
  NwjsApi.mainWindow.close(true)
}

// remember window position
const onMoveApp = (x, y) => {
  if (DB && x && y) {
    DB.sync.store(Math.round(x), 'posX')
    DB.sync.store(Math.round(y), 'posY')
  }
}
const onMaximizeApp = () => {
  DB.sync.store(true, 'wasMaximized')
}
const onRestoreApp = () => {
  if (!NwjsApi.mainWindow.isMaximized()) {
    DB.sync.store(false, 'wasMaximized')
  }
}
const onMinimizeApp = () => {
  NwjsApi.mainWindow.isMaximized(DB.sync.get('wasMaximized'))
  if (DB.sync.get('minimizeToTray')) NwjsApi.mainWindow.hide()
}

// displays
const onDisplayAdded = () => {
  console.info('Multiple monitors (%s) detected', NwjsApi.screens.connected)
  Player.setMPV(DB.sync.get('mpv'))
}
const onDisplayRemoved = () => {
  console.info('A monitor was removed')
  Player.setMPV(DB.sync.get('mpv'))
}