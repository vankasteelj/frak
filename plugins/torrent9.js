const cheerio = require('cheerio');
const got = require('got');
const defaultURL = 'https://ww1.torrent9.is';

const get = (keywords, cfg = {}) => {

    let reqURL = [
        cfg.url || defaultURL,
        'search_torrent',
        cfg.cat,
        escape(keywords) + '.html,trie-seeds-d'
    ].join('/');
    
    let torrents = [];

    return got(reqURL, {
        timeout: 3500
    }).then(response => {

        if (!response.body) {
            throw new Error('Error at fetching Torrent9');
        }

        let $ = cheerio.load(response.body);

        if (!$) {
            throw new Error('Error at loading Torrent9');
        }

        let torrentsTemp = Array();

        $('.table-striped tr').each((index, el) => {

            let torrent = {
                name: $(el).find('a').eq(0).text(),
                seeds: parseInt($(el).find('td').eq(2).text()),
                peers: parseInt($(el).find('td').eq(3).text()),
                magnet: $(el).find('a').eq(0).attr('href'),
                source: 'Torrent9'
            }

            let str = $(el).find('td').eq(1).text();
            let size;
            if (str) {
                let s = parseFloat(str).toString();
                if (str.match(/g/i)) size = s * 1024 * 1024 * 1024;
                if (str.match(/m/i)) size = s * 1024 * 1024;
                if (str.match(/k/i)) size = s * 1024;
            }
            torrent.size = size;

            torrent.name && torrentsTemp.push(torrent);
        });

        return torrentsTemp;
    }).then((torrentsTemp) => {
        return Promise.all(torrentsTemp.map(torrent => {
            return got(defaultURL+torrent.magnet, {timeout: 3500}).then(response => {
                let $ = cheerio.load(response.body);
                torrent.magnet = 'magnet:?xt=urn:btih:' + $('.download-btn a').first().attr('href').split('/')[2] + '&dn=' + escape(torrent.name)
                torrents.push(torrent);
                return;
            })
        }));
    }).then(() => torrents).catch((err) => {
        console.error(err);
        return [];
    });
}

module.exports = {
    name: 'Torrent9',
    url: defaultURL,
    search: (opts) => {
        let req = {};

        switch (opts.type) {
            case 'show':
                req.cat = 'series';
                break;
            case 'movie':
                req.cat = 'films';
                break;
        }

        return get(opts.keywords, req)
    }
}
