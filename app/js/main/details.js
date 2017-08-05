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

        Images.get.movie(file.metadata.movie.ids).then(images => {
            file.metadata.movie.images = images;
            console.log('images', images)
        });
    },

    localEpisode: (elm) => {
        event.stopPropagation();
        let file = Details.getData(elm);

        Images.get.show(file.metadata.show.ids).then(images => {
            file.metadata.show.images = images;
            console.log('images', images)
        });
    },
    
    localUnmatched: (elm) => {
        let file = Details.getData(elm);
    }
}