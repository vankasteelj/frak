'use strict'

const DB = {
  reset: () => {
    localStorage.clear()
    require('localforage').clear()
    IB.reset()
    Cache.delete()
    Misc.restartApp()
  },
  resetApp: () => {
    require('localforage').clear()
    Misc.restartApp()
  },
  sync: { // localStorage
    store: (data, key) => {
      if (typeof data !== 'string') data = JSON.stringify(data)
      localStorage[key] = require('zlib').deflateSync(data).toString('base64')
      return true
    },
    get: (key) => {
      let data
      try {
        data = require('zlib').inflateSync(Buffer.from(localStorage[key], 'base64')).toString()
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
      return require('localforage').setItem(key, data)
    },
    get: (key) => {
      return require('localforage').getItem(key)
    },
    remove: (key) => {
      return require('localforage').removeItem(key)
    }
  },
  trakt: { // localforage
    store: (data, key) => {
      return require('localforage').setItem(DB.sync.get('trakt_active_profile') + key, data)
    },
    get: (key) => {
      return require('localforage').getItem(DB.sync.get('trakt_active_profile') + key)
    },
    remove: (key) => {
      return require('localforage').removeItem(DB.sync.get('trakt_active_profile') + key)
    }
  }
}
