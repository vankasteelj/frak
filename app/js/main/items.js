'use strict'

const Items = {
    slugify: (title) => title.replace(/\W+/g, '-').toLowerCase(),
    pad: (n) => (n < 10) ? ('0' + n) : n,
    percentage: (n) => parseInt(n*10),

    getImage: (url) => {
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
            id: Items.slugify(movie.movie.title) + '-trakt',
            data: JSON.stringify(movie),
            rating: Items.percentage(movie.movie.rating),
            size: DB.get('small_items') ? 4 : 6
        }

        let item = `<div class="grid-item col-sm-${d.size}" id="${d.id}">`+
            `<span class="data">${d.data}</span>`+
            `<div class="fanart" style="background-image: url('${d.image}')">`+
                `<img class="base" src="images/placeholder.png">`+
                `<div class="shadow"></div>`+
                `<div class="titles">`+
                    `<h3>${movie.movie.title}<span class="year">${movie.movie.year}</span></h3>`+
                `</div>`+
            `</div>`+
            `<div class="quick-icons">`+
                `<div class="actions">`+
                    `<div class="watched trakt-icon-check-thick"></div>`+
                    `<div class="trailer fa fa-youtube-play" onClick="Interface.playTrailer('${movie.movie.trailer}')"></div>`+
                    `<div class="play trakt-icon-play2-thick"></div>`+
                `</div>`+
                `<div class="metadata">`+
                    `<div class="percentage">`+
                        `<div class="fa fa-heart"></div>`+
                        `${d.rating}&nbsp%`+
                `</div>`+
            `</div>`+
        `</div>`;

        Items.getImage(d.image).then(state => {
            state && $(`#${d.id} .fanart img`).css('opacity', '0');
            !movie.movie.trailer && $(`#${d.id} .trailer`).hide();
        })

        return item;
    },
    constructShow: (show) => {
        let d = {
            image: Images.reduce(show.show.images.fanart) || show.show.images.poster,
            id: Items.slugify(show.show.title) + '-trakt',
            sxe: `s${Items.pad(show.next_episode.season)}e${Items.pad(show.next_episode.number)}`,
            data: JSON.stringify(show),
            rating: Items.percentage(show.show.rating),
            size: DB.get('small_items') ? 4 : 6
        }

        let item = `<div class="grid-item col-sm-${d.size}" id="${d.id}">`+
            `<span class="data">${d.data}</span>`+
            `<div class="fanart" style="background-image: url('${d.image}')">`+
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
                    `<div class="watched trakt-icon-check-thick"></div>`+
                    `<div class="trailer fa fa-youtube-play" onClick="Interface.playTrailer('${show.show.trailer}')"></div>`+
                    `<div class="play trakt-icon-play2-thick"></div>`+
                `</div>`+
                `<div class="metadata">`+
                    `<div class="percentage">`+
                        `<div class="fa fa-heart"></div>`+
                        `${d.rating}&nbsp;%`+
                `</div>`+
            `</div>`+
        `</div>`;

        Items.getImage(d.image).then(state => {
            state && $(`#${d.id} .fanart img`).css('opacity', '0');
            !show.show.trailer && $(`#${d.id} .trailer`).hide();
            !(show.unseen - 1) && $(`#${d.id} .unseen`).hide();
        });

        return item;
    },
    constructLocalMovie: (movie) => {
        let d = {
            id: Items.slugify(movie.path),
            data: JSON.stringify(movie)
        }

        let item = `<div class="local-item" onClick="Loading.localMovie(this)" id="${d.id}">`+
            `<span class="data">${d.data}</span>`+
            `<span class="title">${movie.metadata.movie.title}</span>`+
        `</div>`;

        return item;
    },
    constructLocalUnmatched: (file) => {
        let d = {
            id: Items.slugify(file.path),
            data: JSON.stringify(file)
        }

        let item = `<div class="local-item" onClick="Loading.localUnmatched(this)" id="${d.id}">`+
            `<span class="data">${d.data}</span>`+
            `<span class="title">${file.filename}</span>`+
        `</div>`;

        return item;
    },
    constructLocalShow: (show) => {
        let d = {
            id: Items.slugify(show.title) + '-local'
        };

        let seasons = function () {
            let str = String();

            for (let s in show.seasons) {
                str += `<div class="season s${s}" onClick="Interface.locals.showEpisodes('${d.id}', ${s})"><span class="title">${i18n.__('Season %s',s)}</span>`;
                for (let e in show.seasons[s].episodes) {
                    let sxe = `S${Items.pad(s)}E${Items.pad(e)}`;
                    let title = show.seasons[s].episodes[e].metadata.episode.title;
                    str += `<div class="episode e${e}" onClick="Loading.localEpisode(this)" id="${Items.slugify(show.seasons[s].episodes[e].path)}" onClick="event.stopPropagation()"><span class="data">${JSON.stringify(show.seasons[s].episodes[e])}</span><span class="e-title">${sxe} - ${title}</span></div>`;
                }
                str += `</div>`;
            }

            return str;
        }();

        let item = `<div class="local-item" id="${d.id}" onClick="Interface.locals.showSeasons('${d.id}')">`+
            `<span class="title">${show.title}</span>`+
            `<div class="seasons">${seasons}</div>`+
        `</div>`;

        return item;
    }
}