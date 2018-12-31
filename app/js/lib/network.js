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
    buildMainServer: () => {
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

        // only one main server running at a time
        if (Network.servers.main) {
            Network.servers.main.close();
            Network.servers.main = null;
        }

        //serve json
        Network.servers.main = http.createServer((req, res) => {
            // on GET, send back the json api
            if (req.method === 'GET') {
                console.log('GET from', req.headers.client);
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

                    console.log('Serving \'%s\' on port %d (requested by %s)', file.filename, Network.ports.play, res.headers.client);

                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.write(JSON.stringify({
                        file: file,
                        url: `http://${json.server.ip}:${Network.port.play}`
                    }));
                    res.end();
                });
            }
        });

        Network.servers.main.listen(Network.ports.main);
        console.log('Local server running on port %d', Network.ports.main);
    },
    findPeers: () => {
        let ip = DB.get('localip');
        let baseIp = ip.match(/\d+\.\d+\.\d+\./)[0];
        let ips = [];

        for (let i = 1; i < 255; i++) ips.push(baseIp+i);

        Promise.all(ips.map(ip => {
          return new Promise((resolve, reject) => {
            got('http://'+ip+':3000', {
                timeout: 300,
                headers: {
                    'client': DB.get('localip')
                }
            }).then(res => {
                let data = JSON.parse(res.body);
                resolve(data.server);
            }).catch(() => resolve());
          });
        })).then((responses) => {
            responses = responses.filter(n => n); // remove empty from array
            responses = responses.filter(n => n.ip !== ip); // remove this machine
            console.log('Available local servers:', responses); // TODO: store availabel servers and have a method to add/remove
        }).catch(console.error);
    }
};