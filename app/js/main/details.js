'use strict'

const Details = {
    default: undefined,
    model: undefined,
    from: undefined,
    previous: {
        id: undefined,
        hmtl: undefined
    },

    getData: (elm) => {
        // extract json from data div
        let id = $(elm).context.offsetParent && $(elm).context.offsetParent.id || $(elm).context.id;
        let data = JSON.parse($(`#${id}`).find('.data').text());

        return data;
    },

    loadImage: (url, type) => {
        url = Images.reduce(url, type === 'poster');

        Items.getImage(url).then(state => {
            if (!state) return;
            
            if (type == 'poster') {
                $('#details .poster').css('background-image', `url('${url}')`);
            } else {
                $('#details .background').css('background-image', `url('${url}')`).css('opacity', 0.7);
            }
        });
    },

    loadDetails: (d, from = 'collection') => {
        Details.from = from;
        Details.fromScroll = window.scrollY;

        if (d.id === Details.previous.id && Player.mpv.isRunning()) {
            console.info('Returning to previous details window');
            $('#details').html(Details.previous.html).show();
            $(`#${Details.from}`).hide();
            $('#playing').hide();

            if (Player.mpv.isRunning() || Streamer.client) {
                $('#details-sources').hide();
                $('#details-loading').show();                
            }

            return;
        } else { //reset
            if (Details.previous.id && !Player.mpv.isRunning()) {
                console.info('Reset previous details');
                Details.previous = {
                    id: undefined,
                    html: undefined
                }
            }
            $('#details').html(Details.default);
            Boot.setupRightClicks('#query');
            Details.model = d.data;
            $('#playing').hide();
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

        // search online
        if (Object.keys(Plugins.loaded).length) {
            let type = d.data.show && 'show' || d.data.movie && 'movie';
            if (type) {
                let keywords = d.data[type].title;

                if (d.data.show) {
                    let s = Misc.pad(d.data.next_episode.season);
                    let e = Misc.pad(d.data.next_episode.number);
                    keywords += ` s${s}e${e}`;
                }

                keywords = keywords
                    .replace('\'', '')
                    .replace(/\W/ig, ' ')
                    .replace(/\s+/g, ' ')
                    .toLowerCase();

                $('#query').val(keywords);
                $('#query').keypress((e) => {
                    if (e.which === 13) $('#details-sources .query .search').click();
                });
                $('#details-sources .query .search').click();
                $('#details-sources .query').show();
            }
        }

        $('#details').show();
        $(`#${Details.from}`).hide();
    },

    closeDetails: () => {
        if (Player.mpv.isRunning() && Details.previous.id === undefined) {
            Details.previous.id = $('#details .id').text();
            Details.previous.html = $('#details').html();
        }

        if (Details.previous.id) {
            let nav = $('#navbar .nav.active').attr('class');
            $('#playing').show().off('click').on('click', () => {
                $(`#navbar .${nav.split(' ')[1]}`).click();

                $(`#${Details.previous.id}`).click();
                $(`#${Details.previous.id} .play`).click();
            });
        }

        $(`#${Details.from}`).show();
        window.scrollTo(0, (Details.fromScroll || 0));
        $('#details').hide();
    },
    
    local: {
        movie: (elm) => {
            let file = Details.getData(elm);

            Details.loadDetails({
                id: Misc.slugify(file.path),
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

            Search.addLocal(file);
        },

        episode: (elm) => {
            event.stopPropagation(); // because of season.onClick...

            let file = Details.getData(elm);

            Details.loadDetails({
                id: Misc.slugify(file.path),
                data: file,
                ids: file.metadata.episode.ids,
                title: file.metadata.show.title,
                'ep-title': `S${Misc.pad(file.metadata.episode.season)}E${Misc.pad(file.metadata.episode.number)} - ` + file.metadata.episode.title,
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

            Search.addLocal(file);
        },
    
        unmatched: (elm) => {
            let file = Details.getData(elm);

            // reset the details view;
            $('#details').html(Details.default);
            $('#playing').hide();
            Details.model = undefined;
            Details.previous = {
                id: undefined,
                html: undefined
            }
            Boot.setupRightClicks('#query');

            Details.closeRemote().then(() => {
                Player.play(file.path);
            });
        }
    },

    trakt: {
        movie: (elm, from) => {
            let item = Details.getData(elm);

            Details.loadDetails({
                id: item.movie.ids.slug,
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
            }, from);

            let offline = Search.offline(item);
            if (offline) {
                console.info('Found match in local library', offline);
                Search.addLocal(offline);
            }
        },

        episode: (elm, from) => {
            let item = Details.getData(elm);

            Details.loadDetails({
                id: item.show.ids.slug,
                data: item,
                ids: item.show.ids,
                title: item.show.title,
                'ep-title': `S${Misc.pad(item.next_episode.season)}E${Misc.pad(item.next_episode.number)} - ` + item.next_episode.title,
                synopsis: item.show.overview,
                year: item.show.year,
                rating: parseFloat(item.show.rating).toFixed(1),
                runtime: item.show.runtime,
                genres: item.show.genres,
                fanart: item.show.images.fanart || item.show.images.poster,
                poster: item.show.images.poster || item.show.images.fanart
            }, from);

            let offline = Search.offline(item);
            if (offline) {
                console.info('Found match in local library', offline);
                Search.addLocal(offline);
            }
        }
    },

    loadLocal: (elm) => {
        Details.closeRemote().then(() => {
            let file = Details.getData(elm);

            Loading.local(file);
            $('#details-loading').show();
            $('#details-sources').hide();
        });
    },

    loadRemote: (magnet) => {
        $('#details-spinner').show();
        $('#details-sources').hide();

        Details.closeRemote().then(() => {
            return Streamer.start(magnet).then(url => {
                Loading.remote(url);
                $('#details-loading').show();
                $('#details-sources').hide();
                $('#details-spinner').hide();
            });
        }).catch((err) => {
            console.error(err);
            Notify.snack(err.message);
            $('#details-spinner').hide();
            $('#details-sources').show();
        });
    },

    closeRemote: () => {
        let timeout = 0;
        return new Promise(resolve => {
            if (Player.mpv.isRunning()) {
                Player.quit();
                timeout = 300;
            }
            if (Streamer.client) {
                clearInterval(Loading.update);
                Loading.update = null;
                Streamer.stop();
                timeout = 300;
            }

            setTimeout(() => {
                resolve();
            }, timeout)
        });
    },

    loadNext: () => {
        let $next_episode = $(`#${Details.model.show.ids.slug}`);
        if (!$next_episode.length) {
            Details.closeDetails();
            return;
        }

        let data = JSON.parse($next_episode.find('.data').text());
        console.info('Next episode is ready', data);

        $('#details-sources').hide();
        $('#details-loading').hide();
        $('#details-spinner').hide();
        $('#details-next').show();

        $('#details-next .content .next-title span').text(`S${Misc.pad(data.next_episode.season)}E${Misc.pad(data.next_episode.number)} - ` + data.next_episode.title);

        $('#playnext').on('click', () => {
            Details.closeDetails();
            $next_episode.find('.play').click();
        });
    },

    loadLocalNext: () => {
        let collection = DB.get('local_shows');

        let findShow = (title) => collection.find((show) => show.metadata.show.title === title);
        let show = findShow(Details.model.metadata.show.title);

        let s = Details.model.metadata.episode.season;
        let e = Details.model.metadata.episode.number;

        let findNext = (s, e) => {
            let season = show.seasons[s];
            let episode = season && season.episodes[e];

            return episode && episode.path;
        };
        let next = findNext(s, e+1) || findNext(s+1, 1);

        if (next) {
            let $next_episode = $(`#${Misc.slugify(next)}`);
            if (!$next_episode.length) {
                Details.closeDetails();
                return;
            }

            let data = JSON.parse($next_episode.find('.data').text());
            console.info('Next episode is ready', data);

            $('#details-sources').hide();
            $('#details-loading').hide();
            $('#details-spinner').hide();
            $('#details-next').show();

            $('#details-next .content .next-title span').text(`S${Misc.pad(data.metadata.episode.season)}E${Misc.pad(data.metadata.episode.number)} - ` + data.metadata.episode.title);

            $('#playnext').on('click', () => {
                Details.closeDetails();
                $next_episode.click();
            });
        }
    }
}