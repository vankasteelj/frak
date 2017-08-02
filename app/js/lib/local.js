'use strict'

const Local = {
    client: new (require('local-video-library'))(Settings.apikeys.trakt_id, [process.env.HOME]),
    
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
        DB.store(paths, 'local_paths');
    },

    setupPaths: () => {
        let paths = DB.get('local_paths');
        if (!paths) paths = [process.env.HOME];

        Local.updatePaths(paths);

        return Promise.resolve(paths);
    },

    buildVideoLibrary: (files) => {
        const library = Object();

        for (let file of files) {
            if (file.metadata && file.metadata.type) {

                if (file.metadata.type == 'movie') {
                    if (!library.movies) library.movies = Array();

                    library.movies.push(file);

                } else if (file.metadata.type == 'episode') {
                    let s = file.metadata.episode.season;
                    let e = file.metadata.episode.number;

                    if (!library.shows) library.shows = Array();

                    let findShow = (title) => library.shows.find((show) => show.title === title);
                    let found = findShow(file.metadata.show.title);

                    if (!found) {
                        let newShow = file.metadata.show;

                        newShow.seasons = Object();
                        newShow.seasons[s] = Object();
                        newShow.seasons[s].episodes = Object();
                        delete file.metadata.show;
                        newShow.seasons[s].episodes[e] = file;

                        library.shows.push(newShow);
                    } else {
                        if (!found.seasons[s]) {
                            found.seasons[s] = Object();
                            found.seasons[s].episodes = Object();
                        }

                        delete file.metadata.show;
                        found.seasons[s].episodes[e] = file;
                    }
                }

            } else {
                if (!library.unmatched) library.unmatched = Array();

                library.unmatched.push(file);
            }
        }

        return library;
    }
}