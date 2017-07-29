'use strict'

const Collection = {
    load: () => {
        console.info('Loading collection');
        
        Collection.trakt.shows();
        Collection.trakt.movies();
        Collection.local();
    },

    trakt: {
        shows: () => {
            return Trakt.client.ondeck.getAll().then(results => {
                console.info('Trakt.tv - "show watchlist" collection recieved');
                console.log(results);
                DB.store(results, 'traktshows');
                return results.shows;
            }).catch(console.error)
        },
        movies: () => {
            return Trakt.client.sync.watchlist.get({
                extended: 'full',
                type: 'movies'
            }).then(results => {
                console.info('Trakt.tv - "movie watchlist" collection recieved');
                console.log(results);
                DB.store(results, 'traktmovies')
                return results;
            }).catch(console.error)
        }
    },
    
    local: () => {
        let collection = DB.get('locallibrary');

        let method = collection ? 'update' : 'scan';
        return Local[method](collection).then(results => {
            console.info('Local library collection recieved');
            console.log(results);
            DB.store(results, 'locallibrary');
            return results;
        }).catch(console.error)
    }
}