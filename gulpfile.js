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
const { detectCurrentPlatform } = require('nw-builder/dist/index.cjs')
require('dns').setDefaultResultOrder('ipv4first') // workaround for yt-dl on node > 0.17.x

/** ******
 * setup *
 ********/
const nwVersion = pkJson.nwjs.version
const flavor = pkJson.nwjs.flavor
const availablePlatforms = ['linux64', 'win64', 'osx64']
const releasesDir = 'build'

/***********
 *  custom  *
 ***********/
// returns an array of platforms that should be built
const parsePlatforms = () => {
  const requestedPlatforms = (yargs.argv.platforms || detectCurrentPlatform(process)).split(',')
  const validPlatforms = []

  for (const i in requestedPlatforms) {
    if (availablePlatforms.indexOf(requestedPlatforms[i]) !== -1) {
      validPlatforms.push(requestedPlatforms[i])
    }
  }

  // for osx and win, 32-bits works on 64, if needed
  if (availablePlatforms.indexOf('win64') === -1 && requestedPlatforms.indexOf('win64') !== -1) {
    validPlatforms.push('win32')
  }
  if (availablePlatforms.indexOf('osx64') === -1 && requestedPlatforms.indexOf('osx64') !== -1) {
    validPlatforms.push('osx32')
  }

  // remove duplicates
  return [...new Set(requestedPlatforms[0] === 'all' ? availablePlatforms : validPlatforms)]
}

/** ***********
 * gulp tasks *
 *************/

// download and compile nwjs
gulp.task('nwjs', () => {
  const nwOptions = {
    files: ['./app/**', './package.json', './README.md', './plugins/**', './mpv/**', './mpv-conf/**', './node_modules/**'],
    buildDir: releasesDir,
    appName: pkJson.releaseName,
    appVersion: pkJson.version,
    zip: false,
    version: nwVersion,
    flavor: flavor,
    macIcns: pkJson.macIcns,
    platforms: parsePlatforms()
  }

  // windows-only (or wine): replace icon & VersionInfo1.res
  if (detectCurrentPlatform(process).indexOf('win') !== -1) {
    nwOptions.winVersionString = {
      Comments: pkJson.description,
      CompanyName: pkJson.homepage,
      FileDescription: pkJson.releaseName,
      FileVersion: pkJson.version,
      InternalName: pkJson.name,
      OriginalFilename: `${pkJson.name}.exe`,
      ProductName: pkJson.releaseName,
      ProductVersion: pkJson.version
    }
  }

  const NwBuilder = require('nw-builder')
  const nw = new NwBuilder(nwOptions).on('log', console.log)

  return nw.build()
})

// start app in development
gulp.task('run', () => {
  return new Promise((resolve, reject) => {
    const platform = parsePlatforms()[0]
    let bin = path.join('cache', `${nwVersion}-${flavor}`, platform)

    switch (platform.slice(0, 3)) {
      case 'osx':
        bin += '/nwjs.app/Contents/MacOS/nwjs'
        break
      case 'lin':
        bin += '/nw'
        break
      case 'win':
        bin += '/nw.exe'
        break
      default:
        return reject(new Error(`Unsupported ${platform} platform`))
    }

    console.log('Running %s from cache', platform)

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
        console.log('%s-%s is not available in cache. Try running `gulp build` beforehand', nwVersion, platform)
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
    ' --platforms=<platform>\t\tBuild for specific platform(s)',
    '\tArguments: ' + availablePlatforms + ',all',
    '\tExample:   `gulp build --platforms=all`',
    '\nUse `gulp --tasks` to show the task dependency tree of gulpfile.js\n'
  ].join('\n'))
  return Promise.resolve()
})

// compile nsis installer
gulp.task('build:nsis', () => {
  return Promise.all(parsePlatforms().map((platform) => {
    if (platform.match(/osx|linux/) !== null) {
      console.log('No `nsis` task for', platform)
      return null
    }

    return new Promise((resolve) => {
      console.log('Packaging nsis for: %s', platform)

      const makensis = process.platform === 'win32' ? 'makensis.exe' : 'makensis'

      const child = spawn(makensis, [
        '-DARCH=' + platform,
        '-DOUTDIR=' + path.join(process.cwd(), releasesDir),
        'dist/win-installer.nsi'
      ])

      const nsisLogs = []
      child.stdout.on('data', (buf) => {
        nsisLogs.push(buf.toString())
      })

      child.on('close', (exitCode) => {
        if (!exitCode) {
          console.log('%s nsis packaged in', platform, path.join(process.cwd(), releasesDir))
        } else {
          if (nsisLogs.length) {
            console.log(nsisLogs.join('\n'))
          }
          console.log('%s failed to package nsis', platform)
        }
        resolve()
      })

      child.on('error', (error) => {
        console.log(error)
        console.log(platform + ' failed to package nsis')
        resolve()
      })
    })
  })).catch(console.log)
})

// compile debian packages
gulp.task('build:deb', () => {
  return Promise.all(parsePlatforms().map((platform) => {
    if (platform.match(/osx|win/) !== null) {
      console.log('No `deb` task for:', platform)
      return null
    }
    if (detectCurrentPlatform(process).indexOf('linux') === -1) {
      console.log('Packaging deb is only possible on linux')
      return null
    }

    return new Promise((resolve) => {
      console.log('Packaging deb for: %s', platform)

      const child = spawn('bash', [
        'dist/deb-maker.sh',
        platform,
        pkJson.name,
        pkJson.releaseName,
        pkJson.version,
        releasesDir
      ])

      const debLogs = []
      child.stdout.on('data', (buf) => {
        debLogs.push(buf.toString())
      })
      child.stderr.on('data', (buf) => {
        debLogs.push(buf.toString())
      })

      child.on('close', (exitCode) => {
        if (!exitCode) {
          console.log('%s deb packaged in', platform, path.join(process.cwd(), releasesDir))
        } else {
          if (debLogs.length) {
            console.log(debLogs.join('\n'))
          }
          console.log('%s failed to package deb', platform)
        }
        resolve()
      })

      child.on('error', (error) => {
        console.log(error)
        console.log('%s failed to package deb', platform)
        resolve()
      })
    })
  })).catch(console.log)
})

// package in tgz (win) or in xz (unix)
gulp.task('build:compress', () => {
  return Promise.all(parsePlatforms().map((platform) => {
    if (platform.indexOf('win') !== -1) {
      console.log('No `compress` task for:', platform)
      return null
    }

    return new Promise((resolve) => {
      console.log('Packaging tar for: %s', platform)

      const sources = path.join(releasesDir, pkJson.releaseName, platform)

      if (detectCurrentPlatform(process).indexOf('win') !== -1) {
        return gulp.src(sources + '/**')
          .pipe(glp.tar(`${pkJson.name}-${pkJson.version}_${platform}.tar`))
          .pipe(glp.gzip())
          .pipe(gulp.dest(releasesDir))
          .on('end', () => {
            console.log('%s tar packaged in %s', platform, path.join(process.cwd(), releasesDir))
            resolve()
          })
      } else {
        const platformCwd = platform.indexOf('linux') !== -1 ? '.' : `${pkJson.name}.app`
        const commands = [
          `cd ${path.join(process.cwd(), sources)}`,
          `tar --exclude-vcs -c ${platformCwd} | $(command -v pxz || command -v xz) -T8 -7 > "${path.join(process.cwd(), releasesDir, `${pkJson.name}-${pkJson.version}_${platform}.tar.xz`)}"`,
          `echo "${platform} tar packaged in ${path.join(process.cwd(), releasesDir)}" || echo "${platform} failed to package tar"`
        ].join(' && ')

        exec(commands, (error, stdout, stderr) => {
          if (error || stderr) {
            console.log(error || stderr)
            console.log('%s failed to package tar', platform)
            resolve()
          } else {
            console.log(stdout.replace('\n', ''))
            resolve()
          }
        })
      }
    })
  })).catch(console.log)
})

// download mpv
gulp.task('mpv', () => {
  return Promise.all(parsePlatforms().map((platform) => {
    if (platform.match(/osx|linux/) !== null) {
      console.log('No `mpv` task for', platform)
      return null
    }
    const location = path.join('cache', `mpv-${pkJson.mpv.version}.7z`)

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
  }))
})

// remove unused libraries
gulp.task('build:nwjsclean', () => {
  return Promise.all(parsePlatforms().map((platform) => {
    if (platform.match(/osx|linux/) !== null) {
      console.log('No `build:nwjsclean` task for', platform)
      return null
    }
    const dirname = path.posix.join(releasesDir, pkJson.releaseName, platform)
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
    console.log('Removing unused %s nwjs files from %s...', platform, dirname)
    return del(removeArray).then(console.log).catch(console.error)
  }))
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
  return Promise.all(parsePlatforms().map((platform) => {
    const mc = new ModClean({
      cwd: path.join(releasesDir, pkJson.releaseName, platform, 'node_modules'),
      patterns: ['default:safe']
    })
    return mc.clean().then(r => {
      console.log('ModClean - Build: %s files/folders removed', r.deleted.length)
    }).catch(console.log)
  }))
})

// npm prune the build/<platform>/ folder (to remove devDeps)
gulp.task('build:prune', () => {
  return Promise.all(parsePlatforms().map((platform) => {
    const dirname = path.join(releasesDir, pkJson.releaseName, platform)
    return new Promise((resolve) => {
      exec(`cd "${dirname}" && npm prune --omit=dev`, (error, stdout, stderr) => {
        if (error || stderr) {
          console.log('`npm prune` failed for %s\n', platform)
          console.log(stderr || error)
          console.log('\n\ncontinuing anyway...\n')
          resolve()
        } else {
          console.log(stdout)
          resolve()
        }
      })
    })
  }))
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
gulp.task('dist', gulp.series('build', 'build:compress', 'build:deb', 'build:nsis'))
