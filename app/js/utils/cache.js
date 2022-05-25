'use strict'

const Cache = {
  dir: path.join(os.tmpdir(), PKJSON.releaseName),
  create: () => {
    try {
      fs.mkdirSync(Cache.dir)
      console.debug('Cache folder created in', Cache.dir)
    } catch (e) {
      console.debug('The app might not have been closed properly - Failed to create cache folder in', Cache.dir, e)
    }
  },
  delete: () => {
    try {
      fs.removeSync(Cache.dir)
    } catch (e) {}
  },
  calcSize: () => {
    return new Promise((resolve, reject) => {
      fs.readdir(Cache.dir, (err, files) => {
        if (err) console.error(err)
        let total = 0
        for (let i = 0; i < files.length; i++) total += fs.statSync(path.join(Cache.dir, files[i])).size
        resolve(parseFloat(total / 1024 / 1024 / 1024).toFixed(2))
      })
    })
  }
}
