'use strict'

const Ratings = {
  // Ratings.cache = all ratings
  // Ratings.fCache = filtered ratings
  // Ratings.page = pagination
  setupDropdown: () => {
    // build dropdown
    const sort = $('#r-sort')
    const types = $('#r-types')
    const rating = $('#r-ratings')
    const genre = $('#r-genres')

    sort.append('<option value="recentlyRated">' + i18n.__('Recently rated') + '</option>')
    sort.append('<option value="highestRated">' + i18n.__('Highest rated') + '</option>')
    sort.append('<option value="lowestRated">' + i18n.__('Lowest rated') + '</option>')
    sort.append('<option value="yearRated">' + i18n.__('Year') + '</option>')
    sort.val('recentlyRated')
    sort.on('change', (e) => {
      Ratings.applyFilters()
    })

    types.append('<option value="typesAll">' + i18n.__('All types') + '</option>')
    types.append('<option value="typesMovies">' + i18n.__('Movies') + '</option>')
    types.append('<option value="typesShows">' + i18n.__('Shows') + '</option>')
    types.val('typesAll')
    types.on('change', (e) => {
      Ratings.applyFilters()
    })

    const ratings = ['Weak Sauce :(', 'Terrible', 'Bad', 'Poor', 'Meh', 'Fair', 'Good', 'Great', 'Superb', 'Totally Ninja!']
    rating.append('<option value="all">' + i18n.__('All ratings') + '</option>')
    for (let i = 10; i > 0; i--) {
      rating.append('<option value="' + i + '">' + i + '&nbsp;-&nbsp;' + i18n.__(ratings[i - 1]) + '</option>')
    }
    rating.val('all')
    rating.on('change', (e) => {
      Ratings.applyFilters()
    })

    const allGenres = DB.sync.get('traktgenres')

    const appendValue = (g) => {
      if (allGenres.movies.filter(a => a.slug === g.slug).length) {
        genre.append('<option value="' + g.slug + '">' + i18n.__(g.name) + '</option>')
      }
    }

    if (allGenres) {
      genre.append('<option value="all">' + i18n.__('All genres') + '</option>')
      for (const i in allGenres.shows) {
        Misc.sleep(i*100).then(() => {
          appendValue(allGenres.shows[i])
        })
      }
      genre.val('all')
      genre.on('change', (e) => {
        Ratings.applyFilters()
      })
    }
  },
  show: () => {
    $('#ratings-spinner').show()
    // reset
    Ratings.cache = null

    return DB.trakt.get('traktratings').then(ratings => {
      Ratings.cache = ratings
      return Ratings.applyFilters()
    }).then((results) => {
      $('#ratings-spinner').hide()
      return results
    })
  },
  applyFilters: () => {
    Ratings.page = 0

    const sort = $('#r-sort').val()
    const type = $('#r-types').val()
    const rating = $('#r-ratings').val()
    const genre = $('#r-genres').val()
    Ratings.fCache = Ratings.filters.genres(Ratings.filters.ratings(Ratings.filters[sort](Ratings.filters[type](Ratings.cache)), rating), genre)

    Ratings.loadMore()
  },
  filters: {
    typesAll: (r) => r,
    typesMovies: (r) => r.filter(a => a.type.indexOf('movie') !== -1),
    typesShows: (r) => r.filter(a => a.type.indexOf('show') !== -1),
    recentlyRated: (r) => r.sort((a, b) => a.rated_at > b.rated_at ? -1 : 1),
    yearRated: (r) => r.sort((a, b) => a[a.type].year > b[b.type].year ? -1 : 1),
    highestRated: (r) => r.sort((a, b) => a.rating > b.rating ? -1 : 1),
    lowestRated: (r) => r.sort((a, b) => a.rating > b.rating ? 1 : -1),
    ratings: (r, val) => {
      if (val === 'all') {
        return r
      } else {
        return r.filter(a => a.rating === parseInt(val))
      }
    },
    genres: (r, val) => {
      if (val === 'all') {
        return r
      } else {
        return r.filter(a => {
          const type = a.type === 'movie' ? 'movie' : 'show'
          return a[type].genres.indexOf(val) !== -1
        })
      }
    }
  },
  loadMore: () => {
    Ratings.page++
    const update = Ratings.page > 1
    const paginate = update ? 24 : 23

    const begin = (paginate * (Ratings.page - 1)) - (update ? 1 : 0)
    const end = (paginate * Ratings.page) - (update ? 1 : 0)
    const results = Ratings.fCache.slice(begin, end)
    console.debug('Ratings indexes [%d => %d]:', begin, end, results)

    Collection.show.ratings(results, update)
    DB.trakt.get('traktratings').then(Items.applyRatings)

    return results
  }
}
