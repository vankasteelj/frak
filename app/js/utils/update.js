'use strict'

const Update = {
  // STARTUP: check updates on app start, based on upstream git package.json
  check: () => {
    if (!DB.app.get('lookForUpdates')) return

    if (DB.app.get('availableUpdate') > PKJSON.version) {
      Update.notify()
      return
    }

    // only check every 7 days
    if (parseInt(DB.app.get('lastUpdateCheck')) + (1000 * 60 * 60 * 24 * 7) > Date.now()) return
    Update.lookForUpdates()
  },

  lookForUpdates: (manual) => {
    DB.app.store(Date.now(), 'lastUpdateCheck')

    // fetch remote package.json
    const url = PKJSON.updateEndpoint
    url && https.get(url, (res) => {
      let body = ''

      res.on('data', (chunk) => {
        body += chunk.toString()
      })

      res.on('end', () => {
        const data = JSON.parse(body)

        if (data.version > PKJSON.version) {
          DB.app.store(data.version, 'availableUpdate')
          DB.app.store(data.releases, 'availableUpdateUrl')
          console.info('Update %s available:', data.version, data.releases)
          Update.notify()
        } else {
          DB.remove('availableUpdate')
          DB.remove('availableUpdateUrl')
          console.debug('No update available')
          if (manual) Notify.snack(i18n.__('No update available'), 15000)
        }
      })
    }).on('error', (e) => {
      console.error('Unable to look for updates', e)
    })
  },

  notify: () => {
    const message = `<a onClick="Misc.openExternal('${DB.app.get('availableUpdateUrl')}')">` +
                `<b>${i18n.__('Update %s available', DB.app.get('availableUpdate'))}</b>` +
                '<br>' +
                `<b>${i18n.__('Download it here!')}</b>` +
            '</a>'
    Notify.snack(message, 60000)
  }
}
