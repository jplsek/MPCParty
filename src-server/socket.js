module.exports = function (io, mpc, skip, downloader, config, utils) {

'use strict';

var addresses = [],
    // save playlist title for future connections (because I have no idea how
    // to get the playlist title on initial load)
    playlisttitle = '',
    // ip:hostname
    hostnames = {};

io.on('connection', socket => {
    var address = socket.request.connection.remoteAddress;

    // if the user skipped in the past, add the skip back onto their client.
    if (~skip.addressNext.indexOf(address))
        socket.emit('user-skip-next');

    if (~skip.addressPrevious.indexOf(address))
        socket.emit('user-skip-previous');

    // on client connect, send update to everyone
    sendUpdate(address, true);

    // on client connect, send init values to single client
    socket.emit('init', {
        'playlist-title': playlisttitle,
        'song-vote': skip.voting,
        'downloader-enabled': downloader.enabled,
        'downloader-location': downloader.directory,
        'album-art': utils.currentArt,
    });

    socket.on('playlist-title', data => {
        // sends the new playlist title to the other users
        if (playlisttitle == data.info) return;

        console.log('Sending new title of the playlist to all clients.');
        playlisttitle = data.info;
        io.emit('playlist-title', {'info': data.info});
    });

    socket.on('stop-server', () => {
        console.log(address + ' closed the server.');
        process.exit(-1);
    });

    // used to keep track of the playlist title
    socket.on('clear-playlist', () => {
        console.log('Clearing the playlist.');

        mpc.currentPlaylist.clear().then(() => {
            playlisttitle = '';
            io.emit('clear-playlist');
            utils.setSong();
        }).catch(console.log);
    });

    socket.on('update-playlist', () => {
        // used for updating the playlist when the client removes the
        // currently playing song
        console.log('Updating the playlist for all clients.');
        io.emit('update-playlist');
    });

    socket.on('update-browser', () => {
        // used for updating the browser after updaing the database
        console.log('Updating the browser for all clients.');
        io.emit('update-browser');
    });

    socket.on('song-next', () => {
        console.log(address + ' skipped song');
        io.emit('song-next', {'info': address});
    });

    socket.on('song-previous', () => {
        console.log(address + ' skipped song');
        io.emit('song-previous', {'info': address});
    });

    socket.on('song-vote-next', data => {
        var index = '';
        if (utils.currentSong !== null && data.info == 'yes' &&
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
                io.emit('song-vote-next', {'info': skip.next});
            }

        } else if (data.info == 'no' &&
                !~skip.addressNextCancel.indexOf(address) &&
                ~skip.addressNext.indexOf(address)) {

            // checks vote cancel
            skip.addressNextCancel.push(address);

            // checks vote
            index = skip.addressNext.indexOf(address);
            skip.addressNext.splice(index, 1);

            --skip.next;
            io.emit('song-vote-next', {'info': skip.next});
        }
    });

    socket.on('song-vote-previous', data => {
        var index = '';
        if (utils.currentSong !== null && data.info == 'yes' &&
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
                io.emit('song-vote-previous',
                    {'info': skip.previous});
            }
        } else if (data.info == 'no' &&
                !~skip.addressPreviousCancel.indexOf(address) &&
                ~skip.addressPrevious.indexOf(address)) {

            // checks vote cancel
            skip.addressPreviousCancel.push(address);

            // checks vote
            index = skip.addressPrevious.indexOf(address);
            skip.addressPrevious.splice(index, 1);

            --skip.previous;
            io.emit('song-vote-previous', {'info': skip.previous});
        }

    });

    socket.on('get-votes', () => {
        console.log('Got vote request from ' + address +
        ', sending updates...');
        sendUpdate(address, true, socket);
    });

    socket.on('playlist-reload', data => {
        console.log('Reloading the playlist for all clients.');
        mpc.currentPlaylist.clear(() => {
            mpc.storedPlaylists.load(data.info).then(() => {
                io.emit('playlist-title', {'info': data.info});
            });
        });
    });

    socket.on('toggle-mute', () => {
        utils.toggleMute();
    });

    // arg1 and arg2 can be callbacks
    socket.on('mpc', (cmd, arg1, arg2, callback) => {

        function createFullCommandString() {
            var fullcmd = cmd + "(";
            // check for undefined because they can be booleans
            if (arg1 !== undefined && typeof(arg1) !== 'function') {
                fullcmd += arg1;
                if (arg2 !== undefined && typeof(arg2) !== 'function') {
                    fullcmd += arg2;
                }
            }

            return fullcmd + ")";
        }

        var fullcmd = createFullCommandString();
        console.log(address + ': got mpc request: ' + fullcmd);

        if (typeof(arg1) == 'function') {
            callback = arg1;
            arg1 = '';
        }

        if (typeof(arg2) == 'function') {
            callback = arg2;
            arg2 = '';
        }

        function reportError(msg) {
            console.log(address + ": SOCKET MCP REQUEST ERROR for: " + fullcmd);
            console.log(msg);
            socket.emit('mpc-error', msg);
        }

        function respond(resp) {
            // Maps do weird things when sent over a socket
            if (resp instanceof Map) {
                resp = Array.from(resp);
            }

            if (callback) callback(resp);
        }

        // This is a horrible way of doing this.
        // If there is a better way, please tell me.
        // The goal is to use mpc-js from the browser. I was unable to get
        // websockify to work.
        // (I'm not a very good js programmer...)
        // Using Function instead of eval to keep it out of scope.
        try {
            if (arg1 !== '' && arg2 !== '') {
                new Function('mpc', 'arg1', 'arg2',
                    'return mpc.' + cmd + '(arg1, arg2)')(mpc, arg1, arg2).
                    then(respond).catch(reportError);
            } else if (arg1 !== '') {
                new Function('mpc', 'arg1',
                    'return mpc.' + cmd + '(arg1)')(mpc, arg1).
                    then(respond).catch(reportError);
            } else {
                new Function('mpc',
                    'return mpc.' + cmd + '()')(mpc).
                    then(respond).catch(reportError);
            }
        } catch(e) {
            reportError(e);
        }
    });

    socket.on('disconnect', () => {
        sendUpdate(address, false);
    });
});

// sendUpdate manages the users connected and sends vote information
// to the clients
var sendUpdate = function (address, connect, customSocket) {
    var oldAddresses = addresses,
        i;

    addresses = [];

    var sockets = io.sockets.sockets;
    for (var socketId in sockets) {
        var remAdd = sockets[socketId].conn.remoteAddress;
        // check if remAdd is undefined
        if (!~addresses.indexOf(remAdd) && remAdd)
            addresses.push(remAdd);
    }

    var oldSize = oldAddresses.length,
        newSize = addresses.length;

    i = 0;

    function hostHandler(addr) {
        return utils.getHostname(addr, function (hostname, usedip) {
            hostnames[usedip] = hostname;

            if (i == addresses.length - 1 && config.users.enabled) {
                io.emit('hostnames', {'info': hostnames});
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

        var send = {
            'type': 'current-info', 'total-clients': totalClients,
            'song-skip-total': skip.total, 'song-skip-next': skip.next,
            'song-skip-previous': skip.previous
        };

        if (customSocket)
            customSocket.emit(send);
        else
            io.emit(send);

        console.log('\\---------------------------------------------------/');
    }
};

};
