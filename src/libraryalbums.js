module.exports = function (mpcp) {

// separate mutliselect for album
return {
    selected: [],
    saved: [],
    tableid: 'library-albums-list',
    table: '#library-albums-list',
    tbody: '#library-albums-list .append',

    // put albums in table
    // albumUse: highlight in table
    update: function (artist, albumUse, poppedState, callback) {
        // if still null, return (user updates library without clicking an
        // artist)
        if (!artist) {
            if (callback) callback();
            return;
        }

        console.log('update albums');
        mpcp.library.artist = artist;

        komponist.list('album', artist, function (err, files) {
            if (err) {
                console.log(err);
                mpcp.librarySongs.update(
                        artist, albumUse, poppedState, callback);
                return;
            }

            $(mpcp.libraryAlbums.table + ' .gen').remove();
            files = mpcp.utils.toArray(files);

            var html       = '',
                tableStart = '<table class="fixed-table"><tr><td>',
                tableEnd   = '</td></tr></table>',
                addClass   = '';

            if (!albumUse)
                addClass = 'info';

            // All row
            html += '<tr class="context-menu gen album library-artist-all ' + addClass + '" data-artist="' + artist + '" title="All"><td>' + tableStart + 'All' + tableEnd + '</td><td class="song-list-icons text-right"><span class="album-add faded text-success glyphicon glyphicon-plus" title="Add album to the bottom of the playlist"></span></td></tr>';
            addClass = '';

            //console.log(files);

            if (!files.length || files[0].Album === '') {
                html = '<tr class="gen"><td colspan="2">' +
                    '<em class="text-muted">No albums</em></td></tr>';
                $(mpcp.libraryAlbums.tbody)[0].innerHTML = html;
                console.log('No albums found');
                window.dispatchEvent(new CustomEvent('MPCPLibraryAlbumsChanged'));
                mpcp.librarySongs.update(
                        artist, albumUse, poppedState, callback);
                return;
            }

            for (var i = 0; i < files.length; ++i) {
                var album = files[i].Album;

                if (album == albumUse)
                    addClass = 'info';

                html += '<tr class="context-menu gen album ' + addClass + '" data-artist="' + artist + '" data-album="' + album + '" title="' + album + '"><td>' + tableStart + album + tableEnd + '</td><td class="song-list-icons text-right"><span class="album-add faded text-success glyphicon glyphicon-plus" title="Add album to the bottom of the playlist"></span></td></tr>';
                addClass = '';
            }

            $(mpcp.libraryAlbums.tbody)[0].innerHTML = html;

            mpcp.sortHelper.reloadSortable(mpcp.libraryAlbums);
            window.dispatchEvent(new CustomEvent('MPCPLibraryAlbumsChanged'));

            // show all songs initially
            mpcp.librarySongs.update(artist, albumUse, poppedState, callback);
        });
    },

    initEvents: function () {
        mpcp.utils.lazySearch('#search-albums', this.table, 'album',
            '#search-albums-clear');

        mpcp.browser.createSortable(this);

        $(document).on('click', this.table + ' .gen', function () {
            var artist = $(this).data().artist,
                album  = $(this).data().album;
                mpcp.librarySongs.update(artist, album);
        });

        $(document).on('click', '.album-add', function () {
            var artist = $(this).parent().parent().data().artist,
                album  = $(this).parent().parent().data().album;
                mpcp.library.addExternal(mpcp.libraryAlbums, artist, album);
        });

        $(document).on('dblclick', '.album', function () {
            var artist = $(this).parent().parent().data().artist,
                album  = $(this).parent().parent().data().album;
                mpcp.library.addExternal(mpcp.libraryAlbums, artist, album);
        });

        mpcp.tableHeader.init(this.tableid, 'MPCPLibraryAlbumsChanged');

        mpcp.utils.tableSort(this.table, '#library-col-albums', 1, 'string');

        mpcp.utils.multiSelect(this, ['album-add'], ['body'], false);
    }
};

};
