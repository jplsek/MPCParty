module.exports = function (mpcp) {

return {
    // used for song selection
    selected: [],
    // used for saving selected temporarily
    saved: [],
    tableid: 'library-songs-list',
    table: '#library-songs-list',
    tbody: '#library-songs-list .append',
    // used for dragging while selected
    clone: null,

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
            komponist.find('artist', artist, function (err, files) {
                setSongs(err, files);
            });
        } else {
            komponist.find('artist', artist, 'album', album,
                    function (err, files) {
                setSongs(err, files);
            });
        }

        if (!poppedState) mpcp.library.addToHistory();

        function setSongs(err, files) {
            if (err) {
                console.log(err);
                if (callback) callback();
                return;
            }

            //console.log(files);

            $(mpcp.librarySongs.table + ' .gen').remove();
            files = mpcp.utils.toArray(files);

            var html = '';

            if (!files.length || (files.length == 1 && !files[0].Album &&
                        !files[0].Artist)) {
                html = '<tr class="gen"><td colspan="6">' +
                    '<em class="text-muted">No songs found</em></td></tr>';
                $(mpcp.librarySongs.tbody)[0].innerHTML = html;
                window.dispatchEvent(new CustomEvent('MPCPLibrarySongsChanged'));
                console.log('No songs found');
                if (callback) callback();
            }

            var tableStart = '<table class="fixed-table"><tr><td>',
                tableEnd   = '</td></tr></table>';

            for (var i = 0; i < files.length; ++i) {
                html += mpcp.browser.getHtmlFiles(files[i]);
            }

            $(mpcp.librarySongs.tbody)[0].innerHTML = html;

            mpcp.sortHelper.reloadSortable(mpcp.librarySongs);
            mpcp.browser.updatePosition();
            window.dispatchEvent(new CustomEvent('MPCPLibrarySongsChanged'));

            if (callback) callback();
        }
    },

    addMulti: function (to) {
        mpcp.browser.selected = this.selected;
        mpcp.browser.addMulti(to);
        mpcp.utils.clearSelected(mpcp.librarySongs);
        $(mpcp.librarySongs.clone)[0].classList.remove('info');
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
            komponist.search('artist', mpcp.library.artist, 'album',
                    mpcp.library.album, 'title', title, function (err, files) {
                if (err) return console.log(err);
                compare(files);
            });
        } else if (mpcp.library.artist) {
            //console.log('search artist');
            komponist.search('artist', mpcp.library.artist,
                    'title', title, function (err, files) {
                if (err) return console.log(err);
                compare(files);
            });
        } else {
            console.log('no artist or album selected?');
            if (callback) callback();
        }
    },

    initEvents: function () {
        mpcp.browser.createSortable(this);

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

        mpcp.tableHeader.init(this.tableid, 'MPCPLibrarySongsChanged');

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
