'use strict'

const Streamer = {
  client: null,
  torrent: null,
  streaminfo: {},
  getInstance: () => {
    if (Streamer.client === null) {
      const _soptions = DB.get('streamer_options')
      Streamer.client = new (require('webtorrent'))({
        maxConns: parseInt(_soptions.maxConns) | Settings.streamer.maxConns,
        webSeeds: false, // activating BEP19 makes nwjs 'hang' and stop working
        downloadLimit: parseInt(_soptions.downloadLimit) * 1000 | Settings.streamer.downloadLimit | Number.MAX_VALUE,
        uploadLimit: parseInt(_soptions.uploadLimit) * 1000 | Settings.streamer.uploadLimit | Number.MAX_VALUE,
        tracker: {
          wrtc: false,
          announce: _soptions.announce || []
        }
      })
    }
    return Streamer.client
  },
  start: (magnet, index) => {
    if (Streamer.client) Streamer.stop()
    console.info('Streamer - loading', magnet.split('&')[0])

    return Streamer.fetchTorrent(magnet).then(torrent => {
      Streamer.torrent = torrent
      console.info('Streamer connected', Streamer.torrent)

      return Streamer.handleTorrent(Streamer.torrent, index)
    }).then(selectedIndex => {
      console.debug('Selected file index', selectedIndex)
      Streamer.startDownload(Streamer.torrent, selectedIndex)
      Streamer.handleStreaminfo(Streamer.torrent)
      return Streamer.createServer(Streamer.torrent)
    })
  },
  stop: () => {
    clearInterval(Streamer.streaminfo.updateInterval)
    nw.Window.get().setProgressBar(0)
    Streamer.streaminfo = {}
    Streamer.torrent = null

    if (Streamer.client) {
      Streamer.client.destroy()
      Streamer.client = null
      console.info('Streamer stopped')
    }
  },
  fetchTorrent: (magnet) => {
    return new Promise((resolve, reject) => {
      const client = Streamer.getInstance()
      const torrent = client.add(magnet, {
        path: Cache.dir
      })

      const timeout = setTimeout(() => {
        reject(new Error('Streamer - magnet timed out'))
      }, DB.get('streamer_options').magnetTimeout)

      torrent.on('metadata', () => {
        clearTimeout(timeout)
        return resolve(torrent)
      })
      torrent.on('error', reject)
      client.on('error', reject)
    })
  },
  handleTorrent: (torrent, index) => {
    let availableFiles = []

    // don't download anything (still a bug: https://github.com/webtorrent/webtorrent/issues/164)
    torrent.deselect(0, torrent.pieces.length - 1, false)
    torrent.files.forEach((file, i) => {
      file.deselect()

      // check if it's a video file
      const ext = path.extname(file.name).toLowerCase()
      if (Settings.supportedVideoFiles.indexOf(ext) !== -1) {
        file.index = i
        availableFiles.push(file)
      }
    })

    if (index) return index // pre-selected index
    if (availableFiles.length === 1) return availableFiles[0].index // only one available file

    // select manually a file, sorted alphabetically
    availableFiles = availableFiles.sort((a, b) => {
      if (a.name < b.name) return -1
      if (a.name > b.name) return 1
      return 0
    })

    return Details.openFileSelector(availableFiles)
  },
  startDownload: (torrent, index) => {
    torrent.files[index].select()

    Streamer.streaminfo.file_index = index
    Streamer.streaminfo.file_name = torrent.files[index].name
    Streamer.streaminfo.file_size = torrent.files[index].length

    Cache.calcSize().then(s => $('#videocachesize').text(s)).catch(console.log)
  },
  handleStreaminfo: (torrent) => {
    Streamer.streaminfo.torrent = torrent
    Streamer.streaminfo.updateInterval = setInterval(() => {
      Streamer.updateInfos(Streamer.streaminfo.torrent)
    }, 1000)
  },
  createServer: (torrent, port) => {
    return new Promise(resolve => {
      const serverPort = port || 9000

      try {
        torrent.createServer().listen(serverPort)

        Streamer.streaminfo.port = serverPort
        Streamer.streaminfo.url = 'http://127.0.0.1:' + serverPort + '/' + Streamer.streaminfo.file_index

        resolve(Streamer.streaminfo.url)
      } catch (e) {
        setTimeout(() => {
          const rand = Math.floor(Math.random() * (65535 - 1024)) + 1024
          return Streamer.createServer(rand).then(resolve)
        }, 100)
      }
    })
  },
  updateInfos: (torrent) => {
    const downloaded = torrent.files[Streamer.streaminfo.file_index].downloaded || 0

    let percent = (100 / Streamer.streaminfo.file_size) * downloaded
    if (percent >= 99.99) percent = 100

    let timeLeft = Math.round((Streamer.streaminfo.file_size - downloaded) / torrent.downloadSpeed)
    if (isNaN(timeLeft) || timeLeft < 0) {
      timeLeft = 0
    } else if (!isFinite(timeLeft)) {
      timeLeft = undefined
    }

    Streamer.streaminfo.stats = {
      total_peers: torrent.numPeers,
      download_speed: torrent.downloadSpeed,
      upload_speed: torrent.uploadSpeed,
      downloaded_bytes: downloaded,
      remaining_time: timeLeft,
      downloaded_percent: percent
    }
  }
}
