module.exports = function (mpcp) {

// separate mutliselect for artist
return {
    selected: [],
    saved: [],
    tableid: 'library-artists-list',
    table: '#library-artists-list',
    tbody: '#library-artists-list .append',
    tbodyid: 'library-artists-list-tbody',

    // put artists in table
    // artistUse: highlight in table
    update: function (artistUse, callback) {
        if (this.hidden) {
            if (callback) callback();
            return;
        }

        console.log('update artists');

        komponist.list('artist', function (err, files) {
            if (err) {
                console.log(err);
                if (callback) callback();
                return;
            }

            //console.log(files);

            $(mpcp.libraryArtists.table + ' .gen').remove();
            files = mpcp.utils.toArray(files);

            var html = '';

            if (!files.length || files[0].Artist === '') {
                html = '<tr class="gen"><td colspan="2">' +
                    '<em class="text-muted">No artists</em></td></tr>';
                document.getElementById(mpcp.libraryArtists.tbodyid).innerHTML = html;
                console.log('No artists found');
                if (callback) callback();
                return;
            }

            var tableStart = '<table class="fixed-table"><tr><td>',
                tableEnd   = '</td></tr></table>',
                addClass   = '';

            for (var i = 0; i < files.length; ++i) {
                var artist = files[i].Artist;

                if (artist == artistUse) addClass = 'info';

                html += '<tr class="context-menu gen artist ' + addClass + '" data-artist="' + artist + '" title="' + artist + '"><td>' + tableStart + artist + tableEnd + '</td><td class="song-list-icons text-right"><span class="artist-add faded text-success glyphicon glyphicon-plus" title="Add artist to the bottom of the playlist"></span></td></tr>';
                addClass = '';
            }

            document.getElementById(mpcp.libraryArtists.tbodyid).innerHTML = html;

            if (callback) callback();
        });
    },

    initEvents: function () {
        mpcp.utils.lazySearch('#search-artists', this.table, 'artist',
            '#search-artists-clear');

        $(document).on('click', this.table + ' .gen', function () {
            var artist = $(this).data().artist;
            mpcp.libraryAlbums.update(artist);
        });

        $(document).on('click', '.artist-add', function () {
            var artist = $(this).parent().parent().data().artist;
            mpcp.library.addExternal(mpcp.libraryArtists, artist);
        });

        $(document).on('dblclick', '.artist', function () {
            var artist = $(this).parent().parent().data().artist;
            mpcp.library.addExternal(mpcp.libraryArtists, artist);
        });

        mpcp.utils.tableSort(this.table, '#library-col-artists', 1, 'string');

        mpcp.utils.multiSelect(this, ['artist-add'], ['body'], false);
    }
};

};
