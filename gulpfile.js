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

// nw-builder configuration
const nw = new nwBuilder({
    files: [],
    buildDir: releasesDir,
    zip: false,
    macIcns: '',
    winIco: '',
    version: nwVersion,
    flavor: flavor,
    platforms: parsePlatforms()
}).on('log', console.log);


/************* 
 * gulp tasks *
 *************/
// start app in development
gulp.task('run', () => {
    return new Promise((resolve, reject) => {
        const platform = parsePlatforms()[0],
            bin = path.join('cache', nwVersion + '-' + flavor, platform);

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

// download and compile nwjs
gulp.task('nwjs', () => {
    return parseReqDeps().then((requiredDeps) => {
        // required files
        nw.options.files = ['./app/**', './package.json', './README.md', './plugins/**', './mpv/**'];
        // add node_modules
        nw.options.files = nw.options.files.concat(requiredDeps);
        // remove junk files
        nw.options.files = nw.options.files.concat(['!./node_modules/**/*.bin', '!./node_modules/**/*.c', '!./node_modules/**/*.h', '!./node_modules/**/Makefile', '!./node_modules/**/*.h', '!./**/test*/**', '!./**/doc*/**', '!./**/example*/**', '!./**/demo*/**', '!./**/bin/**', '!./**/build/**', '!./**/.*/**']);

        return nw.build();
    });
});

// compile nsis installer
gulp.task('build:nsis', () => {
    return Promise.all(nw.options.platforms.map((platform) => {

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
    return Promise.all(nw.options.platforms.map((platform) => {

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
    return Promise.all(nw.options.platforms.map((platform) => {

        // don't package win, use nsis
        if (platform.indexOf('win') !== -1) {
            console.log('No `compress` task for:', platform);
            return null;
        }

        return new Promise((resolve, reject) => {
            console.log('Packaging tar for: %s', platform);

            const sources = path.join(releasesDir, pkJson.name, platform);

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
                    'cd ' + sources,
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
    return Promise.all(nw.options.platforms.map((platform) => {
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

// remove devDependencies from build folder
gulp.task('build:resourcehacker', () => {
    return Promise.all(nw.options.platforms.map((platform) => {
        // reshack is for win only
        if (platform.match(/osx|linux/) !== null) {
            console.log('No `build:resourcehacker` task for', platform);
            return null;
        }

        const dirname = path.join(releasesDir, pkJson.name, platform);
        const scripts = {
            replaceicon: [
                `-open "${dirname}/frak.exe"`,
                `-save "${dirname}/frak.exe"`,
                `-action addoverwrite`,
                `-res "${dirname}/app/images/frak-logo.ico"`,
                `-mask ICONGROUP,IDR_MAINFRAME,1033`
            ].join(' '),

            buildversioninfo: [
                `-open "${releasesDir}/VersionInfo1.rc"`,
                `-save "${releasesDir}/VersionInfo1.res"`,
                `-action compile`
            ].join(' '),

            removeversioninfo: [
                `-open "${dirname}/frak.exe"`,
                `-save "${dirname}/frak.exe"`,
                `-action delete`,
                `-mask VERSIONINFO,1,1033`
            ].join(' '),

            addversioninfo: [
                `-open "${dirname}/frak.exe"`,
                `-save "${dirname}/frak.exe"`,
                `-action addoverwrite`,
                `-res "build/VersionInfo1.res"`,
                `-mask VERSIONINFO,1,1033`
            ].join(' ')
        };

        const versionArray = pkJson.version.split('.');
        const versionInfo = `
            1 VERSIONINFO
            FILEVERSION ${versionArray[0]},${versionArray[1]},${versionArray[2]},0
            PRODUCTVERSION ${versionArray[0]},${versionArray[1]},${versionArray[2]},0
            FILEOS 0x4
            FILETYPE 0x1
            {
            BLOCK "StringFileInfo"
            {
                BLOCK "040904b0"
                {
                    VALUE "CompanyName", "${pkJson.name}"
                    VALUE "FileDescription", "${pkJson.name}"
                    VALUE "FileVersion", "${pkJson.version}"
                    VALUE "InternalName", "nw_exe"
                    VALUE "LegalCopyright", "Copyright 2018, The NW.js community and The Chromium Authors. All rights reserved."
                    VALUE "OriginalFilename", "nw.exe"
                    VALUE "ProductName", "nwjs"
                    VALUE "ProductVersion", "${nwVersion}"
                    VALUE "CompanyShortName", "${pkJson.name}"
                    VALUE "ProductShortName", "${pkJson.name}"
                    VALUE "LastChange", "${Date()}"
                }
            }

            BLOCK "VarFileInfo"
            {
                VALUE "Translation", 0x0409 0x04B0  
            }
        }`;

        let errors = [];
        const reshack = (task, script) => {
            return new Promise((resolve, reject) => {
                exec('ResourceHacker ' + script + ' -log CONSOLE', (error, stdout, stderr) => {
                    if (error || stderr) {
                        errors.push(stderr || error);
                        resolve();
                    } else {
                        console.log(task);
                        resolve();
                    }
                });
            });
        };

        return reshack('replace icon', scripts.replaceicon).then(() => {
            fs.writeFileSync('build/VersionInfo1.rc', versionInfo, (err) => {
                if (err) throw err;
                console.log('VersionInfo1.rc written!');
            })
            return reshack('build versionInfo', scripts.buildversioninfo)
        }).then(() => reshack('remove old versionInfo', scripts.removeversioninfo)).then(() => reshack('add new versionInfo', scripts.addversioninfo)).then(() => {
            if (errors.length) {
                console.log('`build:resourcehacker` failed for %s\n', platform);
                console.log(...errors);
                console.log('\ncontinuing anyway...\n');
            }
            return del([
                'build/VersionInfo1.rc',
                'build/VersionInfo1.res'
            ]);
        });
    }));
});

gulp.task('build:prune', () => {
    return Promise.all(nw.options.platforms.map((platform) => {
        const dirname = path.join(releasesDir, pkJson.name, platform);
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
gulp.task('build', gulp.series('npm:modclean', 'mpv', 'nwjs', 'build:nwjsclean', 'build:prune', 'build:resourcehacker'));

// create redistribuable packages
gulp.task('dist', gulp.series('build', 'build:compress', 'build:deb', 'build:nsis'));
