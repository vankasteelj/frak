'use strict'

const Details = {
    getData: (elm) => {
        let id = $(elm).context.id;
        let file = JSON.parse($(`#${id} .data`).text());
        
        console.info('Details', file);

        return file;
    },

    localMovie: (elm) => {
        let file = Details.getData(elm);

        //Player.play(file.path);
    },

    localEpisode: (elm) => {
        let file = Details.getData(elm)
    },
    
    localUnmatched: (elm) => {
        let file = Details.getData(elm);
    }
}