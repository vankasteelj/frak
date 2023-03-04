'use strict'

const got = require('got')
const defaultURL = atob('aHR0cHM6Ly90b3JyZW50YXBpLm9yZy9wdWJhcGlfdjIucGhw')
const name = atob('UkFSQkc=')
let token = {};
let defaultTTL = 15*60*1000

const get = (keywords, cfg = {}) => {
  const url = cfg.url || defaultURL
  const config = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:83.0) Gecko/20100101 Firefox/83.0'
    }
  }

  const getToken = () => {
    if (token.ttl > Date.now()) {
      // token is good
      return Promise.resolve(token.value)
    } else {
      return got(defaultURL + '?get_token=get_token&app_id=pubapi', config).then(tok => {
        token.ttl = Date.now() + defaultTTL
        token.value = JSON.parse(tok.body).token
        return token.value
      })
    }
  }

  return getToken().then(tok => {
    return got(defaultURL + `?mode=search&search_string=${keywords}&format=json_extended&category=${cfg.cat}&sort=seeders&ranked=0&app_id=pubapi&token=${tok}`, config)
  }).then(res => {
    const body = JSON.parse(res.body)
    const results = []
    if (!body.error || body.torrent_results) {
      for (const i in body.torrent_results) {
        const t = body.torrent_results[i]
        results.push({
          name: t.title,
          magnet: t.download,
          seeds: t.seeders,
          peers: t.leechers,
          source: name,
          size: t.size
        })
      }
    }
    return results
  }).catch((err) => {
    console.error(err)
    return []
  })
}

module.exports = {
  name: name,
  url: defaultURL,
  search: (opts) => {
    const req = {}

    switch (opts.type) {
      case 'show': req.cat = '2;18;41;49'; break
      case 'movie': req.cat = '14;48;17;44;45;47;50;51;52;42;46;54'; break
    }

    return get(opts.keywords, req)
  }
}
