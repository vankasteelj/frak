'use strict'

const Search = {
    query: () => {
        let query = $('#query').val();
        if (!query) return;

        let data = JSON.parse($('#details > .container > .data').text());
        let type = data.show && 'show' || data.movie && 'movie';

        $('#details-sources .query .search').addClass('fa-spin fa-circle-o-notch').removeClass('fa-search');

        Search.online(query, type).then(results => {
            console.info('Found %s results', results.length, results);

            Search.addRemote(results);

            $('#details-sources .query .search').addClass('fa-search').removeClass('fa-spin fa-circle-o-notch');
        }).catch(err => $('#details-sources .query .search').addClass('fa-search').removeClass('fa-spin fa-circle-o-notch'));
    },
    
    online: (keywords, type) => {
        console.info('Searching for \'%s\' [%s]', keywords, type);

        return Promise.all(Object.keys(Plugins.loaded).map(plugin => {
            try {
                return Plugins.loaded[plugin].search({
                    keywords: keywords,
                    type: type
                }).catch(err => {
                    console.error(err);
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
        let out = [];
        let outDupNames = {};
        let outDupBtih = {};

        let foundNames = [];
        let dupNames = [];
        let foundBtih = [];
        let dupBtih = [];

        for (let i of input) {
            let name = Misc.slugify(i.name);
            foundNames.indexOf(name) === -1 && foundNames.push(name) || dupNames.push(name);

            let btih = i.magnet.match(/btih:(.*?)\&/i)[1];
            foundBtih.indexOf(btih) === -1 && foundBtih.push(btih) || dupBtih.push(btih);
        }

        // add health
        for (let i of input) {
            if (!i || !i.seeds) continue; // remove undefined and 0 seeds
            let ratio = i.peers ? i.seeds / i.peers : i.seeds; // get ratio
            let freeseeds = i.seeds - i.peers; // get total of free seeds

            let score = 0;
            score += ratio > 1 ? 1:0;               // +1 for more seeds than peers
            score += Math.floor(freeseeds/5)/10;    // +0.1 by 5 free peers
            score -= i.seeds < 5 ? 2:0;             // -2 for less than 5 seeds
            score -= i.seeds < 15 ? 1:0;            // -1 for less than 15 seeds
            
            //scores: 0 is bad, 1.2 is usable, 2 is good enough, 3 is good, 5 is great, >10 is awesome

            i.score = score;
            i.ratio = ratio;

            // where to push?
            let name = Misc.slugify(i.name);
            let btih = i.magnet.match(/btih:(.*?)\&/i)[1];
            if (dupBtih.indexOf(btih) !== -1) {
                if (!outDupBtih[btih]) outDupBtih[btih] = [];
                outDupBtih[btih].push(i);
            } else if (dupNames.indexOf(name) !== -1) {
                if (!outDupNames[name]) outDupNames[name] = [];
                outDupNames[name].push(i);
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

        // sort by score (and then seeds, and then ratio)
        out = out.sort((a,b) => {
            if (a.score > b.score) return -1;
            if (a.score < b.score) return 1;
            if (a.seeds > b.seeds) return -1;
            if (a.seeds < b.seeds) return 1;
            if (a.ratio > b.ratio) return -1;
            if (a.ratio < b.ratio) return 1;
            return 0;
        });    

        return out;
    },

    addLocal: (data) => {
        let item = `<div class="item local" id="local-file" onClick="Details.loadLocal(this)">`+
            `<div class="data">${JSON.stringify(data)}</div>`+
            `<div class="fa fa-hdd-o"></div>`+
            `<div class="title">${data.filename}</div>`+
        `</div>`;
        
        $('#details-sources .sources').append(item);
    },
    addRemote: (results) => {
        $('#details-sources .sources .item.remote').remove();
        for (let data of results) {
            if (!data) continue;
            let item = `<div class="item remote" onClick="Details.loadRemote('${data.magnet}')">`+
                `<div class="data">${JSON.stringify(data)}</div>`+
                `<div class="fa fa-magnet"></div>`+
                `<div class="title">${data.name}</div>`+
            `</div>`;

            $('#details-sources .sources').append(item);
        }
    }
}