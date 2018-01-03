'use strict'

const Discover = {
    // trakt search for items
    search: () => {
        let terms = $('#discover .disc-search input').val();

        if (!terms) return;

        $('#discover .disc-proposal').hide();
        $('#discover .disc-results .row').html('');
        $('#discover #disc-spinner').show();
        $('#discover .disc-search .search').addClass('fa-spinner fa-spin');
        Trakt.client.search.text({
            type: 'movie,show',
            query: terms,
            limit: 20,
            extended: 'full'
        }).then((results) => {
            console.info('Trakt - search results', results);
            return Discover.formatSearch(results);
        }).then((items = []) => {
            $('#discover #disc-spinner').hide();
            $('#discover .disc-proposal').hide();
            $('#discover .disc-results .row').html('');
            $('#discover .disc-results').show();
            for (let item of items) {
                let i = Items['constructDiscover'+item.type.charAt(0).toUpperCase() + item.type.slice(1)](item);
                $('#discover .disc-results .row').append(i);
            }

            if (!items.length) {
                $('#discover .disc-results .row').append(`<span class="notfound">${i18n.__("These aren't the droids you're looking for")}</span>`);
            }

            Items.applyRatings(DB.get('traktratings'));
            $('#discover .disc-search .search').removeClass('fa-spinner fa-spin');
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
    
    load: {
        trending: () => {
            Discover.reset();

            let lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows';

            $('#discover .type div').removeClass('active');
            $('#discover .type .trending').addClass('active');

            // cache for 30min
            if (DB.get('lasttrendingsync') && (Date.now() - DB.get('lasttrendingsync') < 30 * 60 * 1000)) {
                console.info('Trakt - trending movies/shows already in cache');
                Discover.show[lastTab]('trending');
                return Promise.resolve();
            } else {
                console.info('Trakt - loading trending movies/shows');
                return Trakt.client.movies.trending({
                    extended: 'full',
                    limit: 20
                }).then(Discover.format.traktmovies).then((collection) => {
                    DB.store(collection, 'traktmoviestrending');
                    return Trakt.client.shows.trending({
                        extended: 'full',
                        limit: 20
                    });
                }).then(Discover.format.traktshows).then((collection) => {
                    DB.store(collection, 'traktshowstrending');
                    DB.store(Date.now(), 'lasttrendingsync');
                    Discover.show[lastTab]('trending');
                }).catch(console.error);
            }
        },
        popular: () => {
            Discover.reset();

            let lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows';

            $('#discover .type div').removeClass('active');
            $('#discover .type .popular').addClass('active');

            // cache for 30min
            if (DB.get('lastpopularsync') && (Date.now() - DB.get('lastpopularsync') < 30 * 60 * 1000)) {
                console.info('Trakt - popular movies/shows already in cache');
                Discover.show[lastTab]('popular');
                return Promise.resolve();
            } else {
                console.info('Trakt - loading popular movies/shows');
                return Trakt.client.movies.popular({
                    extended: 'full',
                    limit: 20
                }).then(Discover.format.traktmovies).then((collection) => {
                    DB.store(collection, 'traktmoviespopular');
                    return Trakt.client.shows.popular({
                        extended: 'full',
                        limit: 20
                    });
                }).then(Discover.format.traktshows).then((collection) => {
                    DB.store(collection, 'traktshowspopular');
                    DB.store(Date.now(), 'lastpopularsync');
                    Discover.show[lastTab]('popular');
                }).catch(console.error);
            }
        },
        watched: () => {
            Discover.reset();

            let lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows';

            $('#discover .type div').removeClass('active');
            $('#discover .type .watched').addClass('active');

            // cache for 30min
            if (DB.get('lastwatchedsync') && (Date.now() - DB.get('lastwatchedsync') < 30 * 60 * 1000)) {
                console.info('Trakt - watched movies/shows already in cache');
                Discover.show[lastTab]('watched');
                return Promise.resolve();
            } else {
                console.info('Trakt - loading watched movies/shows');
                return Trakt.client.movies.watched({
                    extended: 'full',
                    limit: 20
                }).then(Discover.format.traktmovies).then((collection) => {
                    DB.store(collection, 'traktmovieswatched');
                    return Trakt.client.shows.watched({
                        extended: 'full',
                        limit: 20
                    });
                }).then(Discover.format.traktshows).then((collection) => {
                    DB.store(collection, 'traktshowswatched');
                    DB.store(Date.now(), 'lastwatchedsync');
                    Discover.show[lastTab]('watched');
                }).catch(console.error);
            }
        },
        anticipated: () => {
            Discover.reset();

            let lastTab = $('#discover .disc-proposal .categories .movies').hasClass('active') ? 'movies' : 'shows';

            $('#discover .type div').removeClass('active');
            $('#discover .type .anticipated').addClass('active');

            // cache for 30min
            if (DB.get('lastanticipatedsync') && (Date.now() - DB.get('lastanticipatedsync') < 30 * 60 * 1000)) {
                console.info('Trakt - anticipated movies/shows already in cache');
                Discover.show[lastTab]('anticipated');
                return Promise.resolve();
            } else {
                console.info('Trakt - loading anticipated movies/shows');
                return Trakt.client.movies.anticipated({
                    extended: 'full',
                    limit: 20
                }).then(Discover.format.traktmovies).then((collection) => {
                    DB.store(collection, 'traktmoviesanticipated');
                    return Trakt.client.shows.anticipated({
                        extended: 'full',
                        limit: 20
                    });
                }).then(Discover.format.traktshows).then((collection) => {
                    DB.store(collection, 'traktshowsanticipated');
                    DB.store(Date.now(), 'lastanticipatedsync');
                    Discover.show[lastTab]('anticipated');
                }).catch(console.error);
            }
        }
    },
    
    reset: () => {
        $('#discover .disc-results').hide();
        $('#discover .disc-proposal .row').html('');
        $('#discover .disc-search input').val('');
        $('#discover .disc-proposal').show();
        $('#discover #disc-spinner').show();
    },

    show: {
        shows: (key) => {
            if (!key) {
                try {
                    key = $('#discover .type .active')[0].classList[0];
                } catch (e) {
                    key = 'trending';
                }
            }

            Discover.reset();

            let shows = DB.get('traktshows'+key) || [];
            $('#discover #disc-spinner').hide();
            for (let show of shows) {
                let item = Items.constructDiscoverShow(show);
                $('#discover .disc-proposal .row').append(item);
            }
            Items.applyRatings(DB.get('traktratings'));
            $('#discover .disc-proposal .categories div').removeClass('active');
            $('#discover .disc-proposal .categories .shows').addClass('active');
        },

        movies: (key) => {
            if (!key) {
                try {
                    key = $('#discover .type .active')[0].classList[0];
                } catch (e) {
                    key = 'trending';
                }
            }

            Discover.reset();

            let movies = DB.get('traktmovies'+key) || [];
            $('#discover .disc-proposal .row').html('');
            $('#discover #disc-spinner').hide();
            for (let movie of movies) {
                let item = Items.constructDiscoverMovie(movie);
                $('#discover .disc-proposal .row').append(item);
            }
            Items.applyRatings(DB.get('traktratings'));
            $('#discover .disc-proposal .categories div').removeClass('active');
            $('#discover .disc-proposal .categories .movies').addClass('active');
        }
    },

    format: {
        traktmovies: (movies) => {
            let collection = Array();
            let index = 0;

            return Promise.all(movies.map((movie) => {
                movie.index = index;
                index++;

                let obj = movie.movie ? movie.movie : movie;
                return Images.get.movie({
                    imdb: obj.ids.imdb,
                    tmdb: obj.ids.tmdb
                }).then(images => {
                    obj.images = images;
                    collection.push(movie);
                    return movie;
                });
            })).then(() => {
                console.info('All images found for movies');

                // sort
                collection = collection.sort(function(a, b){
                    if(a.index < b.index) {
                        return -1;
                    }
                    if(a.index > b.index) {
                        return 1;
                    }
                    return 0;
                });

                return collection;
            }).catch(console.error);
        },
        traktshows: (shows) => {
            let collection = Array();
            let index = 0;

            return Promise.all(shows.map((item) => {
                item.index = index;
                index++;

                let obj = item.show ? item.show : item;
                return Images.get.show({
                    imdb: obj.ids.imdb,
                    tmdb: obj.ids.tmbd,
                    tvdb: obj.ids.tvdb
                }).then(images => {
                    obj.images = images;
                    collection.push(item);
                    return item;
                });
            })).then(() => {
                console.info('All images found for shows');

                // sort
                collection = collection.sort(function(a, b){
                    if(a.index < b.index) {
                        return -1;
                    }
                    if(a.index > b.index) {
                        return 1;
                    }
                    return 0;
                });

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
            console.info('Added to Watchlist:', data[type]);
            $(`#${data[type].ids.slug} .watchlist`)[0].outerHTML = '<div class="watchlist trakt-icon-list-thick tooltipped i18n selected"></div>';

            Trakt.reload();
        });
    }
}