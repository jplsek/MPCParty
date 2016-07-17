module.exports = function (mpcp) {

// the video (audio) player
return {
    // current tile on player.
    title: '',

    // download the video
    download: function (url) {
        if (url !== '')
            mpcp.socket.send(JSON.stringify(
                    {'type': 'download-video', 'info': url}), function (err) {
                if (err) console.log(err);
            });
    },

    // grab url from player element
    downloadFromPlayer: function () {
        var url = $('#download-player-url').val();
        this.download(url);
    },

    // play the Player (after download)
    play: function () {
        // if there is no title, and the user clicks play, just download
        // the video.
        if (this.title === '') {
            this.downloadFromPlayer();
        } else {
            mpcp.socket.send(JSON.stringify(
                    {'type': 'download-video-play'}), function (err) {
                if (err) console.log(err);
            });
        }
    },

    // pause or play the Player
    pause: function () {
        mpcp.socket.send(JSON.stringify(
                {'type': 'download-video-pause'}), function (err) {
            if (err) console.log(err);
        });
    },

    // stop the Player
    stop: function () {
        mpcp.socket.send(JSON.stringify(
                {'type': 'download-video-stop'}), function (err) {
            if (err) console.log(err);
        });
    },

    sendVolume: function (volume) {
        mpcp.socket.send(JSON.stringify({
            'type': 'download-video-volume', 'info': volume
        }), function (err) {
            if (err) console.log(err);
        });
    },

    setVolume: function (volume) {
        $('#download-player-volume').val(volume);
    },

    setTitle: function (title) {
        this.title = title;
        $('#download-player-title').html(title);
    },

    setStatus: function (str) {
        $('#download-player-status').html(str);

        if (~str.indexOf('Play')) {
            $('#download-player-btn')
                .removeClass('btn-default')
                .addClass('btn-success')
                .removeClass('btn-warning');
            $('#download-player-pause').removeClass('active');
        } else if (~str.indexOf('Paus')) {
            $('#download-player-btn')
                .removeClass('btn-default')
                .removeClass('btn-success')
                .addClass('btn-warning');
            $('#download-player-pause').addClass('active');
        } else if (~str.indexOf('Stop')) {
            $('#download-player-btn')
                .addClass('btn-default')
                .removeClass('btn-success')
                .removeClass('btn-warning');
            $('#download-player-pause').removeClass('active');
        } else if (~str.indexOf('Download')) {
            $('#download-player-btn')
                .removeClass('btn-default')
                .removeClass('btn-success')
                .addClass('btn-warning');
            $('#download-player-pause').removeClass('active');
        }
    },

    initEvents: function () {
        $('#download-player-search').click(function () {
            mpcp.video.downloadFromPlayer();
        });

        $('#download-player-play').click(function () {
            mpcp.video.play();
        });

        $('#download-player-pause').click(function () {
            mpcp.video.pause();
        });

        $('#download-player-stop').click(function () {
            mpcp.video.stop();
        });

        // 'input change' allows arrow keys to work
        $('#download-player-volume').on('input change', function () {
            mpcp.video.sendVolume(this.value);
        });

        // detect enter key
        $('#download-player-url').keyup(function (e) {
            if (e.keyCode == 13) {
                var url = $('#download-player-url').val();
                mpcp.video.download(url);
            }
        });
    }
};

};
