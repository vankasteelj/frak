const got = require('got')
const cheerio = require('cheerio')
const defaultURL = atob('aHR0cHM6Ly9lenR2eC50by9hcGk=')
const name = atob('RVpUVg==')

const get = (cfg) => {
  const imdbid = cfg.imdbid.match(/\d+/)[0]
  const reqUrl = defaultURL + '/get-torrents?imdb_id=' + imdbid + '&limit=100'

  if (cfg.type === 'movie') return []

  const matcher = cfg.keywords.match(/s\d+e\d+/)[0].match(/\d+/g)
  const episode = {
    season: matcher[0],
    episode: matcher[1],
  }

  return got(reqUrl, { timeout: 3500 }).then(data => {
    const results = JSON.parse(data.body)
    const list = []

    if (!results.torrents) return list

    for (let r of results.torrents) {
      if (r.seeds && parseInt(r.season) === parseInt(episode.season) && parseInt(r.episode) === parseInt(episode.episode)) {
        list.push({
          name: r.title,
          magnet: r.magnet_url,
          seeds: r.seeds,
          peers: r.peers,
          size: r.size_bytes,
          source: name
        })
      }
    }

    return list
  })
}

module.exports = {
  name: name,
  url: defaultURL,
  search: (opts) => {
    return get(opts)
  }
}
