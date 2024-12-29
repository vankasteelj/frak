'use strict'

const Items = {
  getImage: (url, ids, type, route) => {
    if (!url && !ids && !type && !route) return Promise.resolve(false)

    if (!url) {
      return Images.get[type](ids).then(images => {
        if (images && images[route]) {
          return Items.getImage(images[route])
        } else if (images && (images.poster || images.fanart)) {
          return Items.getImage(images.poster || images.fanart)
        } else {
          return false
        }
      })
    }

    return new Promise(resolve => {
      const cache = new Image()
      cache.onload = () => resolve(url)
      cache.onerror = (e) => {
        if (ids) IB.remove(ids)
        resolve(false)
      }
      cache.src = url
    })
  },
  redownloadImage: (id, url, ids, type, route) => {
    IB.remove(ids).then(() => {
      return Items.getImage(null, ids, type, route)
    }).then((img) => {
      img && $(`#${id} .fanart`).css('background-image', `url('${img}')`) && $(`#${id} .fanart img`).css('opacity', '0')
      console.log('Image re-downloaded for %s', id)
    })
  },

  constructMovie: (movie) => {
    // detect if in custom list
    let existing = -1
    try {
      existing = Collection.customsbank.indexOf(movie.movie.ids.slug)
    } catch (e) {}

    const d = {
      id: movie.movie.ids.slug,
      data: JSON.stringify(movie),
      rating: Misc.percentage(movie.movie.rating),
      size: DB.sync.get('small_items') ? Settings.grid.mainSmall : Settings.grid.mainNormal
    }

    const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg}" id="${d.id}">` +
                `<span class="data">${d.data}</span>` +
                '<div class="fanart">' +
                    `<div class="exists-elsewhere fa fa-tags ${existing !== -1 && DB.sync.get('use_customs') ? 'active' : ''}" title="${i18n.__('Also present in Custom list')}"></div>` +
                    '<div class="corner-rating"><span></span></div>' +
                    '<img class="base" src="images/placeholder.png" loading="lazy">' +
                    '<div class="shadow"></div>' +
                    '<div class="titles">' +
                        `<h3>${movie.movie.title}<span class="year">${movie.movie.year || ''}</span></h3>` +
                    '</div>' +
                '</div>' +
                '<div class="quick-icons">' +
                    '<div class="actions">' +
                        `<div class="watched trakt-icon-check-thick" title="${i18n.__('Mark as watched')}" onClick="Items.markAsWatched(this)"></div>` +
                        (movie.movie.trailer ? `<div class="trailer fa fa-youtube-play" title="${i18n.__('Watch trailer')}" onClick="Interface.playTrailer('${movie.movie.trailer}')"></div>` : '') +
                        `<div class="play trakt-icon-play2-thick" title="${i18n.__('Play now')}" onClick="Details.trakt.movie(this)"></div>` +
                    '</div>' +
                    '<div class="metadata">' +
                        `<div class="percentage" title="${i18n.__('Rate this')}" onClick="Items.rate('${d.id}')">` +
                        '<div class="fa fa-heart"></div>' +
                        `${d.rating}&nbsp%` +
                    '</div>' +
                '</div>' +
            '</div>'

    let image
    IB.get(movie.movie.ids).then(cached => {
      image = cached.fanart || cached.poster
      return Items.getImage(image, movie.movie.ids, 'movie', 'fanart')
    }).then((img) => {
      img && $(`#${d.id} .fanart`).css('background-image', `url('${img}')`) && $(`#${d.id} .fanart img`).css('opacity', '0')

      // right click menu
      const labels = {}
      const id = d.id
      labels['Play now'] = () => $(`#${id} .play`).click()
      movie.movie.trailer && (labels['Watch trailer'] = () => $(`#${id} .trailer`).click())
      labels['Mark as watched'] = () => $(`#${id} .watched`).click()
      DB.sync.get('use_customs') && (labels['Add to custom list'] = () => Items.addToCustom($(`#${id}`)))
      labels.separator = true
      labels['Open on Trakt.tv'] = () => Misc.openExternal(`https://trakt.tv/movies/${movie.movie.ids.slug}`)
      labels['Redownload image'] = () => Items.redownloadImage(id, image, movie.movie.ids, 'movie', 'fanart')
      labels['Remove from watchlist'] = () => Trakt.client.sync.watchlist.remove({
        movies: [movie.movie]
      }).then(() => $(`#${id}`).remove()).then(() => Collection.hiddenItems.add(movie.movie.ids.slug)).catch(console.error)
      labels.submenu = {
        title: 'Hide for...',
        labels: {
          '7 days': () => Collection.hiddenMovies.add(movie.movie.ids.slug, (Date.now() + (7 * 24 * 60 * 60 * 1000))) && $(`#${id}`).remove(),
          '30 days': () => Collection.hiddenMovies.add(movie.movie.ids.slug, (Date.now() + (30 * 24 * 60 * 60 * 1000))) && $(`#${id}`).remove()
        }
      }
      $(`#${id} .fanart`).off('contextmenu').on('contextmenu', (e) => {
        const menu = Misc.customContextMenu(labels)
        menu.popup(parseInt(e.clientX), parseInt(e.clientY))
      })
    })

    return item
  },
  constructShow: (show) => {
    // detect if in custom list
    let existing = -1
    try {
      existing = Collection.customsbank.indexOf(show.show.ids.slug)
    } catch (e) {}

    const d = {
      id: show.show.ids.slug,
      sxe: `s${Misc.pad(show.next_episode.season)}e${Misc.pad(show.next_episode.number)}`,
      data: JSON.stringify(show),
      rating: Misc.percentage(show.show.rating),
      size: DB.sync.get('small_items') ? Settings.grid.mainSmall : Settings.grid.mainNormal
    }

    const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg}" id="${d.id}">` +
                `<span class="data">${d.data}</span>` +
                '<div class="fanart">' +
                    `<div class="exists-elsewhere fa fa-tags ${existing !== -1 && DB.sync.get('use_customs') ? 'active' : ''}" title="${i18n.__('Also present in Custom list')}"></div>` +
                    '<div class="corner-rating"><span></span></div>' +
                    '<img class="base" src="images/placeholder.png" loading="lazy">' +
                    '<div class="shadow"></div>' +
                    '<div class="titles">' +
                        '<h4>' +
                            `<span class="sxe">${d.sxe}</span>` +
                            `<span class="unseen" title="${i18n.__('This episode and %s other(s) left to watch', show.unseen - 1)}">+${show.unseen - 1}</span>` +
                            `<span class="ep-title">${show.next_episode.title || ''}</span>` +
                        '</h4><br>' +
                        `<h3>${show.show.title}<span class="year">${show.show.year || ''}</span></h3>` +
                    '</div>' +
                '</div>' +
                '<div class="quick-icons">' +
                    '<div class="actions">' +
                        `<div class="watched trakt-icon-check-thick" title="${i18n.__('Mark as watched')}" onClick="Items.markAsWatched(this)"></div>` +
                        (show.show.trailer ? `<div class="trailer fa fa-youtube-play" title="${i18n.__('Watch trailer')}" onClick="Interface.playTrailer('${show.show.trailer}')"></div>` : '') +
                        `<div class="play trakt-icon-play2-thick" title="${i18n.__('Play now')}" onClick="Details.trakt.episode(this)"></div>` +
                    '</div>' +
                    '<div class="metadata">' +
                        `<div class="percentage" title="${i18n.__('Rate this')}" onClick="Items.rate('${d.id}')">` +
                        '<div class="fa fa-heart"></div>' +
                        `${d.rating}&nbsp;%` +
                    '</div>' +
                '</div>' +
            '</div>'

    let image
    IB.get(show.show.ids).then(cached => {
      image = cached.fanart || cached.poster
      return Items.getImage(image, show.show.ids, 'show', 'fanart')
    }).then(img => {
      img && $(`#${d.id} .fanart`).css('background-image', `url('${img}')`) && $(`#${d.id} .fanart img`).css('opacity', '0')
      if (show.unseen - 1 > 0) $(`#${d.id} .unseen`).show()

      // right click menu
      const labels = {}
      const id = d.id
      labels['Play now'] = () => $(`#${id} .play`).click()
      show.show.trailer && (labels['Watch trailer'] = () => $(`#${id} .trailer`).click())
      labels['Mark as watched'] = () => $(`#${id} .watched`).click()
      DB.sync.get('use_customs') && (labels['Add to custom list'] = () => Items.addToCustom($(`#${id}`)))
      labels.separator = true
      if (show.next_episode.number === 1 && show.next_episode.season === 1) {
        labels['Open on Trakt.tv'] = () => Misc.openExternal(`https://trakt.tv/shows/${show.show.ids.slug}`)
        labels['Redownload image'] = () => Items.redownloadImage(id, image, show.show.ids, 'show', 'fanart')
        labels['Remove from watchlist'] = () => Trakt.client.sync.watchlist.remove({
          shows: [show.show]
        }).then(() => $(`#${id}`).remove()).then(() => Collection.hiddenItems.add(show.show.ids.slug)).catch(console.error)
      } else {
        labels['Open on Trakt.tv'] = () => Misc.openExternal(`https://trakt.tv/shows/${show.show.ids.slug}/seasons/${show.next_episode.season}/episodes/${show.next_episode.number}`)
        labels['Redownload image'] = () => Items.redownloadImage(id, image, show.show.ids, 'show', 'fanart')
        labels['Hide this show'] = () => Trakt.client.users.hidden.add({
          section: 'progress_watched',
          shows: [show.show]
        }).then(() => $(`#${id}`).remove()).then(() => Collection.hiddenItems.add(show.show.ids.slug)).catch(console.error)
      }

      $(`#${id} .fanart`).off('contextmenu').on('contextmenu', (e) => {
        const menu = Misc.customContextMenu(labels)
        menu.popup(parseInt(e.clientX), parseInt(e.clientY))
      })
    })

    return item
  },
  constructCustomMovie: (movie) => {
    // detect if in watchlist
    let existing = -1
    try {
      existing = Collection.moviesbank.indexOf(movie.movie.ids.slug)
    } catch (e) {}

    const d = {
      id: 'custom-' + movie.movie.ids.slug,
      data: JSON.stringify(movie),
      rating: Misc.percentage(movie.movie.rating),
      size: DB.sync.get('small_items') ? Settings.grid.mainSmall : Settings.grid.mainNormal
    }

    const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg}" id="${d.id}">` +
                `<span class="data">${d.data}</span>` +
                '<div class="fanart">' +
                    `<div class="exists-elsewhere fa fa-tags ${existing !== -1 ? 'active' : ''}" title="${i18n.__('Also present in watchlist')}"></div>` +
                    '<div class="corner-rating"><span></span></div>' +
                    '<img class="base" src="images/placeholder.png" loading="lazy">' +
                    '<div class="shadow"></div>' +
                    '<div class="titles">' +
                      '<h4>' +
                        `<span class="sxe">${i18n.__('Movie')}</span>` +
                      '</h4><br>' +
                        `<h3>${movie.movie.title}<span class="year">${movie.movie.year || ''}</span></h3>` +
                    '</div>' +
                '</div>' +
                '<div class="quick-icons">' +
                    '<div class="actions">' +
                        `<div class="remove fa fa-times-circle" title="${i18n.__('Remove from custom list')}" onClick="Items.removeFromCustom(this)"></div>` +
                        (movie.movie.trailer ? `<div class="trailer fa fa-youtube-play" title="${i18n.__('Watch trailer')}" onClick="Interface.playTrailer('${movie.movie.trailer}')"></div>` : '') +
                        `<div class="play trakt-icon-play2-thick" title="${i18n.__('Play now')}" onClick="Details.trakt.movie(this, 'custom')"></div>` +
                    '</div>' +
                    '<div class="metadata">' +
                        `<div class="percentage" title="${i18n.__('Rate this')}" onClick="Items.rate('${d.id}')">` +
                        '<div class="fa fa-heart"></div>' +
                        `${d.rating}&nbsp%` +
                    '</div>' +
                '</div>' +
            '</div>'

    let image
    IB.get(movie.movie.ids).then(cached => {
      image = cached.fanart || cached.poster
      return Items.getImage(image, movie.movie.ids, 'movie', 'fanart')
    }).then((img) => {
      img && $(`#${d.id} .fanart`).css('background-image', `url('${img}')`) && $(`#${d.id} .fanart img`).css('opacity', '0')

      // right click menu
      const labels = {}
      const id = d.id
      labels['Play now'] = () => $(`#${id} .play`).click()
      movie.movie.trailer && (labels['Watch trailer'] = () => $(`#${id} .trailer`).click())
      labels.separator = true
      labels['Remove from custom list'] = () => $(`#${id} .remove`).click()
      labels['Open on Trakt.tv'] = () => Misc.openExternal(`https://trakt.tv/movies/${movie.movie.ids.slug}`)
      labels['Redownload image'] = () => Items.redownloadImage(id, image, movie.movie.ids, 'movie', 'fanart')

      $(`#${id} .fanart`).off('contextmenu').on('contextmenu', (e) => {
        const menu = Misc.customContextMenu(labels)
        menu.popup(parseInt(e.clientX), parseInt(e.clientY))
      })
    })

    return item
  },
  constructCustomShow: (show) => {
    // detect if in watchlist
    let existing = -1
    try {
      existing = Collection.showsbank.indexOf(show.show.ids.slug)
    } catch (e) {}
    if (existing !== -1) {
      show.next_episode = Items.getData($(`#${show.show.ids.slug}`)).next_episode
    } else {
      // inject s01e01 for watch now
      show.next_episode = {
        number: 1,
        season: 1
      }
    }

    const d = {
      id: 'custom-' + show.show.ids.slug,
      data: JSON.stringify(show),
      rating: Misc.percentage(show.show.rating),
      size: DB.sync.get('small_items') ? Settings.grid.mainSmall : Settings.grid.mainNormal
    }

    const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg}" id="${d.id}">` +
                `<span class="data">${d.data}</span>` +
                '<div class="fanart">' +
                    `<div class="exists-elsewhere fa fa-tags ${existing !== -1 ? 'active' : ''}" title="${i18n.__('Also present in watchlist')}"></div>` +
                    '<div class="corner-rating"><span></span></div>' +
                    '<img class="base" src="images/placeholder.png" loading="lazy">' +
                    '<div class="shadow"></div>' +
                    '<div class="titles">' +
                        '<h4>' +
                            `<span class="sxe">${i18n.__('Show')}</span>` +
                        '</h4><br>' +
                        `<h3>${show.show.title}<span class="year">${show.show.year || ''}</span></h3>` +
                    '</div>' +
                '</div>' +
                '<div class="quick-icons">' +
                    '<div class="actions">' +
                        `<div class="remove fa fa-times-circle" title="${i18n.__('Remove from custom list')}" onClick="Items.removeFromCustom(this)"></div>` +
                        (show.show.trailer ? `<div class="trailer fa fa-youtube-play" title="${i18n.__('Watch trailer')}" onClick="Interface.playTrailer('${show.show.trailer}')"></div>` : '') +
                        `<div class="play trakt-icon-play2-thick" title="${i18n.__('Play now')}" onClick="Details.trakt.episode(this, 'custom')"></div>` +
                    '</div>' +
                    '<div class="metadata">' +
                        `<div class="percentage" title="${i18n.__('Rate this')}" onClick="Items.rate('${d.id}')">` +
                        '<div class="fa fa-heart"></div>' +
                        `${d.rating}&nbsp;%` +
                    '</div>' +
                '</div>' +
            '</div>'

    let image
    IB.get(show.show.ids).then(cached => {
      image = cached.fanart || cached.poster
      return Items.getImage(image, show.show.ids, 'show', 'fanart')
    }).then(img => {
      img && $(`#${d.id} .fanart`).css('background-image', `url('${img}')`) && $(`#${d.id} .fanart img`).css('opacity', '0')

      // right click menu
      const labels = {}
      const id = d.id
      labels['Play now'] = () => $(`#${id} .play`).click()
      show.show.trailer && (labels['Watch trailer'] = () => $(`#${id} .trailer`).click())
      labels.separator = true
      labels['Remove from custom list'] = () => $(`#${id} .remove`).click()
      labels['Open on Trakt.tv'] = () => Misc.openExternal(`https://trakt.tv/shows/${show.show.ids.slug}/seasons/${show.next_episode.season}/episodes/${show.next_episode.number}`)
      labels['Redownload image'] = () => Items.redownloadImage(id, image, show.show.ids, 'show', 'fanart')

      $(`#${id} .fanart`).off('contextmenu').on('contextmenu', (e) => {
        const menu = Misc.customContextMenu(labels)
        menu.popup(parseInt(e.clientX), parseInt(e.clientY))
      })
    })

    return item
  },
  constructLocalMovie: (movie) => {
    const d = {
      id: Misc.slugify(movie.path),
      data: JSON.stringify(movie)
    }

    const item = `<div class="local-item" onClick="Details.local.movie(this)" id="${d.id}" title="${movie.filename + ' - ' + Misc.fileSize(movie.size)}">` +
                `<span class="data">${d.data}</span>` +
                `<span class="title">${movie.metadata.movie.title}</span>` +
                (movie.source ? `<span class="peer fa fa-download" title="${i18n.__('Shared by %s', movie.source)}"></span>` : '') +
            '</div>'

    return item
  },
  constructLocalUnmatched: (file) => {
    const d = {
      id: Misc.slugify(file.path),
      data: JSON.stringify(file)
    }

    const item = `<div class="local-item local-context" onClick="Details.local.unmatched(this)" id="${d.id}" title="${file.filename + ' - ' + Misc.fileSize(file.size)}">` +
                `<span class="data">${d.data}</span>` +
                `<span class="title">${file.filename}</span>` +
                (file.source ? `<span class="peer fa fa-download" title="${i18n.__('Shared by %s', file.source)}"></span>` : '') +
            '</div>'

    // right click menu
    const labels = {}
    const id = d.id
    labels['Play now'] = () => $(`#${id}`).click()
    labels['Show in file explorer'] = () => {
      console.info('[File explorer opened] Showing', file.path)
      gui.Shell.showItemInFolder(path.normalize(file.path))
      Notify.snack(i18n.__('Opening the file location'))
    }

    Misc.sleep(100).then(() => {
      $(`#${id}`).off('contextmenu').on('contextmenu', (e) => {
        const menu = Misc.customContextMenu(labels)
        menu.popup(parseInt(e.clientX), parseInt(e.clientY))
      })
    })

    return item
  },
  constructLocalShow: (show) => {
    const d = {
      id: Misc.slugify(show.metadata.show.title) + '-local'
    }

    const seasons = (function () {
      let str = String()

      for (const s in show.seasons) {
        str += `<div class="season s${s}" onClick="Interface.locals.showEpisodes('${d.id}', ${s})"><span class="title">${i18n.__('Season %s', s)}</span>`

        for (const e in show.seasons[s].episodes) {
          const sxe = `S${Misc.pad(s)}E${Misc.pad(e)}`
          const title = show.seasons[s].episodes[e].metadata.episode.title
          const epid = Misc.slugify(show.seasons[s].episodes[e].path)

          // attach show information
          const data = show.seasons[s].episodes[e]
          data.metadata.show = show.metadata.show

          str += `<div class="episode e${e}" onClick="Details.local.episode(this)" id="${epid}" title="${data.filename + ' - ' + Misc.fileSize(data.size)}">` +
                            `<span class="data">${JSON.stringify(data)}</span>` +
                            `<span class="e-title">${title ? sxe + ' - ' + title : sxe}</span>` +
                            (data.source ? `<span class="peer fa fa-download" title="${i18n.__('Shared by %s', data.source)}"></span>` : '') +
                        '</div>'
        }
        str += '</div>'
      }

      return str
    })()

    const item = `<div class="local-item" id="${d.id}" onClick="Interface.locals.showSeasons('${d.id}')">` +
                `<span class="title">${show.metadata.show.title}</span>` +
                `<span class="getHistory fa fa-info-circle" title="${i18n.__('Show last watched episode')}" onClick="Items.getLocalShowHistory(event, '${show.metadata.show.ids.slug}', '${d.id}')"></span>` +
                '<span class="gotHistory"></span>' +
                `<div class="seasons">${seasons}</div>` +
            '</div>'

    return item
  },
  getLocalShowHistory: (e, slug, id) => {
    e = e || window.event
    e.preventDefault()
    e.stopPropagation()

    Trakt.client.shows.progress.watched({ id: slug }).then((watched) => {
      const last = watched.last_watched_at
      if (last) {
        let episode
        for (const i in watched.seasons) {
          for (const ii in watched.seasons[i].episodes) {
            if (watched.seasons[i].episodes[ii].last_watched_at === last) {
              episode = 'S' + Misc.pad(watched.seasons[i].number) + 'E' + Misc.pad(watched.seasons[i].episodes[ii].number)
            }
          }
        }

        const date = new Date(watched.last_watched_at)
        $(`#${id} .gotHistory`).text(i18n.__('Last watched episode was %s on %s', episode, date.toLocaleDateString()))
      } else {
        $(`#${id} .gotHistory`).text(i18n.__('Last watched episode: none'))
      }
    }).catch(console.error)
  },
  constructHistoryShow: (show) => {
    const d = {
      id: show.show.ids.slug,
      sxe: `${show.episode.season}x${Misc.pad(show.episode.number)}`,
      title: show.episode.title || '',
      data: JSON.stringify(show),
      rating: Misc.percentage(show.show.rating),
      size: DB.sync.get('small_items') ? Settings.grid.historySmall : Settings.grid.historyNormal,
      watched_at: (function () {
        const d = new Date(show.watched_at)
        return d.toLocaleDateString() + ' ' + Misc.pad(d.getHours()) + ':' + Misc.pad(d.getMinutes())
      })(),
      watchedId: show.id
    }

    const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg} ${d.id}" id="${d.watchedId}">` +
                `<span class="data">${d.data}</span>` +
                '<div class="fanart">' +
                    '<div class="corner-rating"><span></span></div>' +
                    '<img class="base" src="images/posterholder.png" loading="lazy">' +
                '</div>' +
                '<div class="quick-icons">' +
                    '<div class="actions">' +
                        `<div class="watched trakt-icon-check-thick selected" title="${i18n.__('Mark as unwatched')}" onClick="Items.markAsUnWatched(this)"></div>` +
                    '</div>' +
                    '<div class="metadata">' +
                        `<div class="percentage" title="${i18n.__('Rate this')}" onClick="Items.rate('${d.watchedId}')">` +
                        '<div class="fa fa-heart"></div>' +
                            `${d.rating}&nbsp;%` +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="titles">' +
                    '<div class="title">' +
                        `<span class="sxe">${d.sxe}</span>&nbsp` +
                        `<span title="${show.show.title}">${d.title}</span>` +
                    '</div>' +
                    `<span class="datetime">${d.watched_at}</span>` +
                '</div>' +
            '</div>'

    let image
    IB.get(show.show.ids).then(cached => {
      image = cached.poster || cached.fanart
      return Items.getImage(image, show.show.ids, 'show', 'poster')
    }).then(img => {
      img && $(`#${d.watchedId} .fanart`).css('background-image', `url('${img}')`) && $(`#${d.watchedId} .fanart img`).css('opacity', '0')
    })

    return item
  },
  constructHistoryMovie: (movie) => {
    const d = {
      id: movie.movie.ids.slug,
      title: movie.movie.title,
      data: JSON.stringify(movie),
      rating: Misc.percentage(movie.movie.rating),
      size: DB.sync.get('small_items') ? Settings.grid.historySmall : Settings.grid.historyNormal,
      watched_at: (function () {
        const d = new Date(movie.watched_at)
        return d.toLocaleDateString() + ' ' + Misc.pad(d.getHours()) + ':' + Misc.pad(d.getMinutes())
      })(),
      watchedId: movie.id
    }

    const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg} ${d.id}" id="${d.watchedId}">` +
                `<span class="data">${d.data}</span>` +
                '<div class="fanart">' +
                    '<div class="corner-rating"><span></span></div>' +
                    '<img class="base" src="images/posterholder.png" loading="lazy">' +
                '</div>' +
                '<div class="quick-icons">' +
                    '<div class="actions">' +
                        `<div class="watched trakt-icon-check-thick selected" title="${i18n.__('Mark as unwatched')}" onClick="Items.markAsUnWatched(this)"></div>` +
                    '</div>' +
                    '<div class="metadata">' +
                        `<div class="percentage" title="${i18n.__('Rate this')}" onClick="Items.rate('${d.watchedId}')">` +
                            '<div class="fa fa-heart"></div>' +
                            `${d.rating}&nbsp;%` +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="titles">' +
                    '<div class="title">' +
                        `<span title="${d.title}">${d.title}</span>` +
                    '</div>' +
                    `<span class="datetime">${d.watched_at}</span>` +
                '</div>' +
            '</div>'

    let image
    IB.get(movie.movie.ids).then(cached => {
      image = cached.poster || cached.fanart
      return Items.getImage(image, movie.movie.ids, 'movie', 'poster')
    }).then(img => {
      img && $(`#${d.watchedId} .fanart`).css('background-image', `url('${img}')`) && $(`#${d.watchedId} .fanart img`).css('opacity', '0')
    })

    return item
  },
  constructHistoryMore: () => {
    const d = {
      size: DB.sync.get('small_items') ? Settings.grid.historySmall : Settings.grid.historyNormal
    }

    const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg}" id="showMore">` +
                '<div class="showMore_button" onClick="Collection.get.historyMore()">' +
                    '<div class="fa fa-search-plus"></div>' +
                    `<div class="showMore_text">${i18n.__('Show more')}</div>` +
                '</div>' +
            '</div>'

    return item
  },
  constructRatingsItem: (data) => {
    const type = data.movie ? 'movie' : 'show'
    const d = {
      id: data[type].ids.slug,
      title: data[type].title,
      data: JSON.stringify(data),
      rating: Misc.percentage(data[type].rating),
      size: DB.sync.get('small_items') ? Settings.grid.historySmall : Settings.grid.historyNormal,
      rated_at: (function () {
        const d = new Date(data.rated_at)
        return d.toLocaleDateString() + ' ' + Misc.pad(d.getHours()) + ':' + Misc.pad(d.getMinutes())
      })(),
      ratedId: data[type].ids.slug + '-rating'
    }

    const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg} ${d.id}" id="${d.ratedId}">` +
                `<span class="data">${d.data}</span>` +
                '<div class="fanart">' +
                    '<div class="corner-rating"><span></span></div>' +
                    '<img class="base" src="images/posterholder.png">' +
                '</div>' +
                '<div class="quick-icons">' +
                    '<div class="metadata">' +
                        `<div class="percentage" title="${i18n.__('Rate this')}" onClick="Items.rate('${d.ratedId}')">` +
                        '<div class="fa fa-heart"></div>' +
                            `${d.rating}&nbsp;%` +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="titles">' +
                    '<div class="title">' +
                        `<span title="${d.title}">${d.title}</span>` +
                    '</div>' +
                    `<span class="datetime">${d.rated_at}</span>` +
                '</div>' +
            '</div>'

    let image
    IB.get(data[type].ids).then(cached => {
      image = cached.poster || cached.fanart
      return Items.getImage(image, data[type].ids, type, 'poster')
    }).then(img => {
      img && $(`#${d.ratedId} .fanart`).css('background-image', `url('${img}')`) && $(`#${d.ratedId} .fanart img`).css('opacity', '0')

      // right click menu
      const labels = {}
      labels['Open on Trakt.tv'] = () => Misc.openExternal(`https://trakt.tv/${type}s/${d.id}`)
      const menu = Misc.customContextMenu(labels)
      $(`#ratings #${d.ratedId} .fanart`).off('contextmenu').on('contextmenu', (e) => menu.popup(parseInt(e.clientX), parseInt(e.clientY)))
    })

    return item
  },
  constructRatingsMore: () => {
    const d = {
      size: DB.sync.get('small_items') ? Settings.grid.historySmall : Settings.grid.historyNormal
    }

    const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg}" id="showMore">` +
                '<div class="showMore_button" onClick="Ratings.loadMore()">' +
                    '<div class="fa fa-search-plus"></div>' +
                    `<div class="showMore_text">${i18n.__('Show more')}</div>` +
                '</div>' +
            '</div>'

    return item
  },
  constructDiscoverShow: (show) => {
    // standardize output
    if (!show.show) {
      show = {
        show: show
      }
    }

    // inject s01e01 for watch now
    show.next_episode = {
      number: 1,
      season: 1
    }

    return Promise.all([
      WB.find.show(show.show.ids.slug),
      DB.trakt.get('traktshowscollection')
    ]).then(([watched, traktshowscollection]) => {
      const d = {
        id: show.show.ids.slug,
        key: (function () {
          if (show.watchers) return i18n.__('%s people watching', Misc.numberWithCommas(show.watchers))
          if (show.list_count) return i18n.__('Present in %s lists', Misc.numberWithCommas(show.list_count))
          if (show.watcher_count) return i18n.__('Played by %s people', Misc.numberWithCommas(show.watcher_count))

          return false
        })(),
        data: JSON.stringify(show),
        rating: Misc.percentage(show.show.rating),
        size: DB.sync.get('small_items') ? Settings.grid.mainSmall : Settings.grid.mainNormal,
        watchlisted: (() => {
          const want = traktshowscollection.find(o => o.show.ids.slug === show.show.ids.slug)
          return Boolean(want || watched)
        })(),
        watched: (() => {
          return watched && watched.plays >= watched.show.aired_episodes
        })()
      }

      const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg}" id="${d.id}">` +
                  `<span class="data">${d.data}</span>` +
                  '<div class="fanart">' +
                      '<div class="corner-rating"><span></span></div>' +
                      '<img class="base" src="images/placeholder.png">' +
                      '<div class="shadow"></div>' +
                      '<div class="titles">' +
                          '<h4>' +
                              `<span class="ep-title">${d.key}</span>` +
                          '</h4><br>' +
                          `<h3>${show.show.title}<span class="year">${show.show.year || ''}</span></h3>` +
                      '</div>' +
                  '</div>' +
                  '<div class="quick-icons">' +
                      '<div class="actions">' +
                          `<div class="watchlist trakt-icon-list-thick" title="${i18n.__('Add to watchlist')}" onClick="Discover.addToWatchlist(this)"></div>` +
                          (show.show.trailer ? `<div class="trailer fa fa-youtube-play" title="${i18n.__('Watch trailer')}" onClick="Interface.playTrailer('${show.show.trailer}')"></div>` : '') +
                          `<div class="play trakt-icon-play2-thick" title="${i18n.__('Play now')}" onClick="Details.trakt.episode(this, 'discover')"></div>` +
                      '</div>' +
                      '<div class="metadata">' +
                          `<div class="percentage" title="${i18n.__('Rate this')}" onClick="Items.rate('${d.id}')">` +
                          '<div class="fa fa-heart"></div>' +
                          `${d.rating}&nbsp;%` +
                      '</div>' +
                  '</div>' +
              '</div>'

      let image
      IB.get(show.show.ids).then(cached => {
        image = cached.fanart || cached.poster
        return Items.getImage(image, show.show.ids, 'show', 'fanart')
      }).then(img => {
        img && $(`#discover #${d.id} .fanart`).css('background-image', `url('${img}')`) && $(`#discover  #${d.id} .fanart img`).css('opacity', '0')
        !d.key && $(`#discover #${d.id} .ep-title`).hide()
        d.watchlisted && $(`#discover #${d.id} .watchlist`)[0] && ($(`#discover #${d.id} .watchlist`)[0].outerHTML = '<div class="watchlist trakt-icon-list-thick selected"></div>')
        d.watched && $(`#discover #${d.id} .fanart`).addClass('watched')

        // right click menu
        const labels = {}
        labels['Play now'] = () => $(`#discover #${d.id} .play`).click()
        show.show.trailer && (labels['Watch trailer'] = () => $(`#discover #${d.id} .trailer`).click())
        DB.sync.get('use_customs') && (labels['Add to custom list'] = () => Items.addToCustom($(`#${d.id}`)))
        labels['Add to watchlist'] = () => $(`#discover #${d.id} .watchlist`).click()
        labels.separator = true
        show.show.source === 'recommendations' && (labels["Don't recommend this again"] = () => Trakt.client.recommendations.shows.hide({
          id: show.show.ids.slug
        }).then(() => DB.trakt.store(0, 'lastrecommendedsync')).then(() => $(`#discover #${d.id}`).remove()))
        labels['Open on Trakt.tv'] = () => Misc.openExternal(`https://trakt.tv/shows/${show.show.ids.slug}`)
        const menu = Misc.customContextMenu(labels)
        $(`#discover #${d.id} .fanart`).off('contextmenu').on('contextmenu', (e) => menu.popup(parseInt(e.clientX), parseInt(e.clientY)))
      })

      return item
    })
  },
  constructDiscoverMovie: (movie) => {
    // standardize output
    if (!movie.movie) {
      movie = {
        movie: movie
      }
    }

    return Promise.all([
      WB.find.movie(movie.movie.ids.slug),
      DB.trakt.get('traktmoviescollection')
    ]).then(([watched, traktmoviescollection]) => {
      const d = {
        id: movie.movie.ids.slug,
        key: (function () {
          if (movie.watchers) return i18n.__('%s people watching', Misc.numberWithCommas(movie.watchers))
          if (movie.list_count) return i18n.__('Present in %s lists', Misc.numberWithCommas(movie.list_count))
          if (movie.watcher_count) return i18n.__('Played by %s people', Misc.numberWithCommas(movie.watcher_count))

          return false
        })(),
        data: JSON.stringify(movie),
        rating: Misc.percentage(movie.movie.rating),
        size: DB.sync.get('small_items') ? Settings.grid.mainSmall : Settings.grid.mainNormal,
        watchlisted: traktmoviescollection.find(o => o.movie.ids.slug === movie.movie.ids.slug),
        watched: watched
      }

      const item = `<div class="grid-item col-sm-${d.size.sm} col-md-${d.size.md} col-lg-${d.size.lg}" id="${d.id}">` +
                  `<span class="data">${d.data}</span>` +
                  '<div class="fanart">' +
                      '<div class="corner-rating"><span></span></div>' +
                      '<img class="base" src="images/placeholder.png">' +
                      '<div class="shadow"></div>' +
                      '<div class="titles">' +
                          '<h4>' +
                              `<span class="ep-title">${d.key}</span>` +
                          '</h4><br>' +
                          `<h3>${movie.movie.title}<span class="year">${movie.movie.year || ''}</span></h3>` +
                      '</div>' +
                  '</div>' +
                  '<div class="quick-icons">' +
                      '<div class="actions">' +
                          `<div class="watchlist trakt-icon-list-thick" title="${i18n.__('Add to watchlist')}" onClick="Discover.addToWatchlist(this)"></div>` +
                          (movie.movie.trailer ? `<div class="trailer fa fa-youtube-play" title="${i18n.__('Watch trailer')}" onClick="Interface.playTrailer('${movie.movie.trailer}')"></div>` : '') +
                          `<div class="play trakt-icon-play2-thick" title="${i18n.__('Play now')}" onClick="Details.trakt.movie(this, 'discover')"></div>` +
                      '</div>' +
                      '<div class="metadata">' +
                          `<div class="percentage" title="${i18n.__('Rate this')}" onClick="Items.rate('${d.id}')">` +
                          '<div class="fa fa-heart"></div>' +
                          `${d.rating}&nbsp;%` +
                      '</div>' +
                  '</div>' +
              '</div>'

      let image
      IB.get(movie.movie.ids).then(cached => {
        image = cached.fanart || cached.poster
        return Items.getImage(image, movie.movie.ids, 'movie', 'fanart')
      }).then(img => {
        img && $(`#discover #${d.id} .fanart`).css('background-image', `url('${img}')`) && $(`#discover #${d.id} .fanart img`).css('opacity', '0')
        !d.key && $(`#discover #${d.id} .ep-title`).hide()
        d.watchlisted && $(`#discover #${d.id} .watchlist`)[0] && ($(`#discover #${d.id} .watchlist`)[0].outerHTML = '<div class="watchlist trakt-icon-list-thick selected"></div>')
        d.watched && $(`#discover #${d.id} .fanart`).addClass('watched')

        // right click menu
        const labels = {}
        const id = d.id
        labels['Play now'] = () => $(`#discover #${id} .play`).click()
        movie.movie.trailer && (labels['Watch trailer'] = () => $(`#discover #${id} .trailer`).click())
        DB.sync.get('use_customs') && (labels['Add to custom list'] = () => Items.addToCustom($(`#${id}`)))
        labels['Add to watchlist'] = () => $(`#discover #${id} .watchlist`).click()
        labels.separator = true
        movie.movie.source === 'recommendations' && (labels["Don't recommend this again"] = () => Trakt.client.recommendations.movies.hide({
          id: movie.movie.ids.slug
        }).then(() => DB.trakt.store(0, 'lastrecommendedsync')).then(() => $(`#discover #${id}`).remove()))
        labels['Open on Trakt.tv'] = () => Misc.openExternal(`https://trakt.tv/movies/${movie.movie.ids.slug}`)

        $(`#discover #${id} .fanart`).off('contextmenu').on('contextmenu', (e) => {
          const menu = Misc.customContextMenu(labels)
          menu.popup(parseInt(e.clientX), parseInt(e.clientY))
        })
      })

      return item
    })
  },
  markAsWatched: (elm) => {
    const $elm = $(elm)[0]
    const id = $elm.offsetParent.id || $elm.id

    $(elm).addClass('selected')
    $(`#${id}`).append('<div class="item-spinner"><div class="fa fa-spin fa-refresh"></div>')

    const data = JSON.parse($(`#${id}`).find('.data').text())
    let type, model

    if (data.movie) {
      type = 'movies'
      model = data.movie
    } else {
      type = 'episodes'
      model = data.next_episode
    }

    const post = {}
    const item = {
      watched_at: new Date().toISOString(),
      ids: model.ids
    }
    post[type] = [item]

    console.info('Mark as watched:', model.ids.slug || `${data.show.ids.slug} ${model.season}x${model.number}`)

    Trakt.client.sync.history.add(post).finally(() => {
      Trakt.reload(true, type, (data.show ? data.show.ids.slug : false))
      WB.markAsWatched(data)
    })
  },

  markAsUnWatched: (elm) => {
    const data = Items.getData(elm)
    const type = data.show ? 'show' : 'movie'
    const id = data[type].ids.slug
    const watchedId = data.id
    $(`#${watchedId} .watched`).removeClass('selected')
    Trakt.client.sync.history.remove({
      ids: [watchedId]
    }).finally(() => {
      Trakt.reload(false, type)
      $(`#${watchedId}`).remove()
    })
    WB.markAsUnwatched(id)
  },

  applyRatings: (ratings = []) => {
    if (!ratings) return

    $('.corner-rating span').text('')
    $('.corner-rating').hide()

    for (const item of ratings) {
      if (['show', 'movie'].indexOf(item.type) === -1) continue

      if ($('#details .id').text() === item[item.type].ids.slug) {
        $('#details .corner-rating span').text(item.rating).parent().show()
      }

      const el = document.querySelector(`[id='${item[item.type].ids.slug}']`)
      let elc = false
      try { elc = document.querySelector(`.${item[item.type].ids.slug}`) } catch (e) { elc = $(`.${item[item.type].ids.slug}`) }
      if (el || elc) {
        $(`#${item[item.type].ids.slug} .corner-rating span`).text(item.rating).parent().show()
        $(`.${item[item.type].ids.slug} .corner-rating span`).text(item.rating).parent().show()
      }

      const el_ = document.querySelector(`[id='custom-${item[item.type].ids.slug}']`)
      if (el_) {
        $(`#custom-${item[item.type].ids.slug} .corner-rating span`).text(item.rating).parent().show()
        $(`.custom-${item[item.type].ids.slug} .corner-rating span`).text(item.rating).parent().show()
      }
    }
  },

  rate: (slug) => {
    const $this = $(`#${slug} .percentage`)
    $('.popover').remove()

    if (!$this.attr('initialized')) {
      const isRated = $(`#${slug} .corner-rating span`).eq(0).text()

      let content = ''

      const ratings = ['Weak Sauce :(', 'Terrible', 'Bad', 'Poor', 'Meh', 'Fair', 'Good', 'Great', 'Superb', 'Totally Ninja!']

      for (let i = 10; i > 0; i--) {
        const id = 'rating-' + i + '-' + Date.now()

        content += `<input id="${id}" type="radio" class="rating-${i}" name="rating" value="${i}" ${isRated === i.toString() ? 'checked=1' : ''}>` +
                    `<label for="${id}" title="" class="rating-${i}">${i}</label>`
      }

      $this.popover({
        placement: 'bottom',
        trigger: 'focus',
        html: true
      }).on('shown.bs.popover', () => {
        requestIdleCallback(() => {
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

            const item = JSON.parse($(`#${slug}`).find('.data').text())
            if (isRated === score) {
              Trakt.rate('remove', item)
            } else {
              Trakt.rate('add', item, score)
            }

            $this.removeAttr('initialized')
            $this.popover('destroy')
          })
        })
      })

      $this.attr('initialized', 1)
    }

    $this.popover('toggle')
  },

  constructMessage: (text) => {
    return `<p class="rowMessage">${i18n.__(text)}</p>`
  },
  getData: (elm) => {
    // extract json from data div
    const $elm = $(elm)[0]
    if (!$elm) return
    const id = ($elm.offsetParent && (['shows', 'movies', 'customs'].indexOf($elm.offsetParent.id) === -1) && $elm.offsetParent.id) || $elm.id
    try {
      const data = JSON.parse($(`#${id}`).find('.data').text())
      return data
    } catch (e) {
      console.error('Coulnt parse JSON data (Items.getData) for $(#%s)', id)
    }
  },
  removeFromCustom: (elm) => {
    const data = Items.getData(elm)
    Trakt.removeFromCustom(data).then(Collection.get.traktcustoms).then(Collection.get.traktcached)
  },
  addToCustom: (elm) => {
    const data = Items.getData(elm)
    Trakt.addToCustom(data).then(Collection.get.traktcustoms).then(Collection.get.traktcached)
  }
}
