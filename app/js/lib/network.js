'use strict'

const Network = {
    port: 3250,
    server: null,
    headers: {},
    jsonApi: {},
    peers: [],

    // when a new connection occurs
    addPeers: (servers = []) => {
        let added;
        for (let toAdd in servers) {
            let exists;
            for (let existing in Network.peers) {
                if (Network.peers[existing].ip === servers[toAdd].ip) exists = true;
            }
            if (!exists && (Network.jsonApi.ip !== servers[toAdd].ip)) {
                console.log('Network: peer connected (%s @ %s)', servers[toAdd].ip, servers[toAdd].name);
                Network.peers.push(servers[toAdd]);
                Network.checkPeer(servers[toAdd]);
                added = true;
            }
        }
        
        if (added) setTimeout(Network.rearrangeLocals, 500);
    },

    // verify periodically if the peer is still connected
    checkPeer: (server) => {
        got(`http://${server.ip}:${Network.port}`, Network.headers).then(res => {
            for (let existing in Network.peers) {
                if (Network.peers[existing].ip === server.ip) {
                    const body = JSON.parse(res.body);
                    Network.peers[existing].available = body.available;
                    Network.peers[existing].name = body.name;

                    Network.getFreePort(server.ip).then(port => {
                        Network.peers[existing].assignedPort = port;
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

    // discover peers on the same subnet e.g. 192.168.1.[1-254];
    findPeers: () => {
        const localip = Network.jsonApi.ip;
        const baseIp = localip.match(/\d+\.\d+\.\d+\./)[0];
        const ips = [];

        for (let i = 1; i < 255; i++) ips.push(baseIp + i);

        Promise.all(ips.map(ip => {
            return new Promise((resolve, reject) => {
                got('http://' + ip + ':' + Network.port, Object.assign({
                    timeout: 500
                }, Network.headers)).then(res => {
                    resolve(JSON.parse(res.body));
                }).catch(() => resolve());
            });
        })).then((responses) => {
            responses = responses.filter(n => n); // remove empty from array
            Network.addPeers(responses);
        }).catch(console.error);
    },

    // the exposed api on main server
    buildJsonApi: () => {
        Network.jsonApi = {
            available: DB.get('local_library'),
            ip: DB.get('localip'),
            name: process.env.COMPUTERNAME
        };
    },

    // headers used when talking to a peer
    buildHeaders: () => {
        Network.headers = {
            headers: {
                client: JSON.stringify({
                    ip: Network.jsonApi.ip,
                    name: process.env.COMPUTERNAME
                })
            }
        };
    },

    // expose the api and gets ready for playback
    buildMainServer: () => {
        // only one main server running at a time
        if (Network.server) {
            Network.server.close();
            Network.server = null;
        }
        
        // serve json
        Network.server = http.createServer((req, res) => {
            const client = JSON.parse(req.headers.client);

            if (req.method === 'GET') { // on GET, register the client and send back the json api
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.write(JSON.stringify(Network.jsonApi));
                res.end();

                Network.addPeers([client]);

            } else if (req.method === 'POST') { // on POST, serve the file to a new server and send back the url
                const body = '';
                req.on('data', (data) => {
                    body += data;
                });
                req.on('end', () => {
                    const file = JSON.parse(body);

                    for (let existing in Network.peers) {
                        if (Network.peers[existing].ip === client.ip) {
                            Network.buildPlayServer(file, existing);

                            res.writeHead(200, {
                                'Content-Type': 'application/json'
                            });
                            res.write(JSON.stringify({
                                file: file,
                                url: `http://${Network.jsonApi.ip}:${Network.peers[existing].assignedPort}`
                            }));
                            res.end();
                        }
                    }
                });
            }
        });

        Network.server.listen(Network.port);
        console.info('Network: local server running on http://%s:%d', Network.jsonApi.ip, Network.port);
    },

    // on demand from peer
    buildPlayServer: (file, clientId) => {
        // only one play server running at a time
        if (Network.peers[clientId].playbackServer) {
            Network.peers[clientId].playbackServer.close();
            Network.peers[clientId].playbackServer = null;
        }

        // serve the file on assigned port
        Network.peers[clientId].playbackServer = http.createServer((req, res) => {
            const range = req.headers.range;

            if (range) { // this allows seeking on client
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : file.size - 1;
                const chunksize = (end - start) + 1;
                const fileStream = fs.createReadStream(file.path, {start, end});

                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${file.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4',
                });
                fileStream.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': file.size,
                    'Content-Type': 'video/mp4',
                });
                fs.createReadStream(file.path).pipe(res);
            }
        });

        Network.peers[clientId].playbackServer.listen(Network.peers[clientId].assignedPort);

        console.log('Network: \'%s\' ready to stream on port %d (requested by %s @ %s)', file.filename, Network.peers[clientId].assignedPort, Network.peers[clientId].ip, Network.peers[clientId].name);
    },

    // tries defined port for main server + 1, then keeps trying until a free port is found
    getFreePort: (ip, port = Network.port + 1) => {
        return new Promise((resolve, reject) => {
            for (let existing in Network.peers) {
                if (Network.peers[existing].assignedPort === port && Network.peers[existing].ip === ip) return resolve(port);
                if (Network.peers[existing].assignedPort === port && Network.peers[existing].ip !== ip) return resolve(Network.getFreePort(port += 1));
            }

            const server = http.createServer();

            server.once('error', (err) => {
                return resolve(Network.getFreePort(port += 1));
            });

            server.once('listening', () => {
                server.close();
                return resolve(port);
            });

            server.listen(port);
        });
    },

    // promise: sends back an url
    getFileFromPeer: (file) => {
        console.log('getFileFromPeer', file)
        return got(`http://${file.source}`, Object.assign({
            method: 'POST',
            port: Network.port,
            body: JSON.stringify(file)
        }, Network.headers)).then((res) => {
            return JSON.parse(res.body).url;
        });
    },

    // update local library with client's available items
    rearrangeLocals: () => {
        // local collection
        const collection = Network.jsonApi.available;
        let items = 0;

        // add each available item (and its source);
        for (let i in Network.peers) {
            for (let j in Network.peers[i].available) {
                items++;
                collection.push(Object.assign(Network.peers[i].available[j], {
                    source: Network.peers[i].ip
                }));
            }
        }

        console.info('Network: found %d available file(s) on %d peer(s)', items, Network.peers.length);
        Collection.format.locals(collection);
    },

    init: () => {
        // build json api
        Network.buildJsonApi();

        // set the headers we'll need to send on each request
        Network.buildHeaders();

        // fire up the server
        Network.buildMainServer();

        // search for peers on local network
        Network.findPeers();
    }
};
