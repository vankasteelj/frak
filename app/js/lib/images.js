'use strict';

const Images = {
    client: new (require('mdata'))({
        fanart: Settings.apikeys.fanart,
        tmdb: Settings.apikeys.tmdb,
        tvdb: Settings.apikeys.tvdb
    }),
    
    get: {
        movie: (args) => Images.client.images.movie(args),
        show: (args) => Images.client.images.show(args),        
        episode: (args) => Images.client.images.episode(args)
    },

    reduce: (link) => {
        if (!link) {
            return null;
        }

        if (link.match('assets.fanart.tv')) {
            link = link.replace('fanart.tv/fanart', 'fanart.tv/preview');
        } else if (link.match('image.tmdb.org')) {
            link = link.replace('w780', 'w342').replace('/original/', '/w1280/');
        } /*else if (link.match('tvdb.com')) {
            link = link.replace('banners/', 'banners/_cache/');
        }*/

        return link;
    }
}