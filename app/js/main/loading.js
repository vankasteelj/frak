'use strict'

const Loading = {
    local: (file) => {
        $('#streaminfo .filename span').text(file.filename);
        $('#streaminfo .source span').text(path.dirname(file.path));
        $('#streaminfo .connection').hide();

        Player.play(file.path, {}, Details.model);

        Loading.lookForSubtitles({
            path: file.path
        });
    },
    remote: (url) => {
        let localUrl = DB.get('localip') ? url.replace('127.0.0.1', DB.get('localip')) : url;

        $('#streaminfo .filename span').text(Streamer.streaminfo.file_name);
        $('#streaminfo .source span').text(localUrl);
        $('#streaminfo .connection').show();

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
            let downloaded = parseInt(Streamer.streaminfo.stats.downloaded_percent, 10);
            
            if (downloaded == 100) {
                nw.Window.get().setProgressBar(0);
                $('#streaminfo .connection').hide();
                return;
            }

            let time = calcRemainingTime(Streamer.streaminfo.stats.remaining_time);
            let dspeed = Misc.fileSize(Streamer.streaminfo.stats.download_speed);
            let uspeed = Misc.fileSize(Streamer.streaminfo.stats.upload_speed);
            let size = Misc.fileSize(Streamer.streaminfo.file_size);

            nw.Window.get().setProgressBar(downloaded/100);
            $('#streaminfo .status span').text(i18n.__('%s%% of %s', downloaded, size));
            $('#streaminfo .remaining span').text(time);
            $('#streaminfo .peers span').text(Streamer.streaminfo.stats.total_peers);
            $('#streaminfo .download span').text(dspeed+'/s');
            $('#streaminfo .upload span').text(uspeed+'/s');
        }, 1000);

        Player.play(url, {
            'title': Streamer.streaminfo.file_name,
            'force-media-title': localUrl
        }, Details.model);

        Loading.lookForSubtitles({
            filename: Streamer.streaminfo.file_name,
            filesize: Streamer.streaminfo.file_size
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
                subopts.episode = data.next_episode ? data.next_episode.number : data.episode.number;
                subopts.season = data.next_episode ? data.next_episode.season : data.episode.season;
            }
        }

        Subtitles.search(subopts).then(subs => {
            let total = Object.keys(subs).length;
            console.info('Found %d subtitles', total, subs);

            if (total) $('#subtitles').show();
            $('#subtitles .sub').remove();

            for (let lang in subs) {
                Subtitles.addSubtitle(subs[lang]);
            }
        });
    },

    close: () => {
        clearInterval(Loading.update);
        Loading.update = null;
        Streamer.stop();

        $('#details-sources').show();
        $('#details-loading').hide();
    }
}