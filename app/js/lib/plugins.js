'use strict'

const Plugins = {
    loaded: {},
    load: () => {
        let dir = path.join(process.cwd(), 'plugins');

        //console.log('plugins - looking for', dir)

        fs.existsSync(dir) && fs.readdir(dir, (err, plugins) => {
            if (err) return;
            //console.log('plugins - directory exists, contains', plugins)

            for (let file of plugins) {
                let found = path.join(dir, file);
                if (fs.statSync(found).isFile()) return;

                let plugin = path.join(found, 'index.js');

                let tmp = require(plugin);

                Plugins.loaded[tmp.name] = tmp;

                console.info('Plugins - %s is ready', tmp.name);
            }
        });
    }
}