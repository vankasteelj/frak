'use strict'

const Trakt = {
    client: new (require('trakt.tv'))({
        client_id: Settings.apikeys.trakt_id,
        client_secret: Settings.apikeys.trakt_secret,
        plugins: {
            ondeck: require('trakt.tv-ondeck'),
            matcher: require('trakt.tv-matcher')
        },
		debug: true
    }),

    reconnect: () => {
        let auth = DB.get('trakt_auth');
        if (!auth) {
            $('#init').show();
            return;
        }

        Trakt.client.import_token(auth).then(Trakt.connected);
    },

    login: () => {
        console.info('Trying to log into trakt.tv');
        Trakt.client.get_codes().then(poll => {
            console.info('Opening trakt.tv auth url');
            Interface.traktLogin(poll);
            return Trakt.client.poll_access(poll);
        }).then(Trakt.connected).catch(console.error);
    },

    disconnect: () => {
        delete localStorage.trakt_auth;
        delete localStorage.traktmovies;
        delete localStorage.traktmoviescollection;
        delete localStorage.traktshows;
        delete localStorage.traktshowscollection;
        delete localStorage.traktsync;
        delete localStorage.traktratings;
        delete localStorage.trakt_profile;

        win.reload();
    },

    connected: (info) => {
        console.info('Trakt is connected');

        Interface.focus(true);
        Notify.requestAttention();

        DB.store(Trakt.client.export_token(), 'trakt_auth');
        Interface.traktConnected(DB.get('trakt_profile'));

        Collection.load();
    },

    last_activities: () => {
        return Trakt.client.sync.last_activities().then(results => {
            return Math.max.apply(Math, [
                new Date(results.episodes.watchlisted_at).valueOf(),
                new Date(results.shows.watchlisted_at).valueOf(),
                new Date(results.movies.watchlisted_at).valueOf(),
                new Date(results.episodes.watched_at).valueOf(),
                new Date(results.movies.watched_at).valueOf()
            ]);
        }).catch(console.error)
    },

    getRatings: () => {
        return Trakt.client.sync.ratings.get().then(ratings => {
            DB.store(ratings, 'traktratings');
            return Items.applyRatings(ratings);
        });
    },

    rate: (method, item, score) => {
        let model, type;

        if (item.metadata) {
            // local
            if (item.metadata.movie) {
                // local movie
                model = item.metadata.movie;
                type = 'movie';
            } else {
                // local episode
                model = item.metadata.show;
                type = 'show';
            }
        } else {
            // collection
            if (item.movie) {
                // collection movie
                model = item.movie;
                type = 'movie';
            } else {
                // collection episode
                model = item.show;
                type = 'show';
            }
        }

        let data = {rating: score, ids: model.ids};
        let post = {};
        post[type+'s'] = [data];

        console.info('Trakt - %s rating for %s', method, model.ids.slug);

        return Trakt.client.sync.ratings[method](post).then(() => {
            let ratings = DB.get('traktratings');

            switch (method) {
                case 'add':
                    let pushable = {
                        rated_at: (new Date()).toISOString(),
                        rating: score,
                        type: type
                    }
                    pushable[type] = {
                        ids: model.ids,
                        title: model.title,
                        year: model.year
                    }
                    ratings.push(pushable);
                    break;
                case 'remove':
                    ratings = ratings.filter(i => {
                        if (!i[type]) {
                            return true;
                        } else {
                            return i[type].ids.slug !== model.ids.slug;
                        }
                    });
                    break;
                default:
                    break;
            }

            DB.store(ratings, 'traktratings');
            Items.applyRatings(ratings);
        });
    },

    reload: (update) => {
        delete localStorage.traktmovies;
        delete localStorage.traktmoviescollection;
        delete localStorage.traktshows;
        delete localStorage.traktshowscollection;
        delete localStorage.traktratings;
        delete localStorage.traktsync;

        return Promise.all([
            Collection.get.traktshows(update),
            Collection.get.traktmovies(update)
        ]).then((collections) => {
            Collection.get.traktcached(update);
            Trakt.getRatings();

            return collections;
        });
    },

    scrobble: (action) => {
        if (!Player.config.model) {
            return;
        }

        let progress = Player.config.states['percent-pos'] || 0;
        progress = parseFloat(progress.toFixed(2));

        let model, type, itemType;

        if (Player.config.model.metadata) {
            // local
            if (Player.config.model.metadata.movie) {
                // local movie
                model = Player.config.model.metadata.movie;
                type = 'movie';
            } else {
                // local episode
                model = Player.config.model.metadata.episode;
                type = 'episode';
            }
        } else {
            // collection
            if (Player.config.model.movie) {
                // collection movie
                model = Player.config.model.movie;
                type = 'movie';
            } else {
                // collection episode
                model = Player.config.model.next_episode;
                type = 'episode';
            }
        }

        let post = {progress: progress};
        let item = {ids: model.ids};

        post[type] = item;

        console.info('Trakt - scrobble %s (%s%)', action, progress);
        Trakt.client.scrobble[action](post).catch(console.error);

        if (progress > 80 && action === 'stop') {
            if (Player.config.model.metadata) {
                // local item
                if (type == 'episode') {
                    setTimeout(() => {
                        Details.loadLocalNext();
                    }, 50);
                }
            } else {
                // trakt list
                if (type === 'episode') {
                    setTimeout(() => {
                        $('#details-sources').hide();
                        $('#details-loading').hide();
                        $('#details-spinner').show();
                    }, 50);

                    // display spinner on list
                    Player.config.model.show && $(`#${Player.config.model.show.ids.slug}`).append('<div class="item-spinner"><div class="fa fa-spin fa-refresh"></div>');

                    setTimeout(() => {
                        Trakt.reload(true).then(collections => {
                            Details.loadNext();
                        });
                    }, 300);
                } else {
                    $(`#${Player.config.model.movie.ids.slug}`).remove();
                }
            }
        }
    }
}
