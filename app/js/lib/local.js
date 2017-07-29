'use strict'

const Local = {
    client: new (require('local-video-library'))(Settings.apikeys.trakt_id, (DB.get('local_paths') || [process.env.HOME])),
    
    scan: () => {
        console.info('Scanning local drive')
        return Local.client.scan();
    },
    
    update: (library) => {
        console.info('Scanning local drive (update)');
        return Local.client.update(library);
    },

    updatePaths: (paths) => {
        Local.client.parser.options.paths = paths;
    }
}