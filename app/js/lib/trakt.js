'use strict'

const Trakt = {
  client: new (require('trakt.tv'))({
    client_id: Settings.apikeys.trakt_id,
    client_secret: Settings.apikeys.trakt_secret,
    plugins: {
      ondeck: require('trakt.tv-ondeck'),
      matcher: require('trakt.tv-matcher')
    },
    debug: true
  }),

  reconnect: () => {
    const auth = DB.sync.get('trakt_active_profile')
    if (!auth) {
      $('#init').show()
      if (Profiles.list().length !== 0) $('#traktinit .existingaccounts').css('display', 'inline-flex')
    } else {
      Trakt.client.import_token(Profiles.get(auth).auth).then(Trakt.connected).catch((err) => {
        console.debug('There was an error in Trakt authentication', err)
        Trakt.disconnect()
      })
    }
  },

  login: () => {
    console.info('Trying to log into trakt.tv')
    Trakt.client.get_codes().then(poll => {
      console.info('Opening trakt.tv auth url')
      Interface.traktLogin(poll)
      return Trakt.client.poll_access(poll)
    }).then(Profiles.add).then(Trakt.connected).catch(console.error)
  },

  disconnect: () => {
    Profiles.disconnect(DB.sync.get('trakt_active_profile'))
    Misc.restartApp()
  },

  connected: () => {
    console.info('Trakt is connected')

    Interface.focus(true)
    // Notify.requestAttention()

    Interface.traktConnected(DB.sync.get('trakt_active_profile'))
    Collection.load()
  },

  last_activities: (type) => {
    let cached = false
    return DB.trakt.get('traktlastactivities').then(cachedData => {
      if (cachedData && (cachedData.ttl > Date.now())) {
        console.debug('We got cached trakt last_activities')
        cached = true
        return cachedData
      } else {
        return Trakt.client.sync.last_activities()
      }
    }).then(results => {
      if (!cached) {
        results.ttl = Date.now() + (1000 * 10) // 10s cache, avoid multiple calls
        DB.trakt.store(results, 'traktlastactivities')
      }

      if (type === 'rate') {
        return Math.max(
          new Date(results.movies.rated_at).valueOf(),
          new Date(results.shows.rated_at).valueOf()
        )
      }

      if (type === 'history') {
        return Math.max(
          new Date(results.episodes.watched_at).valueOf(),
          new Date(results.movies.watched_at).valueOf()
        )
      }

      return Math.max(
        new Date(results.episodes.watchlisted_at).valueOf(),
        new Date(results.shows.watchlisted_at).valueOf(),
        new Date(results.movies.watchlisted_at).valueOf(),
        new Date(results.episodes.watched_at).valueOf(),
        new Date(results.movies.watched_at).valueOf()
      )
    }).catch(console.error)
  },

  getRatings: () => {
    return Promise.all([
      DB.trakt.get('traktratings'),
      DB.trakt.get('traktsyncrating'),
      Trakt.last_activities('rate')
    ]).then(([traktratings, traktsyncrating, activities]) => {
      if (!traktratings || activities > (traktsyncrating || 0)) {
        console.info('Fetching ratings from remote server')
        return Trakt.client.sync.ratings.get({ extended: 'full' }).then(ratings => {
          DB.trakt.store(ratings, 'traktratings')
          DB.trakt.store(Date.now(), 'traktsyncrating')
          Items.applyRatings(ratings)
          return ratings
        })
      } else {
        console.info('Using cached ratings')
        return traktratings
      }
    })
  },

  rate: (method, item, score) => {
    let model, type

    if (item.metadata) {
      // local
      if (item.metadata.movie) {
        // local movie
        model = item.metadata.movie
        type = 'movie'
      } else {
        // local episode
        model = item.metadata.show
        type = 'show'
      }
    } else {
      // collection
      if (item.movie) {
        // collection movie
        model = item.movie
        type = 'movie'
      } else {
        // collection episode
        model = item.show
        type = 'show'
      }
    }

    const data = {
      rating: score,
      ids: model.ids
    }
    const post = {}
    post[type + 's'] = [data]

    console.info('Trakt - %s rating for %s', method, model.ids.slug)

    return Promise.all([
      DB.trakt.get('traktratings'),
      Trakt.client.sync.ratings[method](post)
    ]).then(([ratings, response]) => {
      // remove
      ratings = ratings.filter(i => {
        if (!i[type]) {
          return true
        } else {
          return i[type].ids.slug !== model.ids.slug
        }
      })

      // add if needed
      if (method === 'add') {
        const pushable = {
          rated_at: (new Date()).toISOString(),
          rating: score,
          type: type
        }
        pushable[type] = {
          ids: model.ids,
          title: model.title,
          year: model.year
        }
        ratings.push(pushable)
      }

      DB.trakt.store(ratings, 'traktratings')
      Items.applyRatings(ratings)
    })
  },

  reload: (update, type, slug) => {
    console.info('Trakt reload')
    console.debug('Trakt reload (update = %s / type = %s / slug = %s)', update, type, slug)
    const username = DB.sync.get('trakt_active_profile')

    return Promise.all([
      DB.trakt.get('traktsyncrating'),
      DB.trakt.get('traktratings'),
      DB.trakt.get('traktsync'),
      DB.trakt.get('traktshowscollection'),
      DB.trakt.get('traktshows'),
      DB.trakt.get('traktmoviescollection'),
      DB.trakt.get('traktmovies')
    ]).then(([traktsyncrating, traktratings, traktsync, traktshowscollection, traktshows, traktmoviescollection, traktmovies]) => {
      const cached = {
        movies: traktmovies,
        moviescollection: traktmoviescollection,
        shows: traktshows,
        showscollection: traktshowscollection,
        sync: traktsync,
        syncrating: traktsyncrating,
        ratings: traktratings
      }

      if (!update) {
        DB.trakt.remove('traktsyncrating')
        DB.trakt.remove('traktratings')
      }

      const handleError = (e) => {
        console.error('Trakt reload failed', e)
        DB.trakt.store(cached.movies, 'traktmovies')
        DB.trakt.store(cached.moviescollection, 'traktmoviescollection')
        DB.trakt.store(cached.shows, 'traktshows')
        DB.trakt.store(cached.showscollection, 'traktshowscollection')
        DB.trakt.store(cached.sync, 'traktsync')
        DB.trakt.store(cached.syncrating, 'traktsyncrating')
        DB.trakt.store(cached.ratings, 'traktratings')
      }

      switch (type) {
        case 'episode':
        case 'episodes':
        case 'show':
        case 'shows':
          return Promise.all([
            DB.trakt.remove('traktshows'),
            DB.trakt.remove('traktshowscollection'),
            DB.trakt.remove('traktsync')
          ]).then(() => {
            return Collection.get.traktshows(update, slug, cached.shows)
          }).then(collection => {
            Trakt.getRatings()
            Collection.get.traktcached(update)
            return [collection]
          }).catch(handleError)
        case 'movie':
        case 'movies':
          return Promise.all([
            DB.trakt.remove('traktmovies'),
            DB.trakt.remove('traktmoviescollection'),
            DB.trakt.remove('traktsync')
          ]).then(() => {
            return Collection.get.traktmovies(update)
          }).then(collection => {
            Trakt.getRatings()
            Collection.get.traktcached(update)
            return [collection]
          }).catch(handleError)
        default:
          return Promise.all([
            DB.trakt.remove('traktmovies'),
            DB.trakt.remove('traktmoviescollection'),
            DB.trakt.remove('traktshows'),
            DB.trakt.remove('traktshowscollection'),
            DB.trakt.remove('traktsync')
          ]).then(() => {
            return Promise.all([
              Collection.get.traktshows(update),
              Collection.get.traktmovies(update)
            ])
          }).then((collections) => {
            if (Misc.isError(collections[0]) || Misc.isError(collections[1])) {
              console.info(collections)
              throw new Error('Trakt.reload failed')
            }

            Trakt.getRatings()
            Collection.get.traktcached(update)

            return collections
          }).catch(handleError)
      }
    })
  },

  scrobble: (action) => {
    if (!Player.config.model) {
      return
    }

    let progress = (Player.config.states && Player.config.states['percent-pos']) || 0
    progress = parseFloat(progress.toFixed(2))

    let model, type, local

    if (Player.config.model.metadata) {
      // local
      local = true
      if (Player.config.model.metadata.movie) {
        // local movie
        model = Player.config.model.metadata.movie
        type = 'movie'
      } else {
        // local episode
        model = Player.config.model.metadata.episode
        type = 'episode'
      }
    } else {
      // collection
      if (Player.config.model.movie) {
        // collection movie
        model = Player.config.model.movie
        type = 'movie'
      } else {
        // collection episode
        model = Player.config.model.next_episode
        type = 'episode'
      }
    }

    new Promise(resolve => {
      if (type === 'episode' && !model.ids) { // this is s01e01 from Discover
        console.log('Trakt - scrobble needs episode.ids: fetching')
        return Trakt.client.episodes.summary({ id: Player.config.model.show.ids.slug, season: Player.config.model.next_episode.season, episode: Player.config.model.next_episode.number }).then(res => {
          Player.config.model.next_episode = res
          model = res
          return resolve()
        })
      } else {
        return resolve()
      }
    }).then(() => {
      const post = {
        progress: progress
      }
      const item = {
        ids: model.ids
      }

      post[type] = item

      console.info('Trakt - scrobble %s (%s%)', action, progress)
      Trakt.client.scrobble[action](post).catch(console.error)
   
      // it's from a custom list and needs to be removed
      if (progress > 80 && action === 'stop') {
        Details.buttonAsWatched()
        Details.autoRate()
        if (Player.config.model.origin && Player.config.model.origin !== 'watchlist') {
          let item = Player.config.model
          return Misc.sleep(1000).then(() => {
            Trakt.removeFromWatchlist(item)
            return
          })
        }
      }
    }).then(() => {
      if (progress > 80 && action === 'stop') {
        if (local) {
          // local item
          if (type === 'episode') {
            Details.loadLocalNext()
          }
        } else {
          // trakt list
          if (type === 'episode') {
            requestIdleCallback(() => {
              $('#details-sources').hide()
              $('#details-loading').hide()
              $('#details-spinner').show()
            })

            // display spinner on list
            $(`#collection #${Details.model.show.ids.slug}`).append('<div class="item-spinner"><div class="fa fa-spin fa-refresh"></div>')

            Misc.sleep(1500).then(() => {
              return Trakt.reload(true, type, Details.model.show.ids.slug)
            }).then(() => {
              Misc.events.on('loadNext', () => {
                Details.loadNext(true)
                Misc.events.removeAllListeners()
              })
            })
          } else {
            $(`#collection #${Details.model.movie.ids.slug}`).hide()
          }
        }
      }
    })
  },
  getGenres: () => {
    const cached = DB.sync.get('traktgenres')
    if (cached && (cached.ttl > Date.now())) {
      console.debug('We got cached trakt genres')
      return Promise.resolve(cached)
    }

    const genres = {}
    return Trakt.client.genres({ type: 'movies' }).then(moviegenres => {
      genres.ttl = Date.now() + (1000 * 60 * 60 * 24 * 7) // 7 days cache
      genres.movies = moviegenres
      return Trakt.client.genres({ type: 'shows' })
    }).then(showgenres => {
      genres.shows = showgenres
      DB.sync.store(genres, 'traktgenres')
      return genres
    }).catch(err => {
      console.error('Unable to get genres from Trakt', err)
    })
  },
  customs: {
    available: {},
    loaded: {},
    setup: () => {
      Trakt.client.users.lists.get({username: 'me'}).then(lists => {
        for (const i in lists) {
          const list = lists[i]
          const item = '<div class="option">' +
            `<div class="text">${list.name}</div>` +
            '<div class="action">' +
                `${i18n.__('no')}&nbsp;` +
                '<label class="switch">' +
                    `<input id="${list.ids.slug}" type="checkbox">` +
                    '<span class="slider round"></span>' +
                '</label>' +
                `&nbsp;${i18n.__('yes')}` +
            '</div>' +
          '</div>'
        
          $('#settings .custom').append(item)
          Trakt.customs.available[list.ids.slug] = list

          $(`#${list.ids.slug}`).off('click').on('click', (evt) => {
            const isActive = evt.target.checked
            DB.sync.store(isActive, list.ids.slug)
      
            if (isActive) {
              // ACTIVATE
              console.info('Lists - using %s', list.name)
              Trakt.customs.loaded[list.ids.slug] = list
            } else {
              // DISABLE
              console.info('Lists - disabling %s', list.name)
              delete Trakt.customs.loaded[list.ids.slug]
            }
          })

          if (DB.sync.get(list.ids.slug)) {
            $(`#${list.ids.slug}`).click()
          }
        }
      })
    },
  },

  removeFromWatchlist: (item) => {
    const type = item.movie ? 'movie' : 'show'
    let traktObj = {}
    traktObj[type+'s'] = [item[type]]

    if (item.origin === 'watchlist') {
      return Trakt.client.sync.watchlist.remove(traktObj)
    } else {
      traktObj.username = 'me'
      traktObj.id = item.origin
      return Trakt.client.users.list.items.remove(traktObj)
    }
  }
}
