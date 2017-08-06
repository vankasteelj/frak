'use strict'

const Details = {
    default: undefined,
    previous: {
        id: undefined,
        hmtl: undefined
    },

    getData: (elm) => {
        // extract json from data div
        let id = $(elm).context.offsetParent.id || $(elm).context.id;
        let data = JSON.parse($(`#${id} .data`).text());
        
        console.log('details', data);

        return data;
    },

    loadImage: (url, type) => {
        url = Images.reduce(url, true); // because small+blur

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
        $('#details .data').text(JSON.stringify(d.data));

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

        d['ep-title'] && $('#details-metadata .ep-title').show().text(d['ep-title']) || $('#details-metadata .ep-title').hide();
        $('#details-metadata .synopsis').text(d.synopsis == 'No overview found.' ? i18n.__('No synopsis available') : d.synopsis || i18n.__('No synopsis available'));

        d.year && $('#details-metadata .year').text(d.year).show() || $('#details-metadata .year').hide();
        d.runtime && $('#details-metadata .runtime').text(`${d.runtime} ${i18n.__('min')}`).show() || $('#details-metadata .runtime').hide();
        d.rating && $('#details-metadata .rating').text(`${d.rating} / 10`).show() || $('#details-metdata .runtime').hide();

        if (d.genres) {
            let genre = Array();
            for (let g of d.genres) {
                genre.push(i18n.__(Misc.capitalize(g)));
            }
            $('#details-metadata .genres').show().text(genre.join(' / '));
        } else {
            $('#details-metadata .genres').hide();
        }

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
                data: file,
                ids: file.metadata.movie.ids,
                title: file.metadata.movie.title,
                synopsis: file.metadata.movie.overview,
                year: file.metadata.movie.year,
                rating: parseFloat(file.metadata.movie.rating).toFixed(1),
                runtime: file.metadata.movie.runtime,
                genres: file.metadata.movie.genres
            });

            Images.get.movie(file.metadata.movie.ids).then(images => {
                file.metadata.movie.images = images;

                Details.loadImage(images.fanart || images.poster, 'fanart');
                Details.loadImage(images.poster || images.fanart, 'poster');
            });

            Search.addLocal(file)
        },

        episode: (elm) => {
            event.stopPropagation(); // because of season.onClick...

            let file = Details.getData(elm);

            Details.loadDetails({
                id: Items.slugify(file.path),
                data: file,
                ids: file.metadata.episode.ids,
                title: file.metadata.show.title,
                'ep-title': `S${Items.pad(file.metadata.episode.season)}E${Items.pad(file.metadata.episode.number)} - ` + file.metadata.episode.title,
                synopsis: file.metadata.show.overview,
                year: file.metadata.show.year,
                rating: parseFloat(file.metadata.show.rating).toFixed(1),
                runtime: file.metadata.show.runtime,
                genres: file.metadata.show.genres
            });

            Images.get.show(file.metadata.show.ids).then(images => {
                file.metadata.show.images = images;

                Details.loadImage(images.fanart || images.poster, 'fanart');
                Details.loadImage(images.poster || images.fanart, 'poster');
            });

            Search.addLocal(file)
        },
    
        unmatched: (elm) => {
            let file = Details.getData(elm);
        }
    },

    trakt: {
        movie: (elm) => {
            let item = Details.getData(elm);

            Details.loadDetails({
                id: Items.slugify(item.movie.title),
                data: item,
                ids: item.movie.ids,
                title: item.movie.title,
                synopsis: item.movie.overview,
                year: item.movie.year,
                rating: parseFloat(item.movie.rating).toFixed(1),
                runtime: item.movie.runtime,
                genres: item.movie.genres,
                fanart: item.movie.images.fanart || item.movie.images.poster,
                poster: item.movie.images.poster || item.movie.images.fanart
            });

            let offline = Search.offline(item);
            if (offline) {
                console.log('Found match in local library', offline);
                Search.addLocal(offline);
            }
        },

        episode: (elm) => {
            let item = Details.getData(elm);

            Details.loadDetails({
                id: Items.slugify(item.show.title),
                data: item,
                ids: item.show.ids,
                title: item.show.title,
                'ep-title': `S${Items.pad(item.next_episode.season)}E${Items.pad(item.next_episode.number)} - ` + item.next_episode.title,
                synopsis: item.show.overview,
                year: item.show.year,
                rating: parseFloat(item.show.rating).toFixed(1),
                runtime: item.show.runtime,
                genres: item.show.genres,
                fanart: item.show.images.fanart || item.show.images.poster,
                poster: item.show.images.poster || item.show.images.fanart
            });

            let offline = Search.offline(item);
            if (offline) {
                console.log('Found match in local library', offline);
                Search.addLocal(offline);
            }
        }
    },

    loadLocal: (elm) => {
        let file = Details.getData(elm);

        Loading.local(file);
        $('#details-loading').show();
        $('#details-sources').hide();
    }
}