'use strict'

const Profiles = {
  add: () => {
    return new Promise((resolve, reject) => {
      return Trakt.client.users.profile({
        username: 'me',
        extended: 'full'
      }).then(profile => {
        const profiles = Profiles.list()
        const index = profiles.findIndex((a) => a.profile && a.profile.username === profile.username)
        if (index === -1) {
          DB.sync.store(profile.username, 'trakt_active_profile')
          profiles.push({ profile: profile, auth: Trakt.client.export_token() })
          DB.sync.store(profiles, 'trakt_profiles')
        } else {
          console.info('Account "%s" already exists, ignoring', profile.username)
        }
        return resolve()
      })
    })
  },
  list: () => {
    return DB.sync.get('trakt_profiles') || []
  },
  get: (username) => {
    const profiles = Profiles.list()
    const index = profiles.findIndex((a) => a.profile && a.profile.username === username)
    if (index !== -1) {
      return profiles[index]
    } else {
      return []
    }
  },
  disconnect: (username) => {
    DB.trakt.remove('traktmovies')
    DB.trakt.remove('traktmoviescollection')
    DB.trakt.remove('traktmovieswatched')
    DB.trakt.remove('traktshows')
    DB.trakt.remove('traktshowscollection')
    DB.trakt.remove('traktshowswatched')
    DB.trakt.remove('traktsync')
    DB.trakt.remove('traktsynchistory')
    DB.trakt.remove('trakthistory')
    DB.trakt.remove('trakthistorycollection')
    DB.trakt.remove('traktlastactivities')
    DB.trakt.remove('watchedMovies')
    DB.trakt.remove('watchedShows')
    DB.trakt.remove('traktsyncrating')
    DB.trakt.remove('traktratings')
    DB.sync.remove('trakt_active_profile')

    const profiles = Profiles.list()
    const index = profiles.findIndex((a) => a.profile && a.profile.username === username)
    if (index !== -1) {
      profiles.splice(index, 1)
      DB.sync.store(profiles, 'trakt_profiles')
    }
  }
}
