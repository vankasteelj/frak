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
    const auth = DB.app.get('trakt_active_profile')
    if (!auth) {
      $('#init').show()
      if (Profiles.list().length !== 0) $('#traktinit .existingaccounts').css('display', 'inline-flex')
    } else {
      Trakt.client.import_token(Profiles.get(auth).auth).then(Trakt.connected)
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
    Profiles.disconnect(DB.app.get('trakt_active_profile'))
    win.reload()
  },

  connected: () => {
    console.info('Trakt is connected')

    Interface.focus(true)
    // Notify.requestAttention()

    Interface.traktConnected(DB.app.get('trakt_active_profile'))
    Collection.load()
  },

  last_activities: (type) => {
    let cached = false
    return new Promise((resolve, reject) => {
      const cachedData = DB.trakt.get('traktlastactivities')
      if (cachedData && (cachedData.ttl > Date.now())) {
        console.debug('We got cached trakt last_activities')
        cached = true
        resolve(cachedData)
      } else {
        resolve(Trakt.client.sync.last_activities())
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
    return Trakt.last_activities('rate').then(activities => {
      if (!DB.trakt.get('traktratings') || activities > (DB.trakt.get('traktsyncrating') || 0)) {
        console.info('Fetching ratings from remote server')
        return Trakt.client.sync.ratings.get().then(ratings => {
          DB.trakt.store(ratings, 'traktratings')
          DB.trakt.store(Date.now(), 'traktsyncrating')
          return ratings
        })
      } else {
        console.info('Using cached ratings')
        return DB.trakt.get('traktratings')
      }
    }).then(Items.applyRatings)
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

    return Trakt.client.sync.ratings[method](post).then(() => {
      let ratings = DB.trakt.get('traktratings')

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
    const username = DB.app.get('trakt_active_profile')

    const cached = {
      movies: DB.trakt.get('traktmovies'),
      moviescollection: DB.trakt.get('traktmoviescollection'),
      shows: DB.trakt.get('traktshows'),
      showscollection: DB.trakt.get('traktshowscollection'),
      sync: DB.trakt.get('traktsync'),
      syncrating: DB.trakt.get('traktsyncrating'),
      ratings: DB.trakt.get('traktratings')
    }

    if (!update) {
      DB.remove(username + 'traktsyncrating')
      DB.remove(username + 'traktratings')
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
        DB.remove(username + 'traktshows')
        DB.remove(username + 'traktshowscollection')
        DB.remove(username + 'traktsync')
        return Collection.get.traktshows(update, slug, cached.shows).then(collection => {
          Collection.get.traktcached(update)
          Trakt.getRatings()
          return [collection]
        }).catch(handleError)
      case 'movie':
      case 'movies':
        DB.remove(username + 'traktmovies')
        DB.remove(username + 'traktmoviescollection')
        DB.remove(username + 'traktsync')
        return Collection.get.traktmovies(update).then(collection => {
          Collection.get.traktcached(update)
          Trakt.getRatings()
          return [collection]
        }).catch(handleError)
      default:
        DB.remove(username + 'traktmovies')
        DB.remove(username + 'traktmoviescollection')
        DB.remove(username + 'traktshows')
        DB.remove(username + 'traktshowscollection')
        DB.remove(username + 'traktsync')
        return Promise.all([
          Collection.get.traktshows(update),
          Collection.get.traktmovies(update)
        ]).then((collections) => {
          if (Misc.isError(collections[0]) || Misc.isError(collections[1])) throw new Error('Trakt.reload failed')

          Collection.get.traktcached(update)
          Trakt.getRatings()

          return collections
        }).catch(handleError)
    }
  },

  scrobble: (action) => {
    if (!Player.config.model) {
      return
    }

    let progress = (Player.config.states && Player.config.states['percent-pos']) || 0
    progress = parseFloat(progress.toFixed(2))

    let model, type

    if (Player.config.model.metadata) {
      // local
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

    const post = {
      progress: progress
    }
    const item = {
      ids: model.ids
    }

    post[type] = item

    console.info('Trakt - scrobble %s (%s%)', action, progress)
    Trakt.client.scrobble[action](post).catch(console.error)

    if (progress > 80 && action === 'stop') {
      Details.buttonAsWatched()

      if (Player.config.model.metadata) {
        // local item
        if (type === 'episode') {
          Details.loadLocalNext()
        }
      } else {
        // trakt list
        if (type === 'episode') {
          setTimeout(() => {
            $('#details-sources').hide()
            $('#details-loading').hide()
            $('#details-spinner').show()
          }, 50)

          // display spinner on list
          Player.config.model.show && $(`#collection #${Player.config.model.show.ids.slug}`).append('<div class="item-spinner"><div class="fa fa-spin fa-refresh"></div>')

          Misc.sleep(2000).then(() => {
            return Trakt.reload(true, type, Details.model.show.ids.slug)
          }).then(collections => {
            Details.loadNext()
          })
        } else {
          $(`#collection #${Player.config.model.movie.ids.slug}`).hide()
        }
      }
    }
  },
  getGenres: () => {
    const cached = DB.app.get('traktgenres')
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
      DB.app.store(genres, 'traktgenres')
      return genres
    }).catch(err => {
      console.error('Unable to get genres from Trakt', err)
    })
  }
}
