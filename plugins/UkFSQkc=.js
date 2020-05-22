'use strict'

const got = require('got')
const cheerio = require('cheerio')
const defaultURL = atob('aHR0cDovL3JhcmJnbWlycm9yLmNvbQ==')
const name = atob('UkFSQkc=')

const get = (keywords, cfg = {}) => {
  const url = cfg.url || defaultURL

  const reqUrl = url +
  '/torrents.php?' +
  (cfg.cat && 'category=' + cfg.cat + '&') +
  ('search=' + encodeURIComponent(keywords).replace(/%20/g, '+')) +
  '&order=seeders&by=DESC'

  return got(reqUrl, { timeout: 3500 }).then(data => {
    const $page = cheerio.load(data.body)
    const $list = cheerio.load($page('.lista2t').html())

    const tmp = []
    const list = []

    $list('.lista2').each(function (index, el) {
      const $chunk = cheerio.load($list(this).html())

      const torrent = {
        name: $chunk('a').eq(1).text(),
        magnet: `${url}${$chunk('a').eq(1).attr('href')}`,
        seeds: parseInt($chunk('td').eq(4).text()),
        peers: parseInt($chunk('td').eq(5).text()),
        source: name
      }

      const str = $chunk('td').eq(3).text().replace(/B\d+/i, 'B')
      let size
      const s = parseFloat(str).toString()
      if (str.match(/g/i)) size = s * 1024 * 1024 * 1024
      if (str.match(/m/i)) size = s * 1024 * 1024
      if (str.match(/k/i)) size = s * 1024
      torrent.size = size

      torrent.seeds && torrent.magnet && tmp.push(torrent) // directly remove 0 seeds
    })

    return Promise.all(tmp.map((item) => {
      return new Promise(resolve => {
        got(item.magnet).then(data => {
          const $detail = cheerio.load(data.body)
          const $content = cheerio.load($detail.html())
          const magnet = $content('.lista').find('a').eq(4).attr('href')

          item.magnet = magnet
          list.push(item)
          resolve()
        }).catch(() => resolve())
      })
    })).then(() => {
      return list
    })
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
