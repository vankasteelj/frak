'use strict'

const Items = {
    slugify: (title) => title.replace(/\W+/g, '-').toLowerCase(),
    pad: (n) => (n < 10) ? ('0' + n) : n,
    percentage: (n) => parseInt(n*10),

    constructMovie: (movie) => {
        let item = `<div class="grid-item col-sm-6" id="${Items.slugify(movie.title)}">`+
            `<span class="data" style="display:none">${JSON.stringify(movie)}</span>`+
            `<div class="fanart">`+
                `<img class="base" src="images/placeholder.png">`+
                `<img class="real" src="${Images.reduce(movie.images.fanart)}">`+
                `<div class="shadow"></div>`+
                `<div class="titles">`+
                    `<h3>${movie.title}<span class="year">${movie.year}</span></h3>`+
                `</div>`+
            `</div>`+
            `<div class="quick-icons">`+
                `<div class="actions">`+
                    `<div class="watched trakt-icon-check-thick"></div>`+
                    (movie.trailer ? `<div class="trailer fa fa-youtube-play" onClick="Interface.playTrailer('${movie.trailer}')"></div>`:'')+
                    `<div class="play trakt-icon-play2-thick"></div>`+
                `</div>`+
                `<div class="metadata">`+
                    `<div class="percentage">`+
                        `<div class="fa fa-heart"></div>`+
                        `${Items.percentage(movie.rating)}&nbsp%`+
                `</div>`+
            `</div>`+
        `</div>`

        return item;
    },
    constructShow: (show) => {
        let item = `<div class="grid-item col-sm-6" id="${Items.slugify(show.show.title)}">`+
            `<span class="data" style="display:none">${JSON.stringify(show)}</span>`+
            `<div class="fanart">`+
                `<img class="base" src="images/placeholder.png">`+
                `<img class="real" src="${Images.reduce(show.show.images.fanart)}">`+
                `<div class="shadow"></div>`+
                `<div class="titles">`+
                    `<h4>`+
                        `<span class="sxe">s${Items.pad(show.next_episode.season)}e${Items.pad(show.next_episode.number)}</span>`+
                        (show.unseen - 1 ? `<span class="unseen">+${show.unseen - 1}</span>`:'')+
                        `<span class="eptitle">${show.next_episode.title}</span>`+
                    `</h4><br/>`+
                    `<h3>${show.show.title}<span class="year">${show.show.year}</span></h3>`+
                `</div>`+
            `</div>`+
            `<div class="quick-icons">`+
                `<div class="actions">`+
                    `<div class="watched trakt-icon-check-thick"></div>`+
                    (show.show.trailer ? `<div class="trailer fa fa-youtube-play" onClick="Interface.playTrailer('${show.show.trailer}')"></div>`:'')+
                    `<div class="play trakt-icon-play2-thick"></div>`+
                `</div>`+
                `<div class="metadata">`+
                    `<div class="percentage">`+
                        `<div class="fa fa-heart"></div>`+
                        `${Items.percentage(show.show.rating)}&nbsp%`+
                `</div>`+
            `</div>`+
        `</div>`

        return item;
    }
}