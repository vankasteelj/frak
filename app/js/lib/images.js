'use strict';

const Images = {
    timeout: 5000,
    defaults: {
        fanart: null,
        poster: null,
    },
    client: new (require('mdata'))({
        fanart: Settings.apikeys.fanart,
        tmdb: Settings.apikeys.tmdb,
        tvdb: Settings.apikeys.tvdb
    }),
    
    get: {
        movie: (args) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    return resolve(Images.defaults);
                }, Images.timeout);

                let cached = IB.get(args);
                if (cached) {
                    return resolve(cached);
                }

                return Images.client.images.movie(args).then((response) => {
                    IB.store(response, args);
                    resolve(response);
                });
            })
        },
        show: (args) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    return resolve(Images.defaults);
                }, Images.timeout);

                let cached = IB.get(args);
                if (cached) {
                    return resolve(cached);
                }

                return Images.client.images.show(args).then(resolve)
            })
        },
        /*episode: (args) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    return resolve(Images.defaults);
                }, Images.timeout)
                return Images.client.images.episode(args).then(resolve)
            })
        }*/
    },

    reduce: (link, full) => {
        if (!link) {
            return null;
        }

        full && link.match('assets.fanart.tv') && (link = link.replace('fanart.tv/fanart', 'fanart.tv/preview'));
        
        link.match('image.tmdb.org') && (link = link.replace('w780', 'w342').replace('/original/', '/w1280/'));
        
        full && link.match('tvdb.com') && (link = link.replace('banners/', 'banners/_cache/'));

        return link;
    }
}