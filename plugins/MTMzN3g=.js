const got = require('got')
const cheerio = require('cheerio')
const defaultURL = atob('aHR0cDovLzEzMzd4LnRv')
const name = atob('MTMzN3g=')

const get = (keywords, cfg = {}) => {
  const url = cfg.url || defaultURL

  const reqUrl = [
    url,
    cfg.cat ? 'category-search' : 'search',
    encodeURIComponent(keywords).replace(/%20/g, '+'),
    (cfg.cat ? cfg.cat + '/' : '') + (cfg.page || 1),
    ''
  ].join('/')

  return got(reqUrl, { timeout: 3500 }).then(data => {
    const $page = cheerio.load(data.body)
    const $list = $page('.table-list tbody tr')

    const tmp = []
    const list = []

    $list.each(function (index, el) {
      const $chunk = cheerio.load(el)

      const torrent = {
        name: $chunk('a').eq(1).text(),
        magnet: `${url}${$chunk('a').eq(1).attr('href')}`,
        seeds: parseInt($chunk('.coll-2').text()),
        peers: parseInt($chunk('.coll-3').text()),
        source: name
      }

      const str = $chunk('.coll-4').text().replace(/B\d+/i, 'B')
      let size
      const s = parseFloat(str).toString()
      if (str.match(/g/i)) size = s * 1024 * 1024 * 1024
      if (str.match(/m/i)) size = s * 1024 * 1024
      if (str.match(/k/i)) size = s * 1024
      torrent.size = size

      torrent.seeds && tmp.push(torrent) // directly remove 0 seeds
    })

    return Promise.all(tmp.map((item) => {
      return new Promise(resolve => {
        got(item.magnet).then(data => {
          const $detail = cheerio.load(data.body)
          const $content = cheerio.load($detail.html())
          const magnet = $content('.torrent-detail-page').find('a').eq(0).attr('href')

          item.magnet = magnet
          list.push(item)
          resolve()
        }).catch(() => resolve())
      })
    })).then(() => {
      return list
    })
  }).catch((err) => {
    console.log(err)
    return []
  })
}

module.exports = {
  name: name,
  url: defaultURL,
  search: (opts) => {
    const req = {}

    switch (opts.type) {
      case 'show': req.cat = 'TV'; break
      case 'movie': req.cat = 'Movies'; break
    }

    return get(opts.keywords, req)
  }
}
