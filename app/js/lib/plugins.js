'use strict'

const Plugins = {
  loaded: {},
  available: {},
  load: () => {
    const dir = path.join(process.cwd(), 'plugins')

    fs.existsSync(dir) && fs.readdir(dir, (err, plugins = []) => {
      if (err) return

      let count = 0
      let count2 = 0
      const loadPlugin = (file) => {
        const found = path.join(dir, file)
        let plugin
        if (fs.statSync(found).isFile()) {
          // load index files
          plugin = found
        } else {
          // load complete modules
          plugin = path.join(found, 'index.js')
        }

        const tmp = require(plugin)

        // add to db if missing
        if (DB.sync.get(tmp.name) === undefined) {
          DB.sync.store(false, tmp.name)
        }

        const active = DB.sync.get(tmp.name)
        Plugins.available[tmp.name] = {
          name: tmp.name,
          path: plugin,
          require: tmp,
          default: active
        }

        scheduler.postTask(() => Plugins.addToSettings(Plugins.available[tmp.name]), { priority: 'background' })
        count2++
      }

      for (const file of plugins) {
        try {
          Misc.sleep(count*500).then(() => {
            loadPlugin(file)
            if (count2 === plugins.length) {
              scheduler.postTask(Plugins.addTest, { priority: 'background' })
            }
          })
        } catch (e) {
          console.info('Plugins - %s cannot be loaded', file, e)
        }
        count++
      }
    })
  },
  addTest: () => {
    const item = '<div class="option">' +
      '<div class="text"></div>' +
      '<div class="action">' +
        '<button class="reload" onClick="Plugins.test()">' +
          `<i18n>${i18n.__('Test plugins')}</i18n>` +
        '</button>' +
      '</div>' +
    '</div>'

    $('#settings .plugins').append(item)
  },
  addToSettings: (plugin) => {
    const id = plugin.name.toLowerCase().replace(/\s/g, '-')
    const item = '<div class="option">' +
            `<div class="text">${plugin.name}</div>` +
            '<div class="action">' +
                `${i18n.__('no')}&nbsp;` +
                '<label class="switch">' +
                    `<input id="${id}" type="checkbox">` +
                    '<span class="slider round"></span>' +
                '</label>' +
                `&nbsp;${i18n.__('yes')}` +
            '</div>' +
        '</div>'

    $('#settings .plugins').append(item)

    $(`#${id}`).off('click').on('click', (evt) => {
      Interface.showWarning()

      const isActive = evt.target.checked
      DB.sync.store(isActive, plugin.name)

      if (isActive) {
        console.info('Plugins - %s is loaded', plugin.name)
        Plugins.loaded[plugin.name] = plugin.require
      } else {
        console.info('Plugins - %s disabled', plugin.name)
        delete Plugins.loaded[plugin.name]
      }
    })

    if (plugin.default) {
      $(`#${id}`).click()
    }
  },
  test: () => {
    $('#testPlugins').show()
    $('#testPlugins .background').on('click', (evt) => {
      $('#testPlugins .background').off('click')
      $('#testPlugins').hide()
      $('#tP-wait').show()
      $('#testPlugins .spinner').show()
      $('#tP-results table').html('')
    })

    Search.testOnline().then(results => {
      $('#tP-wait').hide()
      $('#testPlugins .spinner').hide()
      $('#tP-results table').append(`<tr><th></th><th>${i18n.__('Shows')}</th><th>${i18n.__('Movies')}</th></tr>`)

      const check = (bool) => bool ? 'fa-check-circle' : 'fa-times-circle'
      for (const i in results.shows) {
        const item = `<tr><td>${results.shows[i].tested}</td><td><div class="fa ${check(results.shows[i].working)}"></div></td><td><div class="fa ${check(results.movies[i].working)}"></div></td></tr>`
        $('#tP-results table').append(item)
      }

      $('#tP-results').show()
    })
  }
}
