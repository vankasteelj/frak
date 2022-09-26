const cheerio = require('cheerio');
const got = require('got');
const defaultURL = atob('aHR0cHM6Ly90b3JyZW50Z2FsYXh5LnRvL3RvcnJlbnRzLnBocA==')
const name = atob('VG9ycmVudEdhbGF4eQ==')

const get = (query, cat) => {
  const torrents = []
  const url = defaultURL + "?parent_cat=" + cat + "&search=" + query + "&sort=seeders&order=desc&page=0"
  return got(url).then((html) => {
    const $ = cheerio.load(html.body)

    $('div.tgxtablerow.txlight').each((i, element) => {
      const data = {
        name: $(element).find(":nth-child(4) div a b").text(),
        magnet: $(element).find(".tgxtablecell.collapsehide.rounded.txlight a").next().attr("href"),
        seeds: $(element).find(':nth-child(11) > span > font:nth-child(1) > b').text().replace(/\.|,/g, ''),
        peers: $(element).find(':nth-child(11) > span > font:nth-child(2) > b').text().replace(/\.|,/g, ''),
        source: name
      }

      const str = $(element).find(':nth-child(8)').text()
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
        req.cat = 'TV'
        break
      case 'movie':
        req.cat = 'movies'
        break
    }

    return get(opts.keywords, req.cat)
  }
}
