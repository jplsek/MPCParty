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
      // if still null, return (user updates library without clicking an artist)
      if (!artist) {
        if (callback) callback()
        return
      }

      console.log('update albums')
      mpcp.library.artist = artist

      komponist.list('album', artist, function (err, files) {
        if (err) {
          console.log(err)
          mpcp.librarySongs.update(
            artist, albumUse, poppedState, callback)
          return
        }

        $(mpcp.libraryAlbums.table + ' .gen').remove()
        files = mpcp.utils.toArray(files)

        var html = ''
        var addClass = ''

        if (!albumUse) { addClass = 'info' }

        // All row
        html += '<tr class="context-menu gen album library-artist-all ' + addClass + '" data-artist="' + artist + '" title="All">' +
          '<td>All</td>' +
          '<td class="song-list-icons text-right"><i class="album-add fas fa-plus faded text-success" title="Add album to the bottom of the playlist"></i></td></tr>'
        addClass = ''

        // console.log(files)

        if (!files.length || files[0].Album === '') {
          html = '<tr class="gen"><td colspan="2">' +
          '<em class="text-muted">No albums</em></td></tr>'
          document.getElementById(mpcp.libraryAlbums.tbodyid).innerHTML = html
          console.log('No albums found')
          mpcp.librarySongs.update(
            artist, albumUse, poppedState, callback)
          return
        }

        for (var i = 0; i < files.length; ++i) {
          var album = files[i].Album

          if (album === albumUse) { addClass = 'info' }

          html += '<tr class="context-menu gen album ' + addClass + '" data-artist="' + artist + '" data-album="' + album + '" title="' + album + '">' +
            '<td class="ellipsis">' + album + '</td>' +
            '<td class="song-list-icons text-right"><i class="album-add fas fa-plus faded text-success" title="Add album to the bottom of the playlist"></i></td></tr>'
          addClass = ''
        }

        document.getElementById(mpcp.libraryAlbums.tbodyid).innerHTML = html

        // show all songs initially
        mpcp.librarySongs.update(artist, albumUse, poppedState, callback)
      })
    },

    initEvents: function () {
      mpcp.utils.lazySearch('#search-albums', this.table, 'album')

      $(document).on('click', this.table + ' .gen', function () {
        var artist = $(this).data().artist
        var album = $(this).data().album
        mpcp.librarySongs.update(artist, album)
      })

      $(document).on('click', '.album-add', function () {
        var artist = $(this).parent().parent().data().artist
        var album = $(this).parent().parent().data().album
        mpcp.library.addExternal(mpcp.libraryAlbums, artist, album)
      })

      $(document).on('dblclick', '.album', function () {
        var artist = $(this).parent().parent().data().artist
        var album = $(this).parent().parent().data().album
        mpcp.library.addExternal(mpcp.libraryAlbums, artist, album)
      })

      mpcp.utils.tableSort(this.table, '#library-col-albums', 1, 'string')

      mpcp.utils.multiSelect(this, ['album-add'], ['body'], false)
    }
  }
}
