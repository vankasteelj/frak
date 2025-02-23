'use strict'

const gui = require('nw.gui')
const win = gui.Window.get()

const NwjsApi = {
  argv: gui.App.argv,
  splashScreen: {
    window: null,
    open: () => {
      gui.Window.open('app/html/splash.html', {
        position: 'center',
        width: 128,
        height: 152,
        resizable: false,
        frame: false,
        show_in_taskbar: false,
        transparent: true,
        focus: true
      }, (newWin) => {
        NwjsApi.splashScreen.window = newWin
        NwjsApi.splashScreen.window.focus(true)
        NwjsApi.splashScreen.window.on('close', () => {
          NwjsApi.splashScreen.window.close(true)
        })
      })
    }
  },
  mainWindow: {
    close: (force) => {
      win.close(force)
    },
    show: (force) => {
      win.show(force)
    },
    hide: () => {
      win.hide()
    },
    restore: () => {
      win.restore()
    },
    maximize: () => {
      win.maximize()
    },
    reload: () => {
      win.reload()
    },
    focus: (force) => {
      force && win.setAlwaysOnTop(true)
      win.focus(true)
      force && win.setAlwaysOnTop(false)
    },
    isFullScreen: () => {
      return win.isFullscreen
    },
    isMaximized: (bool) => {
      if (bool !== undefined) {
        win.isMaximized = bool
      } else {
        return win.isMaximized
      }
    },
    zoomLevel: (level) => {
      if (level === undefined) {
        return win.zoomLevel
      } else {
        win.zoomLevel = level
      }
    },
    enterFullscreen: () => {
      win.enterFullscreen()
    },
    leaveFullscreen: () => {
      win.leaveFullscreen()
    },
    moveTo: (x, y) => {
      win.moveTo(x, y)
    },
    resizeTo: (width, height) => {
      win.width = width
      win.height = height
    },
    setProgressBar: (progress) => {
      win.setProgressBar(progress)
    }
  },
  tray: {
    create: (config) => {
      win.tray = new nw.Tray({
        title: config.title,
        icon: config.icon
      })
      win.tray.tooltip = config.tooltip

      if (!config.menu) return
      const menu = new nw.Menu()
      for (let i = 0; i < config.menu.length; i++) {
        let item = config.menu[i]
        menu.append(new nw.MenuItem({
          type: item.type,
          label: item.label,
          click: item.action
        }))
      }
      win.tray.menu = menu
      win.tray.on('click', config.action)
    },
    remove: () => {
      win.tray.remove()
    }
  },
  clipboard: {
    get: () => {
      return nw.Clipboard.get().get()
    },
    set: (data) => {
      nw.Clipboard.get().set(data)
    }
  },
  showDevTools: () => {
    win.showDevTools()
  },
  handleEvents: () => {
    win.on('close', () => {
      onCloseApp()
    })
    win.on('move', (x, y) => {
      onMoveApp(x, y)
    })
    win.on('maximize', () => {
      onMaximizeApp()
    })
    win.on('restore', () => {
      onRestoreApp()
    })
    win.on('minimize', () => {
      onMinimizeApp()
    })
  },
  handleOpen: () => {
    nw.App.on('open', (command) => {
      onOpenApp(command)
      NwjsApi.handleOpen() // listen again for the event
    })
  },
  screens: {
    scaleFactor: null,
    connected: null,
    setup: () => {
      nw.Screen.Init()
      NwjsApi.screens.scaleFactor = nw.Screen.screens[0].scaleFactor
      NwjsApi.screens.connected = Object.keys(nw.Screen.screens).length

      nw.Screen.on('displayAdded', () => {
        NwjsApi.screens.connected = Object.keys(nw.Screen.screens).length
        onDisplayAdded()
      })
      nw.Screen.on('displayRemoved', () => {
        NwjsApi.screens.connected = Object.keys(nw.Screen.screens).length
        onDisplayRemoved()
      })
    }
  },
  shell: {
    showItemInFolder: (path) => {
      gui.Shell.showItemInFolder(path)
    },
    openExternal: (url) => {
      gui.Shell.openExternal(url)
    },
    nwdirectory: (id) => {
      return new Promise((resolve) => {
        if (!document.querySelector(id).hasAttribute('nwdirectory')) {
          document.querySelector(id).setAttribute('nwdirectory', '')
        }
        const selectDirectory = (evt) => {
          const directory = $(id).val()
          document.querySelector(id).removeEventListener('change', selectDirectory, false)
          resolve(directory)
        }
        document.querySelector(id).addEventListener('change', selectDirectory, false)
        document.querySelector(id).click()
      })
    }
  }, 
  menus: {
    buildRightClick: (input) => {
      const getSelection = (textbox) => {
        let selectedText = null
        const activeElement = document.activeElement
    
        if (activeElement && (activeElement.tagName.toLowerCase() === 'textarea' || (activeElement.tagName.toLowerCase() === 'input' && activeElement.type.toLowerCase() === 'text')) && activeElement === textbox) {
          const startIndex = textbox.selectionStart
          const endIndex = textbox.selectionEnd
    
          if (endIndex - startIndex > 0) {
            const text = textbox.value
            selectedText = text.substring(textbox.selectionStart, textbox.selectionEnd)
          }
        }
    
        return selectedText
      }
      const contextMenu = (cutLabel, copyLabel, pasteLabel, field) => {
        const menu = new gui.Menu()
  
        const cut = new gui.MenuItem({
          label: cutLabel,
          click: () => document.execCommand('cut')
        })
  
        const copy = new gui.MenuItem({
          label: copyLabel,
          click: () => {
            // on readonly fields, execCommand doesn't work
            if ($('#' + field).attr('readonly') && getSelection($('#' + field)[0]) === null) {
              NwjsApi.clipboard.set($('#' + field).val())
            } else {
              document.execCommand('copy')
            }
          }
        })
  
        const paste = new gui.MenuItem({
          label: pasteLabel,
          click: () => document.execCommand('paste')
        })
  
        if (cutLabel) {
          menu.append(cut)
        }
        if (copyLabel) {
          menu.append(copy)
        }
        if (pasteLabel) {
          menu.append(paste)
        }
  
        return menu
      }

      // right click event
      input.addEventListener('contextmenu', (e) => {
        // force stop default rightclick event
        e.preventDefault()
        let menu

        if ($(input).attr('readonly')) {
          // copy only on readonly fields
          if (e.target.value !== '') {
            menu = contextMenu(null, i18n.__('Copy'), null, e.target.id)
          } else {
            return
          }
        } else {
          // cut-copy-paste on other
          menu = contextMenu(i18n.__('Cut'), i18n.__('Copy'), i18n.__('Paste'), e.target.id)
        }
        // show our custom menu
        menu.popup(parseInt(e.x), parseInt(e.y))
        return false
      }, false)
    },
    customContextMenu: (labels) => {
      // labels should be: {'my button label 1': () => action(), 'my button label 2': () => otherAction()};
      const menu = new gui.Menu()
  
      for (const label in labels) {
        const action = labels[label]
        let button = false
  
        if (label.indexOf('separator') !== -1) {
          button = new gui.MenuItem({ type: 'separator' })
        } else if (label.indexOf('submenu') !== -1) {
          const submenu = new gui.Menu()
          const title = labels[label].title
          for (const sublabel in labels[label].labels) {
            const subaction = labels[label].labels[sublabel]
            const subbutton = new gui.MenuItem({
              label: i18n.__(sublabel),
              click: () => subaction()
            })
            submenu.append(subbutton)
          }
          button = new gui.MenuItem({
            label: i18n.__(title),
            submenu: submenu
          })
        } else {
          button = new gui.MenuItem({
            label: i18n.__(label),
            click: () => action()
          })
        }
  
        menu.append(button)
      }
  
      return menu
    }
  }
}

if (NwjsApi.argv.indexOf('--hidden') === -1 && NwjsApi.argv.indexOf('--development') === -1) {
  NwjsApi.splashScreen.open()
}
NwjsApi.handleEvents()
NwjsApi.handleOpen()