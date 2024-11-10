const cheerio = require('cheerio')
const got = require('got')
const defaultURL = atob('aHR0cHM6Ly93d3cudG9ycmVudGRvd25sb2FkLmluZm8v')
const name = atob('VG9ycmVudCBEb3dubG9hZA==')

const get = (query, cat) => {
  const torrents = []
  const url = defaultURL + 'search?q=' + query
  return got(url).then((html) => {
    const $ = cheerio.load(html.body)

    $('.table2 tr').each((index, elm) => {
      const $elm = cheerio.load(elm)

      try {
        const n = $elm('.tt-name a')
        const t = $elm('.tt-name .smallish').text()
        const s = $elm('.tdseed')
        const p = $elm('.tdleech')
        const g = $elm('.tdnormal').eq(1).text()

        if (!t.match(new RegExp(cat, 'i'))) {
          throw new Error('none')
        }

        const data = {
          magnet: 'magnet:?xt=urn:btih:' + n[0].attribs.href.split('/')[1],
          name: n.text(),
          peers: parseInt(p.text()) || 0,
          seeds: parseInt(s.text()) || 0,
          size: (() => {
            let _s = 0
            const s = parseFloat(g).toString()
            if (g.match(/g/i)) _s = s * 1024 * 1024 * 1024
            if (g.match(/m/i)) _s = s * 1024 * 1024
            if (g.match(/k/i)) _s = s * 1024
            return parseInt(_s)
          })(),
          source: name
        }
        torrents.push(data)
      } catch (e) {}
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
        req.cat = 'movie'
        break
    }

    return get(opts.keywords, req.cat)
  }
}
