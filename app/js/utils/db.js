'use strict'

const DB = {
  _store: (data, key) => {
    if (typeof data !== 'string') data = JSON.stringify(data)
    localStorage[key] = zlib.deflateSync(data).toString('base64')
    return true
  },
  _get: (key) => {
    let data

    try {
      data = zlib.inflateSync(Buffer.from(localStorage[key], 'base64')).toString()
    } catch (e) {}

    try {
      data = JSON.parse(data)
    } catch (e) {}

    return data
  },
  reset: () => {
    localStorage.clear()
    IB.reset()
    Cache.delete()
    win.reload()
  },
  remove: (key) => {
    localStorage.removeItem(key)
  },
  app: {
    store: (data, key) => {
      return DB._store(data, key)
    },
    get: (key) => {
      return DB._get(key)
    }
  },
  trakt: {
    store: (data, key) => {
      try {
        const active = DB._get('trakt_active_profile')
        return DB._store(data, active+key)
      } catch (e) {}
    },
    get: (key) => {
      try {
        const active = DB._get('trakt_active_profile')
        return DB._get(active+key)
      } catch (e) {}
    }
  }
}