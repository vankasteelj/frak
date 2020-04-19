const got = require('got');
const defaultURL = 'api-fetch.sh'; //.website, .am

const getMovies = (query) => {
    let url = 'https://movies-v2.' + defaultURL;

    return got(url + '/movies/1?keywords=' + escape(query), {
        timeout: 3500
    }).then(res => {
        let result = JSON.parse(res.body);
        if (!result) return [];
        let results = [];

        for (let i in result) {
            let item = result[i];
            for (let q in item.torrents.en) {
                let subitem = item.torrents.en[q];
                let itemModel = {
                    name: function () {
                        try {
                            return unescape(subitem.url.match('\&dn=.*?\&tr')[0]
                                    .replace('&dn=', '')
                                    .replace('&tr', ''))
                                .replace(/\+/g, ' ');
                        } catch (e) {
                            return `${item.title}.${q}.${subitem.provider}`;
                        }
                    }(),
                    magnet: subitem.url,
                    seeds: parseInt(subitem.seed),
                    peers: parseInt(subitem.peer),
                    size: subitem.size,
                    source: 'Popcorn Time'
                };
                results.push(itemModel);
            }
        }

        return results;
    }).catch((err) => {
        console.error(err);
        return [];
    });
}

const getShows = (query) => {
    let url = 'https://tv-v2.' + defaultURL;
    let season = 0;
    let episode = 0;

    let isconform = function () {
        let s = query.match(/s+\d{2}/);
        let e = query.match(/e+\d{2}/);
        if (s && e) {
            season = parseInt(s[0].replace('s', ''));
            episode = parseInt(e[0].replace('e', ''));
            query = query.replace(/s\d{2}e\d{2}/, '').trim();
            return true;
        } else {
            return false;
        }
    }()

    if (!isconform) throw new Error('Query is not conform, respect SxxExx model');

    return got(url + '/shows/1?keywords=' + escape(query), {
        timeout: 3500
    }).then(res => {
        let body = JSON.parse(res.body);
        return got(url + '/show/' + body[0].imdb_id, {
            timeout: 3500
        });
    }).then(det => {
        let serie = JSON.parse(det.body);
        let episodeT = serie.episodes.filter(obj => obj.season == season && obj.episode == episode);

        if (!episodeT.length) {
            return [];
        }

        let torrents = episodeT[0].torrents;
        let results = [];

        for (let q in torrents) {
            if (q == 0) continue;

            let item = torrents[q];
            let pad = (n) => (n < 10) ? ('0' + n) : n;

            let itemModel = {
                name: function () {
                    try {
                        return unescape(item.url.match('\&dn=.*?\&tr')[0]
                                .replace('&dn=', '')
                                .replace('&tr', ''))
                            .replace(/\+/g, ' ');
                    } catch (e) {
                        return [
                            serie.title,
                            '(' + serie.year + ')',
                           's' + pad(season) + 'e' + pad(episode),
                            q,
                            '-',
                            item.provider
                        ].join(' ');
                    }
                }(),
                magnet: item.url,
                seeds: parseInt(item.seeds),
                peers: parseInt(item.peers),
                source: 'Popcorn Time'
            };

            results.push(itemModel);
        }

        return results;

    }).catch((err) => {
        console.error(err);
        return [];
    });
}

module.exports = {
    name: 'Popcorn Time',
    url: defaultURL,
    search: (opts) => {
        opts.keywords = opts.keywords.toLowerCase();

        return opts.type == 'show' ? getShows(opts.keywords) : getMovies(opts.keywords);
    }
}
