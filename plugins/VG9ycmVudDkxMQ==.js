const got = require('got')
const cheerio = require('cheerio')
const defaultURL = atob('aHR0cHM6Ly93d3cudG9ycmVudDkxMS5hcHAv')
const name = atob('VG9ycmVudDkxMQ==')

const get = (keywords, req) => {
  const reqURL = [
    defaultURL,
    'recherche',
    req.cat,
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

    $('.listing-torrent .banner-byx>li').each((index, el) => {
      try {
        const torrent = {
          name: $(el).find('a').eq(1).attr('title'),
          seeds: 0,
          peers: 0,
          magnet: $(el).find('a').eq(1).attr('href'),
          source: name
        }

        if (torrent.name && torrent.magnet) {
          const s = keywords.toLowerCase()
          const r = torrent.name.toLowerCase()
          
          const w = s.split(' ')
          const toMatch = w.length >= 3 ? 3 : 2
          let match = 0
          try {
            r.indexOf(w[0]) >= 0 && match++ 
            r.indexOf(w[1]) >= 0 && match++
            r.indexOf(w[2]) >= 0 && match++
            r.indexOf(w[3]) >= 0 && match++
          } catch(e) { }
            
          if (match >= toMatch) {
            const sxe = s.match(/s\d+e\d+/)
            if (req.cat === 'series' && (sxe && sxe[0])) {
              r.indexOf(sxe[0]) >= 0 && torrentsTemp.push(torrent)
            } else {
              torrentsTemp.push(torrent)
            }
          }
        }
      } catch (e) {}
    })

    return torrentsTemp
  }).then((torrentsTemp) => {
    return Promise.all(torrentsTemp.map(torrent => {
      return got(defaultURL + torrent.magnet, { timeout: 3500 }).then(response => {
        const $ = cheerio.load(response.body)
        torrent.magnet = $('#collapseOne>.table').find('a').eq(1).attr('href')

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
