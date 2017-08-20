'use strict'

const Plugins = {
    loaded: {},
    available: {},
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

                    // add to db if missing
                    if (DB.get(tmp.name) === undefined) {
                        DB.store(tmp.name, false);
                    }

                    let active = DB.get(tmp.name);
                    Plugins.available[tmp.name] = {
                        name: tmp.name,
                        path: plugin,
                        require: tmp,
                        default: active
                    };

                    Plugins.addToSettings(Plugins.available[tmp.name]);
                } catch (e) {
                    console.info('Plugins - %s cannot be loaded', file, e);
                }
            }
        });
    },
    addToSettings: (plugin) => {
        let id = Date.now();
        let item = `<div class="option">`+
            `<div class="text">${plugin.name}</div>`+
            `<div class="action">`+
                `${i18n.__('no')}&nbsp;`+
                `<label class="switch">`+
                    `<input id="${id}" type="checkbox">`+
                    `<span class="slider round"></span>`+
                `</label>`+
                `&nbsp;${i18n.__('yes')}`+
            `</div>`+
        `</div>`;

        $('#settings .plugins').append(item);

        $(`#${id}`).off('click').on('click', (evt) => {
            let isActive = evt.toElement.checked;
            DB.store(isActive, plugin.name);
            
            if (isActive) {
                console.info('Plugins - %s is loaded', plugin.name);
                Plugins.loaded[plugin.name] = plugin.require;
            } else {
                console.info('Plugins - %s disabled', plugin.name);
                delete Plugins.loaded[plugin.name];
            }
        });

        if (plugin.default) {
            $(`#${id}`).click();
        }
    }
}