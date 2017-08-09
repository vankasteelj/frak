'use strict';

const Webtorrent = {
    client: null,
    getInstance: () => {
        if (Webtorrent.client === null) {
            Webtorrent.client = new (require('webtorrent'))({
                maxConns: 55,
                tracker: {
                    wrtc: false
                }
            });
        }
        return Webtorrent.client;
    },
    start: (magnet) => {
        if (Webtorrent.client) Webtorrent.stop();

        Webtorrent.fetchTorrent(magnet).then(torrent => {
            console.info('Webtorrent connected', torrent);

            Webtorrent.handleTorrent(torrent);

            return Webtorrent.createServer(torrent);
        });
    },
    stop: () => {
        if (Webtorrent.client) {
            Webtorrent.client.destroy();
        }
        
        Webtorrent.client = null;
        console.info('Webtorrent stopped');
    },
    fetchTorrent: (magnet) => {
        return new Promise(resolve => {
            let client = Webtorrent.getInstance();
            let torrent = client.add(magnet, {
                path: Cache.dir
            });

            torrent.on('metadata', () => resolve(torrent));
        });
    },
    handleTorrent: (torrent) => {
        // for now select largest only, but in the future open ask the user
        
        // sort files by size
        torrent.files = torrent.files.sort((a, b) => {
            if (a.length > b.length) return -1;
            if (a.length < b.length) return 1;
            return 0;
        });

        // don't download anything (still a bug: https://github.com/webtorrent/webtorrent/issues/164)
        torrent.deselect(0, torrent.pieces.length - 1, false);
        torrent.files.forEach(file => file.deselect());

        // download only the largest file
        torrent.files[0].select();
    },
    createServer: (torrent, port) => {
        return new Promise(resolve => {
            let serverPort = port || 9000;

            try {
                torrent.createServer().listen(serverPort);
                resolve('http://127.0.0.1:' + serverPort + '/0');
            } catch (e) {
                setTimeout(() => {
                    let rand = Math.floor(Math.random() * (65535 - 1024)) + 1024;
                    return Webtorrent.createServer(rand).then(resolve);
                }, 100);
            }
        });
    }
}