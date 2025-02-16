'use strict'

const Collection = {
  moviesbank: [],
  customsbank: [],
  showsbank: [],
  load: () => {
    console.info('Loading collection')

    scheduler.postTask(Collection.hiddenMovies.verify, { priority: 'background' })

    // should trakt update?
    Promise.all([
      Trakt.last_activities('watch'),
      DB.trakt.get('traktsync')
    ]).then(([activities, traktsync]) => {
      if ((activities > (traktsync || 0)) || (Date.now() - (traktsync || 0) > 12 * 60 * 60 * 1000)) { // 12 hours
        console.info('Fetching from remote server...')
        Collection.get.traktcached() // display what we have while we update
        Collection.get.traktwatched().then(() => {
          Promise.all([
            Collection.get.traktshows(),
            Collection.get.traktmovies(),
            Collection.get.traktcustoms()
          ]).then((collections) => {
            Collection.get.traktcached()
            Collection.hiddenItems.reset()
            Trakt.getRatings()
          })
        })
      } else {
        console.info('We got cached trakt data')
        Collection.get.traktcached()
        Trakt.getRatings()
      }
    }).catch(console.error)

    scheduler.postTask(Collection.get.local, { priority: 'background' })
  },

  get: {
    traktshows: (update, slug, cached) => {
      $('#navbar .shows .fa-spin').css('opacity', update ? 0 : 1)

      return new Promise((resolve) => {
        if (slug && cached) {
          resolve(Trakt.client.ondeck.updateOne(cached, slug))
        } else {
          if (update) {
            resolve(WB.get.shows().then(Trakt.client.ondeck.getAll))
          } else {
            resolve(Trakt.client.ondeck.getAll())
          }
        }
      }).then(results => {
        console.info('Trakt.tv - "show watchlist" collection recieved')

        return Promise.all([
          DB.trakt.store(Date.now(), 'traktsync'),
          DB.trakt.store(results, 'traktshows')
        ]).then(() => Collection.format.traktshows(results.shows))
      }).catch(e => {
        $('#navbar .shows .fa-spin').css('opacity', 0)
        return e
      })
    },
    traktmovies: (update) => {
      $('#navbar .movies .fa-spin').css('opacity', update ? 0 : 1)

      return Trakt.client.sync.watchlist.get({
        extended: 'full',
        type: 'movies'
      }).then(results => {
        console.info('Trakt.tv - "movie watchlist" collection recieved')

        return Promise.all([
          DB.trakt.store(Date.now(), 'traktsync'),
          DB.trakt.store(results, 'traktmovies')
        ]).then(() => Collection.format.traktmovies(results))
      }).catch(e => {
        $('#navbar .movies .fa-spin').css('opacity', 0)
        return e
      })
    },
    traktcustoms: (update) => {
      if (!DB.sync.get('customs_params') || !DB.sync.get('use_customs')) return Promise.resolve()

      $('#navbar .customs .fa-spin').css('opacity', update ? 0 : 1)
      return Trakt.client.users.list.items.get(Object.assign(DB.sync.get('customs_params'), { extended: 'full' })).then(results => {
        console.info('Trakt.tv - "custom list" collection recieved')

        return DB.app.store(results, 'traktcustoms').then(() => Collection.format.traktcustoms(results))
      }).catch(e => {
        $('#navbar .customs .fa-spin').css('opacity', 0)
        return e
      })
    },
    traktcached: (update) => {
      Promise.all([
        DB.trakt.get('traktmoviescollection'),
        DB.trakt.get('traktshowscollection'),
        DB.app.get('traktcustomscollection'),
        DB.trakt.get('moviesbank'),
        DB.trakt.get('showsbank'),
        DB.app.get('customsbank')
      ]).then(([movies, shows, customs, moviesbank, showsbank, customsbank]) => {
        if (!shows && !movies) return

        Collection.moviesbank = moviesbank
        Collection.showsbank = showsbank
        Collection.customsbank = customsbank

        Collection.show.movies(movies)
        Collection.show.shows(shows)
        DB.sync.get('use_customs') && Collection.show.customs(customs)
        DB.trakt.get('traktratings').then(Items.applyRatings)

        if (update) return

        if (!Player.mpv && !(process.platform === 'win32' && fs.existsSync('./mpv/mpv.exe'))) {
          Interface.requireMPV()
        } else {
          Interface.showMain()
        }
      })
    },
    local: () => {
      return DB.app.get('local_library').then(collection => {
        const method = collection ? 'update' : 'scan'

        if (!collection) {
          $('#navbar .locals .fa-spin').css('opacity', 1)
          $('#collection #locals .waitforlibrary').show()
          $('#collection #locals .waitforlibrary .spinner').css('visibility', 'visible')
          $('#collection #locals .waitforlibrary .notfound').hide()
          $('#collection #locals .waitforlibrary .scanning').show()
        } else {
          $('#locals .refreshing').show()
        }

        Local.scans++
        return Local[method](collection)
      }).then(results => {
        console.info('Local library collection recieved')
        Local.scans--

        return DB.app.store(results, 'local_library')
      }).then(results => {
        if (Local.scans <= 0) {
          $('#navbar .locals .fa-spin').css('opacity', 0)
          $('#locals .refreshing').hide()
        }

        if (Network.peers.length) {
          Network.init()
          return Network.rearrangeLocals()
        } else {
          return Collection.format.locals(results)
        }
      }).then(Network.init).catch(console.error)
    },
    history: () => {
      $('#navbar .history .fa-spin').css('opacity', 1)
      return Promise.all([
        Trakt.last_activities('history'),
        DB.trakt.get('trakthistory'),
        DB.trakt.get('traktsynchistory')
      ]).then(([activities, trakthistory, traktsynchistory]) => {
        if (!trakthistory || activities > (traktsynchistory || 0)) {
          console.info('Fetching history from remote server')
          return Trakt.client.sync.history.get({
            limit: 23, // because bootstap column is 12 (23+1 show more)
            page: 1,
            extended: 'full'
          }).then(results => {
            DB.trakt.store(results, 'trakthistory')
            DB.trakt.store(activities, 'traktsynchistory')
            return results
          })
        } else {
          console.info('Using cached history')
          return trakthistory
        }
      }).then(results => {
        console.info('Trakt.tv - history recieved', results)
        return Collection.format.trakthistory(results)
      }).then((collection) => {
        return Collection.show.history(collection)
      }).then((r) => {
        DB.trakt.get('traktratings').then(Items.applyRatings)
        return r
      }).catch(console.error)
    },
    historyMore: () => {
      $('#history .showMore_button .fa').addClass('fa-spin fa-circle-o-notch')

      const page = parseInt($('#history .grid-item').length / 24) + 1
      return Trakt.client.sync.history.get({
        limit: 24, // because bootstap column is 12
        page: page,
        extended: 'full'
      }).then(results => {
        console.info('Trakt.tv - history (p.%s) recieved', page, results)
        return Collection.format.trakthistory(results)
      }).then(collection => {
        return Collection.show.history(collection, true)
      }).then((r) => {
        DB.trakt.get('traktratings').then(Items.applyRatings)
        return r
      }).catch(console.error)
    },
    traktwatched: () => {
      return Trakt.client.sync.watched({ type: 'shows', extended: 'full,noseasons' })
        .then(WB.store.shows)
        .then(() => Trakt.client.sync.watched({ type: 'movies' }))
        .then(WB.store.movies)
    }
  },

  format: {
    traktmovies: (movies = []) => {
      let collection = []
      const bank = []

      return Promise.all(movies.map((movie) => {
        return Images.get.movie(movie.movie.ids).then(images => {
          collection.push(movie)
          bank.push(movie.movie.ids.slug)
          return movie
        })
      })).then(() => {
        console.info('All images found for trakt movies')

        // sort
        collection = Collection.sort.movies.listed(collection)

        DB.trakt.store(collection, 'traktmoviescollection')
        DB.trakt.store(bank, 'moviesbank')
        $('#navbar .movies .fa-spin').css('opacity', 0)
        return collection
      }).catch(console.error)
    },
    traktshows: (shows = []) => {
      let collection = []
      const bank = []

      return Promise.all(shows.map((show) => {
        return Images.get.show(show.show.ids).then(images => {
          collection.push(show)
          bank.push(show.show.ids.slug)
          return show
        })
      })).then(() => {
        console.info('All images found for trakt shows')

        // sort
        collection = Collection.sort.shows.nextEpisode(collection)

        DB.trakt.store(collection, 'traktshowscollection')
        DB.trakt.store(bank, 'showsbank')
        $('#navbar .shows .fa-spin').css('opacity', 0)
        return collection
      }).catch(console.error)
    },
    traktcustoms: (items = []) => {
      let collection = []
      const bank = []

      return Promise.all(items.map((item) => {
        if (['movie', 'show'].indexOf(item.type) === -1) return null
        return Images.get[item.type](item[item.type].ids).then(images => {
          collection.push(item)
          bank.push(item[item.type].ids.slug)
          return item
        })
      })).then(() => {
        console.info('All images found for trakt custom list')

        collection = Collection.sort.customs.rank(collection)

        DB.app.store(collection, 'traktcustomscollection')
        DB.app.store(bank, 'customsbank')
        $('#navbar .customs .fa-spin').css('opacity', 0)
        return collection
      }).catch(console.error)
    },

    locals: (items = []) => {
      const collection = Local.buildVideoLibrary(items)

      $('#collection #locals .waitforlibrary').show()
      $('#collection #locals .waitforlibrary .spinner').css('visibility', 'visible')
      $('#collection #locals .categories .movies').hide()
      $('#collection #locals .categories .shows').hide()
      $('#collection #locals .categories .unmatched').hide()

      const movies = Misc.sortAlphabetical(collection.movies)
      DB.app.store(movies, 'local_movies')
      Collection.show.locals.movies(movies)

      const shows = Misc.sortAlphabetical(collection.shows)
      DB.app.store(shows, 'local_shows')
      Collection.show.locals.shows(shows)

      const unmatched = Misc.sortAlphabetical(collection.unmatched)
      Collection.show.locals.unmatched(unmatched)

      if (!movies.length && !shows.length && !unmatched.length) {
        $('#collection #locals .waitforlibrary .spinner').css('visibility', 'hidden')
        $('#collection #locals .waitforlibrary .scanning').hide()
        $('#collection #locals .waitforlibrary .notfound').show()
      }
    },

    trakthistory: (items = []) => {
      let collection = []
      const dupes = []

      return Promise.all(items.map((item, index) => {
        const type = item.type === 'movie' ? 'movie' : 'show'

        item.index = index
        collection.push(item)

        if (dupes.indexOf(item[type].ids.slug) !== -1) {
          return item
        } else {
          dupes.push(item[type].ids.slug)
          return Images.get[type](item[type].ids)
        }
      })).then(() => {
        console.info('All images found for the history')

        // sort
        collection = collection.sort(function (a, b) {
          if (a.index < b.index) {
            return -1
          }
          if (a.index > b.index) {
            return 1
          }
          return 0
        })

        DB.trakt.store(collection, 'trakthistorycollection')
        $('#navbar .history .fa-spin').css('opacity', 0)
        return collection
      }).catch(console.error)
    }
  },

  search: () => {
    if (['movies', 'shows', 'customs'].indexOf(DB.sync.get('active_tab')) === -1) return

    const container = $('#coll-search')
    const input = $('#coll-search input')
    let timestamp = 0
    let lastSearch = false
    let searchCount = 0
    let searchLoop = false

    container.show()
    input.focus()

    // actual search
    const displayElements = (text) => {
      if (!text) text = ''
      $('div.grid-item').filter(function () {
        $(this).hide()
        return $(this).text().toLowerCase().indexOf(text) > -1
      }).show()
    }

    // search logic: on keydown check every 500ms is the input has change
    // fire a search when a new input is available and the person is not actively typing
    const clearSearch = () => {
      clearInterval(searchLoop)
      searchLoop = false
      searchCount = 0
      timestamp = 0
    }
    const search = () => {
      const split = input.val().split(' ').join('')
      if (timestamp === 0 || Date.now() - timestamp < 500 || lastSearch === split) {
        searchCount++
        if (searchCount > 10) clearSearch()
      } else {
        lastSearch = split
        // The actual search starts here
        console.debug('Search for', input.val())
        displayElements(input.val())
        clearSearch()
      }
    }
    input.on('keydown', (e) => {
      timestamp = Date.now()
      if (searchLoop === false) searchLoop = setInterval(search, 500)
    })

    // close search if clicked elsewhere
    $(document).on('click', (e) => {
      if ($(e.target).closest('#coll-search').length === 0) {
        clearSearch()
        container.hide()
        $(document).off('click')
        input.off('keydown')
        input.val('')
        displayElements()
      }
    })
  },

  show: {
    shows: (shows = []) => {
      Promise.all([
        DB.trakt.get('showsbank'),
        DB.trakt.get('hiddenitems')
      ]).then(([showsbank, hiddenitems]) => {
        Collection.showsbank = showsbank || []
        const items = []
        for (const show of shows) {
          if (hiddenitems && hiddenitems[show.show.ids.slug]) continue
          items.push(Items.constructShow(show))
        }
        $('#collection #shows').html('').append(items)

        Misc.sleep(800).then(() => {
          Misc.events.emit('loadNext')
        })

        if (!$('#collection #shows .grid-item').length) {
          return $('#collection #shows').append(Items.constructMessage('No episode to display. Start watching a TV show or add one to your watchlist, and check back here.'))
        }
      })
    },
    movies: (movies = []) => {
      Promise.all([
        DB.trakt.get('moviesbank'),
        DB.trakt.get('hiddenmovies'),
        DB.trakt.get('hiddenitems')
      ]).then(([moviesbank, hiddenmovies, hiddenitems]) => {
        if (!hiddenmovies) hiddenmovies = {}
        Collection.moviesbank = moviesbank || []
        const untrack = []
        const items = []
        for (const movie of movies) {
          if (!movie.movie.released || new Date(movie.movie.released.split('-')).valueOf() > Date.now() || hiddenmovies[movie.movie.ids.slug] || (hiddenitems && hiddenitems[movie.movie.ids.slug])) {
            untrack.push(movie.movie.title)
            continue
          }
          items.push(Items.constructMovie(movie))
        }
        $('#collection #movies').html('').append(items)

        if (!$('#collection #movies .grid-item').length) {
          return $('#collection #movies').append(Items.constructMessage('No movie to display, add one to your watchlist and check back here.'))
        }

        untrack.length && console.info('Some movies are hidden or not released yet, not showing:', untrack.join(', '))
      })
    },
    customs: (collection = []) => {
      DB.app.get('customsbank').then(customsbank => {
        Collection.customsbank = customsbank || []
        const items = []
        const untrack = []
        for (const item of collection) {
          if (item.type === 'movie') {
            if (!item.movie.released || new Date(item.movie.released.split('-')).valueOf() > Date.now()) {
              untrack.push(item.movie.title)
              continue
            }
            items.push(Items.constructCustomMovie(item))
          }
          if (item.type === 'show') {
            if (!item.show.first_aired) {
              untrack.push(item.show.title)
              continue
            }
            items.push(Items.constructCustomShow(item))
          }
        }
        $('#collection #customs').html('').append(items)

        if (!$('#collection #customs .grid-item').length) {
          return $('#collection #customs').append(Items.constructMessage('Nothing to display, the Custom List seems empty.'))
        }

        untrack.length && console.info('Some movies/tv shows are hidden or not released yet, not showing:', untrack.join(', '))
      }).catch(err => {
        console.error(err)
        Collection.get.traktcustoms().then(Collection.get.traktcached)
      })
    },
    locals: {
      movies: (movies = []) => {
        if (!movies.length) return
        $('#collection #locals .waitforlibrary').hide()
        $('#collection #locals .categories .movies').show()
        const items = []
        for (const movie of movies) {
          if ($(`#${Misc.slugify(movie.path)}`).length) continue
          items.push(Items.constructLocalMovie(movie))
        }
        $('#collection #locals .movies .row').html('').append(items)
      },
      shows: (shows = []) => {
        if (!shows.length) return
        $('#collection #locals .waitforlibrary').hide()
        $('#collection #locals .categories .shows').show()
        const items = []
        for (const show of shows) {
          items.push(Items.constructLocalShow(show))
        }
        $('#collection #locals .shows .row').html('').append(items)
      },
      unmatched: (unmatched = []) => {
        if (!unmatched.length) return
        $('#collection #locals .waitforlibrary').hide()
        $('#collection #locals .categories .unmatched').show()
        const items = []
        for (const unmatch of unmatched) {
          items.push(Items.constructLocalUnmatched(unmatch))
        }
        $('#collection #locals .unmatched .row').html('').append(items)
      }
    },
    history: (collection = [], update = false) => {
      if (update) {
        $('#trakt #history #showMore').remove()
      } else {
        $('#trakt #history').html('')
      }

      const items = []
      for (const i of collection) {
        if (i.type === 'movie') {
          items.push(Items.constructHistoryMovie(i))
        } else {
          items.push(Items.constructHistoryShow(i))
        }
      }

      if (!items.length) {
        items.push(Items.constructMessage('No history found, watch something before checking back here.'))
      } else {
        items.push(Items.constructHistoryMore())
      }

      $('#trakt #history').append(items)
    },
    ratings: (collection = [], update = false, filter = false) => {
      if (update) {
        $('#trakt #ratings .row #showMore').remove()
      } else {
        $('#trakt #ratings .row').html('')
      }

      const items = []
      for (const i of collection) {
        items.push(Items.constructRatingsItem(i))
      }

      if (!items.length) {
        if (!update) items.push(Items.constructMessage('No ratings history found, rate something before checking back here.'))
      } else {
        items.push(Items.constructRatingsMore(filter))
      }

      $('#trakt #ratings .row').append(items)
    }
  },

  hiddenMovies: {
    verify: () => {
      DB.trakt.get('hiddenmovies').then((db = {}) => {
        for (const movie in db) { if (db[movie] < Date.now()) delete db[movie] }
        DB.trakt.store(db, 'hiddenmovies')
      })
    },
    add: (slug, time) => {
      return DB.trakt.get('hiddenmovies').then((db = {}) => {
        db[slug] = time
        DB.trakt.store(db, 'hiddenmovies')
        return true
      })
    },
    reset: () => {
      DB.trakt.store({}, 'hiddenmovies')
    }
  },

  hiddenItems: {
    add: (slug) => {
      DB.trakt.get('hiddenitems').then((db = {}) => {
        db[slug] = true
        DB.trakt.store(db, 'hiddenitems')
      })
    },
    reset: () => {
      DB.trakt.store({}, 'hiddenitems')
    }
  },

  sort: {
    customs: {
      rank: (items) => {
        return items.sort(function (a, b) {
          if (a.rank > b.rank) {
            return 1
          }
          if (a.rank < b.rank) {
            return -1
          }
          return 0
        })
      },
      rating: (items) => {
        return items.sort(function (a, b) {
          if (((a.show && a.show.rating) || (a.movie && a.movie.rating)) > ((b.show && b.show.rating) || (b.movie && b.movie.rating))) {
            return -1
          }
          if (((a.show && a.show.rating) || (a.movie && a.movie.rating)) < ((b.show && b.show.rating) || (b.movie && b.movie.rating))) {
            return 1
          }
          return 0
        })
      },
      title: (items) => {
        return items.sort(function (a, b) {
          if (((a.show && a.show.title) || (a.movie && a.movie.title)) < ((b.show && b.show.title) || (b.movie && b.movie.title))) {
            return -1
          }
          if (((a.show && a.show.title) || (a.movie && a.movie.title)) > ((b.show && b.show.title) || (b.movie && b.movie.title))) {
            return 1
          }
          return 0
        })
      },
      released: (items) => {
        return items.sort(function (a, b) {
          if (((a.show && a.show.year) || (a.movie && a.movie.year)) > ((b.show && b.show.year) || (b.movie && b.movie.year))) {
            return -1
          }
          if (((a.show && a.show.year) || (a.movie && a.movie.year)) < ((b.show && b.show.year) || (b.movie && b.movie.year))) {
            return 1
          }
          return 0
        })
      },
      listed: (items) => {
        return items.sort(function (a, b) {
          if (a.listed_at > b.listed_at) {
            return -1
          }
          if (a.listed_at < b.listed_at) {
            return 1
          }
          return 0
        })
      }
    },
    shows: {
      nextEpisode: (shows) => {
        return shows.sort(function (a, b) {
          if (a.next_episode.first_aired > b.next_episode.first_aired) {
            return -1
          }
          if (a.next_episode.first_aired < b.next_episode.first_aired) {
            return 1
          }
          return 0
        })
      },
      firstAired: (shows) => {
        return shows.sort(function (a, b) {
          if (a.show.first_aired > b.show.first_aired) {
            return -1
          }
          if (a.show.first_aired < b.show.first_aired) {
            return 1
          }
          return 0
        })
      },
      title: (shows) => {
        return shows.sort(function (a, b) {
          if (a.show.title < b.show.title) {
            return -1
          }
          if (a.show.title > b.show.title) {
            return 1
          }
          return 0
        })
      },
      rating: (shows) => {
        return shows.sort(function (a, b) {
          if (a.show.rating > b.show.rating) {
            return -1
          }
          if (a.show.rating < b.show.rating) {
            return 1
          }
          return 0
        })
      },
      runtime: (shows) => {
        return shows.sort(function (a, b) {
          if (a.show.runtime < b.show.runtime) {
            return -1
          }
          if (a.show.runtime > b.show.runtime) {
            return 1
          }
          return 0
        })
      },
      genre: (genre, shows) => {
        return shows.filter(a => a.show.genres.indexOf(genre) !== -1)
      }
    },
    movies: {
      listed: (movies) => {
        return movies.sort(function (a, b) {
          if (a.listed_at > b.listed_at) {
            return -1
          }
          if (a.listed_at < b.listed_at) {
            return 1
          }
          return 0
        })
      },
      title: (movies) => {
        return movies.sort(function (a, b) {
          if (a.movie.title < b.movie.title) {
            return -1
          }
          if (a.movie.title > b.movie.title) {
            return 1
          }
          return 0
        })
      },
      released: (movies) => {
        return movies.sort(function (a, b) {
          if (a.movie.released > b.movie.released) {
            return -1
          }
          if (a.movie.released < b.movie.released) {
            return 1
          }
          return 0
        })
      },
      rating: (movies) => {
        return movies.sort(function (a, b) {
          if (a.movie.rating > b.movie.rating) {
            return -1
          }
          if (a.movie.rating < b.movie.rating) {
            return 1
          }
          return 0
        })
      },
      genre: (genre, movies) => {
        return movies.filter(a => a.movie.genres.indexOf(genre) !== -1)
      },
      runtime: (items) => {
        return items.sort(function (a, b) {
          if (a.movie.runtime < b.movie.runtime) {
            return -1
          }
          if (a.movie.runtime > b.movie.runtime) {
            return 1
          }
          return 0
        })
      }
    }
  }
}
