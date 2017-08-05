'use strict'

const Loading = {
    getData: (elm) => {
        let id = $(elm).context.id;
        let file = JSON.parse($(`#${id} .data`).text());
        
        console.info('Loading', file);

        return file;
    },

    localMovie: (elm) => {
        let file = Loading.getData(elm);

        //Player.play(file.path);
    },

    localEpisode: (elm) => {
        let file = Loading.getData(elm)
    },
    
    localUnmatched: (elm) => {
        let file = Loading.getData(elm);
        Player.play(file.path);
    }
}