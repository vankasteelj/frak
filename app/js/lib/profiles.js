'use strict'

const Profiles = {
  add: () => {
    return new Promise((resolve, reject) => { 
      return Trakt.client.users.profile({
        username: 'me',
        extended: 'full'
      }).then(profile => {
        let profiles = Profiles.list()
        let index = profiles.findIndex((a) => a.profile && a.profile.username === username)
        if (index === -1) {
          DB.app.store(profile.username, 'trakt_active_profile')
          profiles.push({profile: profile, auth: Trakt.client.export_token()})
          DB.app.store(profiles, 'trakt_profiles')
        } else {
          console.info('Account "%s" already exists, ignoring', profile.username)
        }
        return resolve()
      })
    })
  },
  list: () => {
    return DB.app.get('trakt_profiles') || []
  },
  get: (username) => {
    let profiles = Profiles.list()
    let index = profiles.findIndex((a) => a.profile && a.profile.username === username)
    if (index !== -1) {
      return profiles[index]
    } else {
      return []
    }
  },
  disconnect: (username) => {
    DB.remove(username+'traktmovies')
    DB.remove(username+'traktmoviescollection')
    DB.remove(username+'traktmovieswatched')
    DB.remove(username+'traktshows')
    DB.remove(username+'traktshowscollection')
    DB.remove(username+'traktshowswatched')
    DB.remove(username+'traktsync')
    DB.remove(username+'traktsynchistory')
    DB.remove(username+'traktsyncrating')
    DB.remove(username+'traktratings')
    DB.remove(username+'trakthistory')
    DB.remove(username+'trakthistorycollection')
    DB.remove(username+'traktlastactivities')
    DB.remove(username+'watchedMovies')
    DB.remove(username+'watchedShows')
    DB.remove('trakt_active_profile')
  
    let profiles = Profiles.list()
    let index = profiles.findIndex((a) => a.profile && a.profile.username === username)
    if (index !== -1) {
      profiles.splice(index, 1)
      DB.app.store(profiles, 'trakt_profiles')
    }
  }
}