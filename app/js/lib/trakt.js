'use strict'

const Trakt = {
    // TODO: it's ark auth keys
    client: new (require('trakt.tv'))({
        client_id: '8f78b7f1fc36d11b7076a0263a0c0c0b3f8d0ca024df49463eb9c38e2a7f1d7d',
        client_secret: '156ed86fbea3601c9b938293c9fd5d73859af6405ed239465357de6834a487e6',
        debug: true,
        plugins: {
            images: require('trakt.tv-images'),
            ondeck: require('trakt.tv-ondeck'),
            matcher: require('trakt.tv-matcher')
        },
        options: {
            images: {
                smallerImages: true,
                fanartApiKey: 'dbfbe8ce76246c9981293bdf5ce766dc',
                tvdbApiKey: '49083CB216C037D0',
                tmdbApiKey: '27075282e39eea76bd9626ee5d3e767b'
            }
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
    }
}