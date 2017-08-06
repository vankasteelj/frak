'use strict'

const Search = {
    getResults: () => {
        let query = $('#query').val()
        
        //if (!query) return;

        //Search.online(query);
    },
    
    online: (query) => {
        console.info('Searching for', query)
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
    }
}