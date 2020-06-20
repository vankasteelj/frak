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
  }
}