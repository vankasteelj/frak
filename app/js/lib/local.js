'use strict'

const Local = {
    scans: 0,
    server: {
        json: null,
        jsonPort: 3000,
        playing: null,
        playPort: 3001
    },
    client: new(require('local-video-library'))(Settings.apikeys.trakt_id, [process.env.HOME || path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)]),

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
        if (!paths || (paths && !paths[0])) paths = [process.env.HOME || path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)];

        Local.updateClientPaths(paths);
        Local.setSettingsPaths(paths);
    },

    buildVideoLibrary: (files = []) => {
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

                } else if (file.metadata.type == 'episode' && file.metadata.show) {
                    let s = file.metadata.episode.season;
                    let e = file.metadata.episode.number;

                    let findShow = (title) => library.shows.find((show) => show.metadata.show.title === title);
                    let found = findShow(file.metadata.show.title);

                    if (!found) {
                        let newShow = {
                            metadata: {
                                show: file.metadata.show
                            }
                        };

                        newShow.seasons = {};
                        newShow.seasons[s] = {};
                        newShow.seasons[s].episodes = {};
                        delete file.metadata.show;
                        newShow.seasons[s].episodes[e] = file;

                        library.shows.push(newShow);
                    } else {
                        if (!found.seasons[s]) {
                            found.seasons[s] = {};
                            found.seasons[s].episodes = {};
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

    setSettingsPaths: (paths = []) => {
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
        let library = DB.get('local_library') || [];
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
        }, 300);
    },
    rescan: () => {
        delete localStorage['local_library'];

        $('#collection #locals .waitforlibrary').show();
        $('#collection #locals .waitforlibrary .spinner').css('visibility', 'visible');
        $('#collection #locals .categories .movies').hide();
        $('#collection #locals .categories .shows').hide();
        $('#collection #locals .categories .unmatched').hide();

        Collection.get.local();
    },
    share: {
        build: () => {
            /*  api is: 
                    - GET: http://some-ip:3000 => sends JSON of available movies/shows
                    - POST the file you want to http://some-ip:3000 => sends back a playable url for that file
            */



            //build json
            let movies = DB.get('local_movies');
            let shows = DB.get('local_shows');

            let json = {
                movies: movies,
                shows: shows,
                server: {
                    ip: DB.get('localip'),
                    name: process.env.COMPUTERNAME
                }
            };

            // only one server running at a time
            if (Local.server.json) {
                Local.server.json.close();
                Local.server.json = null;
            }

            //serve json
            Local.server.json = http.createServer((req, res) => {
                // on GET, send back the json api
                if (req.method === 'GET') {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.write(JSON.stringify(json));
                    res.end();
                    
                // on POST, serve the file to a new server and send back the url
                } else if (req.method === 'POST') {
                    let body = '';
                    req.on('data', (data) => {
                        body += data;
                    });
                    req.on('end', () => {
                        let file = JSON.parse(body);

                        // only one server running at a time
                        if (Local.server.playing) {
                            Local.server.playing.close();
                            Local.server.playing = null;
                        }
                        // serve the file
                        console.log(req,res)
                        Local.server.playing = http.createServer((req, res) => {
                            res.writeHead(200, {
                                'Content-Type': 'video/mp4',
                                'Content-Length': file.size
                            });
                            let readStream = fs.createReadStream(file.path);
                            readStream.pipe(res);
                        }).listen(Local.server.playPort);

                        // TODO: add file.request
                        console.log('Serving \'%s\' on port %d (requested by %s)', file.filename, Local.server.playPort, file.request);

                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.write(JSON.stringify({
                            file: file,
                            url: json.server.ip + ':' + Local.server.playPort
                        }));
                        res.end();
                    });
                }
            });

            Local.server.json.listen(Local.server.jsonPort);
            console.log('Local server running on port %d', Local.server.jsonPort);
        },
        find: () => {
            let ip = DB.get('localip');
            
            //TODO: loop all 255 localip to try and find an available server.
        }
    }
}
