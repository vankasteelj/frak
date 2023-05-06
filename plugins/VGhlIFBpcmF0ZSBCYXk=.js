const cheerio = require('cheerio')
const got = require('got')
const defaultURL = atob('aHR0cHM6Ly90aGVoaWRkZW5iYXkuY29t')
const name = atob('VGhlIFBpcmF0ZSBCYXk=')

const get = (keywords, cfg = {}) => {
  const reqURL = [
    cfg.url || defaultURL,
    'search',
    escape(keywords),
    cfg.page || 0,
    cfg.sort || 7,
    cfg.cat || 200
  ].join('/')

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

    const torrents = []

    $('table[id="searchResult"] tr').each((index, el) => {
      const torrent = {
        name: $(el).find('.detLink').text(),
        seeds: parseInt($(el).find('td[align="right"]').eq(0).text()),
        peers: parseInt($(el).find('td[align="right"]').eq(1).text()),
        magnet: $(el).find('a[title="Download this torrent using magnet"]').attr('href'),
        source: name
      }

      const desc = $(el).find('.detDesc').first().text().match(/Size (.*?),/i)
      let size
      if (desc) {
        const str = desc[1]
        const s = parseFloat(str).toString()
        if (str.match(/g/i)) size = s * 1024 * 1024 * 1024
        if (str.match(/m/i)) size = s * 1024 * 1024
        if (str.match(/k/i)) size = s * 1024
      }
      torrent.size = size

      torrent.name && torrents.push(torrent)
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

    switch (opts.type) {
      case 'show':
        req.cat = '205,208'
        break
      case 'movie':
        req.cat = '201,202,207'
        break
    }

    return get(opts.keywords, req)
  }
}
