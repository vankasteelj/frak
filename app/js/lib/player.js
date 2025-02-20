'use strict'

const Player = {
  config: {
    events: false,
    states: undefined,
    model: undefined
  },
  mpv: undefined,

  play: (file, args = {}, model) => {
    if (!Player.mpv) {
      console.error('No MPV player defined') // this shouldn't happen
      return
    }

    Player.mpv.isRunning() ? Player.quit() : Player.handleEvents();

    Player.mpv.start().then(() => Player.mpv.load(file)).then(() => {
      console.info('Playing:', file)

      // mpv properties setup
      Player.mpv.observeProperty('percent-pos', 50)
      for (const prop in args) {
        Player.mpv.setProperty(prop, args[prop])
      }

      // trakt
      Player.config.model = model
      Trakt.scrobble('start')
    }).catch(error => {
      console.error('MPV error', error)
      Notify.snack('MPV error: ' + error.verbose || error.message)
    })
  },

  quit: () => {
    // trakt
    Trakt.scrobble('stop')

    $('#playing').hide()

    Player.mpv.quit()
    Loading.close()

    Player.config.model = undefined
    Player.config.states = undefined

    Player.setMPV()

    // reset details window
    Details.previous = {
      id: undefined,
      html: undefined
    }
  },

  handleEvents: () => {
    if (Player.config.events) return
    Player.config.states = {}

    Player.mpv.on('status', states => {
      if (states.property === 'percent-pos') {
        if (states.value) Player.config.states['percent-pos'] = states.value
      } else {
        Player.config.states[states.property] = states.value
      }

      if (states.property === 'pause') {
        if (states.value) {
          Trakt.scrobble('pause')
          $('#streaminfo .control .play').addClass('fa-play').removeClass('fa-pause')
        } else {
          Trakt.scrobble('start')
          $('#streaminfo .control .play').addClass('fa-pause').removeClass('fa-play')
        }
        return
      }
    })
    Player.mpv.on('seek', timepositions => {
      if (!Player.config.states.pause) Trakt.scrobble('start')
    })
    Player.mpv.on('stopped', () => {
      if (!Player.config.model) return

      console.info('MPV stopped')
      Player.quit()
    })
    Player.mpv.on('crashed', () => {
      console.error('MPV crashed')
      Player.quit()
    })
    Player.mpv.on('quit', () => {
      console.info('MPV has been closed')
      Player.quit()
    })

    Player.config.events = true
  },

  setMPV: (p) => {
    const binary = p || DB.sync.get('mpv')
    const options = Player.getOptions()

    Player.mpv = new (require('node-mpv-2'))({
      binary: binary,
      auto_restart: false,
      time_update: 1,
      debug: true
    }, options)

    $('#settings .mpv #fakempvpath').val(binary)
    Player.config.events = false
  },

  getOptions: () => {
    const options = DB.sync.get('player_options')
    let scale = options.scale

    return [
      options.multimonitor && (sessionStorage.screens >= options.monitor) ? '--screen=' + (options.monitor - 1) : '',
      (options.fullscreen || win.isFullscreen) ? '--fs' : '',
      options.fullscreen && options.multimonitor && (sessionStorage.screens >= options.monitor) ? '--fs-screen=' + (options.monitor - 1) : '',
      options.sub_auto ? DB.sync.get('defaultsublocale') ? `--slang=${DB.sync.get('defaultsublocale')}` : '' : '--sid=no',
      options.centered ? '--geometry=50%' : '',
      '--sub-font-size=' + options.sub_size,
      '--sub-color=' + options.sub_color,
      '--sub-border-size=2',
      '--sub-scale=' + options.scale,
      '--contrast=' + options.contrast,
      '--saturation=' + options.saturation,
      '--osc=no',
      '--osd-level=0',
      '--config-dir=' + path.resolve(process.cwd(), 'mpv-conf'),
      `--script-opts=modernz-language=${i18n.getLocale()}`
    ].filter(n => n)
  },

  findMpv: () => {
    // should be automatic on osx/linux
    if (process.platform !== 'win32') {
      Player.setMPV()
      return
    }

    // is it shipped with mpv (win32)?
    if (process.platform === 'win32' && fs.existsSync('./mpv/mpv.exe')) {
      DB.sync.store('./mpv/mpv.exe', 'mpv')
      Player.setMPV('./mpv/mpv.exe')
      return
    }

    // did we store it?
    let found = DB.sync.get('mpv')
    if (found && fs.existsSync(found)) {
      Player.setMPV(found)
      return
    } else {
      found = undefined
    }

    // lets go for a search then
    const { readdirp } = require('readdirp')
    const searchPaths = []
    const addPath = (path) => {
      if (fs.existsSync(path)) {
        searchPaths.push(path)
      }
    }

    addPath(process.env.SystemDrive + '\\Program Files\\')
    addPath(process.env.SystemDrive + '\\Program Files (x86)\\')
    addPath(process.env.HOME)

    for (const folderName of searchPaths) {
      if (found) break

      console.info('Looking for mpv in', folderName)

      const fileStream = readdirp(path.resolve(folderName), { depth: 3 })

      fileStream.on('data', (d) => {
        const app = d.name.replace('.app', '').replace('.exe', '').toLowerCase()

        if (app === 'mpv') {
          console.info('Found mpv in', d.fullParentDir)

          found = d.fullPath.replace(/\\/g, '/')
          DB.sync.store(found, 'mpv')

          Player.setMPV(found)
        }
      })
    }
  },

  subFontSize: (n) => {
    const saved = DB.sync.get('player_options')
    saved.sub_size += n

    Player.notify(i18n.__('Subtitle size: %d', saved.sub_size))
    Player.mpv.setProperty('sub-font-size', saved.sub_size)

    DB.sync.store(saved, 'player_options')
    $('#sub_size').val(saved.sub_size)
  },
  subDelay: (n) => {
    let i = 0
    const delay = (d) => {
      Player.mpv.getProperty('sub-delay').then(current => {
        current += d
        Player.notify(i18n.__('Subtitle delay: %dms', current * 1000))
        Player.mpv.setProperty('sub-delay', current)
      })
    }
    delay(n)

    Player.timeOut = setInterval(() => {
      if (i++ > 1) delay(n)
      if (i > 20) delay(n * 2.5)
      if (i > 40) delay(n * 5)
    }, 200)
  },
  stopDelay: () => {
    clearInterval(Player.timeOut)
  },
  notify: (message) => {
    if (!message) return
    Player.mpv.command('show-text', [message, '1200', '1'])
  },
  onTop: () => {
    Player.mpv.setProperty('ontop', true)
  }
}
