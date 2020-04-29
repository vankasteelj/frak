'use strict'

const DB = {
  store: (data, key) => {
    if (typeof data !== 'string') data = JSON.stringify(data)
    localStorage[key] = zlib.deflateSync(data).toString('base64')
    return true
  },
  get: (key) => {
    let data

    try {
      data = zlib.inflateSync(new Buffer(localStorage[key], 'base64')).toString()
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
  }
}
