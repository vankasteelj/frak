var got = require('got')
var cheerio = require('cheerio')
var defaultURL = atob('aHR0cHM6Ly93d3cudG9ycmVudDkxMS5jYw==')
var name = atob('VG9ycmVudDkxMQ==')

var get = (keywords) => {
  var reqURL = [
    defaultURL,
    'recherche',
    escape(keywords)
  ].join('/')

  var torrents = []

  return got(reqURL, {
    timeout: 3500
  }).then(response => {
    if (!response.body) {
      throw new Error('Error at fetching %s', name)
    }

    var $ = cheerio.load(response.body)

    if (!$) {
      throw new Error('Error at loading %s', name)
    }

    var torrentsTemp = []

    $('table tbody tr').each((index, el) => {
      var torrent = {
        name: $(el).find('a').eq(0).text(),
        seeds: parseInt($(el).find('td').eq(2).text()),
        peers: parseInt($(el).find('td').eq(3).text()),
        magnet: $(el).find('a').eq(0).attr('href'),
        source: name
      }

      var str = $(el).find('td').eq(1).text()
      let size
      if (str) {
        var s = parseFloat(str).toString()
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
        var $ = cheerio.load(response.body)
        torrent.magnet = $('.btn-magnet a')[0].attribs.href
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
    var req = {}

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
