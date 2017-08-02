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
        if (!auth) return;

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
    }
}