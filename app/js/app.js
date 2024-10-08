'use strict'

console.time('Application ready')
console.info('Opening app...')

// setup window's content and start the app
try {
  // Set up everything
  Boot.load()
  Trakt.reconnect()

  // if started with gulp, open devtools
  if (gui.App.argv.indexOf('--development') !== -1) {
    console.debug('Running in development')
    win.showDevTools()
  }

  if (gui.App.argv.indexOf('--bp') !== -1) {
    Interface.bigPicture(true)
  }

  if (gui.App.argv.indexOf('--hidden') === -1) {
    setTimeout(() => win.show(true), 0)
    Interface.focus(true)
  }

  console.timeEnd('Application ready')
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
  win.close(true)
})
