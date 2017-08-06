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
        let id = data.show && data.show.ids.slug || data.movie && data.movie.ids.slug;
        let library = data.show && DB.get('local_shows') || data.movie && DB.get('local_movies');

        if (!id || !library) return;
        
        let find = (slug) => library.findIndex((item) => item.metadata.ids.slug === slug);
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