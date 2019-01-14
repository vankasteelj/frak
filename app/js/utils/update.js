'use strict';

const Update = {
    // STARTUP: check updates on app start, based on upstream git package.json
    check: () => {
        if (!DB.get('lookForUpdates')) return;

        if (localStorage.availableUpdate > PKJSON.version) {
            Update.notify();
            return;
        }

        // only check every 7 days
        if (parseInt(localStorage.lastUpdateCheck) + (1000*60*60*24*7) > Date.now()) return;
        localStorage.lastUpdateCheck = Date.now();
        
        // fetch remote package.json
        const url = PKJSON.updateEndpoint;
        url && https.get(url, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk.toString();
            });

            res.on('end', () => {
                const data = JSON.parse(body);

                if (data.version > PKJSON.version) {
                    localStorage.availableUpdate = data.version;
                    localStorage.availableUpdateUrl = data.releases;
                    console.info('Update %s available:', data.version, data.releases);
                    Update.notify();
                } else {
                    localStorage.removeItem('availableUpdate');
                    localStorage.removeItem('availableUpdateUrl');
                    console.debug('No update available');
                }
            });
        }).on('error', (e) => {
            console.error('Unable to look for updates', e);
        });
    },

    notify: () => {
        let message = `<a onClick="Misc.openExternal('${localStorage.availableUpdateUrl}')">`+
                `<b>${i18n.__('Update %s available', localStorage.availableUpdate)}</b>`+
                `<br>`+
                `<b>${i18n.__('Download it here!')}</b>`+
            `</a>`;
        Notify.snack(message, 60000);
    }
};
