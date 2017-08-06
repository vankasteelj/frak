'use strict'

const Details = {
    default: undefined,
    previous: {
        id: undefined,
        hmtl: undefined
    },

    getData: (elm) => {
        // extract json from data div
        let id = $(elm).context.id;
        let file = JSON.parse($(`#${id} .data`).text());
        
        console.log('details', file);

        return file;
    },

    loadImage: (url, type) => {
        Items.getImage(url).then(state => {
            if (!state) return;
            
            if (type == 'poster') {
                $('#details .poster').css('background-image', `url('${url}')`);
            } else {
                $('#details .background').css('background-image', `url('${url}')`).css('opacity',.7);
            }
        });
    },

    loadDetails: (d) => {
        if (d.id === Details.previous.id) {
            console.info('Returning to previous details window')
            $('#details').html(Details.previous.html).show();
            $('#collection').hide();
            return;
        } else {
            $('#details').html(Details.default); //reset
        }

        $('#details .id').text(d.id);

        if (d.ids) {
            d.ids.imdb && $('#details-metadata .ids .imdb').text(d.ids.imdb);
            d.ids.trakt && $('#details-metadata .ids .trakt').text(d.ids.trakt);
            d.ids.tmdb && $('#details-metadata .ids .tmdb').text(d.ids.tmdb);
            d.ids.tvdb && $('#details-metadata .ids .tvdb').text(d.ids.tvdb);
        }

        Details.loadImage(d.fanart, 'fanart');
        Details.loadImage(d.poster, 'poster');

        $('#details-metadata .title').text(d.title);

        if (d.title.length > 40) {
            $('#details-metadata .title').css('font-size', `${d.title.length > 50 ? 40 : 35}px`);
        }

        d['ep-title'] && $('#details-metadata .ep-title').text(d['ep-title']);
        $('#details-metadata .synopsis').text(d.synopsis || i18n.__('No synopsis available'));

        d.year && $('#details-metadata .year').text(d.year).show() || $('#details-metadata .year').hide();
        d.runtime && $('#details-metadata .runtime').text(`${d.runtime} ${i18n.__('min')}`).show() || $('#details-metadata .runtime').hide();
        d.rating && $('#details-metadata .rating').text(`${d.rating} / 10`).show() || $('#details-metdata .runtime').hide();

        $('#details').show();
        $('#collection').hide();
    },

    closeDetails: () => {
        if (Player.mpv.isRunning()) {
            Details.previous.id = $('#details .id').text();
            Details.previous.html = $('#details').html();
        } else {
            Details.previous = {
                id: undefined,
                html: undefined
            }
        }

        $('#collection').show();
        $('#details').hide();
    },
    
    local: {
        movie: (elm) => {
            let file = Details.getData(elm);

            Details.loadDetails({
                id: Items.slugify(file.path),
                ids: file.metadata.movie.ids,
                title: file.metadata.movie.title,
                synopsis: file.metadata.movie.overview,
                year: file.metadata.movie.year,
                rating: parseFloat(file.metadata.movie.rating).toFixed(1),
                runtime: file.metadata.movie.runtime
            });

            Images.get.movie(file.metadata.movie.ids).then(images => {
                file.metadata.movie.images = images;

                Details.loadImage(images.fanart, 'fanart');
                Details.loadImage(images.poster, 'poster');
            });
        },

        episode: (elm) => {
            event.stopPropagation(); // because of season.onClick...

            let file = Details.getData(elm);

            Images.get.show(file.metadata.show.ids).then(images => {
                file.metadata.show.images = images;
                console.log('images', images)
            });
        },
    
        unmatched: (elm) => {
            let file = Details.getData(elm);
        }
    }
}