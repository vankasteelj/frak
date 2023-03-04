'use strict'

const WB = {
  store: {
    movies: (watchedMovies) => DB.trakt.store(watchedMovies, 'watchedMovies'),
    shows: (watchedShows) => DB.trakt.store(watchedShows, 'watchedShows')
  },
  get: {
    movies: () => DB.trakt.get('watchedMovies'),
    shows: () => DB.trakt.get('watchedShows')
  },
  find: {
    movie: (id) => {
      return DB.trakt.get('watchedMovies').then(wM => {
        return wM.find(o => o.movie.ids.slug === id)
      })
    },
    show: (id) => {
      return DB.trakt.get('watchedShows').then(wS => {
        return wS.find(o => o.show.ids.slug === id)
      })
    }
  },
  markAsWatched: (data) => {
    let found
    if (data.movie) {
      WB.get.movies().then((db = []) => {
        found = db.find((movie, index) => {
          if (movie.movie.ids.slug === data.movie.ids.slug) {
            db[index].plays++
            return true
          }
          return false
        })
        if (!found) {
          db.push({
            plays: 1,
            movie: data.movie
          })
        }
        WB.store.movies(db)
      })
    } else {
      WB.get.shows().then((db = []) => {
        found = db.find((show, index) => {
          if (show.show.ids.slug === data.show.ids.slug) {
            db[index].plays++
            return true
          }
          return false
        })
        if (!found) {
          db.push({
            plays: 1,
            show: data.show
          })
        }
        WB.store.shows(db)
      })
    }
  },
  markAsUnwatched: (slug) => {
    return Promise.all([
      WB.get.movies(),
      WB.get.shows()
    ]).then(([mdb = [], sdb = []]) => {
      mdb.find((movie, index) => {
        if (movie.movie.ids.slug === slug) {
          mdb[index].plays--
          if (!mdb[index].plays) {
            mdb.splice(index, 1)
          }
          return true
        }
        return false
      })
      sdb.find((show, index) => {
        if (show.show.ids.slug === slug) {
          sdb[index].plays--
          if (!sdb[index].plays) {
            sdb.splice(index, 1)
          }
          return true
        }
        return false
      })
      WB.store.movies(mdb)
      WB.store.shows(sdb)
    })
  }
}
