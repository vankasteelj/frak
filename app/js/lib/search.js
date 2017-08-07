'use strict'

const Search = {
    getResults: () => {
        let query = $('#query').val()
        
        //if (!query) return;

        //Search.online(query);
    },
    
    online: (data) => {
        let type = data.show && 'show' || data.movie && 'movie';

        let keywords = data[type].title;
        
        if (data.show) {
            let s = Items.pad(data.next_episode.season);
            let e = Items.pad(data.next_episode.number);
            keywords += ` s${s}e${e}`;
        }

        console.info('Searching for', keywords);
        
        return Promise.all(Object.keys(Plugins.loaded).map(plugin => {
            return Plugins.loaded[plugin].search({
                keywords: keywords,
                type: type
            });
        })).then(r => {
            let results = [].concat.apply([], r); //flatten array
            console.log(results);
            return results;
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

    addLocal: (data) => {
        let item = `<div class="item local" id="local-file" onClick="Details.loadLocal(this)">`+
            `<div class="data">${JSON.stringify(data)}</div>`+
            `<div class="fa fa-hdd-o"></div>`+
            `<div class="title">${data.filename}</div>`+
        `</div>`;
        
        $('#details-sources .sources').append(item);
    },
    addRemote: (results) => {
        $('#details-sources .sources .item.remote').remove()
        for (let data of results) {
            let item = `<div class="item remote" id="local-file" onClick="Details.loadRemote(${data.magnet})">`+
                `<div class="data">${JSON.stringify(data)}</div>`+
                `<div class="fa fa-magnet"></div>`+
                `<div class="title">${data.name}</div>`+
            `</div>`;

            $('#details-sources .sources').append(item);
        }
    }
}