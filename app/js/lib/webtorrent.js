'use strict';

const Webtorrent = {
    client: null,
    streaminfo: {},
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

        return Webtorrent.fetchTorrent(magnet).then(torrent => {
            console.info('Webtorrent connected', torrent);

            Webtorrent.handleTorrent(torrent);
            Webtorrent.handleStreaminfo(torrent);

            return Webtorrent.createServer(torrent);
        });
    },
    stop: () => {
        clearInterval(Webtorrent.streaminfo.updateInterval);
        Webtorrent.streaminfo = {};

        if (Webtorrent.client) {
            Webtorrent.client.destroy();
            Webtorrent.client = null;
            console.info('Webtorrent stopped');
        }        
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

        Webtorrent.streaminfo.file_index = 0;
        Webtorrent.streaminfo.file_name = torrent.files[0].name;
        Webtorrent.streaminfo.file_size = torrent.files[0].length;
    },
    handleStreaminfo: (torrent) => {
        Webtorrent.streaminfo.torrent = torrent;
        Webtorrent.streaminfo.updateInterval = setInterval(() => {
            Webtorrent.updateInfos(Webtorrent.streaminfo.torrent);
        }, 1000);
    },
    createServer: (torrent, port) => {
        return new Promise(resolve => {
            let serverPort = port || 9000;

            try {
                torrent.createServer().listen(serverPort);

                Webtorrent.streaminfo.url = 'http://127.0.0.1:' + serverPort + '/' + Webtorrent.streaminfo.file_index;

                resolve(Webtorrent.streaminfo.url);
            } catch (e) {
                setTimeout(() => {
                    let rand = Math.floor(Math.random() * (65535 - 1024)) + 1024;
                    return Webtorrent.createServer(rand).then(resolve);
                }, 100);
            }
        });
    },
    updateInfos: (torrent) => {
        let downloaded = torrent.files[Webtorrent.streaminfo.file_index].downloaded || 0;

        let percent = (100 / Webtorrent.streaminfo.file_size) * downloaded;
        if (percent >= 100) percent = 100;

        let time_left = Math.round((Webtorrent.streaminfo.file_size - downloaded) / torrent.downloadSpeed);
        if (isNaN(time_left) || time_left < 0) {
            time_left = 0;
        } else if (!isFinite(time_left)) {
            time_left = undefined;
        }
        
        Webtorrent.streaminfo.stats = {
            total_peers: torrent.numPeers,
            download_speed: torrent.downloadSpeed,
            upload_speed: torrent.uploadSpeed,
            downloaded_bytes: downloaded,
            remaining_time: time_left,
            downloaded_percent: percent
        };
    }
}