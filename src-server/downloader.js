const fs    = require('fs'),
      path  = require('path'),
      tilde = require('expand-tilde');

module.exports = function (config) {

return {
    // some of these settings get set in config.cfg
    enabled: true,
    directory: 'Downloads',
    keepVideo: false,

    // TODO check if file already exists
    download: function (url, location, address, socket) {
        if (location.includes('..')) {
            console.log(address + ' tried to access ' + location + '!');
            socket.emit('downloader-status', {
                'info': 'You cannot have ".." in the location!'
            });
            return;
        }

        location = downloader.getLocation(location);

        socket.emit('downloader-status', {
            'info': 'Downloading and converting video...'
        });

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

                    socket.emit('downloader-status', {
                        'info': 'Error creating directory!'
                    });
                }
            } else {
                console.log('Creating directory for the ' +
                    'Downloader: ' + location);
            }

            youtubedl.exec(url, option, {cwd: location},
                    function exec(err, output) {
                if (err) {
                    socket.emit('downloader-status', {
                        'info': 'Error! Invalid url?'
                    });
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

                socket.emit('downloader-status', {
                    'info': 'Done'
                });
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

};
