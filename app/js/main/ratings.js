'use strict'

const Ratings = {
  // Ratings.cache = sorted ratings
  // Ratings.page = pagination
  show: () => {
    // reset
    Ratings.page = 0 
    Ratings.cache = null

    return DB.trakt.get('traktratings').then(ratings => {
      Ratings.cache = ratings
      console.log('SHOW ALL RATINGS:', Ratings.cache)
      return Ratings.loadMore()
    })
  },
  filters: {
    recentlyRated: '',
    highestRated: '',
    lowestRated: '',
    type: {
      all: '',
      movies: '',
      shows: ''
    },
    ratings: {
      all: '',
      10: '',
      9: '',
      8: '',
      7: '',
      6: '', 
      5: '', 
      4: '',
      3: '', 
      2: '', 
      1: ''
    },
    genres: ''
  },
  loadMore: () => {
    Ratings.page++
    const update = Ratings.page > 1
    const paginate = update ? 24 : 23

    const begin = (paginate * (Ratings.page - 1)) - (update ? 1 : 0)
    const end = (paginate * Ratings.page) - (update ? 1 : 0)
    const results = Ratings.cache.slice(begin, end)
    console.debug('Ratings indexes [%d => %d]:', begin, end, results)

    Collection.show.ratings(results, update)
    return results
  }
}