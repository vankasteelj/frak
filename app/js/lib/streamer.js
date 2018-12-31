'use strict';

const Streamer = {
    client: null,
    streaminfo: {},
    getInstance: () => {
        if (Streamer.client === null) {
            let _soptions = DB.get('streamer_options');
            Streamer.client = new(require('webtorrent'))({
                maxConns: _soptions.maxConns,
                webSeeds: _soptions.webSeeds,
                tracker: {
                    wrtc: false,
                    announce: _soptions.announce || []
                }
            });
        }
        return Streamer.client;
    },
    start: (magnet, index) => {
        if (Streamer.client) Streamer.stop();
        console.info('Streamer - loading', magnet.split('&')[0]);

        return Streamer.fetchTorrent(magnet).then(torrent => {
            console.info('Streamer connected', torrent);

            Streamer.handleTorrent(torrent, index);
            Streamer.handleStreaminfo(torrent);

            return Streamer.createServer(torrent);
        });
    },
    stop: () => {
        clearInterval(Streamer.streaminfo.updateInterval);
        nw.Window.get().setProgressBar(0);
        Streamer.streaminfo = {};

        if (Streamer.client) {
            Streamer.client.destroy();
            Streamer.client = null;
            console.info('Streamer stopped');
        }
    },
    fetchTorrent: (magnet) => {
        return new Promise((resolve, reject) => {
            let client = Streamer.getInstance();
            let torrent = client.add(magnet, {
                path: Cache.dir
            });

            let timeout = setTimeout(() => {
                reject(new Error('Streamer - magnet timed out'));
            }, DB.get('streamer_options').magnetTimeout);

            torrent.on('metadata', () => {
                clearTimeout(timeout);
                return resolve(torrent);
            });
            torrent.on('error', reject);
            client.on('error', reject);
        });
    },
    handleTorrent: (torrent, index) => {
        if (!index) {
            index = 0;

            // sort files by size
            torrent.files = torrent.files.sort((a, b) => {
                if (a.length > b.length) return -1;
                if (a.length < b.length) return 1;
                return 0;
            });
        }

        // don't download anything (still a bug: https://github.com/webtorrent/webtorrent/issues/164)
        torrent.deselect(0, torrent.pieces.length - 1, false);
        torrent.files.forEach(file => file.deselect());

        // download only the largest file
        torrent.files[index].select();

        Streamer.streaminfo.file_index = index;
        Streamer.streaminfo.file_name = torrent.files[index].name;
        Streamer.streaminfo.file_size = torrent.files[index].length;
    },
    handleStreaminfo: (torrent) => {
        Streamer.streaminfo.torrent = torrent;
        Streamer.streaminfo.updateInterval = setInterval(() => {
            Streamer.updateInfos(Streamer.streaminfo.torrent);
        }, 1000);
    },
    createServer: (torrent, port) => {
        return new Promise(resolve => {
            let serverPort = port || 9000;

            try {
                torrent.createServer().listen(serverPort);

                Streamer.streaminfo.port = serverPort;
                Streamer.streaminfo.url = 'http://127.0.0.1:' + serverPort + '/' + Streamer.streaminfo.file_index;

                resolve(Streamer.streaminfo.url);
            } catch (e) {
                setTimeout(() => {
                    let rand = Math.floor(Math.random() * (65535 - 1024)) + 1024;
                    return Streamer.createServer(rand).then(resolve);
                }, 100);
            }
        });
    },
    updateInfos: (torrent) => {
        let downloaded = torrent.files[Streamer.streaminfo.file_index].downloaded || 0;

        let percent = (100 / Streamer.streaminfo.file_size) * downloaded;
        if (percent >= 99.99) percent = 100;

        let time_left = Math.round((Streamer.streaminfo.file_size - downloaded) / torrent.downloadSpeed);
        if (isNaN(time_left) || time_left < 0) {
            time_left = 0;
        } else if (!isFinite(time_left)) {
            time_left = undefined;
        }

        Streamer.streaminfo.stats = {
            total_peers: torrent.numPeers,
            download_speed: torrent.downloadSpeed,
            upload_speed: torrent.uploadSpeed,
            downloaded_bytes: downloaded,
            remaining_time: time_left,
            downloaded_percent: percent
        };
    }
}
