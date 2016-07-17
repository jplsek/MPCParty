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

    updateAll: function (callback) {
        // set song title
        komponist.currentsong(function (err, song) {
            if (err) {
                console.log(err);
                mpcp.player.updateControls(callback);
                return;
            }

            //console.log(song);

            if ($.isEmptyObject(song)) {
                $('#title-text').html('<em class="text-muted" title="No song selected">No song selected</em>');
                document.title = 'MPCParty';
                $('#title-pos').html('');
                $('#time-total').html(
                    '<span class="text-muted">-- / --</span>');
                mpcp.player.setCurrent(null);
                console.log('No song selected');
                mpcp.player.updateControls(callback);
                return;
            }

            mpcp.player.title = mpcp.utils.getSimpleTitle(
                    song.Title, song.Artist, song.file);

            if (mpcp.player.current &&
                    mpcp.player.current.file != song.file) {
                mpcp.history.add('Playing: ' + mpcp.player.title);
            }

            mpcp.player.setCurrent(song);

            $('#title-text').html(mpcp.player.title).attr(
                'title', mpcp.player.title);
            document.title =  mpcp.player.title + ' - MPCParty';
            $('#title-pos').html((parseInt(song.Pos) + 1) + '. ');
            $('#music-time').attr('max', song.Time);
            $('#time-total').html(' / ' + mpcp.utils.toMMSS(song.Time));

            // highlight song in playlist with song.Id and data-fileid
            // this happens with only a player update
            $(mpcp.playlist.table + ' .gen').each(function () {
                var id = $(this).data().fileid;
                if (parseInt(id) == mpcp.player.current.Id) {
                    $(this).addClass('bg-success');
                } else {
                    $(this).removeClass('bg-success');
                }
            });

            mpcp.player.updateControls(callback);
        });
    },

    // set player properties
    updateControls: function (callback) {
        komponist.status(function (err, status) {
            //console.log(status);
            if (err) {
                console.log(err);
                mpcp.player.callbackUpdate();
                if (callback) callback();
                return;
            }

            $('#music-time').val(status.elapsed);
            if (mpcp.player.current !== null && status.state == 'stop') {
                $('#time-current').html('00:00');
            } else if (!status.elapsed) {
                $('#time-current').html('');
            } else {
                $('#time-current').html(mpcp.utils.toMMSS(status.elapsed));
            }

            mpcp.progressbar.progress = parseInt(status.elapsed);

            console.log('state: ' + status.state);
            mpcp.player.state = status.state;

            switch (status.state) {
                case 'stop':
                    $('#stop').hide();
                    $('#pause').hide();
                    $('#play').show();
                    mpcp.progressbar.stopProgress();
                    break;

                case 'play':
                    $('#stop').show();
                    $('#pause').show();
                    $('#play').hide();
                    $('#pause').removeClass('active');
                    mpcp.progressbar.startProgress();
                    break;

                case 'pause':
                    $('#play').hide();
                    $('#pause').addClass('active');
                    mpcp.progressbar.stopProgress();
                    break;
            }

            // random
            if (parseInt(status.random) === 0) {
                $('#random').removeClass('active');
            } else if (parseInt(status.random) == 1) {
                $('#random').addClass('active');
            }

            // repeat
            if (parseInt(status.repeat) === 0) {
                $('#repeat').removeClass('active');
            } else if (parseInt(status.repeat) == 1) {
                $('#repeat').addClass('active');
            }

            // consume
            if (parseInt(status.consume) === 0) {
                $('#consume').prop('checked', false);
                $('#warning-consume').css('display', 'none');
            } else if (parseInt(status.consume) == 1) {
                $('#consume').prop('checked', true);
                if (mpcp.settings.consumeWarning)
                    $('#warning-consume').css('display', 'block');
            }

            if (!status.xfade) status.xfade = 0;
            $('#crossfade').val(status.xfade);

            mpcp.player.callbackUpdate();
            if (callback) callback();
        });
    },

    // set interface properties
    updateMixer: function () {
        komponist.status(function (err, status) {
            //console.log(status);
            if (err) return console.log(err);

            $('#volume').val(status.volume);

            if (status.error) {
                lazyToast.error(status.error);
            }
        });
    },

    // set int's so there is less parsing when accessing mpcp.player.current
    setCurrent: function (song) {
        if (song) {
            song.Id  = parseInt(song.Id);
            song.Pos = parseInt(song.Pos);
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
        komponist.toggle(function (err) {
            if (err) console.log(err);
            mpcp.player.addCallbackUpdate(callback);
        });
    },

    // wrapper for komponist.stop
    stop: function () {
        console.log('stop');
        komponist.stop(function (err) {
            if (err) console.log(err);
        });
    },

    // wrapper for komponist.next
    next: function (callback) {
        if (mpcp.vote.enabled) {
            mpcp.player.addCallbackUpdate(callback);

            if (!$('#next').hasClass('active')) {
                socket.send(JSON.stringify({
                    'type': 'song-vote-next', 'info': 'yes'
                }), function (err) {
                    if (err) console.log(err);
                });
                $('#next').addClass('active');
            } else {
                $('#next').removeClass('active');
                socket.send(JSON.stringify({
                    'type': 'song-vote-next', 'info': 'no'
                }), function (err) {
                    if (err) console.log(err);
                });
            }
        } else {
            console.log('next');
            socket.send(JSON.stringify({
                'type': 'song-next'
            }), function (err) {
                if (err) console.log(err);
            });

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
            this.addCallbackUpdate(callback);

            if (!$('#previous').hasClass('active')) {
                socket.send(JSON.stringify({
                    'type': 'song-vote-previous', 'info': 'yes'
                }), function (err) {
                    if (err) console.log(err);
                });
                $('#previous').addClass('active');
            } else {
                $('#previous').removeClass('active');
                socket.send(JSON.stringify({
                    'type': 'song-vote-previous', 'info': 'no'
                }), function (err) {
                    if (err) console.log(err);
                });
            }
        } else {
            console.log('previous');
            socket.send(JSON.stringify({
                'type': 'song-previous'
            }), function (err) {
                if (err) console.log(err);
            });

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

        // 'input change' allows arrow keys to work
        $('#volume').on('input change', function () {
            komponist.setvol(this.value, function (err) {
                if (err) console.log(err);
            });
        });

        $('#random').click(function () {
            console.log('random');
            if ($('#random').hasClass('active')) {
                $('#random').removeClass('active');
                komponist.random(0, function (err) {
                    if (err) console.log(err);
                });
            } else {
                $('#random').addClass('active');
                komponist.random(1, function (err) {
                    if (err) console.log(err);
                });
            }
        });

        $('#repeat').click(function () {
            console.log('repeat');
            if ($('#repeat').hasClass('active'))
                komponist.repeat(0, function (err) {
                    if (err) console.log(err);
                });
            else
                komponist.repeat(1, function (err) {
                    if (err) console.log(err);
                });
        });

        mpcp.utils.createSearch(
            '#search-browser', mpcp.browser.search,
            mpcp.browser.update, '#search-clear');
    }
};

};
