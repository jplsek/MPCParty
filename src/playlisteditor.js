module.exports = function (mpcp) {
  // the playlist editor
  return {
    current: null,
    selector: '#pe',
    table: '#pe-song-list',
    tableid: 'pe-song-list',
    tbody: '#pe-song-list .append',
    tbodyid: 'pe-song-list-tbody',
    minimized: false,
    // selected items from multiSelect
    selected: [],

    // future: share playlists to edit?
    newLocal: function () {
      if (this.minimized) {
        this.minimized = false
        this.resume()
      } else if (!this.current) {
        this.current = 'local'
        document.getElementById('pe').style.display = 'flex'
        this.clear()
      }
    },

    getHtml: function (title, file) {
      var extra = ''
      if (mpcp.settings.pulse) extra += 'pulse'

      return '<tr class="gen context-menu ' + extra + '" title="' + title + '" data-title="' + title + '" data-fileid="' + file + '">' +
      '<td class="playlist-song-list-icons"></td>' +
      '<td class="cell-ellipsis w-100"><span>' + title + '</span></td>' +
      '<td class="playlist-song-list-icons text-right"><i class="pe-song-remove fas fa-times faded text-danger" title="Remove song from playlist"></i></td></tr>'
    },

    // file object, position to put song
    // file can be an array of 'file' objects
    addSong: function (file, pos, callback) {
      // console.log('adding song to pe: ' + this.current)
      // console.log(file)
      this.removeNothingMessage()

      var title; var html = ''

      if (Array.isArray(file)) {
        for (var i = 0; i < file.length; ++i) {
          title = mpcp.utils.getSimpleTitle(file[i].Title, file[i].Artist,
            file[i].file)
          html += this.getHtml(title, file[i].file)
        }
      } else {
        title = mpcp.utils.getSimpleTitle(file.Title, file.Artist, file.file)
        html = this.getHtml(title, file.file)
      }

      if (pos >= 0) {
        if (!pos) {
          $(this.tbody).prepend(html)
          $('#pe-main').scrollTop($(this.table))
        } else {
          // console.log('add to ' + pos)
          $(this.tbody + ' > .gen:nth-child(' + (pos) + ')').after(html)
        }
      } else {
        // console.log('add to bottom')
        document.getElementById(this.tbodyid).innerHTML += html
        $('#pe-main').scrollTop($(this.table)[0].scrollHeight)
      }

      this.move()

      if (callback) callback()
    },

    fromSortableSelf: function (el) {
      if (mpcp.pe.selected.length) {
        var last
        var index = mpcp.pe.selected.index(el)

        $(mpcp.pe.selected).each(function (item, tr) {
          // var file = $(tr).data().fileid

          // if dropped item is further down than the current tr
          if (index > item) {
            // console.log(file + ': insert before')
            $(tr).insertBefore(el)
          } else if (index < item) {
            // console.log(file + ': insert after')
            // put tr after the last placed element
            if (!last) {
              $(tr).insertAfter(el)
            } else {
              $(tr).insertAfter(last)
            }

            last = tr
          }
          // else dont do anything
          // (the item that was dropped)
        })

        mpcp.utils.clearSelected(mpcp.pe)
      }

      this.move()
    },

    // dragging from another drag table
    // mutliselect is handled in addDir and addfile
    fromSortableSender: function (el, index) {
      var rem = 1

      // check if "playlist editor is empty" is showing
      if (index === 1 && document.getElementById(this.tbodyid).children[0].classList.contains('rem')) {
        index = 0
        ++rem
      }

      // remove the dragged element
      $(this.tbody + ' .gen:nth-child(' + (rem + index) + ')').remove()

      // mutli select check
      if (mpcp.browser.selected.length) {
        mpcp.browser.addMulti(index)
        return
      } else if (mpcp.librarySongs.selected.length) {
        mpcp.librarySongs.addMulti(index)
        return
      } else if (el.classList.contains('artist') &&
        mpcp.libraryArtists.selected.length) {
        mpcp.library.addMulti(mpcp.libraryArtists, index, true)
        return
      } else if (el.classList.contains('album') &&
        mpcp.libraryAlbums.selected.length) {
        mpcp.library.addMulti(mpcp.libraryAlbums, index, true)
        return
      }

      var artist, album

      if (el.classList.contains('file')) {
        var fileName = el.dataset.fileid
        this.addid(fileName, index)
      } else if (el.classList.contains('directory')) {
        // directory
        var dir = el.dataset.dirid
        this.add(dir, index)
      } else if (el.classList.contains('album')) {
        artist = el.dataset.artist
        album = el.dataset.album

        mpcp.library.getSongsFromAlbum(artist, album, function (files) {
          mpcp.pe.addSong(files, index)
        })
      } else if (el.classList.contains('artist')) {
        artist = el.dataset.artist

        mpcp.library.getSongsFromAlbum(artist, null, function (files) {
          mpcp.pe.addSong(files, index)
        })
      } else {
        console.log('not supported drag for: ' + $(el).attr('class'))
      }
    },

    // wrapper (similar to komponist.addid)
    addid: function (fileid, pos, callback) {
      // console.log(fileid)
      komponist.find('file', fileid, function (err, value) {
        if (err) {
          console.log(err)
          if (callback) callback()
          return
        }

        // console.log(value)
        value = value[0]

        if (value.file && !value.directory) {
          mpcp.pe.addSong(value, pos, callback)
        }
      })
    },

    // add an array so the DOM is only updated once
    // arr: [type][value]
    addArr: function (arr, pos, rootCallback) {
      // converts to a files array for addSong
      var newArr = []
      var j = 0

      function callback () {
        mpcp.pe.addSong(newArr, pos, rootCallback)
      }

      function setFile (fileid) {
        komponist.find('file', content, function (err, value) {
          if (err) return console.log(err)

          value = value[0]

          if (value.file && !value.directory) {
            // console.log(value)
            newArr.push(value)
            if (++j === arr.length) callback()
          }
        })
      }

      function setDir (dir) {
        mpcp.utils.getAllInfo(dir, function (files) {
          newArr = newArr.concat(files)
          if (++j === arr.length) callback()
        })
      }

      // console.log(arr)
      for (var i = 0; i < arr.length; i++) {
        var val = arr[i][0]
        var content = arr[i][1]

        // fileid
        if (val === 'id') {
          setFile(content)
        } else if (val === 'dir') {
          // dir
          setDir(content)
        } else if (val === 'file') {
          // file
          newArr.push(content)
          j += 1
        } else {
          console.log(val + ' is not supported?')
          j += 1
        }

        if (j === arr.length) callback()
      }
    },

    // wrapper (similar to komponist.add)
    add: function (dir, pos, callback) {
      // FUTURE SELF: DO NOT USE LISTALLINFO, IT WILL HAVE THE "OFF BY ONE"
      // BUG, KEEP THIS 'getAllInfo'.
      // Option 1: Loop through all directories recursively running lsinfo
      // Option 2: Run listall, then loop through each item to get metadata
      // Option 1 sends less requests to the server, so we'll implement that.
      // Add All and Multiselect directories is still based on how fast the
      // server can respond per directory (so it can look random)
      mpcp.utils.getAllInfo(dir, function (files) {
        // console.log(files)
        mpcp.pe.addSong(files, pos, callback)
      })
    },

    // remove song from the pe
    removeSong: function (element) {
      // multiselect check (any left clicks)
      if (this.selected.length) {
        $(this.selected).each(function (item, tr) {
          // console.log(tr)
          $(tr)[0].remove()
        })

        // clear this.selected just in case.
        mpcp.utils.clearSelected(this)
      } else {
        $(element)[0].remove()
      }

      this.move()
    },

    // just updates the numbers column in the table
    move: function () {
      var pos = 0
      var tr = document.getElementById(mpcp.pe.tbodyid).children

      for (var i = 0; i < tr.length; ++i) {
        tr[i].firstChild.innerHTML = ++pos + '.'
      }

      if (!pos) mpcp.pe.showNothingMessage()
    },

    // open the playlist to the pe
    open: function (file, callback) {
      komponist.listplaylistinfo(file, function (err, val) {
        if (err) {
          console.log(err)
          if (callback) callback()
          return
        }

        mpcp.pe.clear()
        mpcp.pe.addSong(val, null, callback)
      })
    },

    // clear the pe
    clear: function () {
      $(this.table + ' .gen').remove()
      this.showNothingMessage()
    },

    // close the pe (and clear)
    close: function () {
      this.current = null
      $(this.selector)[0].style.display = 'none'
      this.clear()
    },

    // minimize the pe (dont clear)
    minimize: function () {
      this.current = null
      this.minimized = true
      $(this.selector)[0].style.display = 'none'
      document.getElementById('pe-tab').style.display = 'block'
    },

    // resume after minimize
    resume: function () {
      this.minimized = false
      this.current = 'local'
      document.getElementById('pe-tab').style.display = 'none'
      $(this.selector)[0].style.display = 'flex'
    },

    // scramble the pe
    scramble: function (callback) {
      $(mpcp.pe.tbody).randomize('.gen')
      mpcp.pe.move()
      if (callback) callback()
    },

    // remove duplicate songs in the pe
    removeDuplicates: function (callback) {
      console.log('remove duplicates')
      var duplicate = {}

      $(this.table + ' .gen').each(function () {
        var title = $(this).attr('title')

        if (duplicate[title]) {
          mpcp.pe.removeSong(this)
        } else {
          duplicate[title] = true
        }
      })

      if (callback) callback()
    },

    // move rows to top of pe
    moveToTop: function (tr) {
      if (this.selected.length) {
        $(this.selected).each(function (item, tr) {
          $(tr).prependTo(mpcp.pe.tbody)
        })

        mpcp.utils.clearSelected(this)
      } else {
        $(tr).prependTo(this.tbody)
      }

      $('#pe-main').scrollTop($(this.table))
      this.move()
    },

    // move rows to bottom of pe
    moveToBottom: function (tr) {
      if (this.selected.length) {
        $(this.selected).each(function (item, tr) {
          $(tr).appendTo(this.tbody)
        })

        mpcp.utils.clearSelected(this)
      } else {
        $(tr).appendTo(this.tbody)
      }

      $('#pe-main').scrollTop(document.getElementById(this.tableid).scrollHeight)
      this.move()
    },

    showNothingMessage: function () {
      var html = '<tr class="rem gen"><td><em class="text-muted">The playlist editor is empty! Songs can be added from the browser or by opening a playlist.</em></td></tr>'
      document.getElementById(this.tbodyid).innerHTML = html
    },

    removeNothingMessage: function () {
      $(this.tbody + ' .rem').remove()
    },

    initEvents: function () {
      $(document).on('click', '.pe-song-remove', function () {
        var file = $(this).parent().parent()
        mpcp.pe.removeSong(file)
      })

      document.getElementById('pe-clear').addEventListener('click', () => {
        mpcp.pe.clear()
      })

      document.getElementById('pe-close').addEventListener('click', () => {
        mpcp.pe.close()
      })

      document.getElementById('pe-save').addEventListener('click', () => {
        mpcp.stored.externalSave()
      })

      document.getElementById('pe-minimize').addEventListener('click', () => {
        mpcp.pe.minimize()
      })

      document.getElementById('pe-tab').addEventListener('click', () => {
        mpcp.pe.resume()
      })

      document.getElementById('pe-open').addEventListener('click', () => {
        mpcp.stored.updatePlaylists('#playlist-open-modal', mpcp.pe.open)
      })

      document.getElementById('pe-scramble').addEventListener('click', () => {
        mpcp.pe.scramble()
      })

      document.getElementById('pe-remove-duplicates').addEventListener('click', () => {
        mpcp.pe.removeDuplicates()
      })

      mpcp.utils.multiSelect(this, ['pe-song-remove'])

      $('#pe-search-toggle').click(function () {
        if (document.getElementById('pe-search-toggle').classList.contains('active')) {
          document.getElementById('pe-search-toggle').classList.remove('active')
          document.getElementById('pe-search').style.display = 'none'
          document.getElementById('search-pe').value = ''
          $(mpcp.pe.tbody).children().show()
        } else {
          document.getElementById('pe-search-toggle').classList.add('active')
          document.getElementById('pe-search').style.display = 'block'
          $('#search-pe').focus()
        }
      })

      mpcp.utils.lazySearch('#search-pe', this.table, 'title')
    }
  }
}
