module.exports = function (mpcp) {
  // page support for browser, playlist, etc
  return {
  // enable page support
    enabledPlaylist: true,
    enabledBrowser: false,
    // maximum items per page (playlist or browser)
    maxPlaylist: 200,
    maxBrowser: 200,
    // total pages
    totalPlaylist: 1,
    totalBrowser: 1,
    // current page
    currentPlaylist: 1,
    currentBrowser: 1,

    // updates the max pages
    update: function (type) {
      console.log('pages update for ' + type)

      if (type === 'playlist') {
        this.totalPlaylist = Math.ceil(mpcp.playlist.local.length / this.maxPlaylist)

        // just in case
        if (this.totalPlaylist <= 0) this.totalPlaylist = 1

        $('#playlist-pages .total-pages')[0].innerHTML = this.totalPlaylist
        $('#playlist-pages input').prop('max', this.totalPlaylist)

        // checks while user updating maximum item values
        if ($('#playlist-pages input')[0].value > this.totalPlaylist) {
          console.log('changing to max page')
          $('#playlist-pages input')[0].value = this.totalPlaylist
          this.go('playlist', this.totalPlaylist)
        }
      } else if (type === 'browser') {
        this.totalBrowser = Math.ceil((mpcp.browser.localFolders.length +
            mpcp.browser.localFiles.length) / this.maxBrowser)

        // just in case
        if (this.totalBrowser <= 0) this.totalBrowser = 1

        $('#browser-pages .total-pages')[0].innerHTML = this.totalBrowser
        $('#browser-pages input').prop('max', this.totalBrowser)

        // checks while user updating maximum item values
        if ($('#browser-pages input')[0].value > this.totalBrowser) {
          console.log('changing to max page')
          $('#browser-pages input')[0].value = this.totalBrowser
          this.go('browser', this.totalBrowser)
        }
      }
    },

    // type: browser or playlist, page: the page to go
    go: function (type, page, scrollDown) {
      page = Math.floor(page)
      console.log('go to page ' + page + ' on ' + type)

      if (type === 'playlist' && this.enabledPlaylist) {
        if (page < 1 || page > this.totalPlaylist) return

        this.currentPlaylist = parseInt(page)
        $('#playlist-pages input')[0].value = this.currentPlaylist
        mpcp.playlist.updateLocal()

        if (!scrollDown) {
          $('#pslwrap').scrollTop($(mpcp.playlist.table))
        } else {
          $('#pslwrap').scrollTop($(mpcp.playlist.table)[0].scrollHeight)
        }
      } else if (type === 'browser' && this.enabledBrowser) {
        if (page < 1 || page > this.totalBrowser) return

        this.currentBrowser = parseInt(page)
        $('#browser-pages input')[0].value = this.currentBrowser
        mpcp.browser.updateLocal()

        if (!scrollDown) {
          $('#slwrap').scrollTop($(mpcp.browser.table))
        } else {
          $('#slwrap').scrollTop($(mpcp.browser.table)[0].scrollHeight)
        }
      }
    },

    // show page footer
    show: function (type) {
      console.log('show pages: ' + type)

      if (type === 'playlist') {
        document.getElementById('playlist-pages').style.display = 'flex'
      } else if (type === 'browser') {
        document.getElementById('browser-pages').style.display = 'flex'
      } else {
        $('.pages').show()
      }
    },

    // hide page footer
    hide: function (type) {
      console.log('hide pages: ' + type)

      if (type === 'playlist') {
        document.getElementById('playlist-pages').style.display = 'none'
      } else if (type === 'browser') {
        document.getElementById('browser-pages').style.display = 'none'
      } else {
        $('.pages').hide()
      }
    },

    initEvents: function () {
      // playlist pages event handling
      document.querySelector('#playlist-pages input').addEventListener('change', e => {
        mpcp.pages.go('playlist', e.target.value)
      })

      document.querySelector('#playlist-pages .first').addEventListener('click', e => {
        mpcp.pages.go('playlist', 1)
      })

      document.querySelector('#playlist-pages .last').addEventListener('click', e => {
        mpcp.pages.go('playlist', mpcp.pages.totalPlaylist)
      })

      // browser pages event handling
      document.querySelector('#browser-pages input').addEventListener('change', e => {
        mpcp.pages.go('browser', e.target.value)
      })

      document.querySelector('#browser-pages .first').addEventListener('click', e => {
        mpcp.pages.go('browser', 1)
      })

      document.querySelector('#browser-pages .last').addEventListener('click', e => {
        mpcp.pages.go('browser', mpcp.pages.totalBrowser)
      })
    }
  }
}
