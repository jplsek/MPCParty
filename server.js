var express         = require('express'),
    app             = express(),
    http            = require('http').Server(app),
    io              = require('socket.io')(http),
    Mpc             = require('mpc-js').MPC,
    mpc             = new Mpc(),
    fs              = require('fs'),
    toml            = require('toml'),
    glob            = require('glob'),
    // optional modules
    youtubedl = null,
    // whether to optimize the client for production usage
    release = false;

const utils = require(__dirname + '/src-server/utils.js')(io, mpc);
const skip = require(__dirname + '/src-server/skip.js')(io, mpc);

// TODO base this off dev vs prod practice
if (release) {
    var minify = require('express-minify');
    // must be above express.static
    app.use(minify());
    app.use(function(req, res, next) {
        if (/mpcparty\.js/.test(req.url)) {
            res._uglifyCompress = {
                drop_console: true
            };
        }
        next();
    });
} else {
    app.locals.pretty = true;
}

app.disable('x-powered-by');

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

    mpc.connectTCP(config.mpd.url, config.mpd.port).then(() => {
        console.log('Connected to MPD!');
        utils.setSong();
        utils.updateMixer();

        mpc.on('changed', function (system) {
            if (system.length === 0)
                return;

            console.log('subsystem changed: ' + system);
            io.emit('mpd-changed', system);

            system.forEach(item => {
                switch (item) {
                    case 'player':
                    // running setSong with a playlist change to fix a vote issue
                    // where users could vote after no song was selected
                    case 'playlist':
                        utils.setSong();
                        break;

                    case 'mixer':
                        utils.updateMixer();
                        break;
                }
            });
        });
    }).catch(err => {
        console.log(err);
        process.exit(-5);
    });
});

const downloader = require(__dirname + '/src-server/downloader.js')(config);

require(__dirname + '/src-server/routes.js')
    (express, app, downloader, config);
require(__dirname + '/src-server/socket.js')
    (io, mpc, skip, downloader, config, utils);

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
