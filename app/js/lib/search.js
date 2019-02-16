'use strict'

const Search = {
    query: () => {
        let query = $('#query').val();
        if (!query) return;

        let data = JSON.parse($('#details > .container > .data').text());
        let type = data.show && 'show' || data.movie && 'movie';

        $('#details-sources .query .search').addClass('fa-spin fa-circle-o-notch').removeClass('fa-search');

        Search.online(query, type).then(results => {
            if (!results) results = [];
            console.info('Found %s results', results.length, results);

            Search.addRemote(results);

            $('#details-sources .query .search').addClass('fa-search').removeClass('fa-spin fa-circle-o-notch');
        }).catch(err => {
            $('#details-sources .query .search').addClass('fa-search').removeClass('fa-spin fa-circle-o-notch')
            console.error('Search.query', err);
        });
    },

    online: (keywords, type) => {
        console.info('Searching for \'%s\' [%s]', keywords, type);

        return Promise.all(Object.keys(Plugins.loaded).map(plugin => {
            try {
                return Plugins.loaded[plugin].search({
                    keywords: keywords,
                    type: type
                }).catch(err => {
                    console.error('%s search error', plugin, err);
                    return Promise.resolve([]);
                });
            } catch (e) {
                return Promise.resolve([])
            }
        })).then(r => {
            let results = [].concat.apply([], r); //flatten array

            return Search.sortOnline(results);
        });
    },
    offline: (data) => {
        let type = data.show && 'show' || data.movie && 'movie';
        let id = data[type].ids.slug;
        let library = DB.get(`local_${type}s`);

        if (!id || !library) return;

        let find = (slug) => library.findIndex((item) => item.metadata[type].ids.slug === slug);
        let found = find(id);

        if (data.movie) {
            return library[found];
        }
        if (data.show) {
            try {
                return library[found].seasons[data.next_episode.season].episodes[data.next_episode.number];
            } catch (e) {}
        }
    },

    sortOnline: (input) => {
        let collection = [];
        let out = [];

        let outDupNames = {};
        let outDupBtih = {};
        let outDupSizes = {};

        let foundNames = [];
        let dupNames = [];
        let foundBtih = [];
        let dupBtih = [];
        let foundSize = [];
        let dupSize = [];

        // check if all info is there
        return Promise.all(input.map((i) => {
            return new Promise(resolve => {
                if (!i) return resolve();

                // 0 peers, 0 seeds
                if (!i.seeds && !i.peers) {
                    Search.recalcSeeds(i).then(reseed => {
                        if (!reseed || reseed.size) {
                            return reseed;
                        } else {
                            // also no size
                            return Search.recalcSize(reseed);
                        }
                    }).then((done) => {
                        done && collection.push(done);
                        resolve();
                    });
                } else if (i.seeds && i.peers && !i.size) {
                    Search.recalcSize(i).then(resize => {
                        resize && collection.push(resize);
                        resolve();
                    })
                } else {
                    collection.push(i);
                    resolve();
                }
            });
        })).then(() => {
            // prepare for duplicates
            for (let i of collection) {
                let name = Misc.slugify(i.name);
                foundNames.indexOf(name) === -1 && foundNames.push(name) || dupNames.push(name);

                let matched = i.magnet.match(/btih:(.*?)($|\&)/i);
                if (!matched) continue;

                let btih = matched[1].toLowerCase();
                foundBtih.indexOf(btih) === -1 && foundBtih.push(btih) || dupBtih.push(btih);

                let size = parseInt(i.size / 1024 / (1024 / 100)); // 1kb range
                foundSize.indexOf(size) === -1 && foundSize.push(size) || dupSize.push(size);
            }

            // add health
            for (let i of collection) {
                if (!i) continue; // remove undefined
                let ratio = i.peers ? i.seeds / i.peers : i.seeds; // get ratio
                let freeseeds = i.seeds - i.peers; // get total of free seeds

                let score = Search.calcScore(ratio, i.seeds, freeseeds);

                i.score = score;
                i.ratio = ratio;

                // where to push?
                let name = Misc.slugify(i.name);

                let matched = i.magnet.match(/btih:(.*?)($|\&)/i);
                if (!matched) continue;

                let btih = matched[1].toLowerCase();
                let size = parseInt(i.size / 1024 / (1024 / 100));

                if (dupBtih.indexOf(btih) !== -1) {
                    if (!outDupBtih[btih]) outDupBtih[btih] = [];
                    outDupBtih[btih].push(i);
                } else if (dupNames.indexOf(name) !== -1) {
                    if (!outDupNames[name]) outDupNames[name] = [];
                    outDupNames[name].push(i);
                } else if (dupSize.indexOf(size) !== -1) {
                    if (!outDupSizes[size]) outDupSizes[size] = [];
                    outDupSizes[size].push(i);
                } else {
                    out.push(i);
                }
            }

            // sort duplicates by score, keep the best one
            let findMax = (a, b) => (a.score > b.score) ? a : b;
            for (let i in outDupNames) {
                out.push(outDupNames[i].reduce(findMax));
            }
            for (let i in outDupBtih) {
                out.push(outDupBtih[i].reduce(findMax))
            }
            for (let i in outDupSizes) {
                out.push(outDupSizes[i].reduce(findMax))
            }

            // sort by score (and then seeds, and then ratio)
            out = out.sort((a, b) => {
                if (a.score > b.score) return -1;
                if (a.score < b.score) return 1;
                if (a.seeds > b.seeds) return -1;
                if (a.seeds < b.seeds) return 1;
                if (a.ratio > b.ratio) return -1;
                if (a.ratio < b.ratio) return 1;
                return 0;
            });

            return out;
        });
    },

    addLocal: (data) => {
        let item = `<div class="item local" id="local-file" onClick="${data.source ? 'Details.loadShared(this)' : 'Details.loadLocal(this)'}">` +
                `<div class="data">${JSON.stringify(data)}</div>` +
                (data.source ? `<div class="fa fa-download" title="${i18n.__('Shared by %s', data.source)}"></div>` : `<div class="fa fa-hdd-o"></div>`) +
                `<div class="title">${data.filename}</div>` +
            `</div>`;

        $('#details-sources .sources').append(item);

        $(`#local-file .fa-hdd-o`).off('contextmenu').on('contextmenu', (e) => {
            gui.Shell.showItemInFolder(path.normalize(data.path));
            Notify.snack(i18n.__('Opening the file location'));
        })
    },
    addRemote: (results = []) => {
        $('#details-sources .sources .item.remote').remove();
        for (let data of results) {
            if (!data) continue;

            let id = data.magnet.match(/\b([A-F\d]+)\b/i)[0];
            let item = `<div class="item remote" onClick="Details.loadRemote('${data.magnet}')" id="${id}">` +
                    `<div class="data">${JSON.stringify(data)}</div>` +
                    `<div class="fa fa-magnet" title="${i18n.__('Open the magnet link')}"></div>` +
                    `<div class="title">${data.name}</div>` +
                    `<div class="size">${Misc.fileSize(data.size) || i18n.__('Unknown')}</div>` +
                    `<div class="fa fa-bolt ${Search.matchScore(data.score)}" title="${i18n.__('Seeds: %s', data.seeds)}, ${i18n.__('Peers: %s', data.peers)}"></div>` +
                `</div>`;

            $('#details-sources .sources').append(item);
            $(`#${id} .fa-magnet`).on('click', (e) => {
                e && e.stopPropagation();
                Misc.openExternal(data.magnet);
            }).off('contextmenu').on('contextmenu', (e) => {
                let clipboard = nw.Clipboard.get();
                clipboard.set(data.magnet, 'text');
                Notify.snack(i18n.__('Magnet link was copied to the clipboard'));
            })
        }
    },

    calcScore: (ratio, seeds, freeseeds) => {
        let score = 0;
        score += ratio > 1 ? 1 : 0; // +1 for more seeds than peers
        score += Math.floor(freeseeds / 5) / 10; // +0.1 by 5 free peers
        score -= seeds < 5 ? 2 : 0; // -2 for less than 5 seeds
        score -= seeds < 15 ? 1 : 0; // -1 for less than 15 seeds

        //scores: 0 is bad, 1.2 is usable, 2 is good enough, 3 is good, 5 is great, >10 is awesome
        return score;
    },

    matchScore: (score) => {
        let cl = 'neutral';

        if (score >= 1.2) cl = 'ok';
        if (score >= 3) cl = 'good';
        if (score >= 5) cl = 'great';
        if (score < 1.2) cl = 'usable';
        if (score < 0) cl = 'terrible';

        return cl;
    },

    recalcSeeds: (data) => {
        return new Promise(resolve => {
            let wheath = require('webtorrent-health');

            wheath(data.magnet).then((i) => {
                data.seeds = i.seeds;
                data.peers = i.peers;
                resolve(data);
            }).catch(() => {
                resolve();
            });
        });
    },

    recalcSize: (data) => {
        return new Promise(resolve => {
            let wtorrent = new(require('webtorrent'))();
            let done;

            setTimeout(() => {
                if (done) return;
                wtorrent.destroy();
                resolve();
            }, 3500);

            wtorrent.add(data.magnet, (t) => {
                data.size = t.length

                wtorrent.destroy();
                done = true;
                resolve(data);
            });
        });
    }
}
