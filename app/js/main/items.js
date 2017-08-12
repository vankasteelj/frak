'use strict'

const Items = {
    getImage: (url) => {
        if (!url) return Promise.resolve(false);

        return new Promise(resolve => {
            let cache = new Image();
            cache.src = url;
            
            cache.onload = () => {
                resolve(true);
            }
            cache.onerror = (e) => {
                resolve(false);
            }
        });
    },

    constructMovie: (movie) => {
        let d = {
            image: Images.reduce(movie.movie.images.fanart) || movie.movie.images.poster,
            id: Misc.slugify(movie.movie.title) + '-trakt',
            data: JSON.stringify(movie),
            rating: Misc.percentage(movie.movie.rating),
            size: DB.get('small_items') ? 4 : 6
        }

        let item = `<div class="grid-item col-sm-${d.size}" id="${d.id}">`+
            `<span class="data">${d.data}</span>`+
            `<div class="fanart">`+
                `<img class="base" src="images/placeholder.png">`+
                `<div class="shadow"></div>`+
                `<div class="titles">`+
                    `<h3>${movie.movie.title}<span class="year">${movie.movie.year}</span></h3>`+
                `</div>`+
            `</div>`+
            `<div class="quick-icons">`+
                `<div class="actions">`+
                    `<div class="watched trakt-icon-check-thick" onClick="Items.markAsWatched(this)"></div>`+
                    `<div class="trailer fa fa-youtube-play" onClick="Interface.playTrailer('${movie.movie.trailer}')"></div>`+
                    `<div class="play trakt-icon-play2-thick" onClick="Details.trakt.movie(this)"></div>`+
                `</div>`+
                `<div class="metadata">`+
                    `<div class="percentage">`+
                        `<div class="fa fa-heart"></div>`+
                        `${d.rating}&nbsp%`+
                `</div>`+
            `</div>`+
        `</div>`;

        Items.getImage(d.image).then(state => {
            state && $(`#${d.id} .fanart`).css('background-image', `url('${d.image}')`) && $(`#${d.id} .fanart img`).css('opacity', '0');
            !movie.movie.trailer && $(`#${d.id} .trailer`).hide();
        })

        return item;
    },
    constructShow: (show) => {
        let d = {
            image: Images.reduce(show.show.images.fanart) || show.show.images.poster,
            id: Misc.slugify(show.show.title) + '-trakt',
            sxe: `s${Misc.pad(show.next_episode.season)}e${Misc.pad(show.next_episode.number)}`,
            data: JSON.stringify(show),
            rating: Misc.percentage(show.show.rating),
            size: DB.get('small_items') ? 4 : 6
        }

        let item = `<div class="grid-item col-sm-${d.size}" id="${d.id}">`+
            `<span class="data">${d.data}</span>`+
            `<div class="fanart">`+
                `<img class="base" src="images/placeholder.png">`+
                `<div class="shadow"></div>`+
                `<div class="titles">`+
                    `<h4>`+
                        `<span class="sxe">${d.sxe}</span>`+
                        `<span class="unseen">+${show.unseen - 1}</span>`+
                        `<span class="eptitle">${show.next_episode.title}</span>`+
                    `</h4><br/>`+
                    `<h3>${show.show.title}<span class="year">${show.show.year}</span></h3>`+
                `</div>`+
            `</div>`+
            `<div class="quick-icons">`+
                `<div class="actions">`+
                    `<div class="watched trakt-icon-check-thick" onClick="Items.markAsWatched(this)"></div>`+
                    `<div class="trailer fa fa-youtube-play" onClick="Interface.playTrailer('${show.show.trailer}')"></div>`+
                    `<div class="play trakt-icon-play2-thick" onClick="Details.trakt.episode(this)"></div>`+
                `</div>`+
                `<div class="metadata">`+
                    `<div class="percentage">`+
                        `<div class="fa fa-heart"></div>`+
                        `${d.rating}&nbsp;%`+
                `</div>`+
            `</div>`+
        `</div>`;

        Items.getImage(d.image).then(state => {
            state && $(`#${d.id} .fanart`).css('background-image', `url('${d.image}')`) && $(`#${d.id} .fanart img`).css('opacity', '0');
            !show.show.trailer && $(`#${d.id} .trailer`).hide();
            !(show.unseen - 1) && $(`#${d.id} .unseen`).hide();
        });

        return item;
    },
    constructLocalMovie: (movie) => {
        let d = {
            id: Misc.slugify(movie.path),
            data: JSON.stringify(movie)
        }

        let item = `<div class="local-item" onClick="Details.local.movie(this)" id="${d.id}">`+
            `<span class="data">${d.data}</span>`+
            `<span class="title">${movie.metadata.movie.title}</span>`+
        `</div>`;

        return item;
    },
    constructLocalUnmatched: (file) => {
        let d = {
            id: Misc.slugify(file.path),
            data: JSON.stringify(file)
        }

        let item = `<div class="local-item" onClick="Details.local.unmatched(this)" id="${d.id}">`+
            `<span class="data">${d.data}</span>`+
            `<span class="title">${file.filename}</span>`+
        `</div>`;

        return item;
    },
    constructLocalShow: (show) => {
        let d = {
            id: Misc.slugify(show.metadata.show.title) + '-local'
        };

        let seasons = function () {
            let str = String();

            for (let s in show.seasons) {
                str += `<div class="season s${s}" onClick="Interface.locals.showEpisodes('${d.id}', ${s})"><span class="title">${i18n.__('Season %s',s)}</span>`;

                for (let e in show.seasons[s].episodes) {
                    let sxe = `S${Misc.pad(s)}E${Misc.pad(e)}`;
                    let title = show.seasons[s].episodes[e].metadata.episode.title;

                    // attach show information
                    let data = show.seasons[s].episodes[e];
                    data.metadata.show = show.metadata.show;

                    str += `<div class="episode e${e}" onClick="Details.local.episode(this)" id="${Misc.slugify(show.seasons[s].episodes[e].path)}" onClick="event.stopPropagation()"><span class="data">${JSON.stringify(data)}</span><span class="e-title">${sxe} - ${title}</span></div>`;
                }
                str += `</div>`;
            }

            return str;
        }();

        let item = `<div class="local-item" id="${d.id}" onClick="Interface.locals.showSeasons('${d.id}')">`+
            `<span class="title">${show.metadata.show.title}</span>`+
            `<div class="seasons">${seasons}</div>`+
        `</div>`;

        return item;
    },

    markAsWatched: (elm) => {
        let id = $(elm).context.offsetParent.id || $(elm).context.id;
        let data = JSON.parse($(`#${id} .data`).text());

        let type, model;
        
        if (data.movie) {
            type = 'movies';
            model = data.movie;
        } else {
            type = 'episodes';
            model = data.next_episode;
        }

        let post = {};
        let item = {ids: model.ids};
        post[type] = [item];

        console.info('Mark as watched:', model.ids.slug);
        Trakt.client.sync.history.add(post);

        $(elm).addClass('selected');
        $(`#${id}`).append('<div class="item-spinner"><div class="fa fa-spin fa-refresh"></div>');


        setTimeout(() => {
            Trakt.reload(true);
        }, 500);        
    }
}