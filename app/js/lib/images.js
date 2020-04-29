'use strict';

const Images = {
    defaults: {
        fanart: null,
        poster: null,
    },
    client: new(require('mdata'))({
        fanart: Settings.apikeys.fanart,
        tmdb: Settings.apikeys.tmdb,
        tvdb: Settings.apikeys.tvdb,
        omdb: Settings.apikeys.omdb
    }),

    get: {
        movie: (args) => {
            let cached = IB.get(args);
            if (cached.poster || cached.fanart) return Promise.resolve(cached);
            console.debug('Movie - getting poster/fanart for', args);
            return Images.client.images.movie(args).then((response) => {
                IB.store(response, args);
                return response;
            });
        },
        show: (args) => {
            let cached = IB.get(args);
            if (cached.poster || cached.fanart) return Promise.resolve(cached);
            console.debug('Show - getting poster/fanart for', args);
            return Images.client.images.show(args).then((response) => {
                IB.store(response, args);
                return response;
            });
        }
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
};