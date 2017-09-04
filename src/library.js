module.exports = function (mpcp) {

// the library (alternative to file browser)
// controls the main #library
return {
    hidden: true,
    // used when searching globally and other things
    bringBack: false,
    // save these when updating the library externally
    artist: null,
    album: null,

    addToHistory: function () {
        if (!mpcp.library.artist) {
            console.log('adding /library/ to history');
            window.history.pushState('','MPCParty', '/library/');
            return;
        }

        var albumHistory = '',
            artistHistory = encodeURIComponent(mpcp.library.artist);

        if (mpcp.library.album)
            albumHistory = '/' + encodeURIComponent(mpcp.library.album);

        var url = artistHistory + albumHistory;
        console.log('adding /library/' + url + ' to history');
        window.history.pushState('', url + ' - MPCParty', '/library/' + url);
    },

    // manually open from the user
    open: function (callback) {
        mpcp.settings.saveBrowser('library');
        this.addToHistory();
        mpcp.libraryArtists.update(mpcp.library.artist, callback);

        if (!mpcp.library.artist) {
            // force an update so header is not squashed together
            mpcp.librarySongs.fixedThead.update();
        }
    },

    show: function () {
        if (!this.hidden) return;

        this.hidden = false;
        document.getElementById('library').style.display = 'flex';
        mpcp.utils.buttonSelect("#open-library", "#browser-selection");
        //mpcp.utils.restoreSelected(mpcp.libraryArtists);
        //mpcp.utils.restoreSelected(mpcp.libraryAlbums);
    },

    hide: function () {
        this.hidden = true;
        document.getElementById('library').style.display = 'none';
        mpcp.utils.saveSelected(mpcp.libraryArtists);
        mpcp.utils.clearSelected(mpcp.libraryArtists);
        mpcp.utils.saveSelected(mpcp.libraryAlbums);
        mpcp.utils.clearSelected(mpcp.libraryAlbums);
    },

    // obj, libraryArtist or libraryAlbum
    addMulti: function (obj, to, dontScroll, dragging) {
        mpcp.utils.toArraySelected(obj);
        var i, tr, artist, album;

        function sendTope(art, alb) {
            mpcp.library.getSongsFromAlbum(art, alb, function (files) {
                mpcp.pe.addSong(files, to);
            });
        }

        function sendToPl(art, alb) {
            mpcp.library.getSongsFromAlbum(artist, album, function (files) {
                // reverse because not incrementing to variable because
                // scrolling to center will be overridden in addSong
                files = files.reverse();
                for (var i = 0; i < files.length; ++i) {
                    mpcp.playlist.addSong(files[i].file, to, dontScroll);
                }
            });
        }

        obj.selected.reverse();

        // context menu check
        if (mpcp.pe.current && !dragging) {
            for (i = 0; i < obj.selected.length; ++i) {
                tr     = obj.selected[i];
                artist = $(tr).data().artist;
                album  = $(tr).data().album;
                sendTope(artist, album);
            }
        } else {
            for (i = 0; i < obj.selected.length; ++i) {
                tr     = obj.selected[i];
                artist = $(tr).data().artist;
                album  = $(tr).data().album;
                sendToPl(artist, album);
            }
        }

        mpcp.utils.clearSelected(obj);
    },

    // return a file list from an album
    getSongsFromAlbum: function (artist, album, callback) {
        // TODO fix special characters
        if (!album) {
            mpcp.socket.emit('mpc', 'database.find', [['artist', artist]],
                    files => {
                setSongs(files);
            });
        } else {
            mpcp.socket.emit('mpc', 'database.find',
                    [['artist', artist], ['album', album]], files => {
                setSongs(files);
            });
        }

        function setSongs (files) {
            //console.log(files);
            if (!files.length || (files.length == 1 && !files[0].album &&
                        !files[0].artist)) {
                console.log('No songs found');
                mpcp.lazyToast.warning('This may be an issue with special characters: ' + album, 'No songs found');
                return;
            }

            if (callback) callback(files);
        }
    },

    addExternal: function (obj, artist, album, to, dontScroll) {
        if (obj.selected.length)
            this.addMulti(obj, to, dontScroll);
        else if (mpcp.pe.current)
            this.getSongsFromAlbum(artist, album, function (files) {
                mpcp.pe.addSong(files, to, dontScroll);
            });
        else
            this.getSongsFromAlbum(artist, album, function (files) {
                for (var i = 0; i < files.length; ++i)
                    mpcp.playlist.addSong(files[i].file, to);
            });
    },

    // decode the url when loading the page
    decodeRequest: function (request) {
        var artist = request,
            album  = null;

        if (!request) request = '';
        //console.log(request);

        if (request.indexOf('/') != -1) {
            artist = request.slice(0, request.indexOf('/'));
            album  = request.slice(request.indexOf('/') + 1, request.length);
        }

        artist = decodeURIComponent(artist);

        if (album) album = decodeURIComponent(album);

        //console.log(artist);
        //console.log(mpcp.library.artist);
        //console.log(album);
        //console.log(mpcp.library.album);

        mpcp.browser.hide();
        this.show();

        // we don't need to update everything if everything is the same
        // (like coming from the browser)
        if (mpcp.library.album !== null && mpcp.library.album === album) return;

        if (mpcp.library.artist != artist) mpcp.libraryArtists.update(artist);

        mpcp.libraryAlbums.update(artist, album, true);
    },

    initEvents: function () {
        $('#open-library').click(function () {
            mpcp.library.open();
        });

        mpcp.libraryAlbums.initEvents();
        mpcp.libraryArtists.initEvents();
        mpcp.librarySongs.initEvents();
    }
};

};
