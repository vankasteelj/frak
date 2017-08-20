const got = require('got');
const defaultURL = 'api-fetch.website';

const getMovies = (query) => {
    let url = 'https://movies-v2.' + defaultURL;

    return got(url + '/movies/1?keywords='+escape(query), {
        json: true,
        timeout: 3500
    }).then(res => {
        let result = res.body[0];
        if (!result) return [];

        let torrents = result.torrents.en;
        let results = [];
        

        for (let q in torrents) {
            let item = torrents[q];
            let itemModel = {
                name: function () {
                    try {
                        return unescape(item.url.match('\&dn=.*?\&tr')[0]
                            .replace('&dn=', '')
                            .replace('&tr', ''))
                            .replace(/\+/g,' ');
                    } catch(e) {
                        return [
                            result.title,
                            '(' + result.year + ')',
                            q,
                            '-',
                            item.provider
                        ].join(' ')
                    }
                }(),
                magnet: item.url,
                seeds: parseInt(item.seed),
                peers: parseInt(item.peer),
                size: item.size
            };
            results.push(itemModel);
        }

        return results;
    });
}

const getShows = (query) => {
    let url = 'https://tv-v2.' + defaultURL;
    let season = 0;
    let episode = 0;

    let isconform = function() {
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
        json: true,
        timeout: 3500
    }).then(res => {
        return got(url + '/show/' + res.body[0].imdb_id, {
            json: true,
            timeout: 3500
        });
    }).then(det => {
        let serie = det.body;
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
                           's'+pad(season)+'e'+pad(episode),
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