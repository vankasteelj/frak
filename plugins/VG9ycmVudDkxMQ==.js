const got = require('got')
const cheerio = require('cheerio')
const defaultURL = atob('aHR0cHM6Ly93d3cubWVnYS10b3JyZW50Mi5jb20=')
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

    $('.listing-torrent .table tbody tr').each((index, el) => {
      try {
        const torrent = {
          name: $(el).find('a').eq(0).attr('title'),
          seeds: 0,
          peers: 0,
          magnet: $(el).find('a').eq(0).attr('href'),
          source: name
        }

        torrent.name && torrent.magnet && torrentsTemp.push(torrent)
      } catch (e) {}
    })

    return torrentsTemp
  }).then((torrentsTemp) => {
    return Promise.all(torrentsTemp.map(torrent => {
      return got(defaultURL + torrent.magnet, { timeout: 3500 }).then(response => {
        const $ = cheerio.load(response.body)
        torrent.magnet = $('.btn-download').find('a').attr('href')

        torrent.seeds = parseInt($('td:contains("Seeders:")').last().siblings().text())
        torrent.peers = parseInt($('td:contains("Leechers:")').last().siblings().text())

        const str = $('td:contains("Poids du fichier:")').last().siblings().text()
        let size
        if (str) {
          const s = parseFloat(str).toString()
          if (str.match(/g/i)) size = s * 1024 * 1024 * 1024
          if (str.match(/m/i)) size = s * 1024 * 1024
          if (str.match(/k/i)) size = s * 1024
        }
        torrent.size = size

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
