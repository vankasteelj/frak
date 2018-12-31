'use strict'

const Network = {
    port: 3250,
    server: null,
    peers: [],
    addPeers: (servers = []) => {
        for (let toAdd in servers) {
            let exists;
            for (let existing in Network.peers) {
                if (Network.peers[existing].ip === servers[toAdd].ip) exists = true;
            }
            if (!exists && (DB.get('localip') !== servers[toAdd].ip)) {
                console.log('Network: peer connected (%s @ %s)', servers[toAdd].ip, servers[toAdd].name);
                Network.peers.push(servers[toAdd]);
                Network.checkPeer(servers[toAdd]);
            }
        }
    },
    checkPeer: (server) => {
        got(`http://${server.ip}:${Network.port}`, {
            headers: {
                'client': JSON.stringify({
                    ip: DB.get('localip'),
                    name: process.env.COMPUTERNAME
                })
            }
        }).then(res => {
            for (let existing in Network.peers) {
                if (Network.peers[existing].ip === server.ip) {
                    Network.peers[existing] = JSON.parse(res.body);
                    Network.getFreePort(server.ip).then(port => {
                        Network.peers[existing].port = port;
                    });
                }
            }

            setTimeout(() => Network.checkPeer(server), 30000);
        }).catch(() => {
            for (let existing in Network.peers) {
                if (Network.peers[existing].ip === server.ip) {
                    Network.peers.splice(existing, 1);
                    console.log('Network: peer disconnected (%s @ %s)', server.ip, server.name);
                }
            }
        });
    },
    findPeers: () => {
        let localip = DB.get('localip');
        let baseIp = localip.match(/\d+\.\d+\.\d+\./)[0];
        let ips = [];

        for (let i = 1; i < 255; i++) ips.push(baseIp + i);

        Promise.all(ips.map(ip => {
            return new Promise((resolve, reject) => {
                got('http://' + ip + ':' + Network.port, {
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
            Network.addPeers(responses);
        }).catch(console.error);
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
        if (Network.server) {
            Network.server.close();
            Network.server = null;
        }

        //serve json
        Network.server = http.createServer((req, res) => {
            let client = JSON.parse(req.headers.client);

            // on GET, register the client and send back the json api
            if (req.method === 'GET') {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.write(JSON.stringify(json));
                res.end();

                Network.addPeers([client]);

                // on POST, serve the file to a new server and send back the url
            } else if (req.method === 'POST') {
                let body = '';
                req.on('data', (data) => {
                    body += data;
                });
                req.on('end', () => {
                    let file = JSON.parse(body);

                    // serve the file on assigned port
                    for (let existing in Network.peers) {
                        if (Network.peers[existing].ip === client.ip) {
                            // only one play server running at a time
                            if (Network.peers[existing].playing) {
                                Network.peers[existing].playing.close();
                                Network.peers[existing].playing = null;
                            }

                            Network.peers[existing].playing = http.createServer((req2, res2) => {
                                res2.writeHead(200, {
                                    'Content-Type': 'video/mp4',
                                    'Content-Length': file.size
                                });
                                let readStream = fs.createReadStream(file.path);
                                readStream.pipe(res2);
                            });
                            Network.peers[existing].playing.listen(Network.peers[existing].port);

                            console.log('Network: serving \'%s\' on port %d (requested by %s @ %s)', file.filename, Network.peers[existing].port, client.ip, client.name);
                            res.writeHead(200, {
                                'Content-Type': 'application/json'
                            });
                            res.write(JSON.stringify({
                                file: file,
                                url: `http://${json.ip}:${Network.peers[existing].port}`
                            }));
                            res.end();
                        }
                    }
                });
            }
        });

        Network.server.listen(Network.port);
        console.log('Network: local server running on http://%s:%d', json.ip, Network.port);
        Network.findPeers();
    },
    getFreePort: (ip, port = Network.port+1) => {
        return new Promise((resolve, reject) => {
            for (let existing in Network.peers) {
                if (Network.peers[existing].port === port && Network.peers[existing].ip === ip) return resolve(port);
                if (Network.peers[existing].port === port && Network.peers[existing].ip !== ip) return resolve(Network.getFreePort(port+=1));
            }

            let server = http.createServer();

            server.once('error', (err) => {
                return resolve(Network.getFreePort(port+=1));
            });

            server.once('listening', () => {
                server.close();
                return resolve(port);
            });

            server.listen(port);
        });
    },
    getFileFromPeer: (file, peer) => {
        return got(`http://${peer.ip}`, {
            method: 'POST',
            port: Network.port,
            headers: {
                client: JSON.stringify({
                    ip: DB.get('localip'),
                    name: process.env.COMPUTERNAME
                })
            },
            body: JSON.stringify(file)
        }).then((res) => {
            return JSON.parse(res.body);
        });
    }
};
