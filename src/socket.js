module.exports = function (mpcp) {
  var host = window.document.location.host

  var socket = new WebSocket('ws://' + host)

  // called in socket init
  function initAfterConnection () {
    console.log('initAfterConnection')
    // mpcp.player.updateAll() // inside of mpcp.playlist.updateTitle
    mpcp.player.updateMixer()
    // mpcp.playlist.updateAll() // inside of mpcp.playlist.updateTitle
    // mpcp.browser.update() // done lower in the function
    mpcp.utils.updateStats()

    var path = window.location.pathname
      .slice(1, window.location.pathname.length)
      .replace(/%20/g, ' ')
    var action = path.slice(0, path.indexOf('/'))
    var request = path.slice(path.indexOf('/') + 1, path.length)

    // console.log(path)
    // console.log(action)
    // console.log(request)

    // check action
    if (action === 'search') {
      mpcp.browser.show()
      request = decodeURIComponent(request)
      mpcp.browser.search(request)
      document.getElementById('search-browser').value = request
    } else if (action === 'library') {
      mpcp.library.decodeRequest(request)
    } else if (action === 'browser') {
      mpcp.browser.show()
      mpcp.browser.current = request
      mpcp.browser.previous = request
      mpcp.browser.update()
    } else {
      // else check settings
      if (mpcp.settings.browser === 'library') {
        mpcp.library.show()
        mpcp.libraryArtists.update()
      } else {
        mpcp.browser.show()
        mpcp.browser.update()
      }
    }

    mpcp.browser.initEvents()

    // sometimes the socket doesn't send the vote updates, this is used for that
    setTimeout(function () {
      if (!mpcp.vote.received) {
        console.log('server didnt send votes, asking for votes')
        socket.send(JSON.stringify(
          { type: 'get-votes' }), function (err) {
          if (err) console.log(err)
        })
      }
    }, 200)

    socket.onclose = function (event) {
      mpcp.disconnect.callSocketClose()
    }
  }

  // Web socket configuration
  socket.onmessage = function (event) {
    if (!event.data) return

    // console.log(event.data)

    var msg = JSON.parse(event.data)

    switch (msg.type) {
      case 'current-info':
        mpcp.vote.received = true
        mpcp.users.total = msg['total-clients']
        mpcp.vote.needed = msg['song-skip-total']
        mpcp.vote.setTitles(msg['song-skip-previous'], 'previous')
        mpcp.vote.setTitles(msg['song-skip-next'], 'next')
        break

      case 'init':
        mpcp.playlist.updateTitle(msg['playlist-title'])
        mpcp.vote.enabled = msg['song-vote']
        if (msg['downloader-enabled']) { mpcp.downloader.init(msg['downloader-location']) }
        mpcp.utils.setCurrentAlbumArt(msg['album-art'])
        initAfterConnection()
        break

      // playlist
      // when song is playing, the playlist doesn't get updated,
      // this is used to force the update
      case 'clear-playlist':
        console.log('user clear-playlist called')
        mpcp.playlist.updateTitle('')
        // mpcp.player.updateAll() // inside mpcp.playlist.updateAll
        mpcp.playlist.updateAll()
        break

      case 'update-playlist':
        console.log('user update-playlist called')
        mpcp.playlist.updateAll()
        break

      case 'update-browser':
        console.log('user update-browser called')
        mpcp.browser.doUpdate = true
        mpcp.browser.update()
        mpcp.utils.updateStats()
        break

      case 'playlist-title':
        mpcp.playlist.updateTitle(msg.info)
        break

      // player
      case 'song-next':
        msg.info += ' skipped to the next song.'
        mpcp.history.add(msg.info, 'info')

        // don't show notification if only 1 person is using the client
        if (mpcp.users.total <= 1) return

        mpcp.lazyToast.info(msg.info, 'Song Skipped', 10000)
        break

      case 'song-previous':
        msg.info += ' skipped to the previous song.'
        mpcp.history.add(msg.info, 'info')

        // don't show notification if only 1 person is using the client
        if (mpcp.users.total <= 1) return

        mpcp.lazyToast.info(msg.info, 'Song Skipped', 10000)
        break

      // stored
      case 'playlist-reload':
        mpcp.stored.open(msg.info)
        break

      // vote
      case 'song-vote-next':
        console.log('received skip')
        mpcp.vote.message(msg.info, 'next')
        break

      case 'song-vote-previous':
        console.log('received skip')
        mpcp.vote.message(msg.info, 'previous')
        break

      case 'request-vote-update-from-server':
        // assumes a vote reset
        document.getElementById('next').classList.remove('active')
        document.getElementById('previous').classList.remove('active')
        break

      case 'skipped':
        console.log('skip successful received')
        document.getElementById('next').classList.remove('active')
        document.getElementById('previous').classList.remove('active')
        var str = ''

        for (var i in msg.info) {
          str += mpcp.users.get(msg.info[i]) + ', '
        }

        if (mpcp.users.total > 1) {
          str += 'skipped: ' + mpcp.player.title + '.'
          mpcp.lazyToast.info(str, 'Song Skip')
          mpcp.history.add(str, 'info')
        } else { mpcp.history.add('Skipped: ' + mpcp.player.title, 'info') }

        mpcp.vote.setTitles(0, 'previous')
        mpcp.vote.setTitles(0, 'next')
        break

      case 'user-skip-next':
        document.getElementById('next').classList.add('active')
        break

      case 'user-skip-previous':
        document.getElementById('previous').classList.add('active')
        break

      case 'hostnames':
        console.log('received hostnames update')
        mpcp.users.populate(msg.info)
        break

      // downloader
      case 'downloader-download':
        mpcp.downloader.setStatus('Downloading and converting video...')
        break

      case 'downloader-status':
        document.getElementById('downloader-status').innerHTML = msg.info
        break

      // album art
      case 'album-art':
        mpcp.utils.setCurrentAlbumArt(msg.url)
        break
    }
  }

  // gracefully close the socket
  window.addEventListener('beforeunload', () => {
    socket.close()
  })

  return socket
}
