'use strict'

const Network = {
    ports: {
        main: 3000,
        play: 3001
    },
    servers: {
        main: null,
        play: null
    },
    connectedServers: [],
    addServers: (servers = []) => {
        for (let toAdd in servers) {
            let exists;
            for (let existing in Network.connectedServers) {
                if (Network.connectedServers[existing].ip === servers[toAdd].ip) exists = true;
            }
            if (!exists && (DB.get('localip') !== servers[toAdd].ip)) {
                console.log('Network: local server found (%s - %s)', servers[toAdd].name, servers[toAdd].ip);
                Network.connectedServers.push(servers[toAdd]);
                Network.checkServer(servers[toAdd]);
            }
        }
    },
    checkServer: (server) => {
        got(`http://${server.ip}:${Network.ports.main}`, {
            headers: {
                'client': JSON.stringify({
                    ip: DB.get('localip'),
                    name: process.env.COMPUTERNAME
                })
            }
        }).then(res => {
            let body = JSON.parse(res.body);

            for (let existing in Network.connectedServers) {
                if (Network.connectedServers[existing].ip === server.ip) {
                    Network.connectedServers[existing].name = body.name;
                    Network.connectedServers[existing].movies = body.movies;
                    Network.connectedServers[existing].shows = body.shows;
                }
            }

            setTimeout(() => Network.checkServer(server), 30000);
        }).catch(() => {
            for (let existing in Network.connectedServers) {
                if (Network.connectedServers[existing].ip === server.ip) {
                    Network.connectedServers.splice(existing, 1);
                    console.log('Network: %s disconnected', server.name);
                }
            }
        });
    },
    buildMainServer: () => {
        //build json
        let movies = DB.get('local_movies');
        let shows = DB.get('local_shows');

        let json = {
            movies: movies,
            shows: shows,
            ip: DB.get('localip'),
            name: process.env.COMPUTERNAME
        };

        // only one main server running at a time
        if (Network.servers.main) {
            Network.servers.main.close();
            Network.servers.main = null;
        }

        //serve json
        Network.servers.main = http.createServer((req, res) => {
            let client = JSON.parse(req.headers.client);

            // on GET, register the client and send back the json api
            if (req.method === 'GET') {
                //req.headers.client is the client IP
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.write(JSON.stringify(json));
                res.end();

                Network.addServers([client]);

            // on POST, serve the file to a new server and send back the url
            } else if (req.method === 'POST') {
                let body = '';
                req.on('data', (data) => {
                    body += data;
                });
                req.on('end', () => {
                    let file = JSON.parse(body);

                    // only one play server running at a time (TODO: allow 1 per client)
                    if (Network.servers.play) {
                        Network.servers.play.close();
                        Network.servers.play = null;
                    }

                    // serve the file
                    Network.servers.play = http.createServer((req2, res2) => {
                        res2.writeHead(200, {
                            'Content-Type': 'video/mp4',
                            'Content-Length': file.size
                        });
                        let readStream = fs.createReadStream(file.path);
                        readStream.pipe(res2);
                    }).listen(Network.ports.play);

                    console.log('Serving \'%s\' on port %d (requested by %s - %s)', file.filename, Network.ports.play, client.name, client.ip);

                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.write(JSON.stringify({
                        file: file,
                        url: `http://${json.ip}:${Network.port.play}`
                    }));
                    res.end();
                });
            }
        });

        Network.servers.main.listen(Network.ports.main);
        console.log('Local server running on port %d', Network.ports.main);
        Network.findPeers();
    },
    findPeers: () => {
        let localip = DB.get('localip');
        let baseIp = localip.match(/\d+\.\d+\.\d+\./)[0];
        let ips = [];

        for (let i = 1; i < 255; i++) ips.push(baseIp+i);

        Promise.all(ips.map(ip => {
          return new Promise((resolve, reject) => {
            got('http://'+ip+':3000', {
                timeout: 500,
                headers: {
                    'client': JSON.stringify({
                        ip: DB.get('localip'),
                        name: process.env.COMPUTERNAME
                    })
                }
            }).then(res => {
                resolve(JSON.parse(res.body));
            }).catch(() => resolve());
          });
        })).then((responses) => {
            responses = responses.filter(n => n); // remove empty from array
            Network.addServers(responses);
        }).catch(console.error);
    }
};