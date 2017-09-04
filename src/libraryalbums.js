module.exports = function (mpcp) {

// separate mutliselect for album
return {
    selected: [],
    saved: [],
    tableid: 'library-albums-list',
    table: '#library-albums-list',
    tbody: '#library-albums-list .append',
    tbodyid: 'library-albums-list-tbody',

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

        mpcp.socket.emit('mpc', 'database.list', 'Album', [['Artist', artist]],
                albums => {

            //console.log(albums);
            albums = albums[0][1];
            //console.log(albums);

            $(mpcp.libraryAlbums.table + ' .gen').remove();

            var html       = '',
                tableStart = '<table class="fixed-table"><tr><td>',
                tableEnd   = '</td></tr></table>',
                addClass   = '';

            if (!albumUse)
                addClass = 'bg-info text-light';

            // All row
            html += '<tr class="context-menu gen album library-artist-all ' + addClass + '" data-artist="' + artist + '" title="All"><td>' + tableStart + 'All' + tableEnd + '</td><td class="song-list-icons text-right"><i class="album-add faded text-success fa fa-plus" title="Add album to the bottom of the playlist"></i></td></tr>';
            addClass = '';

            albums.forEach(album => {
                if (album === '')
                    return;

                if (album == albumUse)
                    addClass = 'bg-info text-light';

                html += '<tr class="context-menu gen album ' + addClass + '" data-artist="' + artist + '" data-album="' + album + '" title="' + album + '"><td>' + tableStart + album + tableEnd + '</td><td class="song-list-icons text-right"><i class="album-add faded text-success fa fa-plus" title="Add album to the bottom of the playlist"></i></td></tr>';
                addClass = '';
            });

            document.getElementById(mpcp.libraryAlbums.tbodyid).innerHTML = html;

            // show all songs initially
            mpcp.librarySongs.update(artist, albumUse, poppedState, callback);
        });
    },

    initEvents: function () {
        mpcp.utils.lazySearch('#search-albums', this.table, 'album',
            '#search-albums-clear');

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

        mpcp.utils.tableSort(this.table, '#library-col-albums', 1, 'string');

        mpcp.utils.multiSelect(this, ['album-add'], ['body'], false);
    }
};

};
