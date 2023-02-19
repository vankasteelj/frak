'use strict'

const Details = {
  default: undefined,
  model: undefined,
  from: undefined,
  previous: {
    id: undefined,
    html: undefined
  },

  getData: (elm) => {
    // extract json from data div
    const $elm = $(elm)[0]
    const id = ($elm.offsetParent && $elm.offsetParent.id) || $elm.id
    const data = JSON.parse($(`#${id}`).find('.data').text())

    return data
  },

  loadImage: (url, type) => {
    Items.getImage(url).then(img => {
      if (!img) return

      if (type === 'poster') {
        $('#details .poster').css('background-image', `url('${img}')`)
      } else {
        $('#details .background').css('background-image', `url('${img}')`).css('opacity', 0.7)
      }
    })
  },

  loadDetails: (d, from = 'collection') => {
    Details.from = from
    Details.fromScroll = window.scrollY

    if (d.id === Details.previous.id && Player.mpv.isRunning()) {
      console.info('Returning to previous details window')
      $('#details').html(Details.previous.html).show()
      $(`#${Details.from}`).hide()
      $('#playing').hide()

      if (Player.mpv.isRunning() || Streamer.client) {
        $('#details-sources').hide()
        $('#details-loading').show()
      }

      return
    } else { // reset
      if (Details.previous.id && !Player.mpv.isRunning()) {
        console.info('Reset previous details')
        Details.previous = {
          id: undefined,
          html: undefined
        }
      }
      $('#details').html(Details.default)
      Boot.setupRightClicks('#query')
      Details.model = d.data
      $('#playing').hide()
    }

    $('#details').find('.id').text(d.id)
    $('#details').find('.data').text(JSON.stringify(d.data))

    if (d.ids) {
      d.ids.imdb && $('#details-metadata .ids .imdb').text(d.ids.imdb)
      d.ids.trakt && $('#details-metadata .ids .trakt').text(d.ids.trakt)
      d.ids.tmdb && $('#details-metadata .ids .tmdb').text(d.ids.tmdb)
      d.ids.tvdb && $('#details-metadata .ids .tvdb').text(d.ids.tvdb)
    }

    $('#details-metadata .title').text(d.title)

    if (d.title.length > 40) {
      $('#details-metadata .title').css('font-size', `${d.title.length > 50 ? 40 : 35}px`)
    }

    d['ep-title'] ? $('#details-metadata .ep-title').show().text(d['ep-title']) : $('#details-metadata .ep-title').hide()
    d.trailer ? $('#details-metadata .trailer').attr('onClick', `Interface.playTrailer('${d.trailer}')`) : $('#details-metadata .trailer').hide()

    d.year ? $('#details-metadata .year').text(d.year).show() : $('#details-metadata .year').hide()
    d.runtime ? $('#details-metadata .runtime').text(`${d.runtime} ${i18n.__('min')}`).show() : $('#details-metadata .runtime').hide()
    d.network ? $('#details-metadata .network').text(`${d.network}`).show() : $('#details-metadata .network').hide()
    d.country ? $('#details-metadata .fi').addClass(`fi-${d.country}`).attr('title', `${countryList[d.country.toUpperCase()]}`).show() : $('#details-metadata .country').hide()
    $('#details-metadata .rating').text(`${d.rating || 0} / 10`).show()

    if (d.genres) {
      const genre = []
      for (const g of d.genres) {
        genre.push(i18n.__(Misc.capitalize(g)))
      }
      $('#details-metadata .genres').show().text(genre.join(' / '))
    } else {
      $('#details-metadata .genres').hide()
    }

    // rate
    DB.trakt._get('traktratings').then(traktratings => {
      traktrating = traktratings.find((i) => i[i.type].ids.slug === d.ids.slug)
      traktrating && $('#details .corner-rating span').text(traktrating.rating).parent().show()
      $('#details-metadata .rating').attr('onClick', `Details.rate('${d.ids.slug}')`).css('cursor', 'pointer')
    })

    // search online & overview translation
    const type = ((d.data.show || (d.data.metadata && d.data.metadata.show)) && 'show') || ((d.data.movie || (d.data.metadata && d.data.metadata.movie)) && 'movie')

    if (DB.app.get('translateOverviews') && DB.app.get('locale') !== 'en') {
      Trakt.client[type + 's'].translations({ id: d.ids.trakt, language: DB.app.get('locale') }).then((r) => {
        if (r && r[0] && r[0].overview) {
          $('#details-metadata .synopsis').text(r[0].overview)
        } else {
          $('#details-metadata .synopsis').text(d.synopsis === 'No overview found.' ? i18n.__('No synopsis available') : (d.synopsis || i18n.__('No synopsis available')))
        }

        if (r && r[0] && r[0].title) $('#details .titles .title').attr('title', i18n.__('Translated title:') + ' ' + r[0].title)
      }).catch(err => {
        console.error(err)
        $('#details-metadata .synopsis').text(d.synopsis === 'No overview found.' ? i18n.__('No synopsis available') : (d.synopsis || i18n.__('No synopsis available')))
      })
    } else {
      $('#details-metadata .synopsis').text(d.synopsis === 'No overview found.' ? i18n.__('No synopsis available') : (d.synopsis || i18n.__('No synopsis available')))
    }

    if (Object.keys(Plugins.loaded).length && type && from !== 'locals') {
      let keywords = d.data[type].title

      if (d.data.show) {
        const s = Misc.pad(d.data.next_episode.season)
        const e = Misc.pad(d.data.next_episode.number)
        keywords += ` s${s}e${e}`
      }

      keywords = Misc.latinize(keywords)
        .replace('\'', '')
        .replace(/\W/ig, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase()

      $('#query').val(keywords)
      $('#query').on('keypress', (e) => {
        if (e.which === 13) $('#details-sources .query .search').trigger('click')
      })
      $('#details-sources .query .search').trigger('click')
      $('#details-sources .query').show()
    }

    $('#details').show()
    $(`#${Details.from}`).hide()
  },

  closeDetails: () => {
    if (Player.mpv.isRunning() && Details.previous.id === undefined) {
      Details.previous.id = $('#details .id').text()
      Details.previous.html = $('#details').html()
    }

    if (Details.previous.id) {
      const nav = $('#navbar .nav.active').attr('class')
      $('#playing').show().off('click').on('click', () => {
        if (Details.from !== 'discover') $(`#navbar .${nav.split(' ')[1]}`).trigger('click')

        $(`#${Details.previous.id}`).trigger('click')
        $(`#${Details.previous.id} .play`).trigger('click')
      })
    }

    $(`#${Details.from}`).show()
    window.scrollTo(0, (Details.fromScroll || 0))
    $('#details').hide()
  },

  local: {
    movie: (elm) => {
      const file = Details.getData(elm)

      Details.loadDetails({
        id: file.metadata.movie.ids.slug,
        data: file,
        ids: file.metadata.movie.ids,
        title: file.metadata.movie.title,
        synopsis: file.metadata.movie.overview,
        year: file.metadata.movie.year,
        rating: parseFloat(file.metadata.movie.rating).toFixed(1),
        runtime: file.metadata.movie.runtime,
        country: file.metadata.movie.country,
        genres: file.metadata.movie.genres,
        trailer: file.metadata.movie.trailer
      }, 'locals')

      Images.get.movie(file.metadata.movie.ids).then(images => {
        Details.loadImage((images.fanart || images.poster), 'fanart')
        Details.loadImage((images.poster || images.fanart), 'poster')
      })

      Search.addLocal(file)
    },

    episode: (elm) => {
      event && event.stopPropagation() // because of season.onClick...

      const file = Details.getData(elm)

      Details.loadDetails({
        id: file.metadata.show.ids.slug,
        data: file,
        ids: file.metadata.show.ids,
        title: file.metadata.show.title,
        'ep-title': `S${Misc.pad(file.metadata.episode.season)}E${Misc.pad(file.metadata.episode.number)}` + (file.metadata.episode.title ? ` - ${file.metadata.episode.title}` : ''),
        synopsis: file.metadata.show.overview,
        year: file.metadata.show.year,
        rating: parseFloat(file.metadata.show.rating).toFixed(1),
        runtime: file.metadata.show.runtime,
        network: file.metadata.show.network,
        country: file.metadata.show.country,
        genres: file.metadata.show.genres,
        trailer: file.metadata.show.trailer
      }, 'locals')

      Images.get.show(file.metadata.show.ids).then(images => {
        Details.loadImage((images.fanart || images.poster), 'fanart')
        Details.loadImage((images.poster || images.fanart), 'poster')
      })

      Search.addLocal(file)
    },

    unmatched: (elm) => {
      const file = Details.getData(elm)

      // reset the details view;
      $('#details').html(Details.default)
      $('#playing').hide()
      Details.model = undefined
      Details.previous = {
        id: undefined,
        html: undefined
      }
      Boot.setupRightClicks('#query')

      Details.closeRemote().then(() => {
        if (file.source) {
          Network.getFileFromPeer(file).then(url => {
            Player.play(url)
          })
        } else {
          Player.play(file.path)
        }
      })
    }
  },

  trakt: {
    movie: (elm, from) => {
      const item = Details.getData(elm)

      Details.loadDetails({
        id: item.movie.ids.slug,
        data: item,
        ids: item.movie.ids,
        title: item.movie.title,
        synopsis: item.movie.overview,
        year: item.movie.year,
        rating: parseFloat(item.movie.rating).toFixed(1),
        runtime: item.movie.runtime,
        country: item.movie.country,
        genres: item.movie.genres,
        trailer: item.movie.trailer
      }, from)

      Details.loadImage((IB.get(item.movie.ids).fanart || IB.get(item.movie.ids).poster), 'fanart')
      Details.loadImage((IB.get(item.movie.ids).poster || IB.get(item.movie.ids).fanart), 'poster')

      const offline = Search.offline(item)
      if (offline) {
        console.info('Found match in local library', offline)
        Search.addLocal(offline)
      }
    },

    episode: (elm, from) => {
      const item = Details.getData(elm)

      Details.loadDetails({
        id: item.show.ids.slug,
        data: item,
        ids: item.show.ids,
        title: item.show.title,
        'ep-title': `S${Misc.pad(item.next_episode.season)}E${Misc.pad(item.next_episode.number)}` + (item.next_episode.title ? ` - ${item.next_episode.title}` : ''),
        synopsis: item.show.overview,
        year: item.show.year,
        rating: parseFloat(item.show.rating).toFixed(1),
        runtime: item.show.runtime,
        network: item.show.network,
        country: item.show.country,
        genres: item.show.genres,
        trailer: item.show.trailer
      }, from)

      Details.loadImage((IB.get(item.show.ids).fanart || IB.get(item.show.ids).poster), 'fanart')
      Details.loadImage((IB.get(item.show.ids).poster || IB.get(item.show.ids).fanart), 'poster')

      const offline = Search.offline(item)
      if (offline) {
        console.info('Found match in local library', offline)
        Search.addLocal(offline)
      }
    }
  },

  loadLocal: (elm) => {
    Details.closeRemote().then(() => {
      const file = Details.getData(elm)

      Loading.local(file)
      $('#details-loading').show()
      $('#details-sources').hide()
      Details.handleCast()
    })
  },

  loadShared: (elm) => {
    Details.closeRemote().then(() => {
      const file = Details.getData(elm)

      Loading.shared(file)
      $('#details-loading').show()
      $('#details-sources').hide()
      Details.handleCast()
    })
  },

  loadVideo: (file) => {
    Details.closeRemote().then(() => {
      const data = {
        path: path.normalize(file),
        filename: path.basename(file)
      }
      Loading.local(data)
      $('#details-loading').show()
      $('#details-sources').hide()
      Details.handleCast()
    })
  },

  loadRemote: (magnet) => {
    $('#details-spinner').show()
    $('#details-sources').hide()

    Details.closeRemote().then(() => {
      return Streamer.start(magnet).then(url => {
        Loading.remote(url)
        $('#details-loading').show()
        $('#details-sources').hide()
        $('#details-spinner').hide()
        Details.handleCast()
      })
    }).catch((err) => {
      console.error(err)
      Notify.snack(err.message)
      $('#details-spinner').hide()
      $('#details-sources').show()
    })
  },

  closeRemote: () => {
    let timeout = 0
    return new Promise(resolve => {
      if (Player.mpv.isRunning()) {
        Player.quit()
        timeout = 300
      }
      if (Streamer.client) {
        clearInterval(Loading.update)
        Loading.update = null
        Streamer.stop()
        timeout = 300
      }

      setTimeout(() => {
        resolve()
      }, timeout)
    })
  },

  loadNext: (fromDetails) => {
    const $nextEpisode = $(`#collection #${Details.model.show.ids.slug}`)

    if (!$nextEpisode.length) {
      if (fromDetails) {
        setTimeout(() => {
          $('#details-sources').show()
          $('#details-loading').hide()
          $('#details-spinner').hide()
        }, 50)
      } else {
        Details.closeDetails()
      }
      return
    }

    const data = JSON.parse($nextEpisode.find('.data').text())
    console.info('Next episode is ready', data)

    $('#details-sources').hide()
    $('#details-loading').hide()
    $('#details-spinner').hide()
    $('#details-next').show()

    $('#details-next .content .next-title span').text(`S${Misc.pad(data.next_episode.season)}E${Misc.pad(data.next_episode.number)}` + (data.next_episode.title ? ` - ${data.next_episode.title}` : ''))

    $('#playnext').on('click', () => {
      Details.closeDetails()
      $nextEpisode.find('.play').trigger('click')
    })
  },

  loadLocalNext: (fromDetails) => {
    const collection = DB.app.get('local_shows')

    const findShow = (title) => collection.find((show) => show.metadata.show.title === title)
    const show = findShow(Details.model.metadata.show.title)

    const s = Details.model.metadata.episode.season
    const e = Details.model.metadata.episode.number

    const findNext = (s, e) => {
      const season = show.seasons[s]
      const episode = season && season.episodes[e]

      return episode && episode.path
    }
    const next = findNext(s, e + 1) || findNext(s, e + 2) || findNext(s + 1, 1)

    if (next) {
      const $nextEpisode = $(`#locals #${Misc.slugify(next)}`)

      if (!$nextEpisode.length) {
        if (fromDetails) {
          setTimeout(() => {
            $('#details-sources').show()
            $('#details-loading').hide()
            $('#details-spinner').hide()
          }, 50)
        } else {
          Details.closeDetails()
        }
        return
      }

      const data = JSON.parse($nextEpisode.find('.data').text())
      console.info('Next episode is ready', data)

      $('#details-next .content .next-title span').text(`S${Misc.pad(data.metadata.episode.season)}E${Misc.pad(data.metadata.episode.number)}` + (data.metadata.episode.title ? ` - ${data.metadata.episode.title}` : ''))
      setTimeout(() => {
        $('#details-sources').hide()
        $('#details-loading').hide()
        $('#details-spinner').hide()
        $('#details-next').show()
      }, 50)

      $('#playnext').on('click', () => {
        Details.closeDetails()
        $nextEpisode.trigger('click')
      })
    }
  },

  rate: (slug) => {
    const $this = $('#details .rating')
    $('.popover').remove()

    if (!$this.attr('initialized')) {
      const isRated = $('#details .corner-rating span').text()

      let content = ''

      const ratings = ['Weak Sauce :(', 'Terrible', 'Bad', 'Poor', 'Meh', 'Fair', 'Good', 'Great', 'Superb', 'Totally Ninja!']

      for (let i = 10; i > 0; i--) {
        const id = 'rating-' + i + '-' + Date.now()

        content += `<input id="${id}" type="radio" class="rating-${i}" name="rating" value="${i}" ${isRated === i.toString() ? 'checked=1' : ''}/>` +
                    `<label for="${id}" title="" class="rating-${i}">${i}</label>`
      }

      $this.popover({
        placement: 'bottom',
        trigger: 'focus',
        html: true
      }).on('shown.bs.popover', () => {
        setTimeout(() => {
          document.getElementsByClassName('popover-content')[0].innerHTML = '<div class="rating-hearts">' + content + '</div>'

          $('.popover').find('label').off('mouseover').on('mouseover', function () {
            const t = $('#' + $(this).attr('for'))
            const e = t.val()
            $('.popover-title').html(isRated === e ? i18n.__('Unrate this') : `<b>${e}</b> &mdash; ${i18n.__(ratings[e - 1])}`)
          }).off('mouseleave').on('mouseleave', () => {
            $('.popover-title').text($this.data('original-title'))
          }).off('click').on('click', function (e) {
            e.preventDefault()

            const t = $('#' + $(this).attr('for'))
            const score = t.val()

            const item = Details.from === 'locals' ? Details.model.metadata : JSON.parse($(`#${slug}`).find('.data').text())

            if (isRated === score) {
              Trakt.rate('remove', item)
            } else {
              Trakt.rate('add', item, score)
            }

            $this.removeAttr('initialized')
            $this.popover('destroy')
          })
        }, 0)
      })

      $this.attr('initialized', 1)
    }

    $this.popover('toggle')
  },

  markAsWatched: () => {
    const base = Details.model.metadata || Details.model
    let type, model

    if (base.movie) {
      type = 'movies'
      model = base.movie
    } else {
      type = 'episodes'
      model = base.episode || base.next_episode
    }

    const post = {}
    const item = {
      watched_at: new Date().toISOString(),
      ids: model.ids
    }
    post[type] = [item]

    console.info('Mark as watched:', base.movie ? model.ids.slug : `${base.show.ids.slug} ${model.season}x${model.number}`)
    Details.buttonAsWatched()

    return new Promise((resolve) => {
      if (model.ids) {
        return resolve()
      } else {
        console.log('Details.markAsWatched: Couldnt find the appropriate ID, looking up online')
        return Trakt.client.episodes.summary({ id: base.show.ids.slug, season: model.season, episode: model.number }).then(summary => {
          item.ids = summary.ids
          post[type] = [item]
          return resolve()
        })
      }
    }).then(() => {
      Trakt.client.sync.history.add(post)
    }).finally(() => {
      if (type === 'episodes') {
        setTimeout(() => {
          $('#details-sources').hide()
          $('#details-loading').hide()
          $('#details-spinner').show()
        }, 50)

        // display spinner on list
        model.show && $(`#collection #${model.show.ids.slug}`).append('<div class="item-spinner"><div class="fa fa-spin fa-refresh"></div>')

        Misc.sleep(800).then(() => {
          return WB.markAsWatched(base)
        }).then(() => {
          if (model.ids) {
            return Trakt.reload(true, type, base.show.ids.slug)
          } else {
            return Trakt.reload()
          }            
        }).then(collections => {
          base.episode ? Details.loadLocalNext(true) : Details.loadNext(true)
        })
      } else {
        $(`#collection #${model.ids.slug}`).hide()
        WB.markAsWatched(base)
      }
    })
  },

  buttonAsWatched: () => {
    $('#details .md-buttons .watched').addClass('selected').attr('title', i18n.__('Use the History tab to mark as unwatched')).removeAttr('onclick')
    $('#details .md-buttons .watched i18n').text(i18n.__('Marked as seen'))
  },

  openTraktPage: () => {
    const base = Details.model.metadata || Details.model

    if (base.movie) {
      Misc.openExternal(`https://trakt.tv/movies/${base.movie.ids.slug}`)
    } else {
      const episode = base.episode || base.next_episode
      Misc.openExternal(`https://trakt.tv/shows/${base.show.ids.slug}/seasons/${episode.season}/episodes/${episode.number}`)
    }
  },

  keepWatchingOn: (peer) => {
    if (!peer.cast_allowed) {
      $('#keepWatching .message').text(i18n.__('%s has disabled %s', peer.name, i18n.__('Direct playback sharing'))).css('color', '#933')
      $('#keepWatching .casting .logo').removeClass('fa-feed').addClass('fa-warning')
      $('#keepWatching .casting').show()
      $('#keepWatching .selector').hide()
      return
    }

    $('#keepWatching .message').text(i18n.__('Currently casting to %s', peer.name))
    $('#keepWatching .ip').text(peer.ip)
    $('#keepWatching .casting').show()
    $('#keepWatching .selector').hide()

    Player.mpv.getProperty('percent-pos').then(position => {
      const data = {
        playback: true,
        position: position
      }
      if (Details.from === 'locals') { // send a playback request
        data.file = Details.model
        data.file.source = DB.app.get('localip')
      } else { // send a link directly
        data.url = Streamer.streaminfo.url.replace('127.0.0.1', DB.app.get('localip'))
      }

      const $sub = $('.sub.active .data').text()
      if ($sub) data.subtitle = JSON.parse($sub)

      got(`http://${peer.ip}`, {
        method: 'POST',
        port: Network.port,
        body: JSON.stringify(data),
        headers: Network.headers
      })
    })
  },

  keepWatchingPopup: () => {
    Player.mpv.pause()

    // clear popup
    $('#keepWatching .selector .list').html('')
    $('#keepWatching .casting .logo').removeClass('fa-warning').addClass('fa-feed')
    $('#keepWatching .casting').hide()
    $('#keepWatching .selector').show()

    for (const i in Network.peers) {
      const item = `<div class="peer" onClick="Details.keepWatchingOn(Network.peers[${i}])">` +
                `<span class="name">${Network.peers[i].name}</span>` +
                `<span class="ip">${Network.peers[i].ip}</span>` +
                `${Network.peers[i].cast_allowed ? '' : '<span class="castingdisallowed">(' + i18n.__('casting disabled') + ')</span>'}` +
            '</div>'
      $('#keepWatching .selector .list').append(item)
    }
    $('#keepWatching').show()
  },

  closeKeepWatchingPopup: () => {
    $('#keepWatching').hide()
  },

  handleCast: () => {
    // peer casting
    if (DB.app.get('localsharing') && DB.app.get('localplayback') && Network.peers.length) {
      $('#cast .peers').show()
    }
  },

  openFileSelector: (files) => {
    return new Promise((resolve, reject) => {
      $('#fileSelector .selector .list').html('')

      for (const i in files) {
        const item = `<div class="item" id="${files[i].index}">` +
                    `<span class="name">${files[i].name}</span>` +
                '</div>'
        $('#fileSelector .selector .list').append(item)
        $(`#${files[i].index}`).on('click', () => {
          resolve(files[i].index)
          $('#fileSelector').hide()
        })
      }
      $('#fileSelector').show()
    })
  },
  closeFileSelector: () => {
    $('#fileSelector').hide()
    $('#details-spinner').hide()
    $('#details-sources').show()
    Streamer.stop()
  }
}
