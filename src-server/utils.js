const dns = require('dns');

module.exports = function (io, mpc) {

return {
    // The current song
    currentSong: null,
    // currently playing song's album art url
    currentArt: null,

    isEmpty: function(obj) { return Object.keys(obj).length === 0; },

    // little wrapper, sets ip if no hostname is found and sends
    getHostname: function(ip, callback) {
        dns.reverse(ip, function (err, hostname) {
            if (err) {
                // ENOTFOUND is okay. DNS just isn't registered for the ip
                if (err.code != 'ENOTFOUND') {
                    console.log('DNS Failed for ' + ip + ': ');
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
    },

    toggleMute: function() {
        mpc.status.status().then(status => {
            var volume = 0;

            // if the volume is 0, then use the last volume that was not zero
            // else mute it
            if (parseInt(status.volume) == 0) {
                volume = parseInt(lastVolume);

                // if the volume is still 0 (such as from a server restart)
                // just set it to an arbitrary value
                if (volume === 0) {
                    volume = 50;
                }
            }

            mpc.playbackOptions.setVolume(volume);
        });
    },

    updateMixer: function() {
        mpc.status.status().then(status => {
            if (err) console.log(err);

            if (status.volume != 0) {
                lastVolume = status.volume;
            }
        });
    },

    sendArtworkMessage: function() {
        io.broadcast.emit('album-art', {'url': currentArt});
    },

    // get album art based on the directory the file is in
    getImage: function(song) {
        if (!song || config.mpd.library === '') {
            currentArt = null;
            sendArtworkMessage();
            return;
        }

        var subFolder = song.file.substr(0, song.file.lastIndexOf('/')),
            folder    = tilde(config.mpd.library + '/' + subFolder);

        //console.log(folder);
        glob('{*.jpg,*.png}', {cwd:folder}, function(err, files) {
            if (err) return console.log(err);

            //console.log(files);
            if (files.length === 0) {
                currentArt = null;
                sendArtworkMessage();
                return;
            }

            // just grab the first file
            var imageLocation = tilde(folder + path.sep + files[0]);
            //console.log(imageLocation);

            currentArt = encodeURI('/album-art/' + subFolder + '/' + files[0])
                // *sigh* https://stackoverflow.com/a/8143232
                .replace(/\(/g, '%28').replace(/\)/g, '%29');

            console.log('Creating art URL: ' + currentArt);

            // TODO check if there is a way to remove the old url when a
            // new one is created (or will the gc or express handle that?)
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
        });
    },

    setSong: function() {
        mpc.status.currentSong().then((song) => {
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
};

};
