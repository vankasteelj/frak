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
  traktConnected: () => {
    $('#traktinit').hide()
    $('#init').show()
    $('#traktwelcome').show()

    const profile = Profiles.get(DB.sync.get('trakt_active_profile')).profile
    $('#welcomeprofile .welcomemessage').text(i18n.__('Welcome back'))
    $('#welcomeprofile .avatar').attr('src', profile.images.avatar.full)
    $('#stats #suserinfo #suserimage').attr('src', profile.images.avatar.full)
    $('#navbar .nav .avatar').css('background-image', 'url("' + profile.images.avatar.full + '")')
    $('#welcomeprofile .username').text(profile.name.split(' ')[0] || profile.username)
    $('#settings .trakt .username').text(profile.username)
    if (profile.vip || profile.vip_ep) $('#stats #suservip').show()

    $('#welcomeprofile').show()
    $('#traktwelcome .spinner').show()

    setTimeout(() => $('#traktwelcome button').show(), 20000) // display reset if still here after 20sec
    Interface.buildSwitch()
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
    $('#init').hide()
    !$('#details').is(':visible') && $('#collection').show()
    $('#navbar').show()
  },

  // USER INTERACTION: click navbar
  showMovies: () => {
    $('#navbar .nav').removeClass('active')
    $('#collection #movies').show()
    $('#collection #shows').hide()
    $('#collection #customs').hide()
    $('#collection #locals').hide()
    $('#trakt #history').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#trakt #ratings').hide()
    $('#settings').hide()
    $('#navbar .movies').addClass('active')
    DB.sync.store('movies', 'last_tab')
    DB.sync.store('movies', 'active_tab')
    window.scrollTo(0, 0)
  },
  // USER INTERACTION: click navbar
  showShows: () => {
    $('#navbar .nav').removeClass('active')
    $('#collection #shows').show()
    $('#collection #movies').hide()
    $('#collection #customs').hide()
    $('#collection #locals').hide()
    $('#trakt #history').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#trakt #ratings').hide()
    $('#settings').hide()
    $('#navbar .shows').addClass('active')
    DB.sync.store('shows', 'last_tab')
    DB.sync.store('shows', 'active_tab')
    window.scrollTo(0, 0)
  },
  // USER INTERACTION: click navbar
  showCustoms: () => {
    $('#navbar .nav').removeClass('active')
    $('#collection #shows').hide()
    $('#collection #customs').show()
    $('#collection #movies').hide()
    $('#collection #locals').hide()
    $('#trakt #history').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#trakt #ratings').hide()
    $('#settings').hide()
    $('#navbar .customs').addClass('active')
    DB.sync.store('customs', 'last_tab')
    DB.sync.store('customs', 'active_tab')
    window.scrollTo(0, 0)
  },
  // USER INTERACTION: click navbar
  showLocals: () => {
    $('#navbar .nav').removeClass('active')
    $('#collection #locals').show()
    $('#collection #shows').hide()
    $('#collection #movies').hide()
    $('#collection #customs').hide()
    $('#trakt #history').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#trakt #ratings').hide()
    $('#settings').hide()
    $('#navbar .locals').addClass('active')
    $('#locals .categories').show()
    $('#locals .items').hide()
    DB.sync.store('locals', 'last_tab')
    DB.sync.store('locals', 'active_tab')
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
    $('#collection #customs').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#trakt #ratings').hide()
    $('#navbar .settings').addClass('active')
    DB.sync.store('settings', 'active_tab')
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
        $('#collection #customs').hide()
        $('#settings').hide()
        $('#trakt #discover').hide()
        $('#trakt #stats').hide()
        $('#trakt #ratings').hide()
        $('#trakt #history').show()
      }, 0)
    })
    $('#navbar .nav').removeClass('active')
    $('#navbar .history').addClass('active')
    $('#collection #shows').hide()
    $('#collection #locals').hide()
    $('#collection #customs').hide()
    $('#collection #movies').hide()
    $('#trakt #discover').hide()
    $('#trakt #stats').hide()
    $('#trakt #ratings').hide()
    $('#settings').hide()
    DB.sync.store('history', 'active_tab')
  },
  // USER INTERACTION: click navbar
  showStats: () => {
    window.scrollTo(0, 0)
    $('#navbar .nav').removeClass('active')
    $('#navbar .stats').addClass('active')
    $('#collection #shows').hide()
    $('#collection #locals').hide()
    $('#collection #movies').hide()
    $('#collection #customs').hide()
    $('#trakt #discover').hide()
    $('#trakt #history').hide()
    $('#trakt #ratings').hide()
    $('#settings').hide()
    $('#trakt #stats').show()
    $('#trakt #stats #sloaded').hide()
    $('#trakt #stats #sloading').show()

    Stats.load().then(() => {
      $('#trakt #stats #sloading').hide()
      $('#trakt #stats #sloaded').show()
      DB.sync.store('stats', 'active_tab')
    })
  },

  // USER INTERACTION: click navbar
  showDiscover: () => {
    Discover.load.trending()
    window.scrollTo(0, 0)
    $('#navbar .nav').removeClass('active')
    $('#collection #shows').hide()
    $('#collection #locals').hide()
    $('#collection #movies').hide()
    $('#collection #customs').hide()
    $('#settings').hide()
    $('#trakt #history').hide()
    $('#trakt #stats').hide()
    $('#trakt #ratings').hide()
    $('#trakt #discover').show()
    $('#navbar .discover').addClass('active')
    DB.sync.store('discover', 'active_tab')
  },

  // USER INTERACTION: click navbar
  showRatings: () => {
    Ratings.show()
    window.scrollTo(0, 0)
    $('#navbar .nav').removeClass('active')
    $('#collection #shows').hide()
    $('#collection #locals').hide()
    $('#collection #movies').hide()
    $('#collection #customs').hide()
    $('#settings').hide()
    $('#trakt #history').hide()
    $('#trakt #stats').hide()
    $('#trakt #discover').hide()
    $('#trakt #ratings').show()
    $('#navbar .ratings').addClass('active')
    DB.sync.store('ratings', 'active_tab')
  },

  // AUTO: right click menu on movies & shows, custom list and account popup
  rightClickNav: () => {
    // right click ACCOUNT
    $('#navbar .stats').off('contextmenu').on('contextmenu', (e) => {
      Interface.switchTraktAccount()
    })

    // right click CUSTOM
    const customlabels = {}

    customlabels['Edit list on Trakt.tv'] = () => Misc.openExternal(DB.sync.get('customs_url'))
    customlabels['Refresh list'] = () => Collection.get.traktcustoms().then(Collection.get.traktcached)

    customlabels.submenu1 = {
      title: 'Sort by...',
      labels: {
        'Listed at': () => DB.app.get('traktcustomscollection').then(coll => { Collection.show.customs(Collection.sort.customs.listed(coll)); Trakt.getRatings() }),
        Year: () => DB.app.get('traktcustomscollection').then(coll => { Collection.show.customs(Collection.sort.customs.released(coll)); Trakt.getRatings() }),
        Title: () => DB.app.get('traktcustomscollection').then(coll => { Collection.show.customs(Collection.sort.customs.title(coll)); Trakt.getRatings() }),
        Rating: () => DB.app.get('traktcustomscollection').then(coll => { Collection.show.customs(Collection.sort.customs.rating(coll)); Trakt.getRatings() }),
        Rank: () => DB.app.get('traktcustomscollection').then(coll => { Collection.show.customs(Collection.sort.customs.rank(coll)); Trakt.getRatings() })
      }
    }

    // right click MOVIES
    const movielabels = {}

    // movie sorting
    movielabels.submenu1 = {
      title: 'Sort by...',
      labels: {
        'Listed at': () => DB.trakt.get('traktmoviescollection').then(coll => { Collection.show.movies(Collection.sort.movies.listed(coll)); Trakt.getRatings() }),
        Year: () => DB.trakt.get('traktmoviescollection').then(coll => { Collection.show.movies(Collection.sort.movies.released(coll)); Trakt.getRatings() }),
        Title: () => DB.trakt.get('traktmoviescollection').then(coll => { Collection.show.movies(Collection.sort.movies.title(coll)); Trakt.getRatings() }),
        Rating: () => DB.trakt.get('traktmoviescollection').then(coll => { Collection.show.movies(Collection.sort.movies.rating(coll)); Trakt.getRatings() }),
        Runtime: () => DB.trakt.get('traktmoviescollection').then(coll => { Collection.show.movies(Collection.sort.movies.runtime(coll)); Trakt.getRatings() })
      }
    }

    // right click SHOWS
    const showlabels = {}

    // show sorting
    showlabels.submenu1 = {
      title: 'Sort by...',
      labels: {
        'Most recent': () => DB.trakt.get('traktshowscollection').then(coll => { Collection.show.shows(Collection.sort.shows.nextEpisode(coll)); Trakt.getRatings() }),
        Year: () => DB.trakt.get('traktshowscollection').then(coll => { Collection.show.shows(Collection.sort.shows.firstAired(coll)); Trakt.getRatings() }),
        Title: () => DB.trakt.get('traktshowscollection').then(coll => { Collection.show.shows(Collection.sort.shows.title(coll)); Trakt.getRatings() }),
        Rating: () => DB.trakt.get('traktshowscollection').then(coll => { Collection.show.shows(Collection.sort.shows.rating(coll)); Trakt.getRatings() }),
        Runtime: () => DB.trakt.get('traktshowscollection').then(coll => { Collection.show.shows(Collection.sort.shows.runtime(coll)); Trakt.getRatings() })
      }
    }

    Trakt.getGenres().then(genres => {
      // movie genres
      const moviegenres = genres.movies
      movielabels.submenu2 = {
        title: 'Genres...',
        labels: {
          All: () => DB.trakt.get('traktmoviescollection').then(coll => { Collection.show.movies(Collection.sort.movies.listed(coll)); Trakt.getRatings() })
        }
      }
      for (const i in moviegenres) {
        movielabels.submenu2.labels[moviegenres[i].name] = () => DB.trakt.get('traktmoviescollection').then(coll => { Collection.show.movies(Collection.sort.movies.genre(moviegenres[i].slug, coll)); Trakt.getRatings() })
      }

      // show genres
      const showgenres = genres.shows
      showlabels.submenu2 = {
        title: 'Genres...',
        labels: {
          All: () => DB.trakt.get('traktshowscollection').then(coll => { Collection.show.shows(Collection.sort.shows.nextEpisode(coll)); Trakt.getRatings() })
        }
      }
      for (const i in showgenres) {
        showlabels.submenu2.labels[showgenres[i].name] = () => DB.trakt.get('traktshowscollection').then(coll => { Collection.show.shows(Collection.sort.shows.genre(showgenres[i].slug, coll)); Trakt.getRatings() })
      }
    }).finally(() => {
      // menu popup

      const custommenu = Misc.customContextMenu(customlabels)
      $('.nav.customs').off('contextmenu').on('contextmenu', (e) => {
        Interface.showCustoms()
        custommenu.popup(parseInt(e.clientX), parseInt(e.clientY))
      })

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
      from: wasBig ? Settings.grid.mainNormal : Settings.grid.mainSmall,
      to: wasBig ? Settings.grid.mainSmall : Settings.grid.mainNormal
    }

    $(`.col-${size.from.xs}`).addClass(`col-${size.to.xs}`).removeClass(`col-${size.from.xs}`)
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
    if (DB.sync.get('legal_notice_read')) return

    $('#legal').show()
  },
  hideWarning: () => {
    $('#legal').hide()
    DB.sync.store(true, 'legal_notice_read')
  },

  bigPictureScale: {
    1: {
      zoomLevel: 4,
      osc: 1.5
    },
    1.25: {
      zoomLevel: 3,
      osc: 1.3
    },
    1.5: {
      zoomLevel: 2,
      osc: 1.1
    },
    1.75: {
      zoomLevel: 1,
      osc: 1.0
    },
    2: {
      zoomLevel: 0,
      osc: 1.2
    },
    2.25: {
      zoomLevel: 0,
      osc: 1.5
    }
  },

  bigPicture: (onStart) => {
    if (!DB.sync.get('bigPicture')) {
      console.info('Entering Big Picture mode', Interface.bigPictureScale[nw.Screen.screens[0].scaleFactor])
      win.zoomLevel = Interface.bigPictureScale[nw.Screen.screens[0].scaleFactor] && !DB.sync.get('bpzoomdisable') ? Interface.bigPictureScale[nw.Screen.screens[0].scaleFactor].zoomLevel : 0
      win.enterFullscreen()
      $('.nav.bigpicture > div').addClass('fa-compress').removeClass('fa-arrows-alt')
      DB.sync.store(true, 'bigPicture')

      if (onStart) {
        $('.nav.bigpicture').hide()
        $('.nav.exitapp').show()
        DB.sync.store(false, 'bigPicture')
      }
    } else {
      console.info('Exiting Big Picture mode')
      win.zoomLevel = 0
      win.leaveFullscreen()
      $('.nav.bigpicture > div').addClass('fa-arrows-alt').removeClass('fa-compress')
      DB.sync.store(false, 'bigPicture')
    }

    Misc.sleep(400).then(() => Player.setMPV(DB.sync.get('mpv')))
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
  },
  switchTraktAccount: () => {
    $('#switchaccount').show()
    $('#switchaccount .background').off('click').on('click', () => $('#switchaccount').hide())
  },
  buildSwitch: () => {
    $('#switchaccount .accounts').html('')
    const profiles = Profiles.list()
    for (const i of profiles) {
      $('#switchaccount .accounts').append(`<div class="account" onClick="Interface.selectTraktAccount('${i.profile.username}')"><img src="${i.profile.images.avatar.full}"/><div class="accountname">${i.profile.name.split(' ')[0] || i.profile.username}</div></div>`)
    }
  },
  addTraktAccount: () => {
    DB.sync.remove('trakt_active_profile')
    Misc.restartApp()
  },
  selectTraktAccount: (username) => {
    if (DB.sync.get('trakt_active_profile') === username) {
      $('#switchaccount .background').click()
      return
    }
    DB.sync.store(username, 'trakt_active_profile')
    Misc.restartApp()
  }
}
