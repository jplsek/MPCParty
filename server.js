var express         = require('express'),
    app             = express(),
    http            = require('http').Server(app),
    WebSocketServer = require('ws').Server,
    io              = new WebSocketServer({ server: http }),
    komponist       = require('komponist'),
    fs              = require('fs'),
    less            = require('less-middleware'),
    browserify      = require('browserify-middleware'),
    dns             = require('dns'),
    toml            = require('toml'),
    path            = require('path'),
    tilde           = require('expand-tilde'),
    // optional modules
    youtubedl       = null,

    // mpd: komponist mpd connection; pack: package.json;
    mpd, pack,
    // save playlist title for future connections (because I have no idea how
    // to get the playlist title on initial load)
    playlisttitle = '',
    // updated per connection
    addresses = [],
    // ip:hostname
    hostnames = {},
    // checks if the song changed to clear user votes
    currentSong = null,
    // currently playing song's album art url
    currentArt = null;

io.broadcast = function(data) {
    io.clients.forEach(function each(client) {
        client.send(data, function (err) {
            if (err) {
                console.log('Error sending message to client via broadcast:');
                console.log(err);
            }
        });
    });
};

function isEmpty(obj) { return Object.keys(obj).length === 0; }

// little wrapper, sets ip if no hostname is found and sends
function getHostname(ip, callback) {
    dns.reverse(ip, function (err, hostname) {
        if (err) {
            // ENOTFOUND is okay. DNS just isn't registered for the ip
            if (err.code != 'ENOTFOUND') {
                console.log("DNS Failed for " + ip + ": ");
                console.log(err);
            }
        }

        // first hostname as a string
        if (!hostname || hostname.length === 0) {
            // in case response is not an array
            hostname    = [];
            hostname[0] = ip;
        }

        //console.log('hostname: ' + hostname[0]);
        if (typeof callback == 'function') callback(hostname[0], ip);
    });
}

var downloader = {
    // some of these settings get set in config.json
    enabled: true,
    directory: 'Downloads',
    keepVideo: false,

    // TODO check if file already exists
    download: function (url, location, address, socket) {
        location = downloader.getLocation(location);

        socket.send(JSON.stringify({
            'type': 'downloader-status',
            'info': 'Downloading and converting video...'
        }));

        var option  = ['-x', '--audio-format', 'mp3'];
        console.log('Requesting video download: ' + url + ' from ' + address +
            ' to ' + location);

        if (this.keepVideo) option.push('-k');

        // create the folder if it doesn't exist
        fs.mkdir(location, function (err) {
            // ignore exists error
            if (err) {
                if (err.code == 'EEXIST') {
                    console.log('Using directory for the ' +
                        'Downloader: ' + location);
                } else {
                    console.log('!!! Error creating directory "' +
                        location + '" for the Downloader.');
                    console.log(err);

                    socket.send(JSON.stringify({
                        'type': 'downloader-status',
                        'info': 'Error creating directory!'
                    }));
                }
            } else {
                console.log('Creating directory for the ' +
                    'Downloader: ' + location);
            }

            youtubedl.exec(url, option, {cwd: location},
                    function exec(err, output) {
                if (err) {
                    socket.send(JSON.stringify({
                        'type': 'downloader-status',
                        'info': 'Error! Invalid url?'
                    }));
                    return console.log(err);
                }

                console.log('============ start youtube-dl ============');
                console.log(output.join('\n'));
                console.log('============  end  youtube-dl ============');

                //for (var item = 0; item < output.length; ++item) {
                //    if (~output[item].indexOf('.mp3')) {
                //        var str = output[item];
                //        var colon = str.indexOf(':');
                //        var newstr = str.substring(colon + 2);
                //        console.log(newstr);
                //    }
                //}

                socket.send(JSON.stringify({
                    'type': 'downloader-status',
                    'info': 'Done'
                }));
            });

            // I would like to use this instead... but it doesnt seem to work
            // unless I use a write steam
            //var ytdl = youtubedl(url, ['-x', '--audio-format', 'mp3'],
                //{cwd: downloader.directory});
            //ytdl.on('info', function (info) {
                //console.log('video download starting!');
            //});
            //ytdl.on('end', function (info) {
                //console.log('video download complete!');
            //});
        });
    },

    getLocation: function (location) {
        return path.normalize(tilde(config.mpd.library + path.sep + location));
    }
};

// song skipping
var skip = {
    votePercent: 0.75,
    voting: true,
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
        this.next     = 0;
        this.previous = 0;
        // logs the addresses that have skipped
        this.addressNext           = [];
        this.addressPrevious       = [];
        this.addressNextCancel     = [];
        this.addressPreviousCancel = [];
        // I would run sendUpdate(), but im not sure how
        // to do with my current set up.
        io.broadcast(JSON.stringify(
            {'type': 'request-vote-update-from-server'}));
    },

    nextSuccess: function () {
        mpd.next(function (err) {
            if (err) return console.log(err);

            io.broadcast(JSON.stringify(
                        {'type': 'skipped', 'info': skip.addressNext}));
            console.log('Song vote skip successful from ' + skip.addressNext);
            skip.next = 0;
            skip.addressNext = [];
        });
    },

    previousSuccess: function () {
        mpd.previous(function (err) {
            if (err) return console.log(err);

            io.broadcast(JSON.stringify(
                {'type': 'skipped', 'info': skip.addressPrevious}));
            console.log('Song vote skip successful from ' + skip.addressPrevious);
            skip.previous = 0;
            skip.addressPrevious = [];
        });
    }
};

app.disable('x-powered-by');
// less config
app.use(less(__dirname + '/public'));
// compile js client side code
app.get('/mpcparty.js', browserify(__dirname + '/src/main.js'));
app.get('/testing.js', browserify(__dirname + '/tests/main.js'));
// serve static files here
app.use(express.static(__dirname + '/public'));
// use pug with express
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
// used mostly for debugging
app.locals.pretty = true;

fs.readFile(__dirname + '/package.json', function (err, data) {
    if (err) return console.log(err);
    pack = JSON.parse(data);
});

// main pages
app.get('/', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            "showUsers": config.users.enabled,
            "downloader": downloader.enabled,
            "testing": config.testing.enabled
        }
    });
});

app.get('/browser/*', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            "showUsers": config.users.enabled,
            "downloader": downloader.enabled,
            "testing": config.testing.enabled
        }
    });
});

app.get('/library/*', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            "showUsers": config.users.enabled,
            "downloader": downloader.enabled,
            "testing": config.testing.enabled
        }
    });
});

app.get('/search/*', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            "showUsers": config.users.enabled,
            "downloader": downloader.enabled,
            "testing": config.testing.enabled
        }
    });
});

// browser modules
app.use('/bootstrap',
    express.static(__dirname + '/bower_components/bootstrap/dist/'));
app.use('/jquery',
    express.static(__dirname + '/bower_components/jquery/dist/'));
app.use('/floatthead',
    express.static(__dirname + '/bower_components/jquery.floatThead/dist/'));
app.use('/toastr',
    express.static(__dirname + '/bower_components/toastr/'));
app.use('/jquery-contextmenu',
    express.static(__dirname + '/bower_components/jQuery-contextMenu/dist/'));
app.use('/html5sortable',
    express.static(__dirname + '/bower_components/html.sortable/dist/'));

// 404 requests
// currently disabled until we can get dynamic urls to not 404 with this
// enabled
/*app.use(function (req, res, next) {
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        res.render('404', { url: req.url });
        console.log('Page 404 by ' + req.connection.remoteAddress +
            ' on ' + req.originalUrl);
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.send({ error: 'Not found' });
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
});*/

// default config
var config = {
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
    }
};

fs.readFile(__dirname + '/config.cfg', function (err, data) {
    if (err) {
        console.log('Unable to read config file. ' +
            'Custom config will not be used.');
        console.log(err);
    } else {
        data = toml.parse(data);

        // set all config (otherwise resort to defaults)
        config.server.port = (data.server.port !== undefined ?
            data.server.port : config.server.port);
        config.mpd.url = (data.mpd.url !== undefined ?
            data.mpd.url : config.mpd.url);
        config.mpd.port = (data.mpd.port !== undefined ?
            data.mpd.port : config.mpd.port);
        config.mpd.library = (data.mpd.library !== undefined ?
            data.mpd.library : config.mpd.library);
        config.users.enabled = (data.users.enabled !== undefined ?
            data.users.enabled : config.users.enabled);
        config.testing.enabled = (data.testing.enabled !== undefined ?
            data.testing.enabled : config.testing.enabled);
        skip.voting = (data.vote.enabled !== undefined ?
            data.vote.enabled : skip.voting);
        skip.votePercent = (data.vote.percent !== undefined ?
            data.vote.percent : skip.votePercent);
        downloader.enabled = (data.downloader.enabled !== undefined ?
            data.downloader.enabled : downloader.enabled);
        downloader.directory = (data.downloader.directory !== undefined ?
            data.downloader.directory : downloader.directory);
        downloader.keepVideo = (data.downloader.keep_videos !== undefined ?
            data.downloader.keep_videos : downloader.keepVideo);
    }

    // if we don't know the location of the library, disable extra features
    if (config.mpd.library === '') {
        downloader.enabled = false;
    }

    // create video.directory folder
    if (downloader.enabled) {
        (function() {
            youtubedl = require('youtube-dl');
            var location = downloader.getLocation(downloader.directory);

            fs.mkdir(location, function (err) {
                // ignore exists error
                if (err) {
                    if (err.code == 'EEXIST') {
                        console.log('Default directory for the ' +
                            'Downloader: ' + location);
                    } else {
                        console.log('!!! Error creating directory "' +
                            location + '" for the ' +
                            'Downloader, disabling...');
                        downloader.enabled = false;
                        console.log(err);
                    }
                } else {
                    console.log('Creating directory for the ' +
                        'Downloader: ' + location);
                }
            });
        })();
    }

    http.listen(config.server.port, function () {
        console.log('Web server listening on *:' + config.server.port);
        console.log('Connecting to MPD server ' + config.mpd.url + ':' +
            config.mpd.port + '...');
    });

    // Open up a proxy on the HTTP server that points to MPD
    komponist.install(http, config.mpd.url, config.mpd.port);

    mpd = komponist.createConnection(config.mpd.port, config.mpd.url,
            function (err, client) {
        if (err) {
            console.log(err);
            process.exit(-5);
        }

        console.log('Connected to MPD!');
        setSong(client);

        client.on('changed', function (system) {
            //console.log('subsystem changed: ' + system);
            if (system == 'player') {
                setSong(client);
            } else if (system == 'playlist') {
                // running setSong with a playlist change to fix a vote issue
                // where users could vote after no song was selected
                setSong(client);
            }
        });
    });
});

function sendArtworkMessage() {
    io.broadcast(JSON.stringify({'type': 'album-art', 'url': currentArt}),
            function (err) {
        if (err) {
            console.log('Error sending album art information');
            console.log(err);
        }
    });
}

// get album art based on the directory the file is in
function getImage(song) {

    if (!song) {
        currentArt = null;
        sendArtworkMessage();
        return;
    }

    console.log('');
    var subFolder = song.file.substr(0, song.file.lastIndexOf('/'));

    // TODO: set absolute path to folder. How do we find out where the
    // root of the music folder is located (preferably without setting
    // a parameter in config.cfg)? mpd.config() does not work because
    // of permissions. The way other GUI mpd clients operate, is that they add
    // a mount, thus the user inputs a custom location specific to that
    // client (and in our case, our config file).
    mpd.config(function (err, val) {
        if (err) {
            console.log(err);
        }
        // (if this actually worked, this would be called during server
        // initialization)
        console.log('mpd config:');
        console.log(val);
    })

    var musicRoot = '/home/jeremy/Music';

    var folder = musicRoot + '/' + subFolder;

    console.log(folder);

    // TODO: look for *.jpg or *.png and set it
    var imageName = 'cover.jpg';
    var imageLocation = folder + '/' + imageName;

    // testing with an absolute path
    //imageLocation = '~/Music/path/to/cover.jpg';

    console.log(imageLocation);

    fs.stat(imageLocation, function (err, stats) {
        if (err) {
            //console.log(err);
            currentArt = null;
            sendArtworkMessage();
        } else if (stats.isFile(imageLocation)) {
            currentArt =
                encodeURI('/album-art/' + subFolder + '/' + imageName);

            console.log(currentArt);

            // create a new url
            app.get(currentArt, function (req, res) {
                res.sendFile(imageLocation, function (err) {
                    if (err) {
                        console.log(err);
                        res.status(err.status).end();
                    }
                });
            });

            sendArtworkMessage();
        } else {
            console.log(imageLocation + ' is not a file?');
            currentArt = null;
            sendArtworkMessage();
        }
    });
}

function setSong(client) {
    client.currentsong(function (err, song) {
        if (err) {
            console.log('Error setting current song');
            return console.log(err);
        }

        //console.log('set song: ' + song);

        if (isEmpty(song)) {
            currentSong = null;
            getImage();
            return console.log('No song selected');
        }

        if (currentSong != song.file) {
            console.log('Now playing: ' + song.file);
            skip.reset();

            getImage(song);
        }

        currentSong = song.file;
    });
}

// sendUpdate manages the users connected and sends vote information
// to the clients
var sendUpdate = function (address, connect, customSocket) {
    var oldAddresses = addresses,
        i;

    addresses = [];

    for (i = 0; i < io.clients.length; ++i) {
        var remAdd = io.clients[i]._socket.remoteAddress;
        // check if remAdd is undefined
        if (!~addresses.indexOf(remAdd) && remAdd)
            addresses.push(remAdd);
    }

    var oldSize = oldAddresses.length,
        newSize = addresses.length;

    i = 0;

    function hostHandler(addr) {
        return getHostname(addr, function (hostname, usedip) {
            hostnames[usedip] = hostname;

            if (i == addresses.length - 1 && config.users.enabled) {
                io.broadcast(JSON.stringify(
                    {'type': 'hostnames', 'info': hostnames}));
            }
            ++i;
        });
    }

    // only get dns if the user is connecting
    if (connect) {
        for (var item = 0; item < addresses.length; ++item) {
            hostHandler(addresses[item]);
        }
    }

    // if the address is undefined, compare addresses with oldAddresses
    if (!address && oldSize != newSize) {
        var diff = oldAddresses.filter(function(i) {
            return addresses.indexOf(i) < 0;
        });

        address = diff[0];

        if (diff.length > 1) {
            console.log('Address differences is > 1, I cant handle this GG.');
            console.log(diff);
        }
    }

    // if there is an update to the ip address list
    // (avoiding duplicate socket connections)
    if (customSocket || oldSize != newSize) {
        console.log('/---------------------------------------------------\\');

        if (connect)
            console.log('| ' + address + ' connected to the socket.');
        else {
            console.log('| ' + address + ' disconnected from the socket.');

            var index = '';

            // removes skipped user from address list
            if (~skip.addressNext.indexOf(address)) {
                console.log('| Removing vote from disconnected user: ' +
                    address);
                --skip.next;
                index = skip.addressNext.indexOf(address);
                skip.addressNext.splice(index, 1);
            }

            if (~skip.addressPrevious.indexOf(address)) {
                console.log('| Removing vote from disconnected user: ' +
                    address);
                --skip.previous;
                index = skip.addressPrevious.indexOf(address);
                skip.addressPrevious.splice(index, 1);
            }
        }

        console.log(addresses);

        var totalClients = addresses.length,
            songSkipFloat = totalClients * skip.votePercent;

        skip.total = parseInt((songSkipFloat), 10);

        if (skip.total < 1) skip.total = 1;

        // in case a user votes, and another user disconnects that
        // didn't vote, to check if the current votes are able to skip.
        if ((skip.next >= skip.total) && (skip.next !== 0) &&
                (skip.total !== 0))
            skip.nextSuccess();
        else if ((skip.previous >= skip.total) && (skip.previous !== 0) &&
                (skip.total !== 0))
            skip.previousSuccess();

        console.log('| Song skip total needed: ' + skip.total + ' (' +
            skip.votePercent * 100 + '% = ' + songSkipFloat +
            ' users) (next: ' + skip.next + ') (previous: ' + skip.previous +
            ')');

        var send = JSON.stringify({
            'type': 'current-info', 'total-clients': totalClients,
            'song-skip-total': skip.total, 'song-skip-next': skip.next,
            'song-skip-previous': skip.previous
        });

        if (customSocket)
            customSocket.send(send, function (err) {
                if (err) {
                    console.log('Error sending message to client:');
                    console.log(err);
                }
            });
        else
            io.broadcast(send);

        console.log('\\---------------------------------------------------/');
    }
};

// io is for everyone, socket is for the single client
io.on('connection', function (socket) {
    var address = socket._socket.remoteAddress;

    // a bug occurs where when the client closes the browser,
    // it sends a connection request, but the address is undefined.
    // This causes issues when trying to send() something to the socket,
    // causing an error
    if (!address) {
        console.log('Address is undefined (did a user disconnect?)');
        sendUpdate(address, false);
        return;
    }

    // if the user skipped in the past, add the skip back onto their client.
    if (~skip.addressNext.indexOf(address))
        socket.send(JSON.stringify({'type': 'user-skip-next'}),
                function (err) {
            if (err) {
                console.log('Error sending user-skip-next');
                console.log(err);
            }
        });

    if (~skip.addressPrevious.indexOf(address))
        socket.send(JSON.stringify({'type': 'user-skip-previous'}),
                function (err) {
            if (err) {
                console.log('Error sending user-skip-previous');
                console.log(err);
            }
        });

    // on client connect, send update to everyone
    sendUpdate(address, true);

    // on client connect, send init values to single client
    socket.send(JSON.stringify({
            'type': 'init', 'playlist-title': playlisttitle,
            'song-vote': skip.voting,
            'downloader-location': downloader.directory,
            'album-art': currentArt,
            }),
            function (err) {
        if (err) {
            console.log('Error sending client current info');
            console.log(err);
        }
    });

    socket.on('message', function incoming(event) {
        if (!event) return;

        var msg = JSON.parse(event),
            index;

        //console.log(msg);

        switch(msg.type) {
            case 'playlist-title':
                // sends the new playlist title to the other users
                if (playlisttitle == msg.info) break;

                console.log('Sending new title of the playlist to all clients.');
                playlisttitle = msg.info;
                io.broadcast(JSON.stringify(
                    {'type': 'playlist-title', 'info': msg.info}));
                break;

            case 'stop-server':
                console.log(address + ' closed the server.');
                process.exit(-1);
                break;

            case 'clear-playlist':
                console.log('Clearing the playlist for all clients.');

                mpd.clear(function (err) {
                    if (err) return console.log(err);
                    playlisttitle = '';
                    io.broadcast(JSON.stringify({'type': 'clear-playlist'}));
                });
                break;

            case 'update-playlist':
                // used for updating the playlist when the client removes the
                // currently playing song
                console.log('Updating the playlist for all clients.');
                io.broadcast(JSON.stringify({'type': 'update-playlist'}));
                break;

            case 'update-browser':
                // used for updating the browser after updaing the database
                console.log('Updating the browser for all clients.');
                io.broadcast(JSON.stringify({'type': 'update-browser'}));
                break;

            case 'song-next':
                console.log(address + ' skipped song');
                io.broadcast(JSON.stringify(
                    {'type': 'song-next', 'info': address}));
                break;

            case 'song-previous':
                console.log(address + ' skipped song');
                io.broadcast(JSON.stringify(
                    {'type': 'song-previous', 'info': address}));
                break;

            case 'song-vote-next':
                index = '';
                if (currentSong !== null && msg.info == 'yes' &&
                        !~skip.addressNext.indexOf(address)) {

                    // checks vote cancel
                    if (~skip.addressNextCancel.indexOf(address)) {
                        index = skip.addressNextCancel.indexOf(address);
                        skip.addressNextCancel.splice(index, 1);
                    }

                    // checks vote
                    skip.addressNext.push(address);

                    ++skip.next;

                    if ((skip.next >= skip.total) && (skip.next !== 0) &&
                            (skip.total !== 0)) {
                        skip.nextSuccess();
                    } else {
                        io.broadcast(JSON.stringify(
                            {'type': 'song-vote-next', 'info': skip.next}));
                    }

                } else if (msg.info == 'no' &&
                        !~skip.addressNextCancel.indexOf(address) &&
                        ~skip.addressNext.indexOf(address)) {

                    // checks vote cancel
                    skip.addressNextCancel.push(address);

                    // checks vote
                    index = skip.addressNext.indexOf(address);
                    skip.addressNext.splice(index, 1);

                    --skip.next;
                    io.broadcast(JSON.stringify(
                        {'type': 'song-vote-next', 'info': skip.next}));
                }

                break;

            case 'song-vote-previous':
                index = '';
                if (currentSong !== null && msg.info == 'yes' &&
                        !~skip.addressPrevious.indexOf(address)) {
                    // checks vote cancel
                    if (~skip.addressPreviousCancel.indexOf(address)) {
                        index = skip.addressPreviousCancel.indexOf(address);
                        skip.addressPreviousCancel.splice(index, 1);
                    }

                    // checks vote
                    skip.addressPrevious.push(address);

                    ++skip.previous;

                    if ((skip.previous >= skip.total) &&
                            (skip.previous !== 0) && (skip.total !== 0)) {
                        skip.previousSuccess();
                    } else {
                        io.broadcast(JSON.stringify({
                            'type': 'song-vote-previous',
                            'info': skip.previous
                        }));
                    }
                } else if (msg.info == 'no' &&
                        !~skip.addressPreviousCancel.indexOf(address) &&
                        ~skip.addressPrevious.indexOf(address)) {

                    // checks vote cancel
                    skip.addressPreviousCancel.push(address);

                    // checks vote
                    index = skip.addressPrevious.indexOf(address);
                    skip.addressPrevious.splice(index, 1);

                    --skip.previous;
                    io.broadcast(JSON.stringify(
                        {'type': 'song-vote-previous', 'info': skip.previous}));
                }

                break;

            case 'get-votes':
                console.log('Got vote request from ' + address +
                        ', sending updates...');
                sendUpdate(address, true, socket);
                break;

            case 'playlist-reload':
                console.log('Reloading the playlist for all clients.');
                mpd.clear(function (err) {
                    if (err) return console.log(err);

                    mpd.load(msg.info, function (err) {
                        if (err) return console.log(err);

                        io.broadcast(JSON.stringify(
                            {'type': 'playlist-title', 'info': msg.info}));
                    });
                });
                break;

            case 'downloader-download':
                downloader.download(msg.url, msg.location, address, socket);
                break;
        }

        socket.on('close', function () {
            sendUpdate(address, false);
        });
    });
});

// error handling
http.on('error', function (err) {
    if (err.code == 'EADDRINUSE') {
        console.error('Web server port already in use! ' +
            'Edit config.cfg to change the port.');
        process.exit(-4);
    } else {
        console.log('Uncaught HTTP Exception!');
        console.error(err);
        process.exit(-3);
    }
});

// catch other errors that I can't seem to catch properly...
// comment out this process.on() to see full stack log
process.on('uncaughtException', function(err) {
    if (err.code == 'ECONNREFUSED') {
        console.log('Connection refused! Is MPD running?');
        process.exit(-6);
    } else {
        console.log('Uncaught Exception!');
        console.log(err);
        process.exit(-2);
    }
});
