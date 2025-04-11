'use strict'

const Loading = {
  local: (file) => {
    $('#streaminfo .filename span').text(file.filename)
    $('#streaminfo .source span').text(path.dirname(file.path))
    $('#streaminfo .connection').hide()

    Player.play(file.path, {
      title: $('#details-metadata .title').text() + ($('#details-metadata .ep-title').text() ? ' - ' + $('#details-metadata .ep-title').text() : '')
    }, Details.model)

    Loading.subfails = 0
    Loading.lookForSubtitles({
      path: file.path
    })
  },
  shared: (file) => {
    Network.getFileFromPeer(file).then(url => {
      $('#streaminfo .filename span').text(file.filename)
      $('#streaminfo .source span').text(url)
      $('#streaminfo .connection').hide()
      Player.play(url, {
        title: $('#details-metadata .title').text() + ($('#details-metadata .ep-title').text() ? ' - ' + $('#details-metadata .ep-title').text() : '')
      }, Details.model)
      setTimeout(() => Network.getSubtitlesFromPeer(file, url), 1500)
    })

    Loading.subfails = 0
    Loading.lookForSubtitles({
      filename: file.filename,
      filesize: file.size
    })
  },
  remote: (url) => {
    const localUrl = DB.sync.get('localip') ? url.replace('127.0.0.1', DB.sync.get('localip')) : url

    $('#streaminfo .filename span').text(Streamer.streaminfo.file_name)
    $('#streaminfo .source span').text(localUrl)
    $('#streaminfo .connection').show()

    const calcRemainingTime = (timeLeft) => {
      if (timeLeft === undefined) {
        return i18n.__('Unknown time remaining')
      } else if (timeLeft > 3600) {
        return i18n.__('%s hour(s) remaining', Math.round(timeLeft / 3600))
      } else if (timeLeft > 60) {
        return i18n.__('%s minute(s) remaining', Math.round(timeLeft / 60))
      } else if (timeLeft <= 60) {
        return i18n.__('%s second(s) remaining', timeLeft)
      }
    }

    Loading.update = setInterval(() => {
      const downloaded = parseInt(Streamer.streaminfo.stats.downloaded_percent, 10)

      if (downloaded === 100) {
        NwjsApi.mainWindow.setProgressBar(0)
        $('#streaminfo .connection').hide()
        return
      }

      const time = calcRemainingTime(Streamer.streaminfo.stats.remaining_time)
      const dspeed = Misc.fileSize(Streamer.streaminfo.stats.download_speed)
      const uspeed = Misc.fileSize(Streamer.streaminfo.stats.upload_speed)
      const size = Misc.fileSize(Streamer.streaminfo.file_size)

      NwjsApi.mainWindow.setProgressBar(downloaded / 100)
      $('#streaminfo .status span').text(i18n.__('%s%% of %s', downloaded, size))
      $('#streaminfo .remaining span').text(time)
      $('#streaminfo .peers span').text(Streamer.streaminfo.stats.total_peers)
      $('#streaminfo .download span').text(dspeed + '/s')
      $('#streaminfo .upload span').text(uspeed + '/s')
    }, 1000)

    const startPlayer = () => {
      if (!Streamer.streaminfo.torrent.metadata) return setTimeout(startPlayer, 200)

      Player.play(url, {
        title: $('#details-metadata .title').text() + ($('#details-metadata .ep-title').text() ? ' - ' + $('#details-metadata .ep-title').text() : '')
      }, Details.model)
    }

    Loading.subfails = 0
    Loading.lookForSubtitles({
      filename: Streamer.streaminfo.file_name,
      filesize: Streamer.streaminfo.file_size
    })

    startPlayer()
  },

  lookForSubtitles: (file) => {
    // API often fails: trying X times, every X milliseconds. Last try doesnt use imbdid
    const tries = 5
    const retry = 5000

    let data = JSON.parse($('#details > .container > .data').text())
    if (data.metadata) data = data.metadata
    const type = (data.show && 'show') || (data.movie && 'movie')

    const subopts = {}

    if (file) {
      subopts.query = file.filename
    }

    subopts.type = (type === 'movie') ? 'movie' : 'episode'

    if (type) {
      if (data[type].ids && Loading.subfails <= tries - 1) {
        subopts[(type === 'movie') ? 'imdb_id' : 'parent_imdb_id'] = data[type].ids.imdb
      }

      if (type === 'show') {
        subopts.episode_number = data.next_episode ? data.next_episode.number : data.episode.number
        subopts.season_number = data.next_episode ? data.next_episode.season : data.episode.season
      }
    }

    Subtitles.search(subopts).then(subs => {
      console.info('Found subtitles', subs)

      const locale = DB.sync.get('locale')

      if (Object.keys(subs).length) $('#subtitles').css('visibility', 'visible')
      $('#subtitles .sub').remove()

      // add app language first
      if (subs[locale]) Subtitles.addSubtitles(subs[locale], locale)

      // then the other langs
      for (const lang in subs) {
        if (locale === lang) continue
        Subtitles.addSubtitles(subs[lang], lang)
      }
    }).catch(error => {
      Loading.subfails++

      if (Loading.subfails >= tries) {
        console.error('Subtitles.search() failed %d times -', Loading.subfails, error)
        return
      }

      setTimeout(() => {
        console.info('Subtitles.search() - retry (n°%d)', Loading.subfails + 1)
        Loading.lookForSubtitles(file)
      }, retry)
    })
  },

  close: () => {
    clearInterval(Loading.update)
    Loading.update = null
    Streamer.stop()

    $('#details-sources').show()
    $('#details-loading').hide()

    // clean states
    $('#streaminfo .status span').text('')
    $('#streaminfo .remaining span').text('')
    $('#streaminfo .peers span').text('')
    $('#streaminfo .download span').text('')
    $('#streaminfo .upload span').text('')
  }
}
