const cheerio = require('cheerio');
const got = require('got');
const defaultURL = 'https://thepiratebay.org';

const get = (keywords, cfg = {}) => {

    let reqURL = [
        cfg.url || defaultURL,
        'search',
        escape(keywords),
        cfg.page || 0,
        cfg.sort || 7,
        cfg.cat || 200
    ].join('/');

    return got(reqURL, {
        timeout: 3500
    }).then(response => {

        if (!response.body) {
            throw new Error('Error at fetching TPB');
        }

        let $ = cheerio.load(response.body);

        if (!$) {
            throw new Error('Error at loading TPB');
        }

        let torrents = Array();

        $('table[id="searchResult"] tr').each((index, el) => {

            let torrent = {
                name: $(el).find('.detLink').text(),
                seeds: parseInt($(el).find('td[align="right"]').eq(0).text()),
                peers: parseInt($(el).find('td[align="right"]').eq(1).text()),
                magnet: $(el).find('a[title="Download this torrent using magnet"]').attr('href'),
                source: 'The Pirate Bay'
            }

            let desc = $(el).find('.detDesc').first().text().match(/Size (.*?),/i);
            let size;
            if (desc) {
                let str = desc[1];
                let s = parseFloat(str).toString();
                if (str.match(/g/i)) size = s * 1024 * 1024 * 1024;
                if (str.match(/m/i)) size = s * 1024 * 1024;
                if (str.match(/k/i)) size = s * 1024;
            }
            torrent.size = size;

            torrent.name && torrents.push(torrent);
        });

        return torrents;
    }).catch((err) => []);
}

module.exports = {
    name: 'The Pirate Bay',
    url: defaultURL,
    search: (opts) => {
        let req = {};

        switch (opts.type) {
            case 'show':
                req.cat = '205,208';
                break;
            case 'movie':
                req.cat = '201,202,207';
                break;
        }

        return get(opts.keywords, req)
    }
}
