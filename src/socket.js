module.exports = function (mpcp) {

var host = window.document.location.host;

var socket = io();

// called in socket init
function initAfterConnection() {
    console.log('initAfterConnection');
    //mpcp.player.updateAll(); // inside of mpcp.playlist.updateTitle
    mpcp.player.updateMixer();
    //mpcp.playlist.updateAll(); // inside of mpcp.playlist.updateTitle
    //mpcp.browser.update(); // done lower in the function
    mpcp.utils.updateStats();

    var path = window.location.pathname.
        slice(1, window.location.pathname.length).
        replace(/%20/g, ' '),
    action = path.slice(0, path.indexOf('/')),
    request = path.slice(path.indexOf('/') + 1, path.length);

    //console.log(path);
    //console.log(action);
    //console.log(request);

    // check action
    if (action == 'search') {
        mpcp.browser.show();
        request = decodeURIComponent(request);
        mpcp.browser.search(request);
        document.getElementById('search-browser').value = request;
    } else if (action == 'library') {
        mpcp.library.decodeRequest(request);
    } else if (action == 'browser') {
        mpcp.browser.show();
        mpcp.browser.current  = request;
        mpcp.browser.previous = request;
        mpcp.browser.update();
    } else {
        // else check settings
        if (mpcp.settings.browser == 'library') {
            mpcp.library.show();
            mpcp.libraryArtists.update();
        } else {
            mpcp.browser.show();
            mpcp.browser.update();
        }
    }

    mpcp.browser.initEvents();

    // sometimes the socket doesn't send the vote updates,
    // this is used for that
    setTimeout(function () {
        if (!mpcp.vote.received) {
            console.log('server didnt send votes, asking for votes');
            socket.send(JSON.stringify(
                    {'type': 'get-votes'}), function (err) {
                if (err) console.log(err);
            });
        }
    }, 200);
}

// Web socket configuration
socket.on('current-info', function (msg) {
    mpcp.vote.received = true;
    mpcp.users.total   = msg['total-clients'];
    mpcp.vote.needed   = msg['song-skip-total'];
    mpcp.vote.setTitles( msg['song-skip-previous'], 'previous');
    mpcp.vote.setTitles( msg['song-skip-next'],     'next');
});

// once() so that if the connection reconnects, we don't create duplicate
// event listeners
socket.once('init', function (msg) {
    mpcp.playlist.updateTitle(msg['playlist-title']);
    mpcp.vote.enabled = msg['song-vote'];
    if (msg['downloader-enabled'])
        mpcp.downloader.init(msg['downloader-location']);
    mpcp.utils.setCurrentAlbumArt(msg['album-art']);
    initAfterConnection();
});

// playlist
// used to update the playlist title
socket.on('clear-playlist', function (msg) {
    console.log('user clear-playlist called');
    mpcp.playlist.updateTitle('');
    //mpcp.player.updateAll(); // inside mpcp.playlist.updateAll
    mpcp.playlist.updateAll();
});

socket.on('update-playlist', function (msg) {
    console.log('user update-playlist called');
    mpcp.playlist.updateAll();
});

socket.on('update-browser', function (msg) {
    console.log('user update-browser called');
    mpcp.browser.doUpdate = true;
    mpcp.browser.update();
    mpcp.utils.updateStats();
});

socket.on('playlist-title', function (msg) {
    mpcp.playlist.updateTitle(msg.info);
});

// player
socket.on('song-next', function (msg) {
    msg.info += ' skipped to the next song.';
    mpcp.history.add(msg.info, 'info');

    // don't show notification if only 1 person is using the client
    if (mpcp.users.total <= 1) return;

    mpcp.lazyToast.info(msg.info, 'Song Skipped', 10000);
});

socket.on('song-previous', function (msg) {
    msg.info += ' skipped to the previous song.';
    mpcp.history.add(msg.info, 'info');

    // don't show notification if only 1 person is using the client
    if (mpcp.users.total <= 1) return;

    mpcp.lazyToast.info(msg.info, 'Song Skipped', 10000);
});

// stored
socket.on('playlist-reload', function (msg) {
    mpcp.stored.open(msg.info);
});

// vote
socket.on('song-vote-next', function (msg) {
    console.log('received skip');
    mpcp.vote.message(msg.info, 'next');
});

socket.on('song-vote-previous', function (msg) {
    console.log('received skip');
    mpcp.vote.message(msg.info, 'previous');
});

socket.on('request-vote-update-from-server', function (msg) {
    // assums a vote reset
    document.getElementById('next').classList.remove('active');
    document.getElementById('previous').classList.remove('active');
});

socket.on('skipped', function (msg) {
    console.log('skip successful received');
    document.getElementById('next').classList.remove('active');
    document.getElementById('previous').classList.remove('active');
    var str = '';

    for (var i in msg.info) {
        str += mpcp.users.get(msg.info[i]) + ', ';
    }

    if (mpcp.users.total > 1) {
        str += 'skipped: ' + mpcp.player.title + '.';
        mpcp.lazyToast.info(str, 'Song Skip');
        mpcp.history.add(str, 'info');
    } else
        mpcp.history.add('Skipped: ' + mpcp.player.title, 'info');

    mpcp.vote.setTitles(0, 'previous');
    mpcp.vote.setTitles(0, 'next');
});

socket.on('user-skip-next', function (msg) {
    document.getElementById('next').classList.add('active');
});

socket.on('user-skip-previous', function (msg) {
    document.getElementById('previous').classList.add('active');
});

socket.on('hostnames', function (msg) {
    console.log('received hostnames update');
    mpcp.users.populate(msg.info);
});

// downloader
socket.on('downloader-download', function (msg) {
    mpcp.downloader.setStatus('Downloading and converting video...');
});

socket.on('downloader-status', function (msg) {
    document.getElementById('downloader-status').innerHTML = msg.info;
});

socket.on('album-art', function (msg) {
    mpcp.utils.setCurrentAlbumArt(msg.url);
});

socket.on('mpc-error', err => {
    mpcp.lazyToast.error('There was an error processing a request: ' +
        err.errorMessage, 'MPC Error', 10000, true);
});

socket.on('mpd-changed', function (msg) {
    console.log('changed: ' + msg);

    msg.forEach(item => {
        switch (item) {
            case 'player':
                mpcp.player.updateAll();
                break;

            case 'playlist':
                mpcp.playlist.updateAll();
                break;

            case 'mixer':
                mpcp.player.updateMixer();
                break;

            case 'options':
                mpcp.player.updateControls();
                break;

            case 'update':
                mpcp.browser.update();
                mpcp.utils.updateStats();
                break;

            case 'stored_playlist':
                mpcp.stored.updatePlaylists('#playlist-open-modal');
                mpcp.stored.updatePlaylists('#playlist-save-modal');
                break;
        }
    });
});

socket.on('disconnect', reason => {
    console.log(reason);
    mpcp.lazyToast.error('Reason: ' + reason +
        '. Attempting to reestablish...', 'Lost connection!');
});

socket.on('reconnect', () => {
    toastr.remove();
    mpcp.lazyToast.info('', 'Connection reestablished!');
});

// gracefully close the socket
$(window).on('beforeunload', function () {
    socket.close();
});

return socket;

};
