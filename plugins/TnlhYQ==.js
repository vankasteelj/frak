const cheerio = require('cheerio')
const got = require('got')
const defaultURL = atob('aHR0cHM6Ly9ueWFhLnNp')
const name = atob('TnlhYQ==')

const get = (query, cat) => {
  const torrents = []
  const url = defaultURL + '?f=0&c=0_0&q=' + query + '&s=seeders&o=desc'
  return got(url, { timeout: 3500 }).then((html) => {
    const $ = cheerio.load(html.body)

    $('.comments').remove()
    $('.torrent-list tbody tr').each((i, el) => {
      const data = {
        name: $(el).find('a').eq(1).text(),
        seeds: parseInt($(el).find('td').eq(5).text()),
        peers: parseInt($(el).find('td').eq(6).text()),
        magnet: $(el).find('a').eq(3).attr('href'),
        source: name
      }

      const str = $(el).find('td').eq(3).text()
      let size
      const s = parseFloat(str).toString()
      if (str.match(/g/i)) size = s * 1024 * 1024 * 1024
      if (str.match(/m/i)) size = s * 1024 * 1024
      if (str.match(/k/i)) size = s * 1024
      data.size = size

      torrents.push(data)
    })
    return torrents
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

    // categories is broken
    switch (opts.type) {
      case 'show':
        req.cat = 'TV'
        break
      case 'movie':
        req.cat = 'movies'
        break
    }

    return get(opts.keywords, req.cat)
  }
}
