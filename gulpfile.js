'use strict'

/** *************
 * dependencies *
 ***************/
const gulp = require('gulp')
const glp = require('gulp-load-plugins')()
const del = require('del')
const yargs = require('yargs')
const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec
const spawn = require('child_process').spawn
const pkJson = require('./package.json')
const got = require('got')
const Z7 = require('node-7z-forall')
const temp = require('os').tmpdir()
const ModClean = require('modclean').ModClean
const standard = require('standard')
const nwbuild = require('nw-builder')
require('dns').setDefaultResultOrder('ipv4first') // workaround for yt-dl on node > 0.17.x

/** ******
 * setup *
 ********/
const nwVersion = pkJson.nwjs.version
const flavor = pkJson.nwjs.flavor
const releasesDir = 'build'

/** ***********
 * gulp tasks *
 *************/

// download and compile nwjs
gulp.task('nwjs', () => {
  const nwOptions = {
    mode: 'build',
    srcDir: ['./app/**', './package.json', './README.md', './plugins/**', './mpv/**', './mpv-conf/**', './node_modules/**'],
    outDir: path.join(releasesDir, pkJson.version),
    app: {
      name: pkJson.releaseName,
      version: pkJson.version,
      comments: pkJson.description,
      company: pkJson.homepage,
      fileDescription: pkJson.releaseName,
      fileVersion: pkJson.version,
      internalName: pkJson.name,
      originalFilename: `${pkJson.name}.exe`,
      productName: pkJson.releaseName,
      productVersion: pkJson.version,
      icon: pkJson.icon
    },
    zip: false,
    version: nwVersion,
    flavor: flavor,
    icon: pkJson.macIcns,
    platform: 'win',
    arch: 'x64'
  }

  return nwbuild.default(nwOptions)
})

// start app in development
gulp.task('run', () => {
  return new Promise((resolve, reject) => {
    let bin = path.join('cache', `nwjs-${flavor}-v${nwVersion}-win-x64/nw.exe`)
    console.log('Running from cache')

    const dev = '--development'
    const bp = yargs.argv.bp ? '--bp' : ''
    const hid = yargs.argv.hidden ? '--hidden' : ''
    const child = spawn(bin, ['.', dev, bp, hid])

    child.on('close', (exitCode) => {
      console.log('%s exited with code %d', pkJson.name, exitCode)
      resolve()
    })

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        console.log('%s is not available in cache. Try running `gulp build` beforehand', nwVersion)
      }
      reject(error)
    })
  })
})

// default is help
gulp.task('default', () => {
  console.log([
    '\nBasic usage:',
    ' gulp run\tStart the application',
    ' gulp standard\tCheck StandardJS linting',
    ' gulp build\tBuild the application',
    ' gulp dist\tCreate a redistribuable package',
    '\nAvailable options:',
    ' --development\t\t\tStart in dev mode',
    '\tExample:   `gulp run --development`',
    '\nUse `gulp --tasks` to show the task dependency tree of gulpfile.js\n'
  ].join('\n'))
  return Promise.resolve()
})

// compile nsis installer
gulp.task('build:nsis', () => {
  return new Promise((resolve) => {
    console.log('Packaging nsis')

    const makensis = process.platform === 'win32' ? 'makensis.exe' : 'makensis'

    const child = spawn(makensis, [
      '-DARCH=' + 'win64',
      '-DOUTDIR=' + path.join(process.cwd(), releasesDir),
      'dist/win-installer.nsi'
    ])

    const nsisLogs = []
    child.stdout.on('data', (buf) => {
      nsisLogs.push(buf.toString())
    })

    child.on('close', (exitCode) => {
      if (!exitCode) {
        console.log('Nsis packaged in', path.join(process.cwd(), releasesDir))
      } else {
        if (nsisLogs.length) {
          console.log(nsisLogs.join('\n'))
        }
        console.log('Failed to package nsis')
      }
      resolve()
    })

    child.on('error', (error) => {
      console.log(error)
      console.log('Failed to package nsis')
      resolve()
    })
  }).catch(console.log)
})

// download mpv
gulp.task('mpv', () => {
  return new Promise((resolve) => {
    if (fs.existsSync(location)) {
      console.log('mpv already present in cache...')
      resolve()
    } else {
      console.log('downloading mpv...')
      const stream = got.stream(pkJson.mpv.url, {
        ecdhCurve: 'auto'
      }).pipe(fs.createWriteStream(location))
      stream.on('downloadProgress', console.log)
      stream.on('error', console.log)
      stream.on('finish', resolve)
    }
  }).then(() => {
    console.log('extracting mpv...')
    return Z7.extractFull(location, 'mpv')
  }).then(() => {
    console.log('mpv extracted')
  })
})

// remove unused libraries
gulp.task('build:nwjsclean', () => {
  const dirname = path.posix.join(releasesDir, pkJson.version)
  const removeArray = [
    `${dirname}/credits.html`,
    `${dirname}/chromedriver.exe`,
    `${dirname}/nwjc.exe`,
    `${dirname}/notification_helper.exe`,
    `${dirname}/nacl_irt_x86_64.nexe`,
    `${dirname}/payload.exe`,
    `${dirname}/pnacl`,
    `${dirname}/debug.log`
  ]
  console.log('Removing unused nwjs files from %s...', dirname)
  return del(removeArray).then(console.log).catch(console.error)
})

// remove unused node_modules
gulp.task('npm:modclean', () => {
  const mc = new ModClean()
  return mc.clean().then(r => {
    console.log('ModClean: %s files/folders removed', r.deleted.length)
  }).catch(console.log)
})

// remove unused node_modules from Build
gulp.task('build:modclean', () => {
  const mc = new ModClean({
    cwd: path.join(releasesDir, pkJson.version, 'package.nw', 'node_modules'),
    patterns: ['default:safe']
  })
  return mc.clean().then(r => {
    console.log('ModClean - Build: %s files/folders removed', r.deleted.length)
  }).catch(console.log)
})

// npm prune the build/<platform>/ folder (to remove devDeps)
gulp.task('build:prune', () => {
  const dirname = path.join(releasesDir, pkJson.version, 'package.nw')
  return new Promise((resolve) => {
    exec(`cd "${dirname}" && npm prune --omit=dev`, (error, stdout, stderr) => {
      if (error || stderr) {
        console.log('`npm prune` failed\n')
        console.log(stderr || error)
        console.log('\n\ncontinuing anyway...\n')
        resolve()
      } else {
        console.log(stdout)
        resolve()
      }
    })
  })
})

// standard function
const sd = (fix) => {
  return new Promise((resolve, reject) => {
    standard.lintFiles('**/*.js', {
      fix: fix,
      ignore: ['dist', 'app/js/vendor', 'build', 'cache'],
      globals: [
        // App
        'crypt',
        'fs',
        'http',
        'https',
        'dns',
        'path',
        'os',
        'atob',
        'sessionStorage',
        'localStorage',
        'i18n',
        'url',
        'langs',
        'NwjsApi',
        'onCloseApp',
        'onMoveApp',
        'onMaximizeApp',
        'onMinimizeApp',
        'onRestoreApp',
        'onOpenApp',
        'onDisplayAdded',
        'onDisplayRemoved',

        // nwjs specific
        'nw',

        // JS files
        'Boot',
        'Interface',
        'Keyboard',
        'Localization',
        'Misc',
        'Notify',
        'Themes',
        'Update',
        'Dragdrop',
        'Images',
        'Local',
        'Network',
        'Player',
        'Cast',
        'Plugins',
        'Profiles',
        'Search',
        'Streamer',
        'Subtitles',
        'Trakt',
        'Collection',
        'Details',
        'Discover',
        'Items',
        'Loading',
        'DB',
        'IB',
        'WB',
        'Settings',
        'Cache',
        'Stats',
        'Ratings',

        // Global variables
        'PKJSON',
        'escape',
        'chrome',
        '$',
        'event',
        'Image',
        'screen',
        'countryList',
        'Chart',
        'requestIdleCallback',
        'scheduler'
      ]
    }, (error, res) => {
      if (error) return reject(error)
      resolve(res)
    })
  })
}

gulp.task('standard', () => {
  return sd().then(res => {
    let skipErrors = 0
    let countError = 0

    for (const i in res.results) {
      const r = res.results[i]
      for (const j in r.messages) {
        const e = r.messages[j]
        if (e.message.match(/is assigned a value/)) {
          skipErrors++
          continue
        }
        if (!countError) console.log('Standard: Use JavaScript Standard Style (https://standardjs.com)\n')
        countError++
        console.log('%s:%s:%s: %s', r.filePath, e.line, e.column, e.message)
      }
    }

    console.log('\nStandard finished: %d warning(s), %d error(s)', res.warningCount, (res.errorCount - skipErrors))
    console.log('=> %d warning(s) and %d error(s) can be fixed with `gulp standard:fix`', res.fixableWarningCount, res.fixableErrorCount)
  })
})

gulp.task('standard:fix', () => {
  return sd(true)
})

// build app from sources
gulp.task('build', gulp.series('npm:modclean', 'mpv', 'nwjs', 'build:nwjsclean', 'build:prune', 'build:modclean'))

// create redistribuable packages
gulp.task('dist', gulp.series('build', 'build:nsis'))
