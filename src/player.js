module.exports = function (mpcp) {

// the header with music controls
return {
    // current song to highlight the playlist
    current: null,
    // current song title
    title: '',
    // current state of the player
    state: '',
    // callback after dom updates
    callbackUpdates: [],
    // callbacks for stopping (use for unit testing mostly)
    stopCallbacks: [],
    // callbacks for changing the volume (use for unit testing mostly)
    volumeCallbacks: [],
    // the volume progressbar
    volume: document.getElementById('volume'),

    updateAll: function (callback) {
        // set song title
        mpcp.socket.emit('mpc', 'status.currentSong', (song) => {
            if ($.isEmptyObject(song)) {
                document.getElementById('title-text').innerHTML =
                    '<em class="text-muted" title="No song selected">No song selected</em>';
                document.title = 'MPCParty';
                document.getElementById('title-pos').innerHTML = '';
                document.getElementById('time-current').innerHTML = '';
                document.getElementById('time-total').innerHTML =
                    '<span class="text-muted">-- / --</span>';
                mpcp.player.setCurrent(null);
                console.log('No song selected');
                mpcp.player.updateControls(callback);
                return;
            }

            mpcp.player.title = mpcp.utils.getSimpleTitle(
                    song.title, song.artist, song.path);

            if (mpcp.player.current &&
                    mpcp.player.current.file != song.path) {
                mpcp.history.add('Playing: ' + mpcp.player.title);
            }

            mpcp.player.setCurrent(song);
            document.getElementById('title-text').innerHTML = mpcp.player.title;
            $('#title-text').attr('title', mpcp.player.title);
            document.title =  mpcp.player.title + ' - MPCParty';
            document.getElementById('title-pos').innerHTML =
                (parseInt(song.postition) + 1) + '. ';
            mpcp.progressbar.max = song.duration;
            document.getElementById('time-total').innerHTML =
                ' / ' + mpcp.utils.toMMSS(song.duration);

            // highlight song in playlist with song.Id and data-fileid
            // this happens with only a player update
            $(mpcp.playlist.table + ' .gen').each(function () {
                var id = $(this).data().fileid;
                if (parseInt(id) == mpcp.player.current.Id) {
                    $(this)[0].classList.add('bg-success');
                } else {
                    $(this)[0].classList.remove('bg-success');
                }
            });

            mpcp.player.updateControls(callback);
        });
    },

    // set player properties
    updateControls: function (callback) {
        mpcp.socket.emit('mpc', 'status.status', (status) => {
            //console.log(status);
            mpcp.progressbar.progress = status.elapsed;

            if (mpcp.player.current !== null && status.state == 'stop') {
                document.getElementById('time-current').innerHTML = '00:00';
            } else if (!status.elapsed) {
                document.getElementById('time-current').innerHTML = '';
            } else {
                document.getElementById('time-current').innerHTML = mpcp.utils.toMMSS(status.elapsed);
            }

            console.log('state: ' + status.state);
            mpcp.player.state = status.state;

            switch (status.state) {
                case 'stop':
                    document.getElementById('stop').style.display = 'none';
                    document.getElementById('pause').style.display = 'none';
                    document.getElementById('play').style.display = 'block';
                    mpcp.progressbar.reset();

                    for (var i = 0; i < mpcp.player.stopCallbacks.length; i++) {
                        mpcp.player.stopCallbacks[i]();
                    }
                    mpcp.player.stopCallbacks = [];
                    break;

                case 'play':
                    document.getElementById('stop').style.display = 'block';
                    document.getElementById('pause').style.display = 'block';
                    document.getElementById('play').style.display = 'none';
                    document.getElementById('pause').classList.remove('active');
                    mpcp.progressbar.start();
                    break;

                case 'pause':
                    document.getElementById('play').style.display = 'none';
                    document.getElementById('pause').classList.add('active');
                    mpcp.progressbar.stop();
                    mpcp.progressbar.update();
                    break;
            }

            // random
            if (parseInt(status.random) === 0) {
                document.getElementById('random').classList.remove('active');
            } else if (parseInt(status.random) == 1) {
                document.getElementById('random').classList.add('active');
            }

            // repeat
            if (parseInt(status.repeat) === 0) {
                document.getElementById('repeat').classList.remove('active');
            } else if (parseInt(status.repeat) == 1) {
                document.getElementById('repeat').classList.add('active');
            }

            // consume
            if (parseInt(status.consume) === 0) {
                $('#consume').prop('checked', false);
                document.getElementById('warning-consume').style.display = 'none';
            } else if (parseInt(status.consume) == 1) {
                $('#consume').prop('checked', true);
                if (mpcp.settings.consumeWarning)
                    document.getElementById('warning-consume').style.display =
                        'block';
            }

            if (!status.xfade) status.xfade = 0;
            document.getElementById('crossfade').value = status.xfade;

            mpcp.player.callbackUpdate();
            if (callback) callback();
        });
    },

    // set interface properties
    updateMixer: function () {
        mpcp.socket.emit('mpc', 'status.status', (status) => {
            //console.log(status);

            if (status.error) {
                mpcp.lazyToast.error(status.error);
            }

            mpcp.player.volume.style.height = status.volume + "%";

            var speaker = document.getElementById('volume-speaker');
            if (parseInt(status.volume) == 0) {
                if (speaker.classList.contains('fa-volume-up')) {
                    speaker.classList.remove('fa-volume-up');
                    speaker.classList.add('fa-volume-off');
                }
            } else {
                if (speaker.classList.contains('fa-volume-off')) {
                    speaker.classList.remove('fa-volume-off');
                    speaker.classList.add('fa-volume-up');
                }
            }

            console.log('done, start calling');
            for (var i = 0; i < mpcp.player.volumeCallbacks.length; i++) {
                console.log('calling!');
                mpcp.player.volumeCallbacks[i](status.volume);
            }
            mpcp.player.volumeCallbacks = [];
            console.log('done, end calling');
        });
    },

    // set int's so there is less parsing when accessing mpcp.player.current
    setCurrent: function (song) {
        if (song) {
            song.id  = parseInt(song.id);
            song.postition = parseInt(song.postition);
        }

        this.current = song;
    },

    // create a queue because the server responds once for a dom update
    addCallbackUpdate: function (callback) {
        if (typeof callback === 'function') {
            this.callbackUpdates.push(callback);
        } else if (callback) {
            console.log('!!! This is not a function, fix it:');
            console.log(callback);
        }
    },

    callbackUpdate: function () {
        // remove callback from array instead of just resetting the array
        // afterward to fix an issue where callbackUpdates was not reset
        // because a callback was executing a NEW callback stack.
        while (this.callbackUpdates.length) {
            var callback = mpcp.player.callbackUpdates[0];
            mpcp.player.callbackUpdates.splice(0, 1);

            if (!mpcp.player.callbackUpdates.length)
                return callback();
            else
                callback();
        }
    },

    // wrapper for komponist.play
    play: function (callback) {
        console.log('play');
        komponist.play(function (err) {
            if (err) console.log(err);
            mpcp.player.addCallbackUpdate(callback);
        });
    },

    // wrapper for komponist.toggle
    toggle: function (callback) {
        console.log('toggle');

        // 1. (playing) -> mousedown adds active -> mouseup -> active goes away ->
        // wait for mpd -> active comes back (to indicate pause).
        // This removes the "active goes away" part so it is more consistent.
        document.getElementById('pause').classList.toggle('active');

        komponist.toggle(function (err) {
            if (err) console.log(err);
            mpcp.player.addCallbackUpdate(callback);
        });
    },

    // wrapper for komponist.stop
    stop: function (callback) {
        console.log('stop');

        if (callback)
            mpcp.player.stopCallbacks.push(callback);

        komponist.stop(function (err) {
            if (err) console.log(err);
        });
    },

    // wrapper for komponist.next
    next: function (callback) {
        if (mpcp.vote.enabled) {
            mpcp.player.addCallbackUpdate(callback);

            if (!document.getElementById('next').classList.contains('active')) {
                document.getElementById('next').classList.add('active');
                mpcp.socket.emit('song-vote-next', {'info': 'yes'});
            } else {
                document.getElementById('next').classList.remove('active');
                mpcp.socket.emit('song-vote-next', {'info': 'no' });
            }
        } else {
            console.log('next');
            mpcp.socket.emit('song-next');

            // if skipping too fast, race conditions happen
            var current = mpcp.player.current;
            komponist.next(function (err) {
                if (err) console.log(err);

                if (mpcp.playlist.skipToRemove) {
                    mpcp.playlist.removeSong(current.Id);
                }

                mpcp.player.addCallbackUpdate(callback);
            });
        }
    },

    // wrapper for komponist.previous
    previous: function (callback) {
        if (mpcp.vote.enabled) {
            mpcp.player.addCallbackUpdate(callback);

            if (!document.getElementById('previous').classList.contains('active')) {
                mpcp.socket.emit('song-vote-previous', {'info': 'yes'});
                document.getElementById('previous').classList.add('active');
            } else {
                document.getElementById('previous').classList.remove('active');
                mpcp.socket.emit('song-vote-previous', {'info': 'no'});
            }
        } else {
            console.log('previous');
            mpcp.socket.emit('song-previous');

            // if skipping too fast, race conditions happen
            var current = mpcp.player.current;
            komponist.previous(function (err) {
                if (err) console.log(err);

                if (mpcp.playlist.skipToRemove) {
                    mpcp.playlist.removeSong(current.Id);
                }

                mpcp.player.addCallbackUpdate(callback);
            });
        }
    },

    toggleMute: function (callback) {
        if (callback)
            mpcp.player.volumeCallbacks.push(callback);

        mpcp.socket.emit('toggle-mute');
    },

    setvol: function (volume, callback) {
        console.log('set volume to ' + volume);

        if (callback)
            mpcp.player.volumeCallbacks.push(callback);

        komponist.setvol(volume, function (err) {
            if (err) console.log(err);
        });
    },

    initEvents: function () {
        $('#pause').click(function () {
            mpcp.player.toggle();
        });

        $('#play').click(function () {
            mpcp.player.play();
        });

        $('#stop').click(function () {
            mpcp.player.stop();
        });

        $('#next').click(function () {
            mpcp.player.next();
        });

        $('#previous').click(function () {
            mpcp.player.previous();
        });

        $('#go-current').click(function () {
            mpcp.playlist.goToCurrent();
        });

        mpcp.utils.customSlider('volume-progress', 'volume', true,
                function (percent) {
            mpcp.player.setvol(Math.round(percent * 100));
        });

        $('#random').click(function () {
            console.log('random');
            if (document.getElementById('random').classList.contains('active')) {
                // read 1.
                document.getElementById('random').classList.toggle('active');
                komponist.random(0, function (err) {
                    if (err) console.log(err);
                });
            } else {
                // read 1.
                document.getElementById('random').classList.toggle('active');
                komponist.random(1, function (err) {
                    if (err) console.log(err);
                });
            }
        });

        $('#repeat').click(function () {
            console.log('repeat');
            if (document.getElementById('repeat').classList.contains('active')) {
                // read 1.
                document.getElementById('repeat').classList.toggle('active');
                komponist.repeat(0, function (err) {
                    if (err) console.log(err);
                });
            } else {
                // read 1.
                document.getElementById('repeat').classList.toggle('active');
                komponist.repeat(1, function (err) {
                    if (err) console.log(err);
                });
            }
        });

        $('#volume-speaker').click(function (e) {
            mpcp.player.toggleMute();
        });

        mpcp.utils.createSearch(
            '#search-browser', mpcp.browser.search,
            mpcp.browser.resetSearch, '#search-clear');
    }
};

};
