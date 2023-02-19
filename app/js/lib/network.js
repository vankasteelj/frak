'use strict'

const Network = {
  port: 3250,
  server: null,
  headers: {},
  jsonApi: {},
  peers: [],

  // when a new connection occurs
  addPeers: (servers = []) => {
    let added
    for (const toAdd in servers) {
      let exists
      for (const existing in Network.peers) {
        if (Network.peers[existing].ip === servers[toAdd].ip) exists = true
      }
      if (!exists && (Network.jsonApi.ip !== servers[toAdd].ip)) {
        console.log('Network: peer connected (%s @ %s)', servers[toAdd].ip, servers[toAdd].name)
        Network.peers.push(servers[toAdd])
        Network.checkPeer(servers[toAdd])
        added = true
      }
    }

    if (added) setTimeout(Network.rearrangeLocals, 5000)
  },

  // verify periodically if the peer is still connected
  checkPeer: (server) => {
    got(`http://${server.ip}:${Network.port}`, { headers: Network.headers }).then(res => {
      for (const existing in Network.peers) {
        if (Network.peers[existing].ip === server.ip) {
          const body = JSON.parse(res.body)
          Network.peers[existing].available = body.available
          Network.peers[existing].name = body.name
          Network.peers[existing].cast_allowed = body.cast_allowed

          if (!Network.peers[existing].assignedPort) {
            Network.getFreePort(server.ip).then(port => {
              Network.peers[existing].assignedPort = port
            })
          }
        }
      }

      setTimeout(() => Network.checkPeer(server), 5000)
    }).catch(() => {
      for (const existing in Network.peers) {
        if (Network.peers[existing].ip === server.ip) {
          Network.peers.splice(existing, 1)
          console.log('Network: peer disconnected (%s @ %s)', server.ip, server.name)
        }
      }
    })
  },

  // discover peers on the same subnet e.g. 192.168.1.[1-254];
  findPeers: () => {
    const localip = Network.jsonApi.ip
    const baseIp = localip.match(/\d+\.\d+\.\d+\./)[0]
    const ips = []

    for (let i = 1; i < 255; i++) ips.push(baseIp + i)

    Promise.all(ips.map(ip => {
      return new Promise((resolve, reject) => {
        got('http://' + ip + ':' + Network.port, {
          timeout: 2000,
          headers: Network.headers
        }).then(res => {
          resolve(JSON.parse(res.body))
        }).catch(() => resolve())
      })
    })).then((responses) => {
      responses = responses.filter(n => n) // remove empty from array
      Network.addPeers(responses)
    }).catch(console.error)
  },

  // the exposed api on main server
  buildJsonApi: () => {
    Network.jsonApi = {
      available: DB.sync.get('local_library'),
      ip: DB.sync.get('localip'),
      name: process.env.COMPUTERNAME,
      cast_allowed: Boolean(DB.sync.get('localplayback'))
    }
  },

  // headers used when talking to a peer
  buildHeaders: () => {
    Network.headers = {
      client: JSON.stringify({
        ip: Network.jsonApi.ip,
        name: process.env.COMPUTERNAME
      })
    }
  },

  // expose the api and gets ready for playback
  buildMainServer: () => {
    // only one main server running at a time
    let wasRunning
    if (Network.server) {
      Network.server.close()
      Network.server = null
      wasRunning = true
    }

    // serve json
    Network.server = http.createServer((req, res) => {
      const client = JSON.parse(req.headers.client)

      if (req.method === 'GET') { // on GET, register the client and send back the json api
        res.writeHead(200, {
          'Content-Type': 'application/json'
        })
        res.write(JSON.stringify(Network.jsonApi))
        res.end()

        Network.addPeers([client])
      } else if (req.method === 'POST') { // on POST, serve the file to a new server and send back the url
        let body = ''
        req.on('data', (data) => {
          body += data
        })
        req.on('end', () => {
          const file = JSON.parse(body)

          for (const existing in Network.peers) {
            if (Network.peers[existing].ip === client.ip) {
              if (file.playback) {
                Network.resumePlayback(file)
                res.writeHead(200)
                res.end()
              } else {
                Network.buildPlayServer(file, existing)

                res.writeHead(200, {
                  'Content-Type': 'application/json'
                })
                res.write(JSON.stringify({
                  file: file,
                  url: `http://${Network.jsonApi.ip}:${Network.peers[existing].assignedPort}`
                }))
                res.end()
              }
            }
          }
        })
      }
    })

    Network.server.listen(Network.port)

    if (!wasRunning) {
      console.info('Network: local server running on http://%s:%d', Network.jsonApi.ip, Network.port)
      $('#settings .localsharing .localstatus .server').text(i18n.__('sharing %s files (port %s)', Network.jsonApi.available.length, Network.port))
    }
  },

  // on demand from peer
  buildPlayServer: (file, clientId) => {
    // only one play server running at a time
    if (Network.peers[clientId].playbackServer) {
      Network.peers[clientId].playbackServer.close()
      Network.peers[clientId].playbackServer = null
    }

    // serve the file on assigned port
    Network.peers[clientId].playbackServer = http.createServer((req, res) => {
      const pathname = url.parse(req.url).pathname
      switch (pathname) {
        case '/subtitles': {
          // only working for a ".srt file" using the exact same name as the video file
          const ext = file.filename.split('.').pop()
          const srtPath = file.path.replace(ext, 'srt')
          const srtName = file.filename.replace(ext, 'srt')
          if (fs.existsSync(srtPath)) {
            fs.createReadStream(srtPath).pipe(res)
          } else {
            res.writeHead(404, { 'Content-Type': 'text/html' })
            res.write('404 Not Found')
            res.end()
          }
          break
        }
        default: {
          const range = req.headers.range

          if (range) { // this allows seeking on client
            const parts = range.replace(/bytes=/, '').split('-')
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : file.size - 1
            const chunksize = (end - start) + 1
            const fileStream = fs.createReadStream(file.path, { start, end })

            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${file.size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': 'video/mp4'
            })
            fileStream.pipe(res)
          } else {
            res.writeHead(200, {
              'Content-Length': file.size,
              'Content-Type': 'video/mp4'
            })
            fs.createReadStream(file.path).pipe(res)
          }
          break
        }
      }
    })

    Network.peers[clientId].playbackServer.listen(Network.peers[clientId].assignedPort)

    console.log(`Network: '${file.filename}' ready to stream on port:${Network.peers[clientId].assignedPort} (requested by ${Network.peers[clientId].ip} @ ${Network.peers[clientId].name})`)
  },

  // find a free port to use by selecting port:0
  getFreePort: () => {
    return new Promise(resolve => {
      const server = http.createServer()
      server.once('error', (err) => {
        console.log(err)
      })

      server.once('listening', () => {
        const port = server.address().port
        server.close()
        return resolve(port)
      })

      server.listen(0)
    })
  },

  // promise: sends back an url
  getFileFromPeer: (file) => {
    return got(`http://${file.source}`, {
      method: 'POST',
      port: Network.port,
      body: JSON.stringify(file),
      headers: Network.headers
    }).then((res) => {
      return JSON.parse(res.body).url
    }).catch(err => {
      console.error('Network.getFileFromPeer()', err)
    })
  },

  // download subtitles srt in temps and use it
  getSubtitlesFromPeer: (file, url) => {
    const ext = file.filename.split('.').pop()
    const srtName = file.filename.replace(ext, 'srt')
    const srtPath = path.join(Cache.dir, srtName)

    got(url + '/subtitles').then(res => { // prevent piping if no subs are available
      got.stream(url + '/subtitles').pipe(fs.createWriteStream(srtPath)).on('finish', () => {
        Player.mpv.addSubtitles(srtPath, 'cached', srtName)
      })
    }).catch(err => {
      console.debug('Network.getSubtitlesFromPeer failed', err)
    })
  },

  // update local library with client's available items
  rearrangeLocals: () => {
    // local collection
    const collection = DB.sync.get('local_library')
    let items = 0

    // add each available item (and its source);
    for (const i in Network.peers) {
      for (const j in Network.peers[i].available) {
        items++
        collection.push(Object.assign(Network.peers[i].available[j], {
          source: Network.peers[i].ip
        }))
      }
    }

    console.info('Network: found %d available file(s) on %d peer(s)', items, Network.peers.length)
    $('#settings .localsharing .localstatus .clients').text(i18n.__('- %s connected peer(s)', Network.peers.length))
    Collection.format.locals(collection)
  },

  resumePlayback: (data) => {
    if (!DB.sync.get('localplayback')) return

    const getSubtitle = () => {
      if (data.subtitle) {
        const subtitle = path.join(Cache.dir, data.subtitle.filename)

        const selectSubtitle = () => {
          Player.mpv.addSubtitles(subtitle, 'cached', data.subtitle.filename, data.subtitle.langcode)
          console.info('Subtitle selected:', data.subtitle.langcode)
        }

        got.stream(data.subtitle.url).pipe(fs.createWriteStream(subtitle)).on('finish', selectSubtitle)
      }
    }

    if (data.file) {
      Network.getFileFromPeer(data.file).then(url => {
        Player.play(url, {
          'percent-pos': data.position
        })
        setTimeout(getSubtitle, 1000)
      })
    } else {
      Player.play(data.url, {
        'percent-pos': data.position
      })
      setTimeout(getSubtitle, 1000)
    }
  },

  init: () => {
    // option to disallow sharing alltogether
    if (!DB.sync.get('localsharing')) return

    // build json api
    Network.buildJsonApi()

    // set the headers we'll need to send on each request
    Network.buildHeaders()

    // fire up the server
    Network.buildMainServer()

    // search for peers on local network
    Network.findPeers()
  },

  disconnect: () => {
    if (Network.server) {
      Network.server.close()
      Network.server = null
    }
    Network.headers = {}
    Network.jsonApi = {}
    Network.peers = []

    $('#settings .localsharing .localstatus .server').text(i18n.__('not running'))
    $('#settings .localsharing .localstatus .clients').text('')
  }
}
