'use strict'

const Keyboard = {

  // STARTUP: setup keyboard shortcuts
  setupShortcuts: () => {
    document.addEventListener('keypress', (key) => {
      if (key.ctrlKey && key.charCode === 4) { // ctrl+d
        console.info('Opening devtools')
        win.showDevTools()
      } else if (key.ctrlKey && key.charCode === 18) { // ctrl+r
        Misc.restartApp()
      }
    })

    document.addEventListener('keydown', (key) => {
      if (key.key === 'Escape') { // escape
        if ($('#details').is(':visible')) {
          $('#details-back').trigger('click')
        } else if ($('#locals').is(':visible')) {
          $('.locals').trigger('click')
        } else if ($('#settings').is(':visible')) {
          $(`.${DB.get('last_tab')}`).trigger('click')
        } else if ($('#trailer').is(':visible')) {
          Interface.closeTrailer()
        } else if ($('#about').is(':visible')) {
          Interface.closeAbout()
        }
      } else if (key.key === 'Tab') { // tab
        if ($('#details').is(':visible')) return

        const tabs = ['movies', 'shows', 'locals']
        const active = DB.get('last_tab')

        let next = tabs.indexOf(active)
        if (key.shiftKey) { // go previous
          next -= 1
          if (next < 0) next = tabs.length - 1
        } else { // go next
          next += 1
          if (next > tabs.length - 1) next = 0
        }

        $(`.${tabs[next]}`).trigger('click')
      } else if (key.key === 'F5') {
        Trakt.reload()
      } else if (key.key === 'F10') {
        console.info('Opening cache folder', Cache.dir)
        Misc.openExternal(Cache.dir)
      } else if (key.key.match(/[a-z]/i)) {
        // local list jump
        if ($('#locals').is(':visible')) {
          if ($('#locals > .movies').is(':visible')) Keyboard.findInLocals('movies', key.key)
          if ($('#locals > .shows').is(':visible')) Keyboard.findInLocals('shows', key.key)
          if ($('#locals > .unmatched').is(':visible')) Keyboard.findInLocals('unmatched', key.key)
        }
      }
    })
  },
  findInLocals: (category, key) => {
    const items = $(`#locals > .${category} span.title`)
    for (let i = 0; i < items.length; i++) {
      const $elm = $(items[i])
      const pos = $elm.offset().top
      const firstLetter = $elm.text().slice(0, 1)
      if (key.toLowerCase() === firstLetter.toLowerCase()) {
        window.scrollTo(0, pos)
        return
      }
    }
  }
}
