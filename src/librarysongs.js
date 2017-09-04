module.exports = function (mpcp) {

return {
    // used for song selection
    selected: [],
    // used for saving selected temporarily
    saved: [],
    tableid: 'library-songs-list',
    table: '#library-songs-list',
    tbody: '#library-songs-list .append',
    tbodyid: 'library-songs-list-tbody',
    // used for dragging while selected
    clone: null,
    fixedThead: null,

    // put songs in table
    update: function (artist, album, poppedState, callback) {
        // if still null, return (user updates library without clicking an
        // artist)
        if (!artist) {
            if (callback) callback();
            return;
        }

        console.log('update songs');
        mpcp.library.album = album;

        if (!album) {
            mpcp.socket.emit('mpc', 'database.find', [['artist', artist]],
                    setSongs);
        } else {
            mpcp.socket.emit('mpc', 'database.find',
                    [['artist', artist], ['album', album]], setSongs);
        }

        if (!poppedState) mpcp.library.addToHistory();

        function setSongs(files) {
            //console.log(files);
            $(mpcp.librarySongs.table + ' .gen').remove();
            var html = '',
                tableStart = '<table class="fixed-table"><tr><td>',
                tableEnd   = '</td></tr></table>';

            for (var i = 0; i < files.length; ++i) {
                html += mpcp.browser.getHtmlFiles(files[i]);
            }

            document.getElementById(mpcp.librarySongs.tbodyid).innerHTML = html;

            mpcp.browser.updatePosition();
            window.dispatchEvent(new CustomEvent('MPCPLibrarySongsChanged'));

            if (callback) callback();
        }
    },

    addMulti: function (to, dragging) {
        mpcp.browser.selected = this.selected;
        mpcp.browser.addMulti(to, null, dragging);
        mpcp.utils.clearSelected(mpcp.librarySongs);
        return;
    },

    // assume library.artist and library.album is already set
    // this only searches for the title atm
    search: function (title, callback) {
        console.log('library search: ' + title);

        function compare(files) {
            $(files).each(function (item, file) {
                $(mpcp.librarySongs.tbody + ' .gen').each(function (item, val) {
                    if ($(val).data().fileid == file.file) {
                        //$(this)[0].style.display = 'block';
                        $(this).show();
                    } else {
                        //$(this)[0].style.display = 'none';
                        $(this).hide();
                    }
                });
            });

            if (callback) callback();
        }

        if (mpcp.library.artist && mpcp.library.album) {
            //console.log('search artist and album');
            mpcp.socket.emit('mpc', 'database.search', [
                        'artist', mpcp.library.artist,
                        'album', mpcp.library.album,
                        'title', title
                    ], compare);
        } else if (mpcp.library.artist) {
            //console.log('search artist');
            mpcp.socket.emit('mpc', 'database.search', [
                        'artist', mpcp.library.artist,
                        'title', title
                    ], compare);
        } else {
            console.log('no artist or album selected?');
            if (callback) callback();
        }
    },

    initEvents: function () {
        // we only really care about the title (hopefully, only exception is
        // when in the 'all' album)
        mpcp.utils.createSearch(
            '#search-songs',
            this.search,
            function () {
                $(mpcp.librarySongs.table + ' .gen').show();
            },
            '#search-songs-clear',
            1000);

        this.fixedThead = mpcp.tableHeader(this.tableid, 'MPCPLibrarySongsChanged');
        mpcp.librarySongs.fixedThead.update();

        // this cannot be part of .song-list because of a bug with sortColumn
        // (overwrites contens from one tabe to other tables).
        mpcp.utils.tableSort(this.table, this.table + '-col-number',
            1, 'number');
        mpcp.utils.tableSort(this.table, this.table + '-col-title',
            2, 'string');
        mpcp.utils.tableSort(this.table, this.table + '-col-artist',
            3, 'string');
        mpcp.utils.tableSort(this.table, this.table + '-col-album',
            4, 'string');
        mpcp.utils.tableSort(this.table, this.table + '-col-time',
            5, '00:00');

        mpcp.utils.multiSelect(this, ['song-add']);
    }
};

};
