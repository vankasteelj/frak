'use strict'

console.info('Opening app...')

// setup window's content and start the app
try {
  // if started with gulp, open devtools
  if (gui.App.argv.indexOf('--development') !== -1) {
    console.debug('Running in development')
    win.showDevTools()
  }
  
  // Set up everything
  Boot.load()
  Trakt.reconnect()

  if (gui.App.argv.indexOf('--bp') !== -1) {
    Interface.bigPicture(true)
  }

  requestIdleCallback(() => {
    if (gui.App.argv.indexOf('--hidden') === -1) {
      win.show(true)
      Interface.focus(true)
    }
    console.timeEnd('Application ready')
    if (nw.global.splashScreen) {
      nw.global.splashScreen.close(true)
    }
  })
} catch (err) {
  // if things go south on startup, just display devtools and log error
  console.error(err)
  win.showDevTools()
}

// if app is already running
const onOpenApp = () => {
  nw.App.on('open', (command) => {
    win.restore()
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

    onOpenApp() // listen for the event again
  })
}
onOpenApp()

win.on('close', () => {
  Cache.delete()
  win.tray.remove()
  nw.global.playerPopup && nw.global.playerPopup.close(true)
  nw.global.splashScreen && nw.global.splashScreen.close(true)
  win.close(true)
})
