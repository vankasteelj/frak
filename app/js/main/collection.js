'use strict'

const Collection = {
    load: () => {
        console.info('Loading collection');

        Collection.hiddenMovies.verify();

        // should trakt update?
        Trakt.last_activities('watch').then(activities => {
            if (
                (activities > (DB.get('traktsync') || 0)) ||
                (Date.now() - (DB.get('traktsync') || 0) > 3600000)
            ) {
                console.info('Fetching from remote server...');
                Collection.get.traktcached();
                Collection.get.traktwatched().then(() => {
                    Promise.all([
                        Collection.get.traktshows(),
                        Collection.get.traktmovies()
                    ]).then((collections) => {
                        Collection.get.traktcached();
                        Collection.hiddenItems.reset();
                        Trakt.getRatings();
                    });
                })
            } else {
                console.info('We got cached trakt data');
                Collection.get.traktcached();
                Trakt.getRatings();
            }
        }).catch(console.error);

        Collection.get.local();
    },

    get: {
        traktshows: (update) => {
            $('#navbar .shows .fa-spin').css('opacity', update ? 0 : 1);

            return Trakt.client.ondeck.getAll(DB.get('watchedShows') || []).then(results => {
                console.info('Trakt.tv - "show watchlist" collection recieved');

                DB.store(Date.now(), 'traktsync');
                DB.store(results, 'traktshows');

                return Collection.format.traktshows(results.shows);
            }).catch(console.error)
        },
        traktmovies: (update) => {
            $('#navbar .movies .fa-spin').css('opacity', update ? 0 : 1);

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
        traktcached: (update) => {
            let movies = DB.get('traktmoviescollection');
            let shows = DB.get('traktshowscollection');

            if (!shows && !movies) return;

            Collection.show.movies(movies);
            Collection.show.shows(shows);

            if (update) return;

            setTimeout(() => {
                if (!Player.mpv && !(process.platform == 'win32' && fs.existsSync('./mpv/mpv.exe'))) {
                    Interface.requireMPV();
                } else {
                    Interface.showMain();
                }
            }, 100);
        },
        local: () => {
            let collection = DB.get('local_library');

            if (!collection) $('#navbar .locals .fa-spin').css('opacity', 1);

            $('#collection #locals .waitforlibrary').show();
            $('#collection #locals .waitforlibrary .spinner').css('visibility', 'visible');
            $('#collection #locals .waitforlibrary .notfound').hide();
            $('#collection #locals .waitforlibrary .scanning').show();

            let method = collection ? 'update' : 'scan';
            method == 'update' && $('#locals .refreshing').show() && collection.length && Collection.format.locals(DB.get('local_library'));

            Local.scans++;

            Local[method](collection).then(results => {
                console.info('Local library collection recieved');
                Local.scans--;

                DB.store(results, 'local_library');

                if (Local.scans <= 0) {
                    $('#navbar .locals .fa-spin').css('opacity', 0);
                    $('#locals .refreshing').hide();
                }

                Collection.format.locals(results);
            }).catch(console.error)
        },
        history: () => {
            $('#navbar .history .fa-spin').css('opacity', 1);

            return Trakt.client.sync.history.get({
                limit: 23, //because bootstap column is 12 (23+1 show more)
                page: 1,
                extended: 'full'
            }).then(results => {
                console.info('Trakt.tv - history recieved', results);
                return Collection.format.trakthistory(results);
            }).then((collection) => {
                return Collection.show.history(collection);
            }).catch(console.error)
        },
        historyMore: () => {
            $('#history .showMore_button .fa').addClass('fa-spin fa-circle-o-notch');

            let page = parseInt($('#history .grid-item').length / 24) + 1;
            return Trakt.client.sync.history.get({
                limit: 24, //because bootstap column is 12
                page: page,
                extended: 'full'
            }).then(results => {
                console.info('Trakt.tv - history (p.%s) recieved', page, results);
                return Collection.format.trakthistory(results);
            }).then(collection => {
                return Collection.show.history(collection, true);
            }).catch(console.error)
        },
        traktwatched: () => {
            return Trakt.client.sync.watched({type: 'shows',extended: 'full,noseasons'})
                .then(watchedShows => DB.store(watchedShows, 'watchedShows'))
                .then(() => Trakt.client.sync.watched({type: 'movies'}))
                .then(watchedMovies => DB.store(watchedMovies, 'watchedMovies'));
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
                collection = collection.sort(function (a, b) {
                    if (a.listed_at > b.listed_at) {
                        return -1;
                    }
                    if (a.listed_at < b.listed_at) {
                        return 1;
                    }
                    return 0;
                });

                DB.store(collection, 'traktmoviescollection');
                $('#navbar .movies .fa-spin').css('opacity', 0);
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
                collection = shows.sort(function (a, b) {
                    if (a.next_episode.first_aired > b.next_episode.first_aired) {
                        return -1;
                    }
                    if (a.next_episode.first_aired < b.next_episode.first_aired) {
                        return 1;
                    }
                    return 0;
                });

                DB.store(collection, 'traktshowscollection');
                $('#navbar .shows .fa-spin').css('opacity', 0);
                return collection;
            }).catch(console.error);
        },

        locals: (items) => {
            let collection = Local.buildVideoLibrary(items);

            let alphabetical = (a, b) => {
                let c = (a.title && b.title) ? 'title' : 'filename';
                if (a[c] < b[c]) return -1
                if (a[c] > b[c]) return 1;
                return 0;
            }

            $('#collection #locals .waitforlibrary').show();
            $('#collection #locals .waitforlibrary .spinner').css('visibility', 'visible');
            $('#collection #locals .categories .movies').hide();
            $('#collection #locals .categories .shows').hide();
            $('#collection #locals .categories .unmatched').hide();


            let movies = collection.movies.sort(alphabetical);
            DB.store(movies, 'local_movies');
            Collection.show.locals.movies(movies);

            let shows = collection.shows.sort(alphabetical);
            DB.store(shows, 'local_shows');
            Collection.show.locals.shows(shows);

            let unmatched = collection.unmatched.sort(alphabetical);
            Collection.show.locals.unmatched(unmatched);

            if (!movies.length && !shows.length && !unmatched.length) {
                $('#collection #locals .waitforlibrary .spinner').css('visibility', 'hidden');
                $('#collection #locals .waitforlibrary .scanning').hide();
                $('#collection #locals .waitforlibrary .notfound').show();
            }
        },

        trakthistory: (items) => {
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
                console.info('All images found for the history');

                // sort
                collection = collection.sort(function (a, b) {
                    if (a.index < b.index) {
                        return -1;
                    }
                    if (a.index > b.index) {
                        return 1;
                    }
                    return 0;
                });

                DB.store(collection, 'trakthistorycollection');
                $('#navbar .history .fa-spin').css('opacity', 0);
                return collection;
            }).catch(console.error);
        }
    },

    show: {
        shows: (shows = []) => {
            $('#collection #shows').html('');
            for (let show of shows) {
                if (DB.get('hiddenitems') && DB.get('hiddenitems')[show.show.ids.slug]) continue;
                let item = Items.constructShow(show);
                $('#collection #shows').append(item);
            }
            Items.applyRatings(DB.get('traktratings'));

            if (!$('#collection #shows .grid-item').length) {
                return $('#collection #shows').append(Items.constructMessage('No episode to display. Start watching a TV show or add one to your watchlist, and check back here.'));
            }
        },
        movies: (movies = []) => {
            $('#collection #movies').html('');
            let untrack = Array();
            for (let movie of movies) {
                if (!movie.movie.released || new Date(movie.movie.released.split('-')).valueOf() > Date.now() || DB.get('hiddenmovies')[movie.movie.ids.slug] || (DB.get('hiddenitems') && DB.get('hiddenitems')[movie.movie.ids.slug])) {
                    untrack.push(movie.movie.title);
                    continue;
                }
                let item = Items.constructMovie(movie);
                $('#collection #movies').append(item);
            }
            Items.applyRatings(DB.get('traktratings'));

            if (!$('#collection #movies .grid-item').length) {
                return $('#collection #movies').append(Items.constructMessage('No movie to display, add one to your watchlist and check back here.'));
            }

            untrack.length && console.info('Some movies are hidden or not released yet, not showing:', untrack.join(', '));
        },
        locals: {
            movies: (movies = []) => {
                $('#collection #locals .movies .row').html('');
                if (!movies.length) return;
                $('#collection #locals .waitforlibrary').hide();
                $('#collection #locals .categories .movies').show();
                for (let movie of movies) {
                    if ($(`#${Misc.slugify(movie.path)}`).length) continue;
                    let item = Items.constructLocalMovie(movie);
                    $('#collection #locals .movies .row').append(item);
                }
            },
            shows: (shows = []) => {
                $('#collection #locals .shows .row').html('');
                if (!shows.length) return;
                $('#collection #locals .waitforlibrary').hide();
                $('#collection #locals .categories .shows').show();
                for (let show of shows) {
                    let item = Items.constructLocalShow(show);
                    $('#collection #locals .shows .row').append(item);
                }
            },
            unmatched: (unmatched = []) => {
                $('#collection #locals .unmatched .row').html('');
                if (!unmatched.length) return;
                $('#collection #locals .waitforlibrary').hide();
                $('#collection #locals .categories .unmatched').show();
                for (let unmatch of unmatched) {
                    let item = Items.constructLocalUnmatched(unmatch);
                    $('#collection #locals .unmatched .row').append(item);
                }
            }
        },
        history: (collection = [], update = false) => {
            if (update) {
                $('#trakt #history #showMore').remove();
            } else {
                $('#trakt #history').html('');
            }

            for (let i of collection) {
                let item;
                if (i.type == 'movie') {
                    item = Items.constructHistoryMovie(i);
                } else {
                    item = Items.constructHistoryShow(i);
                }

                $('#trakt #history').append(item);
            }

            if (!$('#trakt #history .grid-item').length) {
                return $('#trakt #history').append(Items.constructMessage('No history found, watch something before checking back here.'));
            }

            $('#trakt #history').append(Items.constructHistoryMore());
            Items.applyRatings(DB.get('traktratings'));
        }
    },

    hiddenMovies: {
        verify: () => {
            let db = DB.get('hiddenmovies') || {};
            for (let movie in db)
                if (db[movie] < Date.now()) delete db[movie];
            DB.store(db, 'hiddenmovies');
        },
        add: (slug, time) => {
            let db = DB.get('hiddenmovies') || {};
            db[slug] = time;
            DB.store(db, 'hiddenmovies');
            return true;
        },
        reset: () => {
            DB.store({}, 'hiddenmovies');
        }
    },

    hiddenItems: {
        add: (slug) => {
            let db = DB.get('hiddenitems');
            db[slug] = true;
            DB.store(db, 'hiddenitems');
        },
        reset: () => {
            DB.store({}, 'hiddenitems');
        }
    }
}
