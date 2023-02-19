'use strict'

const Discover = {
  // trakt search for items
  search: () => {
    const terms = $('#discover .disc-search input').val()

    if (!terms) return

    $('#discover .disc-proposal').hide()
    $('#discover .disc-results .row').html('')
    $('#discover #disc-spinner').show()
    $('#discover .disc-search .search').addClass('fa-spinner fa-spin')
    Trakt.client.search.text({
      type: 'movie,show',
      query: terms,
      limit: 20,
      extended: 'full'
    }).then((results) => {
      console.info('Trakt - search results', results)
      return Discover.formatSearch(results)
    }).then((items = []) => {
      $('#discover #disc-spinner').hide()
      $('#discover .disc-proposal').hide()
      $('#discover .disc-results .row').html('')
      $('#discover .disc-results').show()
      for (const item of items) {
        Items['constructDiscover' + item.type.charAt(0).toUpperCase() + item.type.slice(1)](item).then(i => $('#discover .disc-results .row').append(i))
      }

      if (!items.length) {
        $('#discover .disc-results .row').append(`<span class="notfound">${i18n.__("These aren't the droids you're looking for")}</span>`)
      }

      DB.trakt._get('traktratings').then(Items.applyRatings)
      $('#discover .disc-search .search').removeClass('fa-spinner fa-spin')
    })
  },
  formatSearch: (items) => {
    let collection = []

    return Promise.all(items.map((item, index) => {
      const type = item.type === 'movie' ? 'movie' : 'show'

      return Images.get[type]({
        imdb: item[type].ids.imdb,
        tmdb: item[type].ids.tmdb,
        tvdb: item[type].ids.tvdb
      }).then(images => {
        item.index = index
        collection.push(item)
        return item
      })
    })).then(() => {
      console.info('All images found for the search')

      // sort
      collection = collection.sort(function (a, b) {
        if (a.score > b.score) {
          return -1
        }
        if (a.score < b.score) {
          return 1
        }
        return 0
      })

      return collection
    }).catch(console.error)
  },

  load: {
    trending: () => {
      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .trending').addClass('active')

      return DB.trakt._get('lasttrendingsync').then(lasttrendingsync => {
        // cache for 30min  
        if (lasttrendingsync && (Date.now() - lasttrendingsync < 30 * 60 * 1000)) {
          console.info('Trakt - trending movies/shows already in cache')
          return
        } else {
          console.info('Trakt - loading trending movies/shows')
          const opts = { extended: 'full', limit: 20 }
          return Promise.all([
            Trakt.client.movies.trending(opts),
            Trakt.client.shows.trending(opts)
          ]).then(([movies, shows]) => {
            return Promise.all([
              Discover.format.traktmovies(movies).then(coll => DB.trakt._store(coll, 'traktmoviestrending')),
              Discover.format.traktshows(shows).then(coll => DB.trakt._store(coll, 'traktshowstrending')),
              DB.trakt._store(Date.now(), 'lasttrendingsync')
            ])
          })
        }
      }).then(() => {
        Discover.show[lastTab]('trending')
      }).catch(console.error)
    },
    popular: () => {
      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .popular').addClass('active')

      return DB.trakt._get('lastpopularsync').then(lastpopularsync => {
        // cache for 30min
        if (lastpopularsync && (Date.now() - lastpopularsync < 30 * 60 * 1000)) {
          console.info('Trakt - popular movies/shows already in cache')
          return
        } else {
          console.info('Trakt - loading popular movies/shows')
          const opts = { extended: 'full', limit: 20 }
          return Promise.all([
            Trakt.client.movies.popular(opts),
            Trakt.client.shows.popular(opts)
          ]).then(([movies, shows]) => {
            return Promise.all([
              Discover.format.traktmovies(movies).then(coll => DB.trakt._store(coll, 'traktmoviespopular')),
              Discover.format.traktshows(shows).then(coll => DB.trakt._store(coll, 'traktshowspopular')),
              DB.trakt._store(Date.now(), 'lastpopularsync')
            ])
          })
        }
      }).then(() => {
        Discover.show[lastTab]('popular')
      }).catch(console.error)
    },
    watched: () => {
      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .watched').addClass('active')

      return DB.trakt._get('lastwatchedsync').then(lastwatchedsync => {
        // cache for 30min
        if (lastwatchedsync && (Date.now() - lastwatchedsync < 30 * 60 * 1000)) {
          console.info('Trakt - watched movies/shows already in cache')
          return
        } else {
          console.info('Trakt - loading watched movies/shows')
          const opts = { extended: 'full', limit: 20 }
          return Promise.all([
            Trakt.client.movies.watched(opts),
            Trakt.client.shows.watched(opts)
          ]).then(([movies, shows]) => {
            return Promise.all([
              Discover.format.traktmovies(movies).then(coll => DB.trakt._store(coll, 'traktmovieswatched')),
              Discover.format.traktshows(shows).then(coll => DB.trakt._store(coll, 'traktshowswatched')),
              DB.trakt._store(Date.now(), 'lastwatchedsync')
            ])
          })
        }
      }).then(() => {
        Discover.show[lastTab]('watched')
      }).catch(console.error)
    },
    anticipated: () => {
      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .anticipated').addClass('active')

      return DB.trakt._get('lastanticipatedsync').then(lastanticipatedsync => {
        // cache for 30min
        if (lastanticipatedsync && (Date.now() - lastanticipatedsync < 30 * 60 * 1000)) {
          console.info('Trakt - anticipated movies/shows already in cache')
          return
        } else {
          console.info('Trakt - loading anticipated movies/shows')
          const opts = { extended: 'full', limit: 20 }
          return Promise.all([
            Trakt.client.movies.anticipated(opts),
            Trakt.client.shows.anticipated(opts)
          ]).then(([movies, shows]) => {
            return Promise.all([
              Discover.format.traktmovies(movies).then(coll => DB.trakt._store(coll, 'traktmoviesanticipated')),
              Discover.format.traktshows(shows).then(coll => DB.trakt._store(coll, 'traktshowsanticipated')),
              DB.trakt._store(Date.now(), 'lastanticipatedsync')
            ])        
          })
        }
      }).then(() => {
        Discover.show[lastTab]('anticipated')
      }).catch(console.error)
    },
    recommended: () => {
      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .recommended').addClass('active')

      return DB.trakt._get('lastrecommendedsync').then(lastrecommendedsync => {
        // cache for 30min
        if (lastrecommendedsync && (Date.now() - lastrecommendedsync < 30 * 60 * 1000)) {
          console.info('Trakt - recommended movies/shows already in cache')
          return
        } else {
          console.info('Trakt - loading recommended movies/shows')
          const opts = { extended: 'full', limit: 20 }
          return Promise.all([
            Trakt.client.recommendations.movies.get(opts),
            Trakt.client.recommendations.shows.get(opts)
          ]).then(([movies, shows]) => {
            for (const movie in movies) movies[movie].source = 'recommendations'
            for (const show in shows) shows[show].source = 'recommendations'
            return Promise.all([
              Discover.format.traktmovies(movies).then(coll => DB.trakt._store(coll, 'traktmoviesrecommended')),
              Discover.format.traktshows(shows).then(coll => DB.trakt._store(coll, 'traktshowsrecommended')),
              DB.trakt._store(Date.now(), 'lastrecommendedsync')
            ])
          })
        }
      }).then(() => {
        Discover.show[lastTab]('recommended')
      }).catch(console.error)
    },
    top50: () => {
      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .top50').addClass('active')

      return DB.trakt._get('lasttop50sync').then(lasttop50sync => {
        // cache for 1 day
        if (lasttop50sync && (Date.now() - lasttop50sync < 24 * 60 * 60 * 1000)) {
          console.info('Trakt - top 50 movies/shows already in cache')
          return
        } else {
          console.info('Trakt - loading top50 movies/shows')
          return Promise.all([
            Trakt.client.users.list.items.get({
              username: 'justin',
              id: 'imdb-top-rated-movies',
              extended: 'full',
              limit: '50'
            }),
            Trakt.client.users.list.items.get({
              username: 'justin',
              id: 'imdb-top-rated-tv-shows',
              extended: 'full',
              limit: '50'
            })
          ]).then(([movies, shows]) => {
            for (const movie in movies) movies[movie].source = 'top50'
            for (const show in shows) shows[show].source = 'top50'
            return Promise.all([
              Discover.format.traktmovies(movies).then(coll => DB.trakt._store(coll, 'traktmoviestop50')),
              Discover.format.traktshows(shows).then(coll => DB.trakt._store(coll, 'traktshowstop50')),
              DB.trakt._store(Date.now(), 'lasttop50sync')
            ])
          })
        }
      }).then(() => {
        Discover.show[lastTab]('top50')
      }).catch(console.error)
    }
  },

  reset: () => {
    $('#discover .disc-results').hide()
    $('#discover .disc-proposal .row').html('')
    $('#discover .disc-proposal').show()
    $('#discover #disc-spinner').show()
  },

  show: {
    shows: (key) => {
      if (!key) {
        try {
          key = $('#discover .type .active')[0].classList[0]
        } catch (e) {
          key = 'trending'
        }
      }

      Discover.reset()

      DB.trakt._get('traktshows' + key).then(shows => {
        $('#discover #disc-spinner').hide()
        for (const show of shows) {
          Items.constructDiscoverShow(show).then(item => $('#discover .disc-proposal .row').append(item))
        }
        DB.trakt._get('traktratings').then(Items.applyRatings)
        $('#discover .disc-proposal .categories div').removeClass('active')
        $('#discover .disc-proposal .categories .shows').addClass('active')        
      })
    },

    movies: (key) => {
      if (!key) {
        try {
          key = $('#discover .type .active')[0].classList[0]
        } catch (e) {
          key = 'trending'
        }
      }

      Discover.reset()

      DB.trakt._get('traktmovies' + key).then(movies => {
        $('#discover #disc-spinner').hide()
        for (const movie of movies) {
          Items.constructDiscoverMovie(movie).then(item => $('#discover .disc-proposal .row').append(item))
        }
        DB.trakt._get('traktratings').then(Items.applyRatings)
        $('#discover .disc-proposal .categories div').removeClass('active')
        $('#discover .disc-proposal .categories .movies').addClass('active')        
      })
    }
  },

  format: {
    traktmovies: (movies) => {
      let collection = []
      let index = 0

      return Promise.all(movies.map((movie) => {
        movie.index = index
        index++

        const obj = movie.movie ? movie.movie : movie
        return Images.get.movie(obj.ids).then(images => {
          collection.push(movie)
          return movie
        })
      })).then(() => {
        console.info('All images found for movies')

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

        return collection
      }).catch(console.error)
    },
    traktshows: (shows) => {
      let collection = []
      let index = 0

      return Promise.all(shows.map((item) => {
        item.index = index
        index++

        const obj = item.show ? item.show : item
        return Images.get.show(obj.ids).then(images => {
          collection.push(item)
          return item
        })
      })).then(() => {
        console.info('All images found for shows')

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

        return collection
      }).catch(console.error)
    }
  },
  getData: (elm) => {
    // extract json from data div
    const $elm = $(elm)[0]
    const id = ($elm.offsetParent && $elm.offsetParent.id) || $elm.id
    const data = JSON.parse($(`#${id}`).find('.data').text())

    return data
  },

  addToWatchlist: (item) => {
    const $item = $(item)[0]
    const id = $item.offsetParent.id || $item.id
    const data = Discover.getData(item)
    const type = data.movie ? 'movie' : 'show'

    const post = {}
    post[type + 's'] = [data[type]]
    $(`#${id}`).append('<div class="item-spinner"><div class="fa fa-spin fa-refresh"></div>')

    Trakt.client.sync.watchlist.add(post).then((res) => {
      console.info('Added to Watchlist:', data[type])
      $(`#${id} .watchlist`)[0].outerHTML = '<div class="watchlist trakt-icon-list-thick tooltipped i18n selected"></div>'
      $(`#${id} .item-spinner`).remove()

      Trakt.reload(false, type)
    })
  }
}
