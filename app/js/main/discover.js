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
        const i = Items['constructDiscover' + item.type.charAt(0).toUpperCase() + item.type.slice(1)](item)
        $('#discover .disc-results .row').append(i)
      }

      if (!items.length) {
        $('#discover .disc-results .row').append(`<span class="notfound">${i18n.__("These aren't the droids you're looking for")}</span>`)
      }

      Items.applyRatings(DB.get('traktratings'))
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
      Discover.reset()

      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .trending').addClass('active')

      // cache for 30min
      if (DB.get('lasttrendingsync') && (Date.now() - DB.get('lasttrendingsync') < 30 * 60 * 1000)) {
        console.info('Trakt - trending movies/shows already in cache')
        Discover.show[lastTab]('trending')
        return Promise.resolve()
      } else {
        console.info('Trakt - loading trending movies/shows')
        return Trakt.client.movies.trending({
          extended: 'full',
          limit: 20
        }).then(Discover.format.traktmovies).then((collection) => {
          DB.store(collection, 'traktmoviestrending')
          return Trakt.client.shows.trending({
            extended: 'full',
            limit: 20
          })
        }).then(Discover.format.traktshows).then((collection) => {
          DB.store(collection, 'traktshowstrending')
          DB.store(Date.now(), 'lasttrendingsync')
          Discover.show[lastTab]('trending')
        }).catch(console.error)
      }
    },
    popular: () => {
      Discover.reset()

      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .popular').addClass('active')

      // cache for 30min
      if (DB.get('lastpopularsync') && (Date.now() - DB.get('lastpopularsync') < 30 * 60 * 1000)) {
        console.info('Trakt - popular movies/shows already in cache')
        Discover.show[lastTab]('popular')
        return Promise.resolve()
      } else {
        console.info('Trakt - loading popular movies/shows')
        return Trakt.client.movies.popular({
          extended: 'full',
          limit: 20
        }).then(Discover.format.traktmovies).then((collection) => {
          DB.store(collection, 'traktmoviespopular')
          return Trakt.client.shows.popular({
            extended: 'full',
            limit: 20
          })
        }).then(Discover.format.traktshows).then((collection) => {
          DB.store(collection, 'traktshowspopular')
          DB.store(Date.now(), 'lastpopularsync')
          Discover.show[lastTab]('popular')
        }).catch(console.error)
      }
    },
    watched: () => {
      Discover.reset()

      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .watched').addClass('active')

      // cache for 30min
      if (DB.get('lastwatchedsync') && (Date.now() - DB.get('lastwatchedsync') < 30 * 60 * 1000)) {
        console.info('Trakt - watched movies/shows already in cache')
        Discover.show[lastTab]('watched')
        return Promise.resolve()
      } else {
        console.info('Trakt - loading watched movies/shows')
        return Trakt.client.movies.watched({
          extended: 'full',
          limit: 20
        }).then(Discover.format.traktmovies).then((collection) => {
          DB.store(collection, 'traktmovieswatched')
          return Trakt.client.shows.watched({
            extended: 'full',
            limit: 20
          })
        }).then(Discover.format.traktshows).then((collection) => {
          DB.store(collection, 'traktshowswatched')
          DB.store(Date.now(), 'lastwatchedsync')
          Discover.show[lastTab]('watched')
        }).catch(console.error)
      }
    },
    anticipated: () => {
      Discover.reset()

      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .anticipated').addClass('active')

      // cache for 30min
      if (DB.get('lastanticipatedsync') && (Date.now() - DB.get('lastanticipatedsync') < 30 * 60 * 1000)) {
        console.info('Trakt - anticipated movies/shows already in cache')
        Discover.show[lastTab]('anticipated')
        return Promise.resolve()
      } else {
        console.info('Trakt - loading anticipated movies/shows')
        return Trakt.client.movies.anticipated({
          extended: 'full',
          limit: 20
        }).then(Discover.format.traktmovies).then((collection) => {
          DB.store(collection, 'traktmoviesanticipated')
          return Trakt.client.shows.anticipated({
            extended: 'full',
            limit: 20
          })
        }).then(Discover.format.traktshows).then((collection) => {
          DB.store(collection, 'traktshowsanticipated')
          DB.store(Date.now(), 'lastanticipatedsync')
          Discover.show[lastTab]('anticipated')
        }).catch(console.error)
      }
    },
    recommended: () => {
      Discover.reset()

      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .recommended').addClass('active')

      // cache for 30min
      if (DB.get('lastrecommendedsync') && (Date.now() - DB.get('lastrecommendedsync') < 30 * 60 * 1000)) {
        console.info('Trakt - recommended movies/shows already in cache')
        Discover.show[lastTab]('recommended')
        return Promise.resolve()
      } else {
        console.info('Trakt - loading recommended movies/shows')
        return Trakt.client.recommendations.movies.get({
          extended: 'full',
          limit: 20
        }).then((data) => {
          for (const movie in data) data[movie].source = 'recommendations'
          return Discover.format.traktmovies(data)
        }).then((collection) => {
          DB.store(collection, 'traktmoviesrecommended')
          return Trakt.client.recommendations.shows.get({
            extended: 'full',
            limit: 20
          })
        }).then((data) => {
          for (const show in data) data[show].source = 'recommendations'
          return Discover.format.traktshows(data)
        }).then((collection) => {
          DB.store(collection, 'traktshowsrecommended')
          DB.store(Date.now(), 'lastrecommendedsync')
          Discover.show[lastTab]('recommended')
        }).catch(console.error)
      }
    },
    top50: () => {
      Discover.reset()

      const lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows'

      $('#discover .type div').removeClass('active')
      $('#discover .type .top50').addClass('active')

      // cache for 1 day
      if (DB.get('lasttop50sync') && (Date.now() - DB.get('lasttop50sync') < 24 * 60 * 60 * 1000)) {
        console.info('Trakt - top 50 movies/shows already in cache')
        Discover.show[lastTab]('top50')
        return Promise.resolve()
      } else {
        console.info('Trakt - loading top50 movies/shows')
        return Trakt.client.users.list.items.get({
          username: 'justin',
          id: 'imdb-top-rated-movies',
          extended: 'full',
          limit: '50'
        }).then((data) => {
          for (const movie in data) data[movie].source = 'top50'
          return Discover.format.traktmovies(data)
        }).then((collection) => {
          DB.store(collection, 'traktmoviestop50')
          return Trakt.client.users.list.items.get({
            username: 'justin',
            id: 'imdb-top-rated-tv-shows',
            extended: 'full',
            limit: '50'
          })
        }).then((data) => {
          for (const show in data) data[show].source = 'top50'
          return Discover.format.traktshows(data)
        }).then((collection) => {
          DB.store(collection, 'traktshowstop50')
          DB.store(Date.now(), 'lasttop50sync')
          Discover.show[lastTab]('top50')
        }).catch(console.error)
      }
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

      const shows = DB.get('traktshows' + key) || []
      $('#discover #disc-spinner').hide()
      for (const show of shows) {
        const item = Items.constructDiscoverShow(show)
        $('#discover .disc-proposal .row').append(item)
      }
      Items.applyRatings(DB.get('traktratings'))
      $('#discover .disc-proposal .categories div').removeClass('active')
      $('#discover .disc-proposal .categories .shows').addClass('active')
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

      const movies = DB.get('traktmovies' + key) || []
      $('#discover .disc-proposal .row').html('')
      $('#discover #disc-spinner').hide()
      for (const movie of movies) {
        const item = Items.constructDiscoverMovie(movie)
        $('#discover .disc-proposal .row').append(item)
      }
      Items.applyRatings(DB.get('traktratings'))
      $('#discover .disc-proposal .categories div').removeClass('active')
      $('#discover .disc-proposal .categories .movies').addClass('active')
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
