'use strict'

const Images = {
  defaults: {
    fanart: null,
    poster: null
  },
  client: new (require('mdata'))({
    fanart: Settings.apikeys.fanart,
    tmdb: Settings.apikeys.tmdb,
    tvdb: Settings.apikeys.tvdb,
    omdb: Settings.apikeys.omdb
  }),

  get: {
    movie: (args) => {
      const cached = IB.get(args)
      if (cached.poster || cached.fanart) return Promise.resolve(cached)
      console.debug('Movie - getting poster/fanart for', args)
      return Images.client.images.movie(args).then((response) => {
        IB.store(response, args)
        return response
      }).catch(err => {
        console.error(err)
        return Promise.resolve(Images.defaults)
      })
    },
    show: (args) => {
      const cached = IB.get(args)
      if (cached.poster || cached.fanart) return Promise.resolve(cached)
      console.debug('Show - getting poster/fanart for', args)
      return Images.client.images.show(args).then((response) => {
        IB.store(response, args)
        return response
      }).catch(err => {
        console.error(err)
        return Promise.resolve(Images.defaults)
      })
    }
  },

  reduce: (link, full) => {
    if (!link) return null

    full && link.match('fanart.tv') && (link = link.replace('fanart.tv/fanart', 'fanart.tv/preview'))
    link.match('tmdb.org') && (link = link.replace('w780', 'w342').replace('/original/', '/w1280/'))
    link.match('thetvdb.com') && (link = link.replace('.jpg', '_t.jpg'))

    return link
  }
}
