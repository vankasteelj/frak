'use strict'

const Cast = {
  clients: {
    dlna: Dlnacasts()
  },
  activePlayer: undefined,
  players: [],
  scan: () => {
    // DLNA
    Cast.clients.dlna = Dlnacasts()
    Cast.clients.dlna.on('update', player => {
      //console.info('Found DLNA Device: %s at %s', player.name, player.host)
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

    console.info('Scanning for DLNA devices...')
    Cast.clients.dlna.update()
  },
  cast: (name, title, url, subtitle) => {
    if (Cast.activePlayer) Cast.activePlayer.stop()

    for (const i in Cast.players) {
      if (Cast.players[i].name === name) {
        const player = Cast.players[i].player
        let media = {
          title: title,
          dlnaFeatures: 'DLNA.ORG_OP=01;DLNA.ORG_FLAGS=01100000000000000000000000000000'
        }
        if (subtitle) media.subtitte = [subtitle]
        player.play(url, media, (err, status) => {
          if (err) {
            Cast.activePlayer = undefined
          } else {
            Cast.activePlayer = player
          }
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
      console.info('DLNA: stop (%s)', Cast.activePlayer.name)
      Cast.activePlayer.stop()
      Cast.activePlayer = undefined
    }
  }
}