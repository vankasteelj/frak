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
                Collection.get.traktcached(); // display what we have while we update
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

            return Trakt.client.ondeck.getAll(WB.get.shows()).then(results => {
                console.info('Trakt.tv - "show watchlist" collection recieved');

                DB.store(Date.now(), 'traktsync');
                DB.store(results, 'traktshows');

                return Collection.format.traktshows(results.shows);
            }).catch(e => {
                $('#navbar .shows .fa-spin').css('opacity', 0);
                return e;
            });
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
            }).catch(e => {
                $('#navbar .movies .fa-spin').css('opacity', 0);
                return e;
            });
        },
        traktcached: (update) => {
            let movies = DB.get('traktmoviescollection');
            let shows = DB.get('traktshowscollection');

            if (!shows && !movies) return;

            Collection.show.movies(movies);
            Collection.show.shows(shows);

            if (update) return;

            if (!Player.mpv && !(process.platform == 'win32' && fs.existsSync('./mpv/mpv.exe'))) {
                Interface.requireMPV();
            } else {
                setTimeout(Interface.showMain, 0);
            }
        },
        local: () => {
            let collection = DB.get('local_library');

            if (!collection) $('#navbar .locals .fa-spin').css('opacity', 1);

            $('#collection #locals .waitforlibrary').show();
            $('#collection #locals .waitforlibrary .spinner').css('visibility', 'visible');
            $('#collection #locals .waitforlibrary .notfound').hide();
            $('#collection #locals .waitforlibrary .scanning').show();

            let method = collection ? 'update' : 'scan';
            method == 'update' && $('#locals .refreshing').show();

            Local.scans++;

            Local[method](collection).then(results => {
                console.info('Local library collection recieved');
                Local.scans--;

                DB.store(results, 'local_library');

                if (Local.scans <= 0) {
                    $('#navbar .locals .fa-spin').css('opacity', 0);
                    $('#locals .refreshing').hide();
                }

                if (Network.peers.length) {
                    Network.buildJsonApi();
                    Network.rearrangeLocals();
                } else {
                    Collection.format.locals(results);
                }
            }).then(Network.init).catch(console.error)
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
                .then(WB.store.shows)
                .then(() => Trakt.client.sync.watched({type: 'movies'}))
                .then(WB.store.movies);
        }
    },

    format: {
        traktmovies: (movies) => {
            let collection = Array();

            return Promise.all(movies.map((movie) => {
                return Images.get.movie(movie.movie.ids).then(images => {
                    collection.push(movie);
                    return movie;
                });
            })).then(() => {
                console.info('All images found for trakt movies');

                // sort
                collection = Collection.sort.movies.listed(collection);

                DB.store(collection, 'traktmoviescollection');
                $('#navbar .movies .fa-spin').css('opacity', 0);
                return collection;
            }).catch(console.error);
        },
        traktshows: (shows) => {
            let collection = Array();

            return Promise.all(shows.map((show) => {
                return Images.get.show(show.show.ids).then(images => {
                    collection.push(show);
                    return show;
                });
            })).then(() => {
                console.info('All images found for trakt shows');

                // sort
                collection = Collection.sort.shows.nextEpisode(collection);

                DB.store(collection, 'traktshowscollection');
                $('#navbar .shows .fa-spin').css('opacity', 0);
                return collection;
            }).catch(console.error);
        },

        locals: (items, rearrange) => {
            let collection = Local.buildVideoLibrary(items);

            $('#collection #locals .waitforlibrary').show();
            $('#collection #locals .waitforlibrary .spinner').css('visibility', 'visible');
            $('#collection #locals .categories .movies').hide();
            $('#collection #locals .categories .shows').hide();
            $('#collection #locals .categories .unmatched').hide();

            let movies = Misc.sortAlphabetical(collection.movies);
            Collection.show.locals.movies(movies);

            let shows = Misc.sortAlphabetical(collection.shows);
            DB.store(shows, 'local_shows');
            Collection.show.locals.shows(shows);

            let unmatched = Misc.sortAlphabetical(collection.unmatched);
            Collection.show.locals.unmatched(unmatched);

            if (!movies.length && !shows.length && !unmatched.length) {
                $('#collection #locals .waitforlibrary .spinner').css('visibility', 'hidden');
                $('#collection #locals .waitforlibrary .scanning').hide();
                $('#collection #locals .waitforlibrary .notfound').show();
            } else {
                // build context menu without hogging
                let items = document.getElementsByClassName('local-context');
                let i = 0;
                let doLoop, buildContext;
                doLoop = () => {
                    if (i < items.length) buildContext();
                };
                buildContext = () => {
                    let item = items.item(i);
                    let file = JSON.parse(item.firstChild.innerText);
                    let context = {
                        'Play now': () => item.click()
                    };
                    if (!file.source) {
                        context = Object.assign(context, {
                            'Show in file explorer': () => {
                                console.info('[File explorer opened] Showing', file.path);
                                gui.Shell.showItemInFolder(path.normalize(file.path));
                                Notify.snack(i18n.__('Opening the file location'));
                            }
                        });
                    }

                    let menu = Misc.customContextMenu(context);
                    item.oncontextmenu = (e) => menu.popup(e.clientX, e.clientY);
                    i++;
                    setTimeout(doLoop, 0);
                };
                doLoop();
            }
        },

        trakthistory: (items) => {
            let collection = Array();
            let dupes = [];

            return Promise.all(items.map((item, index) => {
                let type = item.type == 'movie' ? 'movie' : 'show';

                item.index = index;
                collection.push(item);

                if (dupes.indexOf(item[type].ids.slug) !== -1) {
                    return item;
                } else {
                    dupes.push(item[type].ids.slug);
                    return Images.get[type](item[type].ids);
                }
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
            let items = [];
            for (let show of shows) {
                if (DB.get('hiddenitems') && DB.get('hiddenitems')[show.show.ids.slug]) continue;
                items.push(Items.constructShow(show));
            }
            $('#collection #shows').append(items);
            Items.applyRatings(DB.get('traktratings'));

            if (!$('#collection #shows .grid-item').length) {
                return $('#collection #shows').append(Items.constructMessage('No episode to display. Start watching a TV show or add one to your watchlist, and check back here.'));
            }
        },
        movies: (movies = []) => {
            $('#collection #movies').html('');
            let untrack = Array();
            let items = [];
            for (let movie of movies) {
                if (!movie.movie.released || new Date(movie.movie.released.split('-')).valueOf() > Date.now() || DB.get('hiddenmovies')[movie.movie.ids.slug] || (DB.get('hiddenitems') && DB.get('hiddenitems')[movie.movie.ids.slug])) {
                    untrack.push(movie.movie.title);
                    continue;
                }
                items.push(Items.constructMovie(movie));
            }
            $('#collection #movies').append(items);
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
                let items = [];
                for (let movie of movies) {
                    if ($(`#${Misc.slugify(movie.path)}`).length) continue;
                    items.push(Items.constructLocalMovie(movie));
                }
                $('#collection #locals .movies .row').append(items);
            },
            shows: (shows = []) => {
                $('#collection #locals .shows .row').html('');
                if (!shows.length) return;
                $('#collection #locals .waitforlibrary').hide();
                $('#collection #locals .categories .shows').show();
                let items = [];
                for (let show of shows) {
                    items.push(Items.constructLocalShow(show));
                }
                $('#collection #locals .shows .row').append(items);
            },
            unmatched: (unmatched = []) => {
                $('#collection #locals .unmatched .row').html('');
                if (!unmatched.length) return;
                $('#collection #locals .waitforlibrary').hide();
                $('#collection #locals .categories .unmatched').show();
                let items = [];
                for (let unmatch of unmatched) {
                    items.push(Items.constructLocalUnmatched(unmatch));
                }
                $('#collection #locals .unmatched .row').append(items);
            }
        },
        history: (collection = [], update = false) => {
            if (update) {
                $('#trakt #history #showMore').remove();
            } else {
                $('#trakt #history').html('');
            }

            let items = [];
            for (let i of collection) {
                if (i.type == 'movie') {
                    items.push(Items.constructHistoryMovie(i));
                } else {
                    items.push(Items.constructHistoryShow(i));
                }
            }

            if (!items.length) {
                items.push(Items.constructMessage('No history found, watch something before checking back here.'));
            } else {
                items.push(Items.constructHistoryMore());
            }

            $('#trakt #history').append(items);
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
    },
    
    sort: {
        shows : {
            nextEpisode: (shows = DB.get('traktshowscollection')) => {
                return shows.sort(function (a, b) {
                    if (a.next_episode.first_aired > b.next_episode.first_aired) {
                        return -1;
                    }
                    if (a.next_episode.first_aired < b.next_episode.first_aired) {
                        return 1;
                    }
                    return 0;
                });
            },
            firstAired: (shows = DB.get('traktshowscollection')) => {
                return shows.sort(function (a, b) {
                    if (a.show.first_aired > b.show.first_aired) {
                        return -1;
                    }
                    if (a.show.first_aired < b.show.first_aired) {
                        return 1;
                    }
                    return 0;
                });
            },
            title: (shows = DB.get('traktshowscollection')) => {
                return shows.sort(function (a, b) {
                    if (a.show.title < b.show.title) {
                        return -1;
                    }
                    if (a.show.title > b.show.title) {
                        return 1;
                    }
                    return 0;
                });
            },
            rating: (shows = DB.get('traktshowscollection')) => {
                return shows.sort(function (a, b) {
                    if (a.show.rating > b.show.rating) {
                        return -1;
                    }
                    if (a.show.rating < b.show.rating) {
                        return 1;
                    }
                    return 0;
                });
            },
            runtime: (shows = DB.get('traktshowscollection')) => {
                return shows.sort(function (a, b) {
                    if (a.show.runtime < b.show.runtime) {
                        return -1;
                    }
                    if (a.show.runtime > b.show.runtime) {
                        return 1;
                    }
                    return 0;
                });
            },
            genre: (genre, shows = DB.get('traktshowscollection')) => {
                return shows.filter(a => a.show.genres.indexOf(genre) !== -1);
            }
        },
        movies: {
            listed: (movies = DB.get('traktmoviescollection')) => {
                return movies.sort(function (a, b) {
                    if (a.listed_at > b.listed_at) {
                        return -1;
                    }
                    if (a.listed_at < b.listed_at) {
                        return 1;
                    }
                    return 0;
                });
            },
            title: (movies = DB.get('traktmoviescollection')) => {
                return movies.sort(function (a, b) {
                    if (a.movie.title < b.movie.title) {
                        return -1;
                    }
                    if (a.movie.title > b.movie.title) {
                        return 1;
                    }
                    return 0;
                });
            },
            released: (movies = DB.get('traktmoviescollection')) => {
                return movies.sort(function (a, b) {
                    if (a.movie.released > b.movie.released) {
                        return -1;
                    }
                    if (a.movie.released < b.movie.released) {
                        return 1;
                    }
                    return 0;
                });
            },
            rating: (movies = DB.get('traktmoviescollection')) => {
                return movies.sort(function (a, b) {
                    if (a.movie.rating > b.movie.rating) {
                        return -1;
                    }
                    if (a.movie.rating < b.movie.rating) {
                        return 1;
                    }
                    return 0;
                });
            },
            genre: (genre, movies = DB.get('traktmoviescollection')) => {
                return movies.filter(a => a.movie.genres.indexOf(genre) !== -1);
            }
        }
    }
}
