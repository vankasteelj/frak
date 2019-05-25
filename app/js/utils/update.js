'use strict';

const Update = {
    // STARTUP: check updates on app start, based on upstream git package.json
    check: () => {
        if (!DB.get('lookForUpdates')) return;

        if (DB.get('availableUpdate') > PKJSON.version) {
            Update.notify();
            return;
        }

        // only check every 7 days
        if (parseInt(DB.get('lastUpdateCheck')) + (1000*60*60*24*7) > Date.now()) return;
        DB.store(Date.now(), 'lastUpdateCheck');
        
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
                    DB.store(data.version, 'availableUpdate');
                    DB.store(data.releases, 'availableUpdateUrl');
                    console.info('Update %s available:', data.version, data.releases);
                    Update.notify();
                } else {
                    DB.remove('availableUpdate');
                    DB.remove('availableUpdateUrl');
                    console.debug('No update available');
                }
            });
        }).on('error', (e) => {
            console.error('Unable to look for updates', e);
        });
    },

    notify: () => {
        let message = `<a onClick="Misc.openExternal('${DB.get('availableUpdateUrl')}')">`+
                `<b>${i18n.__('Update %s available', DB.get('availableUpdate'))}</b>`+
                `<br>`+
                `<b>${i18n.__('Download it here!')}</b>`+
            `</a>`;
        Notify.snack(message, 60000);
    }
};
