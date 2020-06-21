'use strict'

const Stats = {
  load: () => {
    console.log('Loading trakt stats')

    const suserinfo = DB.get('trakt_profile')
    $('#stats #susername').text(i18n.__('Hello, %s', suserinfo.name.split(' ')[0] || suserinfo.username))
    $('#stats #suserjoined span').text(new Date(suserinfo.joined_at).toLocaleDateString())

    //reset
    $('#stats #stopratedshows').html('')
    $('#stats #stopratedmovies').html('')

    return Trakt.client.users.stats({username:suserinfo.username}).then(stats => {
      $('#stats #stotaltimeshows').text(Misc.secsToYDHM(stats.episodes.minutes*60))
      $('#stats #stotalepisodes').text(Number(stats.episodes.watched).toLocaleString())
      $('#stats #stotalshows').text(Number(stats.shows.watched).toLocaleString())
      $('#stats #stotaltimemovies').text(Misc.secsToYDHM(stats.movies.minutes*60))
      $('#stats #stotalmovies').text(Number(stats.movies.watched).toLocaleString())
      
      return Stats.getRatings()
    }).then(collection => {
      for (let i = 0; i < 10; i++) {
        let s = collection.show[i]
        let m = collection.movie[i]
        let els = `<li><a onclick="Misc.openExternal('https://trakt.tv/shows/${s.item.ids.slug}')">${s.item.title}</a></li>`
        let elm = `<li><a onclick="Misc.openExternal('https://trakt.tv/movies/${m.item.ids.slug}')">${m.item.title}</a></li>`
        $('#stats #stopratedshows').append(els)
        $('#stats #stopratedmovies').append(elm)
      }
      return Stats.getShowsStats()
    }).then(showsStats => {
      // most watched tv show
      Images.get.show({imdb:showsStats.most_watched.show.show.ids.imdb}).then(imgs => $('#stats #sposter').css('background-image', `url(${imgs.poster})`))
      $('#stats #sposter').attr('onclick', `Misc.openExternal('https://trakt.tv/shows/${showsStats.most_watched.show.show.ids.slug}')`)
      $('#stats #smostwatchedtime').text(i18n.__(`I've spent %s watching %s`, Misc.secsToYDHM(showsStats.most_watched.time_spent), showsStats.most_watched.show.show.title))
      $('#stats #smostwatchedepisodes').text(i18n.__('%s episodes played', showsStats.most_watched.show.plays))
      $('#stats #smostwatchedoverview').text(showsStats.most_watched.show.show.overview)

      // fun cards
      const countryList = require('../app/js/vendor/ISO3166-1.alpha2.json')
      const totgenres = Stats._totCount(showsStats.genres)
      const totcountries = Stats._totCount(showsStats.countries)

      for (let i = 0; i < 4; i++) {
        let favgenre = `<li>${i18n.__(Misc.capitalize(showsStats.genres[i].item))} (${Number((showsStats.genres[i].frequency/totgenres)*100).toFixed()}%)</li>`
        let favcountry = `<li>${countryList[showsStats.countries[i].item.toUpperCase()]} (${Number((showsStats.countries[i].frequency/totcountries)*100).toFixed()}%)</li>`
        let favyear = `<li>${showsStats.years[i].item}</li>`
        $('#stats #sfunfacts #sfavgenres').append(favgenre)
        $('#stats #sfunfacts #sfavcountries').append(favcountry)
        $('#stats #sfunfacts #sfavyears').append(favyear)
      }

      return
    }).catch(err => {
      console.error('Trakt stats error', err)
    })
  },

  getRatings: () => {
    const ratings = DB.get('traktratings')
    const sort = Object.keys(ratings).sort((a,b) => ratings[b].rating - ratings[a].rating)

    const collection = {movie: [], show: []}

    for (let i of sort) {
      let item = ratings[i]
      collection[item.type].push({
        rating: item.rating,
        item: item[item.type]
      })
      if (collection.movie.length >= 10 && collection.show.length >= 10) break
    }
    
    return collection
  },

  getShowsStats: () => {
    const shows = DB.get('watchedShows')
    let mostWatched = {idx: null, timespent: null}
    let genres = [], countries = [], networks = [], years = []

    for (let s in shows) {
      genres = genres.concat(shows[s].show.genres)
      countries = countries.concat(shows[s].show.country)
      networks = networks.concat(shows[s].show.network)
      years = years.concat(shows[s].show.year)
      
      let timespent = shows[s].plays*shows[s].show.runtime
      if (timespent > mostWatched.timespent) mostWatched = {idx: s, timespent: timespent}
    }

    genres = Stats._freqCount(genres)
    networks = Stats._freqCount(networks)
    countries = Stats._freqCount(countries)
    years = Stats._freqCount(years)

    /**
    console.log('I ve spend %s watching %s', Misc.secsToYDHM(mostWatched.timespent*60), shows[mostWatched.idx].show.title)
    console.log('Most watched networks:', networks)
    console.log('My favorite genres are', genres)
    console.log('I watch mostly shows originating from', countries)
    console.log('Based on my watched history, the best TV series years are', years)
    **/

    return {
      genres: genres,
      years: years,
      countries: countries,
      networks: networks,
      most_watched: {show: shows[mostWatched.idx], time_spent: mostWatched.timespent*60}
    }
  },
  
  _freqCount: (arr) => {
    const freqs = arr.reduce((f,item) => Object.assign(f,{[item]:(f[item]||0)+1}),{})
    const freqsArr = Object.keys(freqs).map(item => ({item,frequency: freqs[item]}))
    return freqsArr.sort((a,b) => b.frequency - a.frequency)
  },
  _totCount: (arr) => {
    let total = 0
    for (let i in arr) total += arr[i].frequency
    return total
  }
}