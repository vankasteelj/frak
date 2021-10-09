'use strict'

const Interface = {
  // USERINTERACTION: on "browse" button click, invoke hidden input action
  browse: (type) => {
    console.info('Opening File Browser')
    document.querySelector('#' + type + '-file-path-hidden').click()
  },

  // AUTO: from lib/trakt
  traktLogin: (poll) => {
    Interface.focus(true)
    $('#traktAuth, #traktinit a').hide()
    $('#traktinit p').text(i18n.__('Enter the code below in your browser') + ` (${poll.verification_url})`)
    $('#traktCode').val(poll.user_code).show()
    $('#traktBrowser').show().attr('onClick', `Misc.openExternal("${poll.verification_url}")`)
    gui.Clipboard.get().set(poll.user_code) // ctrl+v easy hack
  },

  // AUTO: from lib/trakt or boot
  traktConnected: (info) => {
    $('#traktinit').hide()
    $('#init').show()
    $('#traktwelcome').show()

    if (info) {
      // we already have a profile
      $('#welcomeprofile .welcomemessage').text(i18n.__('Welcome back'))
      $('#welcomeprofile img').attr('src', info.images.avatar.full)
      $('#welcomeprofile .username').text(info.username)
    } else {
      Trakt.client.users.profile({
        username: 'me',
        extended: 'full'
      }).then(profile => {
        DB.store(profile, 'trakt_profile')
        $('#welcomeprofile .welcomemessage').text(i18n.__('Welcome'))
        $('#welcomeprofile img').attr('src', profile.images.avatar.full)
        $('#welcomeprofile .username').text(profile.username)
      })
    }
    $('#welcomeprofile').show()
    $('#traktwelcome .spinner').show()

    setTimeout(() => $('#traktwelcome button').show(), 30000) // display reset if still here after 30sec
  },

  // AUTO: from welcome page
  requireMPV: () => {
    $('#traktwelcome').hide()
    $('#requirempv').show()
  },

  focus: (force) => {
    force && win.setAlwaysOnTop(true)
    win.focus(true)
    force && win.setAlwaysOnTop(false)
  },

  // AUTO: from welcome page
  showMain: () => {
    $('#traktwelcome').hide()
    $('#requirempv').hide()
    !$('#details').is(':visible') && $('#collection').show()
    $('#navbar').show()
  },

  // USER INTERACTION: click navbar
  showMovies: () => {
    $('#navbar .nav').removeClass('active')
    $('#collection #movies').show()
    $('#collection #shows').hide()
    $('#collection #locals').hide()
    $('#trakt #history').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#settings').hide()
    $('#navbar .movies').addClass('active')
    DB.store('movies', 'last_tab')
    window.scrollTo(0, 0)
  },
  // USER INTERACTION: click navbar
  showShows: () => {
    $('#navbar .nav').removeClass('active')
    $('#collection #shows').show()
    $('#collection #movies').hide()
    $('#collection #locals').hide()
    $('#trakt #history').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#settings').hide()
    $('#navbar .shows').addClass('active')
    DB.store('shows', 'last_tab')
    window.scrollTo(0, 0)
  },
  // USER INTERACTION: click navbar
  showLocals: () => {
    $('#navbar .nav').removeClass('active')
    $('#collection #locals').show()
    $('#collection #shows').hide()
    $('#collection #movies').hide()
    $('#trakt #history').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#settings').hide()
    $('#navbar .locals').addClass('active')
    $('#locals .categories').show()
    $('#locals .items').hide()
    DB.store('locals', 'last_tab')
    window.scrollTo(0, 0)
  },
  // USER INTERACTION: click navbar
  showSettings: () => {
    $('#navbar .nav').removeClass('active')
    $('#settings').show()
    $('#trakt #history').hide()
    $('#collection #shows').hide()
    $('#collection #locals').hide()
    $('#collection #movies').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#navbar .settings').addClass('active')
  },
  // USER INTERACTION: click navbar
  showHistory: () => {
    Collection.get.history().then(() => {
      window.scrollTo(0, 0)
      setTimeout(() => {
        $('#navbar .nav').removeClass('active')
        $('#navbar .history').addClass('active')
        $('#collection #shows').hide()
        $('#collection #locals').hide()
        $('#collection #movies').hide()
        $('#settings').hide()
        $('#trakt #discover').hide()
        $('#trakt #stats').hide()
        $('#trakt #history').show()
      }, 0)
    })
    $('#navbar .nav').removeClass('active')
    $('#navbar .history').addClass('active')
    $('#collection #shows').hide()
    $('#collection #locals').hide()
    $('#collection #movies').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#settings').hide()
  },
  // USER INTERACTION: click navbar
  showStats: () => {
    window.scrollTo(0, 0)
    $('#navbar .nav').removeClass('active')
    $('#navbar .stats').addClass('active')
    $('#collection #shows').hide()
    $('#collection #locals').hide()
    $('#collection #movies').hide()
    $('#trakt #discover').hide()
    $('#trakt #history').hide()
    $('#settings').hide()
    $('#trakt #stats').show()
    $('#trakt #stats #sloaded').hide()
    $('#trakt #stats #sloading').show()

    Stats.load().then(() => {
      $('#trakt #stats #sloading').hide()
      $('#trakt #stats #sloaded').show()
    })
  },

  // USER INTERACTION: click navbar
  showDiscover: () => {
    Discover.load.trending().then(() => {
      window.scrollTo(0, 0)
      setTimeout(() => {
        $('#navbar .nav').removeClass('active')
        $('#collection #shows').hide()
        $('#collection #locals').hide()
        $('#collection #movies').hide()
        $('#settings').hide()
        $('#trakt #history').hide()
        $('#trakt #stats').hide()
        $('#trakt #discover').show()
        $('#navbar .discover').addClass('active')
      }, 0)
    })
    $('#navbar .nav').removeClass('active')
    $('#collection #shows').hide()
    $('#collection #locals').hide()
    $('#collection #movies').hide()
    $('#settings').hide()
    $('#trakt #history').hide()
    $('#trakt #stats').hide()
    $('#trakt #discover').show()
    $('#navbar .discover').addClass('active')
  },

  // AUTO: right click menu on movies & shows
  rightClickNav: () => {
    // right click MOVIES
    const movielabels = {}

    // movie sorting
    movielabels.submenu1 = {
      title: 'Sort by...',
      labels: {
        'Listed at': () => Collection.show.movies(Collection.sort.movies.listed()),
        Year: () => Collection.show.movies(Collection.sort.movies.released()),
        Title: () => Collection.show.movies(Collection.sort.movies.title()),
        Rating: () => Collection.show.movies(Collection.sort.movies.rating())
      }
    }

    // right click SHOWS
    const showlabels = {}

    // show sorting
    showlabels.submenu1 = {
      title: 'Sort by...',
      labels: {
        'Most recent': () => Collection.show.shows(Collection.sort.shows.nextEpisode()),
        Year: () => Collection.show.shows(Collection.sort.shows.firstAired()),
        Title: () => Collection.show.shows(Collection.sort.shows.title()),
        Rating: () => Collection.show.shows(Collection.sort.shows.rating()),
        Runtime: () => Collection.show.shows(Collection.sort.shows.runtime())
      }
    }

    Trakt.getGenres().then(genres => {
      // movie genres
      const moviegenres = genres.movies
      movielabels.submenu2 = {
        title: 'Genres...',
        labels: {
          All: () => Collection.show.movies(Collection.sort.movies.listed())
        }
      }
      for (const i in moviegenres) {
        movielabels.submenu2.labels[moviegenres[i].name] = () => Collection.show.movies(Collection.sort.movies.genre(moviegenres[i].slug))
      }

      // show genres
      const showgenres = genres.shows
      showlabels.submenu2 = {
        title: 'Genres...',
        labels: {
          All: () => Collection.show.shows(Collection.sort.shows.nextEpisode())
        }
      }
      for (const i in showgenres) {
        showlabels.submenu2.labels[showgenres[i].name] = () => Collection.show.shows(Collection.sort.shows.genre(showgenres[i].slug))
      }
    }).finally(() => {
      // menu popup

      const moviemenu = Misc.customContextMenu(movielabels)
      $('.nav.movies').off('contextmenu').on('contextmenu', (e) => {
        Interface.showMovies()
        moviemenu.popup(parseInt(e.clientX), parseInt(e.clientY))
      })

      const showmenu = Misc.customContextMenu(showlabels)
      $('.nav.shows').off('contextmenu').on('contextmenu', (e) => {
        Interface.showShows()
        showmenu.popup(parseInt(e.clientX), parseInt(e.clientY))
      })
    })
  },

  // USER INTERACTION: click trailer item button
  playTrailer: (url) => {
    const ytc = url.split('=')[1]

    if (DB.get('trailers_use_mpv')) {
      Player.play(url)
      return
    }

    const iframe = $('<iframe>')
      .attr('src', `http://www.youtube.com/embed/${ytc}?autoplay=1&VQ=HD720`)
      .attr('frameborder', '0')
      .attr('allowfullscreen', '1')
      .css({
        width: '100%',
        height: '100%'
      })

    $('#trailer .video').append(iframe)
    $('#trailer').show()
  },
  // USER INTERACTION: click out of the trailer popup
  closeTrailer: () => {
    $('#trailer').hide()
    $('#trailer .video').html('')
  },

  locals: {
    // USER INTERACTION: click show
    showSeasons: (id) => {
      const opened = $(`#${id}`).hasClass('active')

      $('#locals .local-item').removeClass('active')
      $('#locals .seasons').hide()

      if (opened) return
      $(`#${id}`).addClass('active')
      $(`#${id} .seasons`).show()
    },
    // USER INTERACTION: click season
    showEpisodes: (id, s) => {
      event && event.stopPropagation()
      const opened = $(`#${id} .s${s}`).hasClass('active')

      $(`#${id} .season`).removeClass('active')
      $(`#${id} .episode`).hide()

      if (opened) return
      $(`#${id} .s${s}`).addClass('active')
      $(`#${id} .s${s} .episode`).show()
    },
    // USER INTERACTION: click one of the local categories
    show: (cl) => {
      $(`#locals .${cl}`).show()
      $('#locals .categories').hide()
    }
  },

  addLocalPath: () => {
    document.querySelector('#hidden-input-local').click()
  },
  removeLocalPath: () => {
    const selected = $('#settings .locals .option .paths li.selected')
    if (!selected.length) return
    Local.removePath(selected.text())
  },

  switchCollectionSize: (wasBig) => {
    console.info('Switching to %s items', wasBig ? 'smaller' : 'bigger')

    const size = {
      from: wasBig ? { sm: 6, md: 6, lg: 4 } : { sm: 6, md: 4, lg: 3 },
      to: wasBig ? { sm: 6, md: 4, lg: 3 } : { sm: 6, md: 6, lg: 4 }
    }

    $(`.col-sm-${size.from.sm}`).addClass(`col-sm-${size.to.sm}`).removeClass(`col-sm-${size.from.sm}`)
    $(`.col-md-${size.from.md}`).addClass(`col-md-${size.to.md}`).removeClass(`col-md-${size.from.md}`)
    $(`.col-lg-${size.from.lg}`).addClass(`col-lg-${size.to.lg}`).removeClass(`col-lg-${size.from.lg}`)
  },

  setMPVPath: () => {
    document.querySelector('#mpvpath').click()
  },

  showAbout: () => {
    $('#about').show()
  },
  closeAbout: () => {
    $('#about').hide()
  },

  showWarning: () => {
    if (DB.get('legal_notice_read')) return

    $('#legal').show()
  },
  hideWarning: () => {
    $('#legal').hide()
    DB.store(true, 'legal_notice_read')
  },

  bigPictureScale: { // zoomLevel is broken on NWJS 0.57.0
    1: {
      zoomLevel: 3.99,
      osc: 1.5
    },
    1.25: {
      zoomLevel: 2.99,
      osc: 1.3
    },
    1.5: {
      zoomLevel: 1.99,
      osc: 1.1
    },
    1.75: {
      zoomLevel: 0.99,
      osc: 1.0
    },
    2: {
      zoomLevel: 0.01,
      osc: 1.2
    },
    2.25: {
      zoomLevel: 0.01,
      osc: 1.5
    }
  },

  bigPicture: (onStart) => {
    if (!DB.get('bigPicture')) {
      console.info('Entering Big Picture mode', Interface.bigPictureScale[nw.Screen.screens[0].scaleFactor])
      win.zoomLevel = Interface.bigPictureScale[nw.Screen.screens[0].scaleFactor] && !DB.get('bpzoomdisable') ? Interface.bigPictureScale[nw.Screen.screens[0].scaleFactor].zoomLevel : 0.01
      win.enterFullscreen()
      $('.nav.bigpicture > div').addClass('fa-compress').removeClass('fa-arrows-alt')
      DB.store(true, 'bigPicture')

      if (onStart) {
        $('.nav.bigpicture').hide()
        $('.nav.exitapp').show()
        DB.store(false, 'bigPicture')
      }
    } else {
      console.info('Exiting Big Picture mode')
      win.zoomLevel = 0.01
      win.leaveFullscreen()
      $('.nav.bigpicture > div').addClass('fa-arrows-alt').removeClass('fa-compress')
      DB.store(false, 'bigPicture')
    }

    Misc.sleep(400).then(() => Player.setMPV(DB.get('mpv')))
  },
  playerPopup: () => {
    nw.Window.open('app/html/playerPopup.html', {
      width: 365,
      height: 65,
      always_on_top: true,
      resizable: false,
      show: false,
      frame: false,
      show_in_taskbar: false,
      transparent: true
    }, function (newWin) {
      // newWin.showDevTools();
      console.debug('Player popup spawned')

      nw.global.playerAPI = Player

      nw.global.playerPopup = newWin
      nw.global.playerPopup.blur()
      nw.global.playerPopup.x = screen.availWidth - 360
      nw.global.playerPopup.y = 0
      nw.global.playerPopup.on('closed', () => {
        delete nw.global.playerAPI
        delete nw.global.playerPopup
        console.debug('Player popup closed')
      })
    })
  }
}
