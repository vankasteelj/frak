'use strict';

/*************** 
 * dependencies *
 ***************/
const gulp = require('gulp'),
    glp = require('gulp-load-plugins')(),
    runSequence = require('run-sequence'),
    nwBuilder = require('nw-builder'),
    del = require('del'),
    currentPlatform = require('nw-builder/lib/detectCurrentPlatform.js'),
    yargs = require('yargs'),
    fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    pkJson = require('./package.json'),
    got = require('got'),
    z7 = require('node-7z-forall'),
    temp = require('os').tmpdir(),
    modClean = require('modclean').ModClean;

/******** 
 * setup *
 ********/
const nwVersion = pkJson.nwjs.version,
    flavor = pkJson.nwjs.flavor,
    availablePlatforms = ['linux64', 'win64', 'osx64'],
    releasesDir = 'build';

/***********
 *  custom  *
 ***********/
// returns an array of platforms that should be built
const parsePlatforms = () => {
    const requestedPlatforms = (yargs.argv.platforms || currentPlatform()).split(','),
        validPlatforms = [];

    for (let i in requestedPlatforms) {
        if (availablePlatforms.indexOf(requestedPlatforms[i]) !== -1) {
            validPlatforms.push(requestedPlatforms[i]);
        }
    }

    // for osx and win, 32-bits works on 64, if needed
    if (availablePlatforms.indexOf('win64') === -1 && requestedPlatforms.indexOf('win64') !== -1) {
        validPlatforms.push('win32');
    }
    if (availablePlatforms.indexOf('osx64') === -1 && requestedPlatforms.indexOf('osx64') !== -1) {
        validPlatforms.push('osx32');
    }

    // remove duplicates
    validPlatforms.filter((item, pos) => {
        return validPlatforms.indexOf(item) === pos;
    });

    return requestedPlatforms[0] === 'all' ? availablePlatforms : validPlatforms;
};

// returns an array of paths with the node_modules to include in builds
const parseReqDeps = () => {
    return new Promise((resolve, reject) => {
        exec('npm ls --production=true --parseable=true', (error, stdout, stderr) => {
            if (error || stderr) {
                reject(error || stderr);
            } else {
                // build array
                let npmList = stdout.split('\n');

                // remove empty or soon-to-be empty
                npmList = npmList.filter((line) => {
                    return line.replace(process.cwd().toString(), '');
                });

                // format for nw-builder
                npmList = npmList.map((line) => {
                    return line.replace(process.cwd(), '.') + '/**';
                });

                // return
                resolve(npmList);
            }
        });
    });
};


/************* 
 * gulp tasks *
 *************/

// download and compile nwjs
gulp.task('nwjs', () => {
    const nwOptions = {
        files: ['./app/**', './package.json', './README.md', './plugins/**', './mpv/**', './node_modules/**'],
        buildDir: releasesDir,
        appName: pkJson.releaseName,
        appVersion: pkJson.version,
        zip: false,
        version: nwVersion,
        flavor: flavor,
        macIcns: pkJson.macIcns,
        platforms: parsePlatforms()
    };

    // windows-only (or wine): replace icon & VersionInfo1.res
    if (currentPlatform().indexOf('win') !== -1) {
        nwOptions.winIco = pkJson.icon;
        nwOptions.winVersionString = {
            Comments: pkJson.description,
            CompanyName: pkJson.homepage,
            FileDescription: pkJson.releaseName,
            FileVersion: pkJson.version,
            InternalName: pkJson.name,
            OriginalFilename: pkJson.name + '.exe',
            ProductName: pkJson.releaseName,
            ProductVersion: pkJson.version
        };
    }

    const nw = new nwBuilder(nwOptions).on('log', console.log);

    return nw.build();
});


// start app in development
gulp.task('run', () => {
    return new Promise((resolve, reject) => {
        const platform = parsePlatforms()[0];
        let bin = path.join('cache', nwVersion + '-' + flavor, platform);

        // path to nw binary
        switch (platform.slice(0, 3)) {
            case 'osx':
                bin += '/nwjs.app/Contents/MacOS/nwjs';
                break;
            case 'lin':
                bin += '/nw';
                break;
            case 'win':
                bin += '/nw.exe';
                break;
            default:
                reject(new Error('Unsupported %s platform', platform));
        }

        console.log('Running %s from cache', platform);

        // spawn cached binary with package.json, toggle flags
        const dev = yargs.argv.development ? '--development' : '';
        const bp = yargs.argv.bp ? '--bp' : '';
        const child = spawn(bin, ['.', dev, bp]);

        // nwjs console speaks to stderr
        child.stderr.on('data', (buf) => {
            console.log(buf.toString());
        });

        child.on('close', (exitCode) => {
            console.log('%s exited with code %d', pkJson.name, exitCode);
            resolve();
        });

        child.on('error', (error) => {
            if (error.code === 'ENOENT') {
                // nw binary most probably missing
                console.log('%s-%s is not available in cache. Try running `gulp build` beforehand', nwVersion, platform);
            }
            reject(error);
        });
    });
});

// default is help, because we can!
gulp.task('default', () => {
    console.log([
        '\nBasic usage:',
        ' gulp run\tStart the application',
        ' gulp build\tBuild the application',
        ' gulp dist\tCreate a redistribuable package',
        '\nAvailable options:',
        ' --development\t\t\tStart in dev mode',
        '\tExample:   `gulp run --development`',
        ' --platforms=<platform>\t\tBuild for specific platform(s)',
        '\tArguments: ' + availablePlatforms + ',all',
        '\tExample:   `gulp build --platforms=all`',
        '\nUse `gulp --tasks` to show the task dependency tree of gulpfile.js\n'
    ].join('\n'));
});

// compile nsis installer
gulp.task('build:nsis', () => {
    return Promise.all(parsePlatforms().map((platform) => {

        // nsis is for win only
        if (platform.match(/osx|linux/) !== null) {
            console.log('No `nsis` task for', platform);
            return null;
        }

        return new Promise((resolve, reject) => {
            console.log('Packaging nsis for: %s', platform);

            // spawn isn't exec
            const makensis = process.platform === 'win32' ? 'makensis.exe' : 'makensis';

            const child = spawn(makensis, [
                '-DARCH=' + platform,
                '-DOUTDIR=' + path.join(process.cwd(), releasesDir),
                'dist/win-installer.nsi'
            ]);

            // display log only on failed build
            const nsisLogs = [];
            child.stdout.on('data', (buf) => {
                nsisLogs.push(buf.toString());
            });

            child.on('close', (exitCode) => {
                if (!exitCode) {
                    console.log('%s nsis packaged in', platform, path.join(process.cwd(), releasesDir));
                } else {
                    if (nsisLogs.length) {
                        console.log(nsisLogs.join('\n'));
                    }
                    console.log('%s failed to package nsis', platform);
                }
                resolve();
            });

            child.on('error', (error) => {
                console.log(error);
                console.log(platform + ' failed to package nsis');
                resolve();
            });
        });
    })).catch(console.log);
});

// compile debian packages
gulp.task('build:deb', () => {
    return Promise.all(parsePlatforms().map((platform) => {

        // deb is for linux only
        if (platform.match(/osx|win/) !== null) {
            console.log('No `deb` task for:', platform);
            return null;
        }
        if (currentPlatform().indexOf('linux') === -1) {
            console.log('Packaging deb is only possible on linux');
            return null;
        }

        return new Promise((resolve, reject) => {
            console.log('Packaging deb for: %s', platform);

            const child = spawn('bash', [
                'dist/deb-maker.sh',
                platform,
                pkJson.name,
                pkJson.releaseName,
                pkJson.version,
                releasesDir
            ]);

            // display log only on failed build
            const debLogs = [];
            child.stdout.on('data', (buf) => {
                debLogs.push(buf.toString());
            });
            child.stderr.on('data', (buf) => {
                debLogs.push(buf.toString());
            });

            child.on('close', (exitCode) => {
                if (!exitCode) {
                    console.log('%s deb packaged in', platform, path.join(process.cwd(), releasesDir));
                } else {
                    if (debLogs.length) {
                        console.log(debLogs.join('\n'));
                    }
                    console.log('%s failed to package deb', platform);
                }
                resolve();
            });

            child.on('error', (error) => {
                console.log(error);
                console.log('%s failed to package deb', platform);
                resolve();
            });
        });
    })).catch(console.log);
});

// package in tgz (win) or in xz (unix)
gulp.task('build:compress', () => {
    return Promise.all(parsePlatforms().map((platform) => {

        // don't package win, use nsis
        if (platform.indexOf('win') !== -1) {
            console.log('No `compress` task for:', platform);
            return null;
        }

        return new Promise((resolve, reject) => {
            console.log('Packaging tar for: %s', platform);

            const sources = path.join(releasesDir, pkJson.releaseName, platform);

            // compress with gulp on windows
            if (currentPlatform().indexOf('win') !== -1) {

                return gulp.src(sources + '/**')
                    .pipe(glp.tar(pkJson.name + '-' + pkJson.version + '_' + platform + '.tar'))
                    .pipe(glp.gzip())
                    .pipe(gulp.dest(releasesDir))
                    .on('end', () => {
                        console.log('%s tar packaged in %s', platform, path.join(process.cwd(), releasesDir));
                        resolve();
                    });

                // compress with tar on unix*
            } else {

                // using the right directory
                const platformCwd = platform.indexOf('linux') !== -1 ? '.' : pkJson.name + '.app';

                // list of commands
                const commands = [
                    'cd ' + path.join(process.cwd(), sources),
                    'tar --exclude-vcs -c ' + platformCwd + ' | $(command -v pxz || command -v xz) -T8 -7 > "' + path.join(process.cwd(), releasesDir, pkJson.name + '-' + pkJson.version + '_' + platform + '.tar.xz') + '"',
                    'echo "' + platform + ' tar packaged in ' + path.join(process.cwd(), releasesDir) + '" || echo "' + platform + ' failed to package tar"'
                ].join(' && ');

                exec(commands, (error, stdout, stderr) => {
                    if (error || stderr) {
                        console.log(error || stderr);
                        console.log('%s failed to package tar', platform);
                        resolve();
                    } else {
                        console.log(stdout.replace('\n', ''));
                        resolve();
                    }
                });
            }
        });
    })).catch(console.log);
});

// check entire sources for potential coding issues (tweak in .jshintrc)
gulp.task('jshint', () => {
    return gulp.src(['gulpfile.js', 'app/js/**/*.js', 'app/js/**/*.js', '!app/js/vendor/*.js'])
        .pipe(glp.jshint('.jshintrc'))
        .pipe(glp.jshint.reporter('jshint-stylish'))
        .pipe(glp.jshint.reporter('fail'));
});

// download mpv
gulp.task('mpv', () => {
    return Promise.all(parsePlatforms().map((platform) => {
        // bundled mpv is for win only
        if (platform.match(/osx|linux/) !== null) {
            console.log('No `mpv` task for', platform);
            return null;
        }

        return new Promise((resolve, reject) => {
            console.log('downloading mpv...');
            let stream = got.stream(pkJson.mpv.url, {
                ecdhCurve: 'auto'
            }).pipe(fs.createWriteStream(path.join(temp, 'mpv.7z')));
            stream.on('finish', resolve);
        }).then(() => {
            console.log('mpv downloaded, extracting...');
            let zip = new z7();
            return zip.extractFull(path.join(temp, 'mpv.7z'), 'mpv');
        }).then(() => {
            console.log('mpv extracted');
            console.log('downloading youtube-dl...');
            return new Promise((resolve, reject) => {
                let stream = got.stream(pkJson.mpv['youtube-dl']).pipe(fs.createWriteStream('mpv/youtube-dl.exe'));
                stream.on('finish', resolve);
            });
        }).then(() => {
            console.log('all done.')
        });
    }));
});

// remove unused libraries
gulp.task('build:nwjsclean', () => {
    return Promise.all(parsePlatforms().map((platform) => {
        const dirname = path.join(releasesDir, pkJson.name, platform);
        const removeArray = [
            dirname + '/pdf*',
            dirname + '/chrome*',
            dirname + '/nacl*',
            dirname + '/pnacl',
            dirname + '/payload*',
            dirname + '/nwjc*',
            dirname + '/credit*',
            dirname + '/debug*',
            dirname + '/swift*',
            dirname + '/notification_helper*',
            dirname + '/d3dcompiler*'
        ];
        console.log('Removing unused %s nwjs files...', platform);
        return del(removeArray);
    }));
});

// remove unused node_modules
gulp.task('npm:modclean', () => {
    const mc = new modClean();
    return mc.clean().then(r => {
        console.log('ModClean: %s files/folders removed', r.deleted.length);
    }).catch(console.log);
});

// npm prune the build/<platform>/ folder (to remove devDeps)
gulp.task('build:prune', () => {
    return Promise.all(parsePlatforms().map((platform) => {
        const dirname = path.join(releasesDir, pkJson.releaseName, platform);
        return new Promise((resolve, reject) => {
            exec('cd "' + dirname + '" && npm prune', (error, stdout, stderr) => {
                if (error || stderr) {
                    console.log('`npm prune` failed for %s\n', platform);
                    console.log(stderr || error);
                    console.log('\n\ncontinuing anyway...\n');
                    resolve();
                } else {
                    console.log(stdout);
                    resolve();
                }
            });
        });
    }));
});

// build app from sources
gulp.task('build', gulp.series('npm:modclean', 'mpv', 'nwjs', 'build:nwjsclean', 'build:prune'));

// create redistribuable packages
gulp.task('dist', gulp.series('build', 'build:compress', 'build:deb', 'build:nsis'));
