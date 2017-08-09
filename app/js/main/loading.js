'use strict'

const Loading = {
    local: (file) => {
        $('#streaminfo .filename span').text(file.filename);
        $('#streaminfo .source span').text(path.dirname(file.path));
        $('#streaminfo .connection').hide();

        Player.play(file.path);

        Loading.lookForSubtitles(file.path);
    },
    torrent: () => {},

    lookForSubtitles: (file) => {
        let data = JSON.parse($('#details > .container > .data').text());
        if (data.metadata) data = data.metadata;
        let type = data.show && 'show' || data.movie && 'movie';

        let subopts = {
            extensions: ['srt', 'vtt', 'ass', 'txt'],
        };

        if (type) {
            data[type].ids && (subopts.imdbid = data[type].ids.imdb);
            
            if (type === 'show') {
                subopts.episode = data.next_episode.number;
                subopts.season = data.next_episode.season;
            }
        }
        
        if (file) {
            Subtitles.searchLocal(file);
            subopts.path = file;
        }

        Subtitles.search(subopts).then(subs => {
            console.info('Found %d subtitles', Object.keys(subs).length, subs);
            for (let lang in subs) {
                Subtitles.addSubtitle(subs[lang]);
            }
        });
    },

    close: () => {
        $('#details-sources').show();
        $('#details-loading').hide();
    }
}