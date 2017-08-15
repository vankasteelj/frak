'use strict'

const Plugins = {
    loaded: {},
    load: () => {
        let dir = path.join(process.cwd(), 'plugins');

        fs.existsSync(dir) && fs.readdir(dir, (err, plugins) => {
            if (err) return;
            console.info('Plugins - loading:', plugins.join(', '));

            for (let file of plugins) {
                try {
                    let found = path.join(dir, file);
                    let plugin;
                    if (fs.statSync(found).isFile()) {
                        // load index files
                        plugin = found;
                    } else {
                        // load complete modules
                        plugin = path.join(found, 'index.js');
                    }

                    let tmp = require(plugin);

                    Plugins.loaded[tmp.name] = tmp;

                    console.info('Plugins - %s is ready', tmp.name);
                } catch (e) {
                    console.info('Plugins - %s cannot be loaded', file, e);
                }
            }
        });
    }
}