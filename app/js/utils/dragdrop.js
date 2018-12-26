'use strict'

const Dragdrop = {
    setup: () => {
        // disable default drag&drop events
        window.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
        window.addEventListener('dragstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
        window.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);

        $(document).on('paste', (e) => {
            if (e.target.nodeName === 'INPUT' || e.target.nodeName === 'TEXTAREA') return;

            let magnet = (e.originalEvent || e).clipboardData.getData('text/plain');
            e.preventDefault();
            Dragdrop.handle(magnet, 'magnet');

            return false;
        });

        window.ondragenter = (e) => {
            // details
            if ($('#details').css('display') != 'none' && !Streamer.client) {
                let showDrag = true;
                let timeout = -1;
                $(document).on('dragenter', (e) => {
                    $('#details-sources .drop-area').show();
                    $('#details-sources .sources').addClass('blur');
                });
                $(document).on('dragover', (e) => showDrag = true);
                $(document).on('dragleave', (e) => {
                    showDrag = false;
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        if (!showDrag) {
                            $('#details-sources .drop-area').hide();
                            $('#details-sources .sources').removeClass('blur');
                            $(document).off('dragenter');
                            $(document).off('dragover');
                            $(document).off('dragleave');
                        }
                    }, 100);
                });
            }
        };

        window.ondrop = (e) => {
            e.preventDefault();
            $('#details-sources .drop-area').hide();
            $('#details-sources .sources').removeClass('blur');

            let file = e.dataTransfer.files[0];

            if (file != null) { // we have a file
                let ext = path.extname(file.name).toLowerCase();
                if (ext === '.torrent') { // a torrent
                    return Dragdrop.handle(file.path, 'torrent');
                } else if (['.mkv','.avi','.mp4','.m4v','.mts','.m2ts'].indexOf(ext) != -1) { // a video file
                    return Dragdrop.handle(file.path, 'video');
                }
            } else { // we have a link
                file = e.dataTransfer.getData('text/plain');
                if (file.slice(0,6) === 'magnet') { // a magnet
                    return Dragdrop.handle(file, 'magnet');
                }
            }

            // unsupported
            console.log('Unable to handle drop for:', file);
            return false;
        };
    },
    handle: (data, type) => {
        // in details view
        if ($('#details').css('display') === 'none' && Streamer.client) return;

        switch(type) {
            case 'magnet': 
                Details.loadRemote(data);
                break;
            case 'video': 
                Details.loadVideo(data);
                break;
            case 'torrent': 
                Details.loadRemote(data);
                break;
            default:
                console.error('Dragdrop.handle(): no `type` passed');
        }
    }
};
