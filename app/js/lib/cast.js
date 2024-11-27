'use strict'

const Cast = {
  activePlayer: undefined,
  players: [],
  scan: () => {
    // DLNA
    console.info('Scanning for DLNA devices...', Cast.players)
    Cast.dlna = require('dlnacasts3')()
    Cast.dlna.on('update', player => {
      // console.info('Found DLNA Device: %s at %s', player.name, player.host)
      let exists = false
      for (const i in Cast.players) {
        if (Cast.players[i].name === player.name) {
          exists = true
          console.info('Updating the available players list with %s (%s)', player.name, player.host)
          Cast.players[i] = {
            name: player.name,
            url: player.host,
            player: player
          }
        }
      }

      if (!exists) {
        console.info('Adding %s (%s) to the list of available players', player.name, player.host)
        Cast.players.push({
          name: player.name,
          url: player.host,
          player: player
        })
      }
    })
    setInterval(Cast.dlna.update, 30000)
  },
  cast: (name, title, url, subtitle) => {
    if (Cast.activePlayer) Cast.activePlayer.stop()

    for (const i in Cast.players) {
      if (Cast.players[i].name === name) {
        const player = Cast.players[i].player
        const media = {
          title: title,
          dlnaFeatures: 'DLNA.ORG_OP=01;DLNA.ORG_FLAGS=01100000000000000000000000000000',
          seek: '0',
          autoSubtitles: false
        }

        if (subtitle) {
          const port = 8000
          const subtitlesUrl = 'http://' + DB.sync.get('localip') + ':' + port + '/dlnacaptions.srt'
          
          //build srt server
          Cast.subtitleServer = http.createServer((req, res) => {
            res.writeHead(200, {
              'Content-type': 'text/srt',
              'Access-Control-Allow-Origin': '*',
              'transferMode.dlna.org': 'Streaming',
              'contentFeatures.dlna.org': 'DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000',
              'CaptionInfo.sec': subtitlesUrl
            })
            fs.createReadStream(subtitle).pipe(res)
          })

          //serve srt
          Cast.subtitleServer.listen(port)
          media.subtitle = [subtitlesUrl]
        }

        console.debug('Casting %s to %s (sub: %s)', media.title, player.name, (media.subtitle || 'none'))
        player.play(url, media, (err, status) => {
          if (err) {
            Cast.activePlayer = undefined
          } else {
            Cast.activePlayer = player
          }
        })

        player.on('status', (state) => {
          console.info('DLNA: status', state)
          if (state.playerState === 'STOPPED') Cast.stop()
        })
      }
    }
  },
  play: () => {
    if (Cast.activePlayer) {
      console.info('DLNA: play (%s)', Cast.activePlayer.name)
      Cast.activePlayer.play()
    }
  },
  pause: () => {
    if (Cast.activePlayer) {
      console.info('DLNA: pause (%s)', Cast.activePlayer.name)
      Cast.activePlayer.pause()
    }
  },
  stop: () => {
    if (Cast.activePlayer) {
      Cast.activePlayer.removeAllListeners('status')
      console.info('DLNA: stop (%s)', Cast.activePlayer.name)
      Cast.activePlayer.stop()
      Cast.activePlayer = undefined
      Details.closeKeepWatchingPopup()
    }
    if (Cast.subtitleServer) {
      Cast.subtitleServer.close()
      Cast.subtitleServer = null
    }
  }
}
