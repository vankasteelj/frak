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
        }).then(Trakt.connected).catch(console.error)
    },

    connected: (info) => {
        console.info('Trakt is connected');
        DB.store(Trakt.client.export_token(), 'trakt_auth');
        Interface.traktConnected(DB.get('trakt_profile'));
        Collection.load();
    },

    update: () => {
        let now = Date.now();
        Trakt.client.sync.last_activities().then(results => {
            let activities = {
                watchlist_changed: () => Math.max.apply(Math, [
                    Date(results.episodes.watchlisted_at).valueOf(),
                    Date(results.shows.watchlisted_at).valueOf(),
                    Date(results.movies.watchlisted_at).valueOf()
                ])(),
                watched: () => Math.max.apply(Math, [
                    Date(results.episodes.watched_at).valueOf(),
                    Date(results.movies.watched_at).valueOf()
                ])()
            }
        }).catch(console.error)
    }
}