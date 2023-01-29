'use strict'

const IB = {
  dir: path.join(process.env.LOCALAPPDATA || (process.platform === 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + '/.cache'), PKJSON.name, 'ImagesBank'),
  downloader: require('image-downloader'),
  create: () => {
    try {
      fs.mkdirSync(IB.dir)
    } catch (e) {}
    try {
      IB.clean()
    } catch (e) {}
  },
  reset: () => {
    try {
      fs.removeSync(IB.dir)
    } catch (e) {}
  },
  calcSize: () => {
    return new Promise((resolve, reject) => {
      fs.readdir(IB.dir, (err, files) => {
        if (err) console.error(err)
        let total = 0
        for (let i = 0; i < files.length; i++) total += fs.statSync(path.join(IB.dir, files[i])).size
        resolve(parseInt(total / 1024 / 1024))
      })
    })
  },
  clean: () => {
    const db = IB._load()
    const ttl = 15 * 24 * 60 * 60 * 1000 // 15 days
    const minsize = 20000 // according to my testings, below that it's a corrupted image
    let outdated = 0
    let toosmall = 0

    for (const id in db) {
      if (Date.now() - db[id].ttl > ttl) {
        outdated++ && IB.remove({
          imdb: id
        })
      } else {
        try {
          const sp = fs.statSync(path.join(IB.dir, id + 'p')).size
          const sf = fs.statSync(path.join(IB.dir, id + 'f')).size
          if (sp < minsize || sf < minsize) {
            toosmall++ && IB.remove({
              imdb: id
            })
          }
        } catch (e) {}
      }
    }
    (outdated || toosmall) && console.log('IB.clean: %d images were outdated, %d were corrupted', outdated, toosmall)
  },

  _load: () => {
    let db = DB.app.get('imgBank')
    if (!db) db = {}
    return db
  },
  _save: (db) => {
    DB.app.store(db, 'imgBank')
    return true
  },

  store: (urls, ids) => {
    const id = ids.imdb
    const db = IB._load()

    if (!db[id]) db[id] = {}
    if (urls.poster) {
      db[id].poster = urls.poster
      IB.download(urls.poster, path.join(IB.dir, id + 'p'))
    }
    if (urls.fanart) {
      db[id].fanart = urls.fanart
      IB.download(urls.fanart, path.join(IB.dir, id + 'f'))
    }

    db[id].ttl = Date.now()

    return IB._save(db)
  },
  get: (ids) => {
    if (!ids) return {}

    const id = ids.imdb
    const db = IB._load()

    // invalidate cache every 15 days
    if (db[id] && Date.now() - db[id].ttl > 15 * 24 * 60 * 60 * 1000) {
      IB.remove(ids)
      return {}
    }

    // only return full objects
    /* if (db[id] && (!db[id].poster || !db[id].fanart)) {
      return {}
    } */

    // locally cached
    if (db[id] && (
      fs.existsSync(path.join(IB.dir, id + 'p')) &&
                fs.existsSync(path.join(IB.dir, id + 'f'))
    )) {
      return {
        poster: 'file:///' + path.join(IB.dir, id + 'p').replace(/\\/g, '/'),
        fanart: 'file:///' + path.join(IB.dir, id + 'f').replace(/\\/g, '/')
      }
    }

    return db[id] || {}
  },
  remove: (ids) => {
    const id = ids.imdb
    const db = IB._load()
    if (db[id]) {
      try {
        fs.unlinkSync(path.join(IB.dir, id + 'p'))
      } catch (e) {}
      try {
        fs.unlinkSync(path.join(IB.dir, id + 'f'))
      } catch (e) {}
      delete db[id]
    }

    return IB._save(db)
  },
  download: (uri, filename) => {
    IB.downloader.image({
      url: uri,
      dest: filename,
      extractFilename: false
    }).then(() => {
      IB.calcSize().then(s => $('#imagecachesize').text(s)).catch(console.log)
    }).catch((err) => console.error(err))
  }
}
