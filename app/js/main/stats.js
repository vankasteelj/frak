'use strict'

const Stats = {
  cache: {
    ratings: undefined,
    traktStats: undefined,
    lastMonth: undefined,
    showsStats: undefined
  },

  load: () => {
    console.log('Loading trakt stats')

    const suserinfo = Profiles.get(DB.sync.get('trakt_active_profile')).profile
    $('#stats #susername').text(i18n.__('Hello, %s', suserinfo.name.split(' ')[0] || suserinfo.username))
    $('#stats #suserjoined').attr('onClick', `Misc.openExternal('https://trakt.tv/users/${suserinfo.username}')`).attr('title', i18n.__('Open Trakt profile page in a browser'))
    $('#stats #suserjoined span').text(new Date(suserinfo.joined_at).toLocaleDateString())

    // reset
    $('#stats #stopratedshows').html('')
    $('#stats #stopratedmovies').html('')
    $('#stats #sfunfacts #sfavgenres').html('')
    $('#stats #sfunfacts #sfavcountries').html('')
    $('#stats #sfunfacts #sfavyears').html('')
    $('#stats #sfunfacts #sfavday').html('')
    $('#stats #sfunfacts #sfavweek').html('')
    $('#stats #sfunfacts #sfavhours').html('')

    return Stats.getTraktStats(suserinfo.username).then(stats => {
      $('#stats #stotaltimeshows').text(Misc.secsToYDHM(stats.episodes.minutes * 60))
      $('#stats #stotalepisodes').text(Number(stats.episodes.watched).toLocaleString())
      $('#stats #stotalshows').text(Number(stats.shows.watched).toLocaleString())
      $('#stats #stotaltimemovies').text(Misc.secsToYDHM(stats.movies.minutes * 60))
      $('#stats #stotalmovies').text(Number(stats.movies.watched).toLocaleString())

      return Stats.getRatings()
    }).then(collection => {
      for (let i = 0; i < 10; i++) {
        const s = collection.show[i]
        const m = collection.movie[i]
        if (s) {
          const els = `<li><a onclick="Misc.openExternal('https://trakt.tv/shows/${s.item.ids.slug}')">${s.item.title}</a></li>`
          $('#stats #stopratedshows').append(els)
        } else {
          $('#stats #stop .show h3').hide()
        }
        if (m) {
          const elm = `<li><a onclick="Misc.openExternal('https://trakt.tv/movies/${m.item.ids.slug}')">${m.item.title}</a></li>`
          $('#stats #stopratedmovies').append(elm)
        } else {
          $('#stats #stop .movie h3').hide()
        }
      }
      return Stats.getShowsStats()
    }).then(showsStats => {
      // most watched tv show
      Images.get.show({ imdb: showsStats.most_watched.show.show.ids.imdb }).then(imgs => $('#stats #sposter').css('background-image', `url(${imgs.poster})`))
      $('#stats #sposter').attr('onclick', `Misc.openExternal('https://trakt.tv/shows/${showsStats.most_watched.show.show.ids.slug}')`)
      $('#stats #smostwatchedtime').text(i18n.__('I\'ve spent %s watching %s', Misc.secsToYDHM(showsStats.most_watched.time_spent), showsStats.most_watched.show.show.title))
      $('#stats #smostwatchedepisodes').text(i18n.__('%s episodes played', showsStats.most_watched.show.plays))
      $('#stats #smostwatchedoverview').text(showsStats.most_watched.show.show.overview)

      // fun cards
      const totgenres = Stats._totCount(showsStats.genres)
      const totcountries = Stats._totCount(showsStats.countries)

      for (let i = 0; i < 4; i++) {
        if (showsStats.genres[i]) {
          const favgenre = `<li>${i18n.__(Misc.capitalize(showsStats.genres[i].item))} (${Number((showsStats.genres[i].frequency / totgenres) * 100).toFixed()}%)</li>`
          $('#stats #sfunfacts #sfavgenres').append(favgenre)
        }

        if (showsStats.countries[i]) {
          const favcountry = `<li>${countryList[showsStats.countries[i].item.toUpperCase()]} (${Number((showsStats.countries[i].frequency / totcountries) * 100).toFixed()}%)</li>`
          $('#stats #sfunfacts #sfavcountries').append(favcountry)
        }

        if (showsStats.years[i]) {
          const favyear = `<li>${showsStats.years[i].item}</li>`
          $('#stats #sfunfacts #sfavyears').append(favyear)
        }
      }

      return Stats.getLastMonth()
    }).then(lastMonth => {
      $('#stats #sfunfacts #sfavday').append(`<li>${i18n.__(Misc.capitalize(lastMonth.days.best_day))}</li>`)
      $('#stats #sfunfacts #sfavweek').append(`<li>${i18n.__('Weekdays')} (${lastMonth.days.weekdays}%)</li>`)
      $('#stats #sfunfacts #sfavweek').append(`<li>${i18n.__('Weekends')} (${lastMonth.days.weekend}%)</li>`)
      for (const time in lastMonth.hours) {
        $('#stats #sfunfacts #sfavhours').append(`<li>${i18n.__(Misc.capitalize(time))} (${lastMonth.hours[time]}%)</li>`)
      }
    }).catch(err => {
      console.error('Trakt stats error', err)
    })
  },

  getRatings: () => {
    if (Stats.cache.ratings) return Stats.cache.ratings

    return DB.trakt.get('traktratings').then(ratings => {
      const sort = Object.keys(ratings).sort((a, b) => ratings[b].rating - ratings[a].rating)

      Stats.cache.ratings = { movie: [], show: [] }

      for (const i of sort) {
        const item = ratings[i]
        Stats.cache.ratings[item.type].push({
          rating: item.rating,
          item: item[item.type]
        })
        if (Stats.cache.ratings.movie.length >= 10 && Stats.cache.ratings.show.length >= 10) break
      }

      return Stats.cache.ratings
    })
  },

  getTraktStats: (username) => {
    if (Stats.cache.traktStats) return Promise.resolve(Stats.cache.traktStats)

    return Trakt.client.users.stats({ username: username }).then(stats => {
      Stats.cache.traktStats = stats
      return Stats.cache.traktStats
    })
  },

  getShowsStats: () => {
    if (Stats.cache.showsStats) return Promise.resolve(Stats.cache.showsStats)

    return DB.trakt.get('watchedShows').then((shows = []) => {
      let mostWatched = { idx: null, timespent: null }
      let genres = []; let countries = []; let networks = []; let years = []

      for (const s in shows) {
        genres = genres.concat(shows[s].show.genres)
        countries = countries.concat(shows[s].show.country)
        networks = networks.concat(shows[s].show.network)
        years = years.concat(shows[s].show.year)

        const timespent = shows[s].plays * shows[s].show.runtime
        if (timespent > mostWatched.timespent) mostWatched = { idx: s, timespent: timespent }
      }

      genres = Stats._freqCount(genres)
      networks = Stats._freqCount(networks)
      countries = Stats._freqCount(countries)
      years = Stats._freqCount(years)

      Stats.cache.showsStats = {
        genres: genres,
        years: years,
        countries: countries,
        networks: networks, // unused
        most_watched: { show: shows[mostWatched.idx], time_spent: mostWatched.timespent * 60 }
      }

      return Stats.cache.showsStats
    })
  },

  getLastMonth: () => {
    if (Stats.cache.lastMonth) return Promise.resolve(Stats.cache.lastMonth)

    return Trakt.client.sync.history.get({ type: 'all', start_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), end_at: new Date().toISOString(), limit: 1000 }).then(history => {
      let days = []
      let hours = []
      for (const i of history) {
        const date = new Date(i.watched_at)
        days = days.concat(date.getDay())
        hours = hours.concat(date.getHours())
      }
      days = Stats._freqCount(days)
      hours = Stats._freqCount(hours)

      // 18-23: evenings // 24-4 night // 5-11: mornings // 12-17: afternoons
      let timesTotal = null
      const times = {
        morning: null,
        afternoon: null,
        evening: null,
        night: null
      }
      for (const i in hours) {
        const h = hours[i].item
        if (h >= 5 && h < 12) times.morning += hours[i].frequency
        if (h >= 12 && h < 18) times.afternoon += hours[i].frequency
        if (h >= 18 && h <= 23) times.evening += hours[i].frequency
        if (h >= 0 && h < 5) times.night += hours[i].frequency
        timesTotal += hours[i].frequency
      }

      let weekTotal = null
      const week = {
        week: null,
        weekend: null
      }
      for (const i in days) {
        const d = days[i].item
        if (d === 0 || d === 6) {
          week.weekend += days[i].frequency
        } else {
          week.week += days[i].frequency
        }
        weekTotal += days[i].frequency
      }

      // days 6-0 week-end // 1-2-3-4-5 weekdays
      const daysoftheweek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

      Stats.cache.lastMonth = {
        days: {
          weekdays: Math.round((week.week / weekTotal) * 100),
          weekend: Math.round((week.weekend / weekTotal) * 100),
          best_day: daysoftheweek[days[0].item]
        },
        hours: {
          morning: Math.round((times.morning / timesTotal) * 100),
          afternoon: Math.round((times.afternoon / timesTotal) * 100),
          evening: Math.round((times.evening / timesTotal) * 100),
          night: Math.round((times.night / timesTotal) * 100)
        }
      }

      return Stats.cache.lastMonth
    })
  },

  _freqCount: (arr) => {
    const freqs = arr.reduce((f, item) => Object.assign(f, { [item]: (f[item] || 0) + 1 }), {})
    const freqsArr = Object.keys(freqs).map(item => ({ item, frequency: freqs[item] }))
    return freqsArr.sort((a, b) => b.frequency - a.frequency)
  },
  _totCount: (arr) => {
    let total = 0
    for (const i in arr) total += arr[i].frequency
    return total
  }
}
