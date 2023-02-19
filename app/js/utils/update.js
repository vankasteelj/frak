'use strict'

const Update = {
  // STARTUP: check updates on app start, based on upstream git package.json
  check: () => {
    if (!DB.sync.get('lookForUpdates')) return

    if (DB.sync.get('availableUpdate') > PKJSON.version) {
      Update.notify()
      return
    }

    // only check every 7 days
    if (parseInt(DB.sync.get('lastUpdateCheck')) + (1000 * 60 * 60 * 24 * 7) > Date.now()) return
    Update.lookForUpdates()
  },

  lookForUpdates: (manual) => {
    DB.sync.store(Date.now(), 'lastUpdateCheck')

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
          DB.sync.store(data.version, 'availableUpdate')
          DB.sync.store(data.releases, 'availableUpdateUrl')
          console.info('Update %s available:', data.version, data.releases)
          Update.notify()
        } else {
          DB.sync.remove('availableUpdate')
          DB.sync.remove('availableUpdateUrl')
          console.debug('No update available')
          if (manual) Notify.snack(i18n.__('No update available'), 15000)
        }
      })
    }).on('error', (e) => {
      console.error('Unable to look for updates', e)
    })
  },

  notify: () => {
    const message = `<a onClick="Misc.openExternal('${DB.sync.get('availableUpdateUrl')}')">` +
                `<b>${i18n.__('Update %s available', DB.sync.get('availableUpdate'))}</b>` +
                '<br>' +
                `<b>${i18n.__('Download it here!')}</b>` +
            '</a>'
    Notify.snack(message, 60000)
  }
}
