// tell browserify that this is a global object
global.mpcp = {};

$(function () {

"use strict";

mpcp.socket         = require('./socket.js')(mpcp);
mpcp.disconnect     = require('./disconnect.js')(mpcp);
mpcp.utils          = require('./utils.js')(mpcp);
mpcp.player         = require('./player.js')(mpcp);
mpcp.history        = require('./history.js')(mpcp);
mpcp.playlist       = require('./playlist.js')(mpcp);
mpcp.browser        = require('./browser.js')(mpcp);
mpcp.libraryArtists = require('./libraryartists.js')(mpcp);
mpcp.libraryAlbums  = require('./libraryalbums.js')(mpcp);
mpcp.librarySongs   = require('./librarysongs.js')(mpcp);
mpcp.library        = require('./library.js')(mpcp);
mpcp.stored         = require('./stored.js')(mpcp);
mpcp.progressbar    = require('./progressbar.js')(mpcp);
mpcp.pb             = require('./playlistbuffer.js')(mpcp);
mpcp.vote           = require('./vote.js')(mpcp);
mpcp.users          = require('./users.js')(mpcp);
mpcp.pages          = require('./pages.js')(mpcp);
mpcp.settings       = require('./settings.js')(mpcp);
mpcp.downloader     = require('./downloader.js')(mpcp);
mpcp.lazyToast      = require('./lazytoast.js')(mpcp);
mpcp.sortHelper     = require('./sorthelper.js')(mpcp);
require('./contextmenu.js')(mpcp);

komponist.on('changed', function (system) {
    console.log('changed: ' + system);

    switch (system) {
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

// misc events
$(document).on('click', '.stop-click-event', function (event) {
    // stop bootstrap from closing the dropdown
    event.stopPropagation();
});

$('.dropdown').on('hide.bs.dropdown', function (e) {
    // if keep-shown, don't close dropwdown
    return !$(e.target)[0].classList.contains('keep-open');
});

$(document).on('click', '.stop-server', function () {
    console.log('you stopped the server');
    mpcp.socket.send(JSON.stringify({'type': 'stop-server'}), function (err) {
        if (err) console.log(err);
    });
});

$(document).on('click', '.playlist-reload', function () {
    mpcp.socket.send(JSON.stringify({
            'type': 'playlist-reload', 'info': mpcp.playlist.current
            }), function (err) {
        if (err) console.log(err);
    });
});

// handle back and forwards
window.onpopstate = function (event) {
    var url    = decodeURIComponent(document.location.pathname),
        option = url.substr(1, mpcp.utils.nthOccurrence(url, '/', 2) - 1),
        folder;

    console.log('poppedState: ' + option);
    if (option == 'browser') {
        folder = url.replace('/browser/', '');
        mpcp.library.hide();
        mpcp.browser.show();
        if (folder === '') folder = '/';
        mpcp.browser.update(folder, true);
    } else if (option == 'search') {
        var search = url.replace('/search/', '');
        mpcp.browser.search(search, true);
    } else if (option == 'library') {
        var request = document.location.pathname.replace('/library/', '');
        mpcp.library.decodeRequest(request);
    } else {
        // unknown, use mpcp.settings.browser
        if (mpcp.settings.lastBrowser == 'library') {
            mpcp.browser.hide();
            mpcp.library.show();
            mpcp.library.decodeRequest();
        } else {
            mpcp.library.hide();
            mpcp.browser.show();
            mpcp.browser.update('/', true);
        }
    }
};

// disable form submissions because everything runs on a single page
$('form').submit(function (e) {
    e.preventDefault();
    return false;
});

// enables resizable playlist buffer
$('#pb').resizable({
    handles: 'n, w, s, e, nw, ne, sw, se',
    minHeight: 140,
    minWidth: 160
});

// make pb draggable because why not
$('#pb').draggable({
    containment: 'body',
    handle: '#pb-header'
});

$('#pb-tab').draggable({
    axis: 'x',
    containment: 'body'
});

// enables resizable testing
$('#testing').resizable({
    handles: 'n, w, s, e, nw, ne, sw, se',
    minHeight: 140,
    minWidth: 140
});

// make testing draggable because why not
$('#testing').draggable({
    containment: 'body',
    handle: '#testing-header'
});

mpcp.settings.loadAll();

mpcp.progressbar.initEvents();
mpcp.player     .initEvents();
mpcp.playlist   .initEvents();
// gets called in initAfterConnection(). For some reason it was setting the
// current page to /browser/ when sharing a link
//mpcp.browser   .initEvents();
mpcp.settings   .initEvents();
mpcp.pages      .initEvents();
mpcp.pb         .initEvents();
mpcp.history    .initEvents();
mpcp.stored     .initEvents();
mpcp.downloader .initEvents();
mpcp.disconnect .initEvents();
mpcp.library    .initEvents();

});
