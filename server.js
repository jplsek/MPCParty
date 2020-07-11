var express = require('express')
var app = express()
var http = require('http').Server(app)
var WebSocketServer = require('ws').Server
var io = new WebSocketServer({ server: http })
var komponist = require('komponist')
var fs = require('fs')
var sass = require('node-sass-middleware')
var browserify = require('browserify-middleware')
var dns = require('dns')
var toml = require('toml')
var path = require('path')
var tilde = require('expand-tilde')
var glob = require('glob')

// mpd: komponist mpd connection; pack: package.json
var mpd; var pack

// some of these varaibles are saved so that a new client can quickly get
// unique information the server knows about.

// save playlist title for future connections (because I have no idea how
// to get the playlist title on initial load)
var playlistTitle = ''
// updated per connection
var addresses = []
// ip:hostname
var hostnames = {}
// checks if the song changed to clear user votes
var currentSong = null
// currently playing song's album art url
var currentArt = null
// set to true when making a release
var release = false

var settingsManager = {
  server: {
    port: 8081
  },
  mpd: {
    url: 'localhost',
    port: 6600,
    library: ''
  },
  users: {
    enabled: false
  },
  testing: {
    enabled: false
  },
  voting: {
    enabled: true,
    percent: 0.75
  },
  downloader: {
    enabled: true,
    directory: 'Downloads',
    keepVideo: false
  },

  start: function () {
    console.log('Reading settings from mpcparty.cfg...')

    try {
      var data = fs.readFileSync(path.join(__dirname, '/mpcparty.cfg'))

      data = toml.parse(data)
      this.server.port = (data.server.port !== undefined
        ? data.server.port : this.server.port)
      this.mpd.url = (data.mpd.url !== undefined
        ? data.mpd.url : this.mpd.url)
      this.mpd.port = (data.mpd.port !== undefined
        ? data.mpd.port : this.mpd.port)
      this.mpd.library = (data.mpd.library !== undefined
        ? data.mpd.library : this.mpd.library)
      this.users.enabled = (data.users.enabled !== undefined
        ? data.users.enabled : this.users.enabled)
      this.testing.enabled = (data.testing.enabled !== undefined
        ? data.testing.enabled : this.testing.enabled)
      this.voting.enabled = (data.vote.enabled !== undefined
        ? data.vote.enabled : this.voting.enabled)
      this.voting.percent = (data.vote.percent !== undefined
        ? data.vote.percent : this.voting.percent)
      this.downloader.enabled = (data.downloader.enabled !== undefined
        ? data.downloader.enabled : this.downloader.enabled)
      this.downloader.directory = (data.downloader.directory !== undefined
        ? data.downloader.directory : this.downloader.directory)
      this.downloader.keepVideo = (data.downloader.keep_videos !== undefined
        ? data.downloader.keep_videos : this.downloader.keepVideo)
    } catch (err) {
      console.warn('Unable to read the config file. ' +
        'Make sure to copy the mpcparty.cfg.example file to mpcparty.cfg if you would like to customize your settings.')
    }

    console.log('Reading any environment variables...')

    this.server.port = process.env.SERVER_PORT || this.server.port
    this.mpd.url = process.env.MPD_URL || this.mpd.url
    this.mpd.port = process.env.MPD_PORT || this.mpd.port
    this.mpd.library = process.env.MPD_LIBRARY || this.mpd.library
    this.users.enabled = process.env.USERS_ENABLED || this.users.enabled
    this.testing.enabled = process.env.TESTING_ENABLED || this.testing.enabled
    this.voting.enabled = process.env.VOTE_ENABLED || this.voting.enabled
    this.voting.percent = process.env.VOTE_PERCENT || this.voting.percent
    this.downloader.enabled = process.env.DOWNLOADER_ENABLED || this.downloader.enabled
    this.downloader.directory = process.env.DOWNLOADER_DIRECTORY || this.downloader.directory
    this.downloader.keepVideo = process.env.DOWNLOADER_KEEP_VIDEOS || this.downloader.keepVideo

    // if we don't know the location of the library, disable extra features
    if (this.mpd.library === '') {
      console.warn('Disabling the downloader since the library setting is not set.')
      this.downloader.enabled = false
    }
  }
}

settingsManager.start()

io.broadcast = function (data) {
  io.clients.forEach(function each (client) {
    client.send(data, function (err) {
      if (err) {
        console.log('Error sending message to client via broadcast:')
        console.log(err)
      }
    })
  })
}

function isEmpty (obj) { return Object.keys(obj).length === 0 }

// little wrapper, sets ip if no hostname is found and sends
function getHostname (ip, callback) {
  dns.reverse(ip, function (err, hostname) {
    if (err) {
      // ENOTFOUND is okay. DNS just isn't registered for the ip
      if (err.code !== 'ENOTFOUND') {
        console.log('DNS Failed for ' + ip + ': ')
        console.log(err)
      }
    }

    // first hostname as a string
    if (!hostname || hostname.length === 0) {
      // in case response is not an array
      hostname = []
      hostname[0] = ip
    }

    // console.log('hostname: ' + hostname[0])
    if (typeof callback === 'function') callback(hostname[0], ip)
  })
}

var downloader = {
  youtubedl: require('youtube-dl'),

  start: function () {
    if (!settingsManager.downloader.enabled) {
      return
    }

    // create video.directory folder
    var location = downloader.getLocation(settingsManager.downloader.directory)

    try {
      fs.mkdirSync(location)
    } catch (err) {
      // ignore exists error
      if (err.code !== 'EEXIST') {
        console.log('!!! Error creating directory "' + location + '" for the Downloader, disabling...', err.message)
        settingsManager.downloader.enabled = false
      }
    }

    if (settingsManager.downloader.enabled) {
      console.log('Using directory for the Downloader: ' + location)
    }
  },

  // TODO check if file already exists
  download: function (url, location, address, socket) {
    if (!settingsManager.downloader.enabled) {
      return
    }

    if (location.includes('..')) {
      console.log(address + ' tried to access ' + location + '!')
      socket.send(JSON.stringify({
        type: 'downloader-status',
        info: 'You cannot have ".." in the location!'
      }))
      return
    }

    location = downloader.getLocation(location)

    // make sure the folder exists and is writable
    try {
      fs.accessSync(location, fs.constants.R_OK | fs.constants.W_OK)
    } catch (err) {
      console.log(address + ' tried to download ' + url + ' to ' + location + ', ' +
        "but mpcparty can't write to the directory. Does it exist?", err.message)
      socket.send(JSON.stringify({
        type: 'downloader-status',
        info: 'Error writing to the selected directory'
      }))
      return
    }

    socket.send(JSON.stringify({
      type: 'downloader-status',
      info: 'Downloading and converting video...'
    }))

    var option = ['-x', '--audio-format', 'mp3']
    console.log('Requesting video download: ' + url + ' from ' + address +
      ' to ' + location)

    if (settingsManager.downloader.keepVideo) option.push('-k')

    this.youtubedl.exec(url, option, { cwd: location },
      function exec (err, output) {
        if (err) {
          socket.send(JSON.stringify({
            type: 'downloader-status',
            info: err.stderr + '. Updating youtube-dl may fix the problem.'
          }))
          return console.log(err)
        }

        console.log('============ start youtube-dl ============')
        console.log(output.join('\n'))
        console.log('============  end  youtube-dl ============')

        // for (var item = 0; item < output.length; ++item) {
        //  if (~output[item].indexOf('.mp3')) {
        //    var str = output[item]
        //    var colon = str.indexOf(':')
        //    var newstr = str.substring(colon + 2)
        //    console.log(newstr)
        //  }
        // }

        socket.send(JSON.stringify({
          type: 'downloader-status',
          info: 'Done'
        }))
      })

    // I would like to use this instead... but it doesnt seem to work
    // unless I use a write steam
    // var ytdl = this.youtubedl(url, ['-x', '--audio-format', 'mp3'],
    // {cwd: settingsManager.downloader.directory})
    // ytdl.on('info', function (info) {
    // console.log('video download starting!')
    // })
    // ytdl.on('end', function (info) {
    // console.log('video download complete!')
    // })
  },

  getLocation: function (location) {
    return path.normalize(tilde(settingsManager.mpd.library + path.sep + location))
  }
}

// song skipping
var skip = {
  // user count
  total: 1,
  // user count for skip ammout
  next: 0,
  previous: 0,
  // logs the addresses that have skipped
  addressNext: [],
  addressPrevious: [],
  addressNextCancel: [],
  addressPreviousCancel: [],

  reset: function () {
    // reset arrays and vote ammounts?
    this.next = 0
    this.previous = 0
    // logs the addresses that have skipped
    this.addressNext = []
    this.addressPrevious = []
    this.addressNextCancel = []
    this.addressPreviousCancel = []
    // I would run sendUpdate(), but im not sure how
    // to do with my current set up.
    io.broadcast(JSON.stringify(
      { type: 'request-vote-update-from-server' }))
  },

  nextSuccess: function () {
    mpd.next(function (err) {
      if (err) return console.log(err)

      io.broadcast(JSON.stringify(
        { type: 'skipped', info: skip.addressNext }))
      console.log('Song vote skip successful from ' + skip.addressNext)
      skip.next = 0
      skip.addressNext = []
    })
  },

  previousSuccess: function () {
    mpd.previous(function (err) {
      if (err) return console.log(err)

      io.broadcast(JSON.stringify(
        { type: 'skipped', info: skip.addressPrevious }))
      console.log('Song vote skip successful from ' + skip.addressPrevious)
      skip.previous = 0
      skip.addressPrevious = []
    })
  }
}

if (release) {
  var minify = require('express-minify')
  // must be above express.static
  app.use(minify())
  app.use(function (req, res, next) {
    if (/mpcparty\.js/.test(req.url)) {
      res._uglifyCompress = {
        drop_console: true
      }
    }
    next()
  })
} else {
  app.locals.pretty = true
}

app.disable('x-powered-by')
// sass config
app.use(sass({
  src: path.join(__dirname, '/public'),
  dest: path.join(__dirname, '/public')
}))
// compile js client side code
app.get('/mpcparty.js', browserify(path.join(__dirname, '/src/main.js')))
app.get('/testing.js', browserify(path.join(__dirname, '/tests/main.js')))
// serve static files here
app.use(express.static(path.join(__dirname, '/public')))
// use pug with express
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'pug')

fs.readFile(path.join(__dirname, '/package.json'), function (err, data) {
  if (err) return console.log(err)
  pack = JSON.parse(data)
})

// main pages
app.get('/', function (req, res) {
  res.render('index', {
    pack: pack,
    config: {
      showUsers: settingsManager.users.enabled,
      downloader: settingsManager.downloader.enabled,
      testing: settingsManager.testing.enabled
    }
  })
})

app.get('/browser/*', function (req, res) {
  res.render('index', {
    pack: pack,
    config: {
      showUsers: settingsManager.users.enabled,
      downloader: settingsManager.downloader.enabled,
      testing: settingsManager.testing.enabled
    }
  })
})

app.get('/library/*', function (req, res) {
  res.render('index', {
    pack: pack,
    config: {
      showUsers: settingsManager.users.enabled,
      downloader: settingsManager.downloader.enabled,
      testing: settingsManager.testing.enabled
    }
  })
})

app.get('/search/*', function (req, res) {
  res.render('index', {
    pack: pack,
    config: {
      showUsers: settingsManager.users.enabled,
      downloader: settingsManager.downloader.enabled,
      testing: settingsManager.testing.enabled
    }
  })
})

// static components
app.use('/bootstrap',
  express.static(path.join(__dirname, '/node_modules/bootstrap/dist/')))
app.use('/jquery',
  express.static(path.join(__dirname, '/node_modules/jquery/dist/')))
app.use('/floatthead',
  express.static(path.join(__dirname, '/node_modules/floatthead/dist/')))
app.use('/toastr',
  express.static(path.join(__dirname, '/node_modules/toastr/build/')))
app.use('/jquery-contextmenu',
  express.static(path.join(__dirname, '/node_modules/jquery-contextmenu/dist/')))
app.use('/dragula',
  express.static(path.join(__dirname, '/node_modules/dragula/dist/')))
app.use('/fa',
  express.static(path.join(__dirname, '/node_modules/@fortawesome/fontawesome-free/css/')))
app.use('/webfonts',
  express.static(path.join(__dirname, '/node_modules/@fortawesome/fontawesome-free/webfonts/')))

// 404 requests
// currently disabled until we can get dynamic urls to not 404 with this
// enabled
/* app.use(function (req, res, next) {
  res.status(404)

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url })
    console.log('Page 404 by ' + req.connection.remoteAddress +
      ' on ' + req.originalUrl)
    return
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' })
    return
  }

  // default to plain-text. send()
  res.type('txt').send('Not found')
}) */

downloader.start()

http.listen(settingsManager.server.port, function () {
  console.log('Web server listening on http://localhost:' + settingsManager.server.port)
})

console.log('Connecting to MPD server ' + settingsManager.mpd.url + ':' + settingsManager.mpd.port + '...')

// Open up a proxy on the HTTP server that points to MPD
komponist.install(http, settingsManager.mpd.url, settingsManager.mpd.port)

mpd = komponist.createConnection(settingsManager.mpd.port, settingsManager.mpd.url, function (err, client) {
  if (err) {
    console.log(err)
    process.exit(-5)
  }

  console.log('Connected to MPD!')
  setSong(client)

  client.on('changed', function (system) {
    // console.log('subsystem changed: ' + system)
    if (system === 'player') {
      setSong(client)
    } else if (system === 'playlist') {
      // running setSong with a playlist change to fix a vote issue
      // where users could vote after no song was selected
      setSong(client)
    }
  })
})

function sendArtworkMessage () {
  io.broadcast(JSON.stringify({
    type: 'album-art', url: currentArt
  }), function (err) {
    if (err) {
      console.log('Error sending album art information')
      console.log(err)
    }
  })
}

// get album art based on the directory the file is in
function getImage (song) {
  if (!song || settingsManager.mpd.library === '') {
    currentArt = null
    sendArtworkMessage()
    return
  }

  var subFolder = song.file.substr(0, song.file.lastIndexOf('/'))
  var folder = tilde(settingsManager.mpd.library + '/' + subFolder)

  // console.log(folder)
  glob('{*.jpg,*.png}', { cwd: folder }, function (err, files) {
    if (err) return console.log(err)

    // console.log(files)
    if (files.length === 0) {
      currentArt = null
      sendArtworkMessage()
      return
    }

    // just grab the first file
    var imageLocation = tilde(folder + path.sep + files[0])
    // console.log(imageLocation)

    currentArt = encodeURI('/album-art/' + subFolder + '/' + files[0])
      // *sigh* https://stackoverflow.com/a/8143232
      .replace(/\(/g, '%28').replace(/\)/g, '%29')

    console.log('Creating art URL: ' + currentArt)

    // TODO check if there is a way to remove the old url when a
    // new one is created (or will the gc or express handle that?)
    // create a new url
    app.get(currentArt, function (req, res) {
      res.sendFile(imageLocation, function (err) {
        if (err) {
          console.log(err)
          res.status(404).end()
        }
      })
    })

    sendArtworkMessage()
  })
}

function setSong (client) {
  client.currentsong(function (err, song) {
    if (err) {
      console.log('Error setting current song')
      return console.log(err)
    }

    // console.log('set song: ' + song)

    if (isEmpty(song)) {
      currentSong = null
      getImage()
      return console.log('No song selected')
    }

    if (currentSong !== song.file) {
      console.log('Now playing: ' + song.file)
      skip.reset()
      getImage(song)
    }

    currentSong = song.file
  })
}

// sendUpdate manages the users connected and sends vote information to the clients
var sendUpdate = function (address, connect, customSocket) {
  var oldAddresses = addresses
  var i

  addresses = []

  for (i = 0; i < io.clients.length; ++i) {
    var remAdd = io.clients[i]._socket.remoteAddress
    // check if remAdd is undefined
    if (!~addresses.indexOf(remAdd) && remAdd) { addresses.push(remAdd) }
  }

  var oldSize = oldAddresses.length
  var newSize = addresses.length

  i = 0

  function hostHandler (addr) {
    return getHostname(addr, function (hostname, usedip) {
      hostnames[usedip] = hostname

      if (i === addresses.length - 1 && settingsManager.users.enabled) {
        io.broadcast(JSON.stringify(
          { type: 'hostnames', info: hostnames }))
      }
      ++i
    })
  }

  // only get dns if the user is connecting
  if (connect) {
    for (var item = 0; item < addresses.length; ++item) {
      hostHandler(addresses[item])
    }
  }

  // if the address is undefined, compare addresses with oldAddresses
  if (!address && oldSize !== newSize) {
    var diff = oldAddresses.filter(function (i) {
      return addresses.indexOf(i) < 0
    })

    address = diff[0]

    if (diff.length > 1) {
      console.log('Address differences is > 1, I cant handle this GG.')
      console.log(diff)
    }
  }

  // if there is an update to the ip address list
  // (avoiding duplicate socket connections)
  if (customSocket || oldSize !== newSize) {
    console.log('/---------------------------------------------------\\')

    if (connect) {
      console.log('| ' + address + ' connected to the socket.')
    } else {
      console.log('| ' + address + ' disconnected from the socket.')

      var index = ''

      // removes skipped user from address list
      if (~skip.addressNext.indexOf(address)) {
        console.log('| Removing vote from disconnected user: ' +
          address)
        --skip.next
        index = skip.addressNext.indexOf(address)
        skip.addressNext.splice(index, 1)
      }

      if (~skip.addressPrevious.indexOf(address)) {
        console.log('| Removing vote from disconnected user: ' +
          address)
        --skip.previous
        index = skip.addressPrevious.indexOf(address)
        skip.addressPrevious.splice(index, 1)
      }
    }

    console.log(addresses)

    var totalClients = addresses.length
    var songSkipFloat = totalClients * settingsManager.voting.percent

    skip.total = parseInt((songSkipFloat), 10)

    if (skip.total < 1) skip.total = 1

    // in case a user votes, and another user disconnects that
    // didn't vote, to check if the current votes are able to skip.
    if ((skip.next >= skip.total) && (skip.next !== 0) && (skip.total !== 0)) {
      skip.nextSuccess()
    } else if ((skip.previous >= skip.total) && (skip.previous !== 0) && (skip.total !== 0)) {
      skip.previousSuccess()
    }

    console.log('| Song skip total needed: ' + skip.total + ' (' +
      settingsManager.voting.percent * 100 + '% = ' + songSkipFloat +
      ' users) (next: ' + skip.next + ') (previous: ' + skip.previous +
      ')')

    var send = JSON.stringify({
      type: 'current-info',
      'total-clients': totalClients,
      'song-skip-total': skip.total,
      'song-skip-next': skip.next,
      'song-skip-previous': skip.previous
    })

    if (customSocket) {
      customSocket.send(send, function (err) {
        if (err) {
          console.log('Error sending message to client:')
          console.log(err)
        }
      })
    } else { io.broadcast(send) }

    console.log('\\---------------------------------------------------/')
  }
}

// io is for everyone, socket is for the single client
io.on('connection', function (socket) {
  var address = socket._socket.remoteAddress

  // a bug occurs where when the client closes the browser,
  // it sends a connection request, but the address is undefined.
  // This causes issues when trying to send() something to the socket,
  // causing an error
  if (!address) {
    console.log('Address is undefined (did a user disconnect?)')
    sendUpdate(address, false)
    return
  }

  // if the user skipped in the past, add the skip back onto their client.
  if (~skip.addressNext.indexOf(address)) {
    socket.send(JSON.stringify({
      type: 'user-skip-next'
    }), function (err) {
      if (err) {
        console.log('Error sending user-skip-next')
        console.log(err)
      }
    })
  }

  if (~skip.addressPrevious.indexOf(address)) {
    socket.send(JSON.stringify({
      type: 'user-skip-previous'
    }), function (err) {
      if (err) {
        console.log('Error sending user-skip-previous')
        console.log(err)
      }
    })
  }

  // on client connect, send update to everyone
  sendUpdate(address, true)

  // on client connect, send init values to single client
  socket.send(JSON.stringify({
    type: 'init',
    'playlist-title': playlistTitle,
    'song-vote': settingsManager.voting.enabled,
    'downloader-enabled': settingsManager.downloader.enabled,
    'downloader-location': settingsManager.downloader.directory,
    'album-art': currentArt
  }), function (err) {
    if (err) {
      console.log('Error sending client current info')
      console.log(err)
    }
  })

  socket.on('message', function incoming (event) {
    if (!event) return

    var msg = JSON.parse(event)
    var index

    // console.log(msg)

    switch (msg.type) {
      case 'playlist-title':
        // sends the new playlist title to the other users
        if (playlistTitle === msg.info) break

        console.log('Sending new title of the playlist to all clients.')
        playlistTitle = msg.info
        io.broadcast(JSON.stringify({
          type: 'playlist-title',
          info: msg.info
        }))
        break

      case 'stop-server':
        console.log(address + ' closed the server.')
        process.exit(-1)

      case 'clear-playlist':
        console.log('Clearing the playlist for all clients.')

        mpd.clear(function (err) {
          if (err) return console.log(err)
          playlistTitle = ''
          io.broadcast(JSON.stringify({ type: 'clear-playlist' }))
        })
        break

      case 'update-playlist':
        // used for updating the playlist when the client removes the
        // currently playing song
        console.log('Updating the playlist for all clients.')
        io.broadcast(JSON.stringify({ type: 'update-playlist' }))
        break

      case 'update-browser':
        // used for updating the browser after updaing the database
        console.log('Updating the browser for all clients.')
        io.broadcast(JSON.stringify({ type: 'update-browser' }))
        break

      case 'song-next':
        console.log(address + ' skipped song')
        io.broadcast(JSON.stringify({ type: 'song-next', info: address }))
        break

      case 'song-previous':
        console.log(address + ' skipped song')
        io.broadcast(JSON.stringify({ type: 'song-previous', info: address }))
        break

      case 'song-vote-next':
        index = ''
        if (currentSong !== null && msg.info === 'yes' &&
            !~skip.addressNext.indexOf(address)) {
          // checks vote cancel
          if (~skip.addressNextCancel.indexOf(address)) {
            index = skip.addressNextCancel.indexOf(address)
            skip.addressNextCancel.splice(index, 1)
          }

          // checks vote
          skip.addressNext.push(address)

          ++skip.next

          if ((skip.next >= skip.total) && (skip.next !== 0) &&
              (skip.total !== 0)) {
            skip.nextSuccess()
          } else {
            io.broadcast(JSON.stringify(
              { type: 'song-vote-next', info: skip.next }))
          }
        } else if (msg.info === 'no' &&
            !~skip.addressNextCancel.indexOf(address) &&
            ~skip.addressNext.indexOf(address)) {
          // checks vote cancel
          skip.addressNextCancel.push(address)

          // checks vote
          index = skip.addressNext.indexOf(address)
          skip.addressNext.splice(index, 1)

          --skip.next
          io.broadcast(JSON.stringify({
            type: 'song-vote-next',
            info: skip.next
          }))
        }

        break

      case 'song-vote-previous':
        index = ''
        if (currentSong !== null && msg.info === 'yes' &&
            !~skip.addressPrevious.indexOf(address)) {
          // checks vote cancel
          if (~skip.addressPreviousCancel.indexOf(address)) {
            index = skip.addressPreviousCancel.indexOf(address)
            skip.addressPreviousCancel.splice(index, 1)
          }

          // checks vote
          skip.addressPrevious.push(address)

          ++skip.previous

          if ((skip.previous >= skip.total) &&
              (skip.previous !== 0) && (skip.total !== 0)) {
            skip.previousSuccess()
          } else {
            io.broadcast(JSON.stringify({
              type: 'song-vote-previous',
              info: skip.previous
            }))
          }
        } else if (msg.info === 'no' &&
            !~skip.addressPreviousCancel.indexOf(address) &&
            ~skip.addressPrevious.indexOf(address)) {
          // checks vote cancel
          skip.addressPreviousCancel.push(address)

          // checks vote
          index = skip.addressPrevious.indexOf(address)
          skip.addressPrevious.splice(index, 1)

          --skip.previous
          io.broadcast(JSON.stringify({
            type: 'song-vote-previous',
            info: skip.previous
          }))
        }

        break

      case 'get-votes':
        console.log('Got vote request from ' + address +
            ', sending updates...')
        sendUpdate(address, true, socket)
        break

      case 'playlist-reload':
        console.log('Reloading the playlist for all clients.')
        mpd.clear(function (err) {
          if (err) return console.log(err)

          mpd.load(msg.info, function (err) {
            if (err) return console.log(err)

            io.broadcast(JSON.stringify({
              type: 'playlist-title',
              info: msg.info
            }))
          })
        })
        break

      case 'downloader-download':
        downloader.download(msg.url, msg.location, address, socket)
        break
    }

    socket.on('close', function () {
      sendUpdate(address, false)
    })
  })
})

// error handling
http.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.error('Web server port already in use! ' +
      'Edit mpcparty.cfg to change the port.')
    process.exit(-4)
  } else {
    console.log('Uncaught HTTP Exception!')
    console.error(err)
  }
})

// catch other errors that I can't seem to catch properly...
// comment out this process.on() to see full stack log
process.on('uncaughtException', function (err) {
  if (err.code === 'ECONNREFUSED') {
    console.log('Connection refused! Is MPD running?')
    process.exit(-6)
  } else if (err.code === 'EADDRINUSE') {
    console.error('Web server port already in use! ' +
      'Edit mpcparty.cfg to change the port.')
    process.exit(-4)
  } else {
    console.log('Uncaught Exception!')
    console.log(err)
  }
})
