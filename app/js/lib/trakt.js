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
    const auth = DB.get('trakt_auth')
    if (!auth) {
      $('#init').show()
      return
    }

    Trakt.client.import_token(auth).then(Trakt.connected)
  },

  login: () => {
    console.info('Trying to log into trakt.tv')
    Trakt.client.get_codes().then(poll => {
      console.info('Opening trakt.tv auth url')
      Interface.traktLogin(poll)
      return Trakt.client.poll_access(poll)
    }).then(Trakt.connected).catch(console.error)
  },

  disconnect: () => {
    DB.remove('trakt_auth')
    DB.remove('traktmovies')
    DB.remove('traktmoviescollection')
    DB.remove('traktshows')
    DB.remove('traktshowscollection')
    DB.remove('traktsync')
    DB.remove('traktratings')
    DB.remove('trakt_profile')

    win.reload()
  },

  connected: (info) => {
    console.info('Trakt is connected')

    Interface.focus(true)
    Notify.requestAttention()

    DB.store(Trakt.client.export_token(), 'trakt_auth')
    Interface.traktConnected(DB.get('trakt_profile'))

    Collection.load()
  },

  last_activities: (type) => {
    let cached = false
    return new Promise((resolve, reject) => {
      const cachedData = DB.get('traktlastactivities')
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
        DB.store(results, 'traktlastactivities')
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
      if (!DB.get('traktratings') || activities > (DB.get('traktsyncrating') || 0)) {
        console.info('Fetching ratings from remote server')
        return Trakt.client.sync.ratings.get().then(ratings => {
          DB.store(ratings, 'traktratings')
          DB.store(Date.now(), 'traktsyncrating')
          return ratings
        })
      } else {
        console.info('Using cached ratings')
        return DB.get('traktratings')
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
      let ratings = DB.get('traktratings')

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

      DB.store(ratings, 'traktratings')
      Items.applyRatings(ratings)
    })
  },

  reload: (update, type, slug) => {
    const cached = {
      movies: DB.get('traktmovies'),
      moviescollection: DB.get('traktmoviescollection'),
      shows: DB.get('traktshows'),
      showscollection: DB.get('traktshowscollection'),
      sync: DB.get('traktsync'),
      syncrating: DB.get('traktsyncrating'),
      ratings: DB.get('traktratings')
    }

    if (!update) {
      DB.remove('traktsyncrating')
      DB.remove('traktratings')
    }

    const handleError = (e) => {
      console.error(e)
      DB.store(cached.movies, 'traktmovies')
      DB.store(cached.moviescollection, 'traktmoviescollection')
      DB.store(cached.shows, 'traktshows')
      DB.store(cached.showscollection, 'traktshowscollection')
      DB.store(cached.sync, 'traktsync')
      DB.store(cached.syncrating, 'traktsyncrating')
      DB.store(cached.ratings, 'traktratings')
    }

    switch (type) {
      case 'episode':
      case 'episodes':
      case 'show':
      case 'shows':
        DB.remove('traktshows')
        DB.remove('traktshowscollection')
        DB.remove('traktsync')
        return Collection.get.traktshows(update, slug, cached.shows).then(collection => {
          Collection.get.traktcached(update)
          Trakt.getRatings()
          return [collection]
        }).catch(handleError)
      case 'movie':
      case 'movies':
        DB.remove('traktmovies')
        DB.remove('traktmoviescollection')
        DB.remove('traktsync')
        return Collection.get.traktmovies(update).then(collection => {
          Collection.get.traktcached(update)
          Trakt.getRatings()
          return [collection]
        }).catch(handleError)
      default:
        DB.remove('traktmovies')
        DB.remove('traktmoviescollection')
        DB.remove('traktshows')
        DB.remove('traktshowscollection')
        DB.remove('traktsync')
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

    let progress = Player.config.states.position || 0
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

          Misc.sleep(800).then(() => {
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
    const cached = DB.get('traktgenres')
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
      DB.store(genres, 'traktgenres')
      return genres
    }).catch(err => {
      console.error('Unable to get genres from Trakt', err)
    })
  }
}
