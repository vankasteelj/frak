const got = require('got')
const defaultURL = atob('aHR0cDovL2Z1c21lLmxpbms=') 
const name = atob('UG9wY29ybiBUaW1l')

const getMovies = (query) => {
  const url = defaultURL

  return got(url + '/movies/1?keywords=' + escape(query), {
    timeout: 3500
  }).then(res => {
    const result = JSON.parse(res.body)
    if (!result) return []
    const results = []

    for (const i in result) {
      const item = result[i]
      for (const q in item.torrents.en) {
        const subitem = item.torrents.en[q]
        const itemModel = {
          name: (function () {
            try {
              return unescape(subitem.url.match('&dn=.*?&tr')[0]
                .replace('&dn=', '')
                .replace('&tr', ''))
                .replace(/\+/g, ' ')
            } catch (e) {
              return `${item.title}.${q}.${subitem.provider}`
            }
          }()),
          magnet: subitem.url,
          seeds: parseInt(subitem.seed),
          peers: parseInt(subitem.peer),
          size: subitem.size,
          source: name
        }
        results.push(itemModel)
      }
    }

    return results
  }).catch((err) => {
    console.log(err)
    return []
  })
}

const getShows = (query) => {
  const url = defaultURL
  let season = 0
  let episode = 0

  const isconform = (function () {
    const s = query.match(/s+\d{2}/)
    const e = query.match(/e+\d{2}/)
    if (s && e) {
      season = parseInt(s[0].replace('s', ''))
      episode = parseInt(e[0].replace('e', ''))
      query = query.replace(/s\d{2}e\d{2}/, '').trim()
      return true
    } else {
      return false
    }
  }())

  if (!isconform) throw new Error('Query is not conform, respect SxxExx model')

  return got(url + '/shows/1?keywords=' + escape(query), {
    timeout: 3500
  }).then(res => {
    const body = JSON.parse(res.body)
    return got(url + '/show/' + body[0].imdb_id, {
      timeout: 3500
    })
  }).then(det => {
    const serie = JSON.parse(det.body)
    const episodeT = serie.episodes.filter(obj => obj.season.toString() === season.toString() && obj.episode.toString() === episode.toString())

    if (!episodeT.length) {
      return []
    }

    const torrents = episodeT[0].torrents
    const results = []

    for (const q in torrents) {
      if (q.toString() === '0') continue

      const item = torrents[q]
      const pad = (n) => (n < 10) ? ('0' + n) : n

      const itemModel = {
        name: (function () {
          try {
            return unescape(item.url.match('&dn=.*?&tr')[0]
              .replace('&dn=', '')
              .replace('&tr', ''))
              .replace(/\+/g, ' ')
          } catch (e) {
            return [
              serie.title,
              '(' + serie.year + ')',
              's' + pad(season) + 'e' + pad(episode),
              q,
              '-',
              item.provider
            ].join(' ')
          }
        }()),
        magnet: item.url,
        seeds: parseInt(item.seeds),
        peers: parseInt(item.peers),
        source: name
      }

      results.push(itemModel)
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
    opts.keywords = opts.keywords.toLowerCase()

    return opts.type === 'show' ? getShows(opts.keywords) : getMovies(opts.keywords)
  }
}
