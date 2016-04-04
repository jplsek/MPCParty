var express         = require('express'),
    app             = express(),
    http            = require('http').Server(app),
    WebSocketServer = require('ws').Server,
    io              = new WebSocketServer({ server: http }),
    komponist       = require('komponist'),
    fs              = require('fs'),
    less            = require('less-middleware'),
    dns             = require('dns'),
    toml            = require('toml'),
    // optional modules
    Player          = null,
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
    currentSong = null;

io.broadcast = function(data) {
    io.clients.forEach(function each(client) {
        client.send(data, function (err) {
            if (err) console.log(err);
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

var video = {
    // the current Player
    // some of these settings get set in config.json
    enabled: true,
    directory: __dirname + '/downloads',
    keepVideo: true,
    player: null,
    file: null,
    playing: false,
    paused: false,
    volume: 0.5,
    msg: '',
    title: '',

    // TODO check if file already exists
    download: function (url) {
        io.broadcast(JSON.stringify({'type': 'download-video'}));
        this.msg    = 'Downloading and converting video...';
        this.paused = false;
        var option  = ['-x', '--audio-format', 'mp3'];

        if (this.keepVideo) option.push('-k');

        youtubedl.exec(url, option, {cwd: video.directory},
                function exec(err, output) {
            if (err) {
                io.broadcast(JSON.stringify({
                    'type': 'download-video-status',
                    'info': 'Error! Invalid url?'
                }));
                video.msg = 'Stopped...';
                return console.log(err);
            }

            // just in case there is something already playing
            video.stop();

            console.log('============ start youtube-dl ============');
            console.log(output.join('\n'));
            console.log('============  end  youtube-dl ============');

            for (var item = 0; item < output.length; ++item) {
                if (~output[item].indexOf('.mp3')) {
                    var str = output[item];
                    var colon = str.indexOf(':');
                    var newstr = str.substring(colon + 2);
                    //console.log(newstr);
                    video.title = newstr;
                    io.broadcast(JSON.stringify(
                        {'type': 'download-video-title', 'info': newstr}));
                    video.file = video.directory + '/' + newstr;
                    video.play();
                }
            }
        });

        // I would like to use this instead... but it doesnt seem to work
        // unless I use a write steam
        //var ytdl = youtubedl(url, ['-x', '--audio-format', 'mp3'],
            //{cwd: video.directory});
        //ytdl.on('info', function (info) {
            //console.log('video download starting!');
        //});
        //ytdl.on('end', function (info) {
            //console.log('video download complete!');
            //video.file = video.directory + '/' + info._filename;
            //video.play();
        //});
    },

    // play the Player (after download)
    play: function () {
        // prevent duplicate play requests
        if (this.playing) return;

        this.playing = true;
        video.player = new Player(this.file);
        video.player.play();
        io.broadcast(JSON.stringify({'type': 'download-video-play'}));
        this.msg = 'Playing...';

        // TODO Random bug sometimes??: if this stops working: go to
        // node_modules/player/dist/player.js and look for
        // "self.send('playing', song);" add another line like
        // "self.send('playingTest', song);" and change the "playing"
        // on this next line to "playingTest"
        video.player.on('playing', function (item) {
            console.log('Playing downloaded video: ' + item._name);
            //console.log('player.on.playing works now!');
            video.setVolume();
        });

        video.player.on('playend', function (item) {
            console.log('Playend downloaded video: ' + item._name);
            video.stop();
        });

        video.player.on('error', function (err){
            // ignore error
            if (err == 'No next song was found') {
                console.log('> Got "finish" event, waiting...');
                // TODO
                // because playend event doesn't work on some systems
                // I'm using this error code to detect the end.
                // unfortunalty, this also cuts the last ~5 seconds of
                // audio, so I added a dirty timeout
                // Overall, this Player module is a little buggy, but I
                // don't want to recreate an audio stack...
                setTimeout(function () {
                    console.log('> Stopping song!');
                    video.stop();
                }, 5000);
            } else {
                console.log('Error playing song!');
                console.log(err);
            }
        });
    },

    // pause or play the Player
    pause: function () {
        // dont do anything if nothing is playing
        if (!this.player) return;

        this.player.pause();
        // for some reason, the volume gets reset after a pause
        this.player.setVolume(video.volume);
        this.paused = !this.paused;

        if (this.paused) {
            io.broadcast(JSON.stringify(
                {'type': 'download-video-pause', 'info': true}));
            this.msg = 'Paused...';
        } else {
            io.broadcast(JSON.stringify(
                {'type': 'download-video-pause', 'info': false}));
            this.msg = 'Playing...';
        }
    },

    // stop the Player
    stop: function () {
        // dont do anything if nothing is playing
        if (!this.player) return;

        io.broadcast(JSON.stringify({'type': 'download-video-stop'}));
        this.msg = 'Stopped...';
        this.player.stop();
        this.playing = false;
        this.paused  = false;
    },

    setVolume: function (volume) {
        if (volume) video.volume = volume;
        io.broadcast(JSON.stringify(
            {'type': 'download-video-volume', 'info': video.volume}));
        if (this.player)
            this.player.setVolume(video.volume);
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
        mpd.next();
        io.broadcast(JSON.stringify(
            {'type': 'skipped', 'info': this.addressNext}));
        console.log('Song vote skip successful from ' + this.addressNext);
        this.next = 0;
        this.addressNext = [];
    },

    previousSuccess: function () {
        mpd.previous();
        io.broadcast(JSON.stringify(
            {'type': 'skipped', 'info': this.addressPrevious}));
        console.log('Song vote skip successful from ' + this.addressPrevious);
        this.previous = 0;
        this.addressPrevious = [];
    }
};

app.disable('x-powered-by');
// less config
app.use(less(__dirname + '/public'));
// serve static files here
app.use(express.static(__dirname + '/public'));
// use jade with express
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
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
            "player": video.enabled
        }
    });
});

app.get('/browser/*', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            "showUsers": config.users.enabled,
            "player": video.enabled
        }
    });
});

app.get('/search/*', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            "showUsers": config.users.enabled,
            "player": video.enabled
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

// 404 requests
app.use(function (req, res, next) {
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
});

// default config
var config = {
    server: {
        port: 8081
    },
    mpd: {
        url: 'localhost',
        port: 6600
    },
    users: {
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
        config.users.enabled = (data.users.enabled !== undefined ?
            data.users.enabled : config.users.enabled);
        skip.voting = (data.vote.enabled !== undefined ?
            data.vote.enabled : skip.voting);
        skip.votePercent = (data.vote.percent !== undefined ?
            data.vote.percent : skip.votePercent);
        video.enabled = (data.player.enabled !== undefined ?
            data.player.enabled : video.enabled);
        video.directory = (data.player.directory !== undefined ?
            data.player.directory : video.directory);
        video.volume = (data.player.volume !== undefined ?
            data.player.volume : video.volume);
        video.keepVideo = (data.player.keep_videos !== undefined ?
            data.player.keep_videos : video.keepVideo);
    }

    // create video.directory folder
    if (video.enabled) {
        Player    = require('player');
        youtubedl = require('youtube-dl');
        // tilde is only here because the Player is the only thing using a
        // custom dir.
        var tilde = require('expand-tilde');
        video.directory = tilde(video.directory);

        fs.mkdir(video.directory, function (err) {
            // ignore exists error
            if (err) {
                if (err.code == 'EEXIST') {
                    console.log('Using directory for the ' +
                        'Download Player: ' + video.directory);
                } else {
                    console.log('!!! Error creating a directory for the ' +
                        'Download Player, disabling...');
                    video.enabled = false;
                    console.log(err);
                }
            } else {
                console.log('Creating directory for the ' +
                    'Download Player: ' + video.directory);
            }
        });
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
            process.exit(3);
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

function setSong(client) {
    client.currentsong(function (err, song) {
        if (err) return console.log(err);

        //console.log('set song: ' + song);

        if (isEmpty(song)) {
            currentSong = null;
            return console.log('No song selected');
        }

        if (currentSong != song.file) {
            console.log('Now playing: ' + song.file);
            skip.reset();
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
        if (!~addresses.indexOf(remAdd))
            addresses.push(remAdd);
    }

    var oldSize = oldAddresses.length,
        newSize = addresses.length;

    i = 0;

    function hostHandler(item) {
        return getHostname(addresses[item], function (hostname, usedip) {
            hostnames[usedip] = hostname;

            if (i == addresses.length - 1 && config.users.enabled) {
                io.broadcast(JSON.stringify(
                    {'type': 'hostnames', 'info': hostnames}));
            }
            ++i;
        });
    }

    for (var item = 0; item < addresses.length; ++item) {
        hostHandler(item);
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
                if (err) console.log(err);
            });
        else
            io.broadcast(send);

        console.log('\\---------------------------------------------------/');
    }
};

// io is for everyone, socket is for the single client
io.on('connection', function (socket) {
    var address = socket._socket.remoteAddress;

    // if the user skipped in the past, add the skip back onto their client.
    if (~skip.addressNext.indexOf(address))
        socket.send(JSON.stringify({'type': 'user-skip-next'}),
                function (err) {
            if (err) console.log(err);
        });

    if (~skip.addressPrevious.indexOf(address))
        socket.send(JSON.stringify({'type': 'user-skip-previous'}),
                function (err) {
            if (err) console.log(err);
        });

    // on client connect, send update to everyone
    sendUpdate(address, true);

    // on client connect, send init values to single client
    socket.send(JSON.stringify({
        'type': 'init', 'playlist-title': playlisttitle,
        'song-vote': skip.voting, 'player-volume': video.volume,
        'player-status': video.msg, 'player-title': video.title
        }),
        function (err) {
            if (err) console.log(err);
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
                process.exit(1);
                break;

            case 'clear-playlist':
                console.log('Clearing the playlist for all clients.');
                io.broadcast(JSON.stringify({'type': 'clear-playlist'}));
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
                mpd.clear();
                mpd.load(msg.info);
                io.broadcast(JSON.stringify(
                    {'type': 'playlist-title', 'info': msg.info}));
                break;

            case 'download-video':
                video.download(msg.info);
                break;

            case 'download-video-play':
                video.play();
                break;

            case 'download-video-pause':
                video.pause();
                break;

            case 'download-video-stop':
                video.stop();
                break;

            case 'download-video-volume':
                video.setVolume(msg.info);
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
        process.exit(2);
    } else {
        console.log('Uncaught Exception!');
        console.error(err);
        process.exit(1);
    }
});

// catch other errors that I can't seem to catch properly...
// comment out this process.on() to see full stack log
process.on('uncaughtException', function(err) {
    if (err.code == 'ECONNREFUSED') {
        console.log('Connection refused! Is MPD running?');
        process.exit(4);
    } else {
        console.log('Uncaught Exception!');
        console.log(err);
        process.exit(0);
    }
});
