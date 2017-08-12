'use strict'

const Trakt = {
    client: new (require('trakt.tv'))({
        client_id: Settings.apikeys.trakt_id,
        client_secret: Settings.apikeys.trakt_secret,
        plugins: {
            ondeck: require('trakt.tv-ondeck'),
            matcher: require('trakt.tv-matcher')
        }
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
        delete localStorage.trakt_profile;

        win.reload();
    },

    connected: (info) => {
        console.info('Trakt is connected');
        DB.store(Trakt.client.export_token(), 'trakt_auth');
        Interface.traktConnected(DB.get('trakt_profile'));
        Collection.load();
        win.focus();
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

    reload: () => {
        delete localStorage.traktmovies;
        delete localStorage.traktmoviescollection;
        delete localStorage.traktshows;
        delete localStorage.traktshowscollection;
        delete localStorage.traktsync;

        Promise.all([
            Collection.get.traktshows(),
            Collection.get.traktmovies()
        ]).then((collections) => {
            //console.log('Fetching done', collections)
            Collection.get.traktcached();
        })
    },

    scrobble: (action) => {
        if (!Details.model) {
            return;
        }

        let progress = Player.config.states['percent-pos'] || 0;
        let model, type, itemType;

        if (Details.model.metadata) {
            // local
            if (Details.model.metadata.movie) {
                // local movie
                model = Details.model.metadata.movie;
                type = 'movie';
            } else {
                // local episode
                model = Details.model.metadata.episode;
                type = 'episode';
            }
        } else {
            // collection
            if (Details.model.movie) {
                // collection movie
                model = Details.model.movie;
                type = 'movie';
            } else {
                // collection episode
                model = Details.model.next_episode;
                type = 'episode';
            }
        }

        let post = {progress: parseFloat(progress).toFixed(2)};
        let item = {ids: model.ids};

        post[type] = item;

        console.info('Trakt - scrobble %s (%s%)', action, progress);
        Trakt.client.scrobble[action](post);
    }
}