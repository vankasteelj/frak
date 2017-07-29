'use strict';

const Images = {
    client: new (require('mdata'))({
        fanart: Settings.apikeys.fanart,
        tmdb: Settings.apikeys.tmdb,
        tvdb: Settings.apikeys.tvdb
    }),
    
    get: {
        movie: (item) => {
            let args = {
                imdb: item.ids.imdb,
                tmdb: item.ids.tvdb
            };

            return Images.client.images.movies(args);
        }, 
        show: (item) => {
            let args = {
                imdb: item.show.ids.imdb,
                tvdb: item.show.ids.tvdb,
                tmdb: item.show.ids.tmdb
            };
            
            return Images.client.images.show(args);
        }, 
        
        episode: (item) => {
            let args = {
                imdb: item.show.ids.imdb,
                tvdb: item.show.ids.tvdb,
                tmdb: item.show.ids.tmdb, 
                season: item.next_episode.season,
                episode: item.next_episode.number
            };
            
            return Images.client.images.episode(args);
        }
    }
}