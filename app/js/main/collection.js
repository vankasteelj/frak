'use strict'

const Collection = {
    load: () => {
        console.info('Loading collection');

        // should trakt update?
        Trakt.last_activities().then(activities => {
            if (activities > (DB.get('traktsync') || 0) + 1200000) {
                console.info('Fetching from remote server...')
                Collection.get.traktcached();
                Promise.all([
                    Collection.get.traktshows(),
                    Collection.get.traktmovies()
                ]).then((collections) => {
                    console.log('Fetching done', collections)
                    Collection.get.traktcached();
                })
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

                return Collection.format.traktshows(results.shows);
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

                return Collection.format.traktmovies(results);
            }).catch(console.error)
        },
        traktcached: () => {
            let movies = DB.get('traktmoviescollection');
            let shows = DB.get('traktshowscollection');

            if (!shows && !movies) return;

            Collection.show.movies(movies);
            Collection.show.shows(shows);
            setTimeout(() => Interface.showMain(), 1500);
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

            return Promise.all(movies.map((movie) => {
                return Images.get.movie({
                    imdb: movie.movie.ids.imdb,
                    tmdb: movie.movie.ids.tmdb
                }).then(images => {
                    movie.movie.images = images;
                    collection.push(movie);
                    return movie;
                });
            })).then(() => {
                console.info('All images found for trakt movies');

                // sort
                collection = collection.sort(function(a, b){
                    if(a.listed_at > b.listed_at) {
                        return -1;
                    }
                    if(a.listed_at < b.listed_at) {
                        return 1;
                    }
                    return 0;
                });

                DB.store(collection, 'traktmoviescollection');
                return collection;
            }).catch(console.error);
        },
        traktshows: (shows) => {
            let collection = Array();

            return Promise.all(shows.map((item) => {
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

                // sort
                collection = shows.sort(function(a, b){
                    if(a.next_episode.first_aired > b.next_episode.first_aired) {
                        return -1;
                    }
                    if(a.next_episode.first_aired < b.next_episode.first_aired) {
                        return 1;
                    }
                    return 0;
                });

                DB.store(collection, 'traktshowscollection');
                return collection;
            }).catch(console.error);
        }
    },

    show: {
        shows: (shows) => {
            for (let show of shows) {
                let item = Items.constructShow(show);
                $('#collection #shows').append(item);
            }
        },
        movies: (movies) => {
            for (let movie of movies) {
                if (new Date(movie.movie.released.split('-')).valueOf() > Date.now()) {
                    console.info(`${movie.movie.title} is not released yet, not showing`)
                    continue;
                }
                let item = Items.constructMovie(movie);
                $('#collection #movies').append(item);
            }
        }
    }
}