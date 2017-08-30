'use strict';

const got = require('got');
const cheerio = require('cheerio');
const defaultURL = 'http://1337x.to';

const get = (keywords, cfg = {}) => {
    let url = cfg.url|| defaultURL;

    let reqUrl = [
        url,
        cfg.cat ? 'category-search' : 'search',
        encodeURIComponent(keywords).replace(/%20/g, '+'),
        (cfg.cat ? cfg.cat+'/' : '') + (cfg.page || 1),
        ''
    ].join('/');

    return got(reqUrl, {timeout: 3500}).then(data => {
        let $page = cheerio.load(data.body);
        let $list = cheerio.load($page('.table-list tbody').html());

        let tmp = [];
        let list = [];

        $list('tr').each(function (index, el) {
            let $chunk = cheerio.load($list(this).html());

            let torrent = {
                name: $chunk('a').eq(1).text(),
                magnet: `${url}${$chunk('a').eq(1).attr('href')}`,
                seeds: parseInt($chunk('.coll-2').text()),
                peers: parseInt($chunk('.coll-3').text()),
                source: '1337x'
            };

            let str = $chunk('.coll-4').text().replace(/B\d+/i, 'B');
            let size;
            let s = parseFloat(str).toString();
            if (str.match(/g/i)) size = s * 1024 * 1024 * 1024;
            if (str.match(/m/i)) size = s * 1024 * 1024;
            if (str.match(/k/i)) size = s * 1024;
            torrent.size = size
            
            torrent.seeds && tmp.push(torrent); //directly remove 0 seeds
        });

        return Promise.all(tmp.map((item) => {
            return new Promise(resolve => {
                got(item.magnet).then(data => {
                    let $detail = cheerio.load(data.body);
                    let $content = cheerio.load($detail.html());
                    let magnet = $content('.torrent-category-detail ul.download-links-dontblock li').eq(0).children('a').attr('href');

                    item.magnet = magnet;
                    list.push(item);
                    resolve();
                }).catch(() => resolve());
            });
        })).then(() => {
            return list;
        });
        
    }).catch((err) => []);
        
};

module.exports = {
    name: '1337x',
    url: defaultURL,
    search: (opts) => {
        let req = {};

        switch (opts.type) {
            case 'show': req.cat = 'TV'; break;
            case 'movie': req.cat = 'Movies'; break;
        }

        return get(opts.keywords, req);
    }
}