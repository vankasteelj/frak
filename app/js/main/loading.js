'use strict'

const Loading = {
    local: (file) => {
        $('#streaminfo .filename span').text(file.filename);
        $('#streaminfo .source span').text(path.dirname(file.path));
        $('#streaminfo .connection').hide();

        Player.play(file.path);
    },
    torrent: () => {},
    close: () => {
        $('#details-sources').show();
        $('#details-loading').hide();
    }
}