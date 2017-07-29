'use strict'

const Collection = {
    load: () => {
        console.info('Loading collection');

        // should trakt update?
        Trakt.last_activities().then(activities => {
            if (activities > (DB.get('traktsync')) + 1200000) {
                console.info('Fetching from remote server...')
                Collection.get.traktcached();
                Collection.get.traktshows();
                Collection.get.traktmovies();
            } else {
                console.info('We got cached trakt data')
                Collection.get.traktcached();
            }
        }).catch(console.error);

        Collection.get.local();
    },

    get: {
        traktshows: () => {
            return Trakt.client.ondeck.getAll().then(results => {
                console.info('Trakt.tv - "show watchlist" collection recieved');

                DB.store(Date.now(), 'traktsync');
                DB.store(results, 'traktshows');

                Collection.format.traktshows(results.shows);

                return results.shows;
            }).catch(console.error)
        },
        traktmovies: () => {
            return Trakt.client.sync.watchlist.get({
                extended: 'full',
                type: 'movies'
            }).then(results => {
                console.info('Trakt.tv - "movie watchlist" collection recieved');

                DB.store(Date.now(), 'traktsync');
                DB.store(results, 'traktmovies');

                Collection.format.traktmovies(results);

                return results;
            }).catch(console.error)
        },
        traktcached: () => {
            let movies = DB.get('traktmoviescollection');
            let shows = DB.get('traktshowscollection');
            console.log('all movies', movies);
            console.log('all shows', shows);

            Collection.show.movies(movies);
            Collection.show.shows(shows);
            Interface.showMain();
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
    },

    format: {
        traktmovies: (movies) => {
            let collection = Array();

            Promise.all(movies.map((movie) => {
                movie = movie.movie;
                return Images.get.movie({
                    imdb: movie.ids.imdb,
                    tmdb: movie.ids.tmdb
                }).then(images => {
                    movie.images = images;
                    collection.push(movie);
                    console.log(images)
                    return movie;
                });
            })).then(() => {
                console.info('All images found for trakt movies');
                DB.store(collection, 'traktmoviescollection');
                console.log('all movies', collection);
            }).catch(console.error);
        },
        traktshows: (shows) => {
            let collection = Array();

            Promise.all(shows.map((item) => {
                return Images.get.show({
                    imdb: item.show.ids.imdb,
                    tmdb: item.show.ids.tmbd,
                    tvdb: item.show.ids.tvdb
                }).then(images => {
                    item.show.images = images;
                    collection.push(item);
                    return item;
                });
            })).then(() => {
                console.info('All images found for trakt shows');
                DB.store(collection, 'traktshowscollection');
                console.log('all shows', collection);
            }).catch(console.error);
        }
    },

    slugify: (title) => title.replace(/\W+/g, '-'),

    show: {
        shows: (shows) => {
            
        },
        movies: (movies) => {
            for (let movie of movies) {
                let item = Interface.constructMovieItem(movie)
                $('#collection .row').append(item);
            }
        }
    }
}