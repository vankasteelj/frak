'use strict'

const DB = {
  reset: () => {
    localStorage.clear()
    localforage.clear()
    IB.reset()
    Cache.delete()
    Misc.restartApp()
  },
  sync: { // localStorage
    store: (data, key) => {
      if (typeof data !== 'string') data = JSON.stringify(data)
      localStorage[key] = zlib.deflateSync(data).toString('base64')
      return true
    },
    get: (key) => {
      let data
      try {
        data = zlib.inflateSync(Buffer.from(localStorage[key], 'base64')).toString()
      } catch (e) {}
      try {
        data = JSON.parse(data)
      } catch (e) {}
      return data
    },
    remove: (key) => {
      return localStorage.removeItem(key)
    }
  },
  app: { // localforage
    store: (data, key) => {
      return localforage.setItem(key, data)
    },
    get: (key) => {
      return localforage.getItem(key)
    },
    remove: (key) => {
      return localforage.removeItem(key)
    }
  },
  trakt: { // localforage
    store: (data, key) => {
      return localforage.setItem(DB.sync.get('trakt_active_profile') + key, data)
    },
    get: (key) => {
      return localforage.getItem(DB.sync.get('trakt_active_profile') + key)
    },
    remove: (key) => {
      return localforage.removeItem(DB.sync.get('trakt_active_profile') + key)
    }
  }
}
