'use strict'

const Local = {
  scans: 0,
  client: new (require('local-video-library'))(Settings.apikeys.trakt_id, [process.env.HOME || path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)]),

  scan: () => {
    console.info('Scanning local drive')
    return Local.client.scan()
  },

  update: (library) => {
    console.info('Scanning local drive (update)')
    return Local.client.update(library)
  },

  updateClientPaths: (paths) => {
    Local.client.parser.options.paths = paths
    DB.app.store(paths, 'local_paths')
  },

  setupPaths: () => {
    let paths = DB.app.get('local_paths')
    if (!paths || (paths && !paths[0])) paths = [process.env.HOME || path.join(process.env.HOMEDRIVE, process.env.HOMEPATH)]

    Local.updateClientPaths(paths)
    Local.setSettingsPaths(paths)
  },

  buildVideoLibrary: (files = []) => {
    const library = {
      movies: [],
      shows: [],
      unmatched: []
    }

    for (const file of files) {
      file.path = file.path.replace(/\\/g, '/') // unix-like

      if (file.metadata && file.metadata.type) {
        if (file.metadata.type === 'movie') {
          library.movies.push(file)
        } else if (file.metadata.type === 'episode' && file.metadata.show) {
          const s = file.metadata.episode.season
          const e = file.metadata.episode.number

          const findShow = (title) => library.shows.find((show) => show.metadata.show.title === title)
          const found = findShow(file.metadata.show.title)

          if (!found) {
            const newShow = {
              metadata: {
                show: file.metadata.show
              }
            }

            newShow.seasons = {}
            newShow.seasons[s] = {}
            newShow.seasons[s].episodes = {}
            delete file.metadata.show
            newShow.seasons[s].episodes[e] = file

            library.shows.push(newShow)
          } else {
            if (!found.seasons[s]) {
              found.seasons[s] = {}
              found.seasons[s].episodes = {}
            }

            delete file.metadata.show
            found.seasons[s].episodes[e] = file
          }
        }
      } else {
        library.unmatched.push(file)
      }
    }

    return library
  },

  setSettingsPaths: (paths = []) => {
    $('#settings .locals .option .paths').html('')

    let items = String()
    for (const p of paths) {
      items += `<li onClick="Local.setSettingsActive(this)">${p}</li>`
    }
    $('#settings .locals .option .paths').append(items)
  },

  setSettingsActive: (item) => {
    $('#settings .locals .option .paths li').removeClass('selected')
    $(item).addClass('selected')
  },

  removePath: (p) => {
    const paths = DB.app.get('local_paths')
    paths.splice(paths.indexOf(p), 1)

    DB.app.store(paths, 'local_paths')
    Local.setupPaths()

    // remove untracked files
    const library = DB.app.get('local_library') || []
    const newLibrary = []
    for (const file of library) {
      if (!file.path.startsWith(p)) newLibrary.push(file)
    }
    DB.app.store(newLibrary, 'local_library')
    Collection.format.locals(newLibrary)
  },
  addPath: (p) => {
    const paths = DB.app.get('local_paths')
    paths.push(p)

    DB.app.store(paths, 'local_paths')
    Local.setupPaths()

    setTimeout(() => {
      $('#navbar .locals .fa-spin').css('opacity', 1)
      Collection.get.local()
    }, 300)
  },
  rescan: () => {
    DB.remove('local_library')

    $('#collection #locals .waitforlibrary').show()
    $('#collection #locals .waitforlibrary .spinner').css('visibility', 'visible')
    $('#collection #locals .categories .movies').hide()
    $('#collection #locals .categories .shows').hide()
    $('#collection #locals .categories .unmatched').hide()

    Collection.get.local()
  }
}
