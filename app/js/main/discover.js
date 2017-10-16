'use strict'

const Discover = {
    // trakt search for items
    search: () => {
        let terms = $('#discover .disc-search input').val()
        $('#discover .disc-proposal').hide();
        $('#discover #disc-spinner').show();
        Trakt.client.search.text({
            type: 'movie,show',
            query: terms,
            limit: 20,
            extended: "full"
        }).then((results) => {
            console.info('Trakt - search results', results);
            return Discover.formatSearch(results);
        }).then((items) => {
            $('#discover #disc-spinner').hide();
            $('#discover .disc-proposal').hide();
            $('#discover .disc-results .row').html('');
            $('#discover .disc-results').show();
            for (let item of items) {
                let i = Items['constructDiscover'+item.type.charAt(0).toUpperCase() + item.type.slice(1)](item);
                $('#discover .disc-results .row').append(i);
            }
            Items.applyRatings(DB.get('traktratings'));
        });
    },
    formatSearch: (items) => {
        let collection = Array();

        return Promise.all(items.map((item, index) => {
            let type = item.type == 'movie' ? 'movie' : 'show';

            return Images.get[type]({
                imdb: item[type].ids.imdb,
                tmdb: item[type].ids.tmdb,
                tvdb: item[type].ids.tvdb
            }).then(images => {
                item[type].images = images;
                item.index = index;
                collection.push(item);
                return item;
            });
        })).then(() => {
            console.info('All images found for the search');

            // sort
            collection = collection.sort(function(a, b){
                if(a.score > b.score) {
                    return -1;
                }
                if(a.score < b.score) {
                    return 1;
                }
                return 0;
            });

            return collection;
        }).catch(console.error);
    },
    
    load: () => {
        Discover.reset();

        // cache for 30min
        if (DB.get('lasttrendingsync') && (Date.now() - DB.get('lasttrendingsync') < 30 * 60 * 1000)) {
            console.info('Trakt - trending movies/shows already in cache');
            Discover.showShows();
            return Promise.resolve();
        } else {
            console.info('Trakt - loading trending movies/shows');
            return Trakt.client.movies.trending({
                extended: 'full',
                limit: 20
            }).then(Discover.format.traktmovies).then(() => {
                return Trakt.client.shows.trending({
                    extended: 'full',
                    limit: 20
                });
            }).then(Discover.format.traktshows).then(() => {
                DB.store(Date.now(), 'lasttrendingsync');
                Discover.showShows();
            });
        }
    },
    
    reset: () => {
        $('#discover .disc-results').hide();
        $('#discover .disc-proposal').show();
        $('#discover #disc-spinner').show();
    },

    showShows: () => {
        let shows = DB.get('traktshowstrending');
        $('#discover .disc-proposal .row').html('');
        $('#discover #disc-spinner').hide();
        for (let show of shows) {
            let item = Items.constructDiscoverShow(show);
            $('#discover .disc-proposal .row').append(item);
        }
        Items.applyRatings(DB.get('traktratings'));
        $('#discover .disc-proposal .categories div').removeClass('active');
        $('#discover .disc-proposal .categories .shows').addClass('active');
    },

    showMovies: () => {
        let movies = DB.get('traktmoviestrending');
        $('#discover .disc-proposal .row').html('');
        $('#discover #disc-spinner').hide();
        for (let movie of movies) {
            let item = Items.constructDiscoverMovie(movie);
            $('#discover .disc-proposal .row').append(item);
        }
        Items.applyRatings(DB.get('traktratings'));
        $('#discover .disc-proposal .categories div').removeClass('active');
        $('#discover .disc-proposal .categories .movies').addClass('active');
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
                console.info('All images found for movies');

                // sort
                collection = collection.sort(function(a, b){
                    if(a.watchers > b.watchers) {
                        return -1;
                    }
                    if(a.watchers < b.watchers) {
                        return 1;
                    }
                    return 0;
                });

                DB.store(collection, 'traktmoviestrending');
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
                console.info('All images found for shows');

                // sort
                collection = collection.sort(function(a, b){
                    if(a.watchers > b.watchers) {
                        return -1;
                    }
                    if(a.watchers < b.watchers) {
                        return 1;
                    }
                    return 0;
                });

                DB.store(collection, 'traktshowstrending');
                return collection;
            }).catch(console.error);
        }
    },
    getData: (elm) => {
        // extract json from data div
        let id = $(elm).context.offsetParent && $(elm).context.offsetParent.id || $(elm).context.id;
        let data = JSON.parse($(`#${id} .data`).text());

        return data;
    },

    addToWatchlist: (item) => {
        let data = Discover.getData(item);
        let type = data.movie ? 'movie' : 'show';

        let post = {};
        post[type+'s'] = [data[type]];

        Trakt.client.sync.watchlist.add(post).then((res) => {
            $(`#${data[type].ids.slug} .watchlist`)[0].outerHTML = '<div class="watchlist trakt-icon-list-thick tooltipped i18n selected"></div>';
        })
    }
}