const cheerio = require('cheerio')
const got = require('got')
const defaultURL = atob('aHR0cHM6Ly93d3cudG9ycmVudDkuZ2c=')
const name = atob('VG9ycmVudDk=')

const get = (keywords, cfg = {}) => {
  const reqURL = [
    cfg.url || defaultURL,
    'search_torrent',
    // cfg.cat,
    escape(keywords)// + '.html,trie-seeds-d'
  ].join('/')

  const torrents = []

  return got(reqURL, {
    timeout: 3500
  }).then(response => {
    if (!response.body) {
      throw new Error('Error at fetching %s', name)
    }

    const $ = cheerio.load(response.body)

    if (!$) {
      throw new Error('Error at loading %s', name)
    }

    const torrentsTemp = []

    $('.table-striped tr').each((index, el) => {
      const torrent = {
        name: $(el).find('a').eq(0).text(),
        seeds: parseInt($(el).find('td').eq(2).text()),
        peers: parseInt($(el).find('td').eq(3).text()),
        magnet: $(el).find('a').eq(0).attr('href'),
        source: name
      }

      const str = $(el).find('td').eq(1).text()
      let size
      if (str) {
        const s = parseFloat(str).toString()
        if (str.match(/g/i)) size = s * 1024 * 1024 * 1024
        if (str.match(/m/i)) size = s * 1024 * 1024
        if (str.match(/k/i)) size = s * 1024
      }
      torrent.size = size

      torrent.name && torrentsTemp.push(torrent)
    })

    return torrentsTemp
  }).then((torrentsTemp) => {
    return Promise.all(torrentsTemp.map(torrent => {
      return got(defaultURL + torrent.magnet, { timeout: 3500 }).then(response => {
        const $ = cheerio.load(response.body)
        torrent.magnet = 'magnet:?xt=urn:btih:' + $('.download-btn a')[1].attribs.href.split('&')[0] + '&dn=' + escape(torrent.name)
        torrents.push(torrent)
      })
    }))
  }).then(() => torrents).catch((err) => {
    console.error(err)
    return []
  })
}

module.exports = {
  name: name,
  url: defaultURL,
  search: (opts) => {
    const req = {}

    // categories is broken
    switch (opts.type) {
      case 'show':
        req.cat = 'series'
        break
      case 'movie':
        req.cat = 'films'
        break
    }

    return get(opts.keywords, req)
  }
}
