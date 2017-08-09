'use strict'

const Loading = {
    local: (file) => {
        $('#streaminfo .filename span').text(file.filename);
        $('#streaminfo .source span').text(path.dirname(file.path));
        $('#streaminfo .connection').hide();

        Player.play(file.path);

        Loading.lookForSubtitles({
            path: file.path
        });
    },
    remote: (url) => {
        $('#streaminfo .filename span').text(Webtorrent.streaminfo.file_name);
        $('#streaminfo .source span').text(url);


        let calcRemainingTime = (timeLeft) => {
            if (timeLeft === undefined) {
                return i18n.__('Unknown time remaining');
            } else if (timeLeft > 3600) {
                return i18n.__('%s hour(s) remaining', Math.round(timeLeft / 3600));
            } else if (timeLeft > 60) {
                return i18n.__('%s minute(s) remaining', Math.round(timeLeft / 60));
            } else if (timeLeft <= 60) {
                return i18n.__('%s second(s) remaining', timeLeft);
            }
        };

        Loading.update = setInterval(() => {
            let downloaded = parseInt(Webtorrent.streaminfo.stats.downloaded_percent, 10);
            
            if (downloaded == 100) {
                $('#streaminfo .connection').hide();
                return;
            }

            let time = calcRemainingTime(Webtorrent.streaminfo.stats.remaining_time);
            let dspeed = Misc.fileSize(Webtorrent.streaminfo.stats.download_speed);
            let uspeed = Misc.fileSize(Webtorrent.streaminfo.stats.upload_speed);
            let size = Misc.fileSize(Webtorrent.streaminfo.file_size);

            $('#streaminfo .status span').text(i18n.__('%s%% of %s', downloaded, size));
            $('#streaminfo .remaining span').text(time);
            $('#streaminfo .peers span').text(Webtorrent.streaminfo.stats.total_peers);
            $('#streaminfo .download span').text(dspeed+'/s');
            $('#streaminfo .upload span').text(uspeed+'/s');
        }, 1000);

        Player.play(url);

        Loading.lookForSubtitles({
            filename: Webtorrent.streaminfo.file_name,
            filesize: Webtorrent.streaminfo.file_size
        });
    },

    lookForSubtitles: (file) => {
        let data = JSON.parse($('#details > .container > .data').text());
        if (data.metadata) data = data.metadata;
        let type = data.show && 'show' || data.movie && 'movie';

        let subopts = {};

        if (file) {
            subopts = file;
        }

        subopts.extensions = ['srt', 'vtt', 'ass', 'txt'];

        if (type) {
            data[type].ids && (subopts.imdbid = data[type].ids.imdb);
            
            if (type === 'show') {
                subopts.episode = data.next_episode.number;
                subopts.season = data.next_episode.season;
            }
        }

        Subtitles.search(subopts).then(subs => {
            console.info('Found %d subtitles', Object.keys(subs).length, subs);
            for (let lang in subs) {
                Subtitles.addSubtitle(subs[lang]);
            }
        });
    },

    close: () => {
        clearInterval(Loading.update);
        Loading.update = null;
        Webtorrent.stop();

        $('#details-sources').show();
        $('#details-loading').hide();
    }
}