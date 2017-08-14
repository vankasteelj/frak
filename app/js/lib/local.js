'use strict'

const Local = {
    scans: 0,
    client: new (require('local-video-library'))(Settings.apikeys.trakt_id, [process.env.HOME]),
    
    scan: () => {
        console.info('Scanning local drive')
        return Local.client.scan();
    },
    
    update: (library) => {
        console.info('Scanning local drive (update)');
        return Local.client.update(library);
    },

    updateClientPaths: (paths) => {
        Local.client.parser.options.paths = paths;
        DB.store(paths, 'local_paths');
    },

    setupPaths: () => {
        let paths = DB.get('local_paths');
        if (!paths || (paths && !paths[0])) paths = [process.env.HOME];

        Local.updateClientPaths(paths);
        Local.setSettingsPaths(paths);
    },

    buildVideoLibrary: (files) => {
        let library = {
            movies: [],
            shows: [],
            unmatched: []
        };

        for (let file of files) {
            file.path = file.path.replace(/\\/g, '/'); //unix-like

            if (file.metadata && file.metadata.type) {

                if (file.metadata.type == 'movie') {
                    library.movies.push(file);

                } else if (file.metadata.type == 'episode') {
                    let s = file.metadata.episode.season;
                    let e = file.metadata.episode.number;

                    let findShow = (title) => library.shows.find((show) => show.metadata.show.title === title);
                    let found = findShow(file.metadata.show.title);

                    if (!found) {
                        let newShow = {metadata: {show: file.metadata.show}};

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
                library.unmatched.push(file);
            }
        }

        return library;
    },

    setSettingsPaths: (paths) => {
        $('#settings .locals .option .paths').html('');

        let items = String();
        for (let p of paths) {
            items += `<li onClick="Local.setSettingsActive(this)">${p}</li>`;
        }
        $('#settings .locals .option .paths').append(items);
    },

    setSettingsActive: (item) => {
        $('#settings .locals .option .paths li').removeClass('selected');
        $(item).addClass('selected');
    },

    removePath: (p) => {
        let paths = DB.get('local_paths');
        paths.splice(paths.indexOf(p), 1);

        DB.store(paths, 'local_paths');
        Local.setupPaths();

        //remove untracked files
        let library = DB.get('local_library');
        let newLibrary = Array();
        for (let file of library) {
            if (!file.path.startsWith(p)) newLibrary.push(file);
        }
        DB.store(newLibrary, 'local_library');
        Collection.format.locals(newLibrary);
    },
    addPath: (p) => {
        let paths = DB.get('local_paths');
        paths.push(p);

        DB.store(paths, 'local_paths');
        Local.setupPaths();
        
        setTimeout(() => {
            $('#navbar .locals .fa-spin').css('opacity', 1)
            Collection.get.local()
        }, 500);
    }
}