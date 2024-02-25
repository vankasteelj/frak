const got = require('got')
const cheerio = require('cheerio')
const defaultURL = atob('aHR0cHM6Ly93d3cudG9ycmVudDkxMS5jYw==')
const name = atob('VG9ycmVudDkxMQ==')

const get = (keywords) => {
  const reqURL = [
    defaultURL,
    'recherche',
    escape(keywords)
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

    $('table tbody tr').each((index, el) => {
      try {
        let magnet = $(el).find('a').eq(0).attr('onclick')
        const torrent = {
          name: $(el).find('a').eq(0).text(),
          seeds: parseInt($(el).find('td').eq(2).text()),
          peers: parseInt($(el).find('td').eq(3).text()),
          magnet: magnet.split('=')[1].replaceAll('\'',''),
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

        torrent.name && magnet && torrentsTemp.push(torrent)
      } catch (e) {}
    })

    return torrentsTemp
  }).then((torrentsTemp) => {
    return Promise.all(torrentsTemp.map(torrent => {
      let details = defaultURL + torrent.magnet
      return got(details, { timeout: 3500 }).then(response => {
        const $ = cheerio.load(response.body)
        torrent.magnet = 'magnet:?xt=urn:btih:' + $('#info_hash').val()
        torrents.push(torrent)
      })
    }))
  }).then(() => torrents).catch((err) => {
    console.log(err)
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
