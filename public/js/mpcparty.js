var mpcp = {};

$(function () {

"use strict";

var host   = window.document.location.host,
    socket = new WebSocket('ws://' + host);

// convert int to mm:ss
function toMMSS(str) {
    str = (!str ? '0' : str);

    var secNum  = parseInt(str, 10),
        minutes = Math.floor(secNum / 60),
        seconds = secNum - (minutes * 60);

    if (minutes < 10) minutes = '0' + minutes;
    if (seconds < 10) seconds = '0' + seconds;

    var time = minutes + ':' + seconds;
    return time;
}

// convert int to dd days, hh hours, mm minutes
function toFriendlyDDHHMM(str) {
    str = (!str ? '0' : str);

    var secNum  = parseInt(str, 10),
        days    = Math.floor(secNum / 86400),
        hours   = Math.floor(secNum / 3600) - (days * 24),
        minutes = Math.floor(secNum / 60) - (days * 24 + hours) * 60;

    var time = days + ' days, ' + hours + ' hours, ' + minutes + ' minutes';
    return time;
}

// copied from http://stackoverflow.com/a/1533945
$.fn.randomize = function (childElem) {
    return this.each(function () {
        var $this = $(this),
            elems = $this.children(childElem);

        elems.sort(function () { return (Math.round(Math.random()) - 0.5); });

        $this.detach(childElem);

        for (var i = 0; i < elems.length; ++i) $this.append(elems[i]);
    });
};

// copied from http://stackoverflow.com/a/12745196
function nthOccurrence(string, char, nth) {
    var firstIndex = string.indexOf(char);
    var lengthUpToFirstIndex = firstIndex + 1;

    if (nth == 1) {
        return firstIndex;
    } else {
        var stringAfterFirstOccurrence = string.slice(lengthUpToFirstIndex);
        var nextOccurrence =
            nthOccurrence(stringAfterFirstOccurrence, char, nth - 1);

        if (nextOccurrence === -1) {
            return -1;
        } else {
            return lengthUpToFirstIndex + nextOccurrence;
        }
    }
}

// return hours:minutes:seconds
function getTime() {
    var date    = new Date(),
        hours   = date.getHours(),
        minutes = date.getMinutes(),
        seconds = date.getSeconds();

    if (hours.  toString().length == 1) hours   = '0' + hours;
    if (minutes.toString().length == 1) minutes = '0' + minutes;
    if (seconds.toString().length == 1) seconds = '0' + seconds;

    return hours + ':' + minutes + ':' + seconds;
}

// generate a title for playlist and player
function getSimpleTitle(title, artist, file, playlistVal) {
    artist = (!artist ? 'unknown' : artist);
    var song = artist + ' - ' + title,
        fileStripped = stripSlash(file);

    // if the title doesn't exist, just return the file name
    if (!playlistVal) {
        return (!title ? fileStripped : song);
    } else {
        playlistVal = parseInt(playlistVal) + 1;
        var songPlaylist = playlistVal + '. ' + song;
        var fileStrippedPlaylist = playlistVal + '. ' + fileStripped;

        return (!title ? fileStrippedPlaylist : songPlaylist);
    }
}

// strip to the last slash
function stripSlash(str) {
    if (!str) return;

    var index = str.lastIndexOf('/');
    return str.substring(index+1);
}

// http://stackoverflow.com/a/9645447
function ignoreCase(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}

// http://stackoverflow.com/a/9716488
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

// create the popup window for song information
function parseSongInfo(err, values) {
    if (err || !values || Object.keys(values).length < 1) {
        lazyToast.warning('This is most likely a bug with MPCParty or the song is not in the live database.', 'Error getting song information.', 10000);
        return console.log(err);
    }

    //console.log(values);
    $('#song-info .gen').remove();
    $('#song-info-modal h4').html('');
    $('#song-info-modal').modal('show');

    var title = getSimpleTitle(values.Title, values.Artist, values.file);
    $('#song-info-modal h4').append(title);

    if (values.Time) values.Time = toMMSS(values.Time);

    // http://stackoverflow.com/a/31102605
    var html = '';
    Object.keys(values).sort(ignoreCase).forEach(function (key) {
        html += '<tr class="gen"><td>' + key + '</td><td>' + values[key] + '</td></tr>';
    });

    $('#song-info tbody').append(html);
}

// replace listAllInfo because of issues with it
// loop through each directory, add each file to array, return array
function getAllInfo(dir, callback) {
    var arr = [];

    // MESSAGE1: so there is a bug with lsinfo.
    // sometimes the json is is oddly placed. http://i.imgur.com/Iankhha.png,
    // notice the second json object, where part of the file is a key, and
    // the key is undefined. So... A way to work around this bug is to check
    // for an undefined value (because there should not be any), then run a
    // find('file') because that works.
    komponist.lsinfo(dir, function (err, files) {
        if (err) {
            console.log(err);
            callback(arr);
        }

        // make object to array (single items usually ... hopefully)
        if (!Array.isArray(files))
            files = [files];

        if (!files.length) callback(arr);

        var j = 0;

        function recurse(dir) {
            getAllInfo(dir, function (newArr) {
                arr = arr.concat(newArr);

                if (++j == files.length) {
                    callback(arr);
                }
            });
        }

        // and this is the function to work around said bug...
        function findFile(file, key) {
            //console.log(files[i]);
            // append a space
            var file1 = file.file + ' ' + key;
            // do not append a space
            var file2 = file.file + key;
            //console.log(file.file);
            //console.log(file1);
            //console.log(file2);

            // 1. find file as it normally would
            komponist.find('file', file.file, function (findErr, value) {
                //console.log(value);

                if (findErr || $.isEmptyObject(value[0])) {
                    // 2. find file with file1
                    komponist.find('file', file1, function (findErr, value) {
                        //console.log(value);

                        if (findErr || $.isEmptyObject(value[0])) {
                            // 3. find file with file2
                            komponist.find('file', file2,
                                    function (findErr, value) {
                                //console.log(value);

                                if (findErr || $.isEmptyObject(value[0])) {
                                    console.log(
                                        'no matches found, falling back');
                                    arr.push(file);

                                    if (++j == files.length) {
                                        callback(arr);
                                    }
                                } else {
                                    console.log('found match 2!');
                                    //console.log(value[0]);
                                    arr.push(value[0]);

                                    if (++j == files.length) {
                                        callback(arr);
                                    }
                                }
                            });
                        } else {
                            console.log('found match 1!');
                            //console.log(value[0]);
                            arr.push(value[0]);

                            if (++j == files.length) {
                                callback(arr);
                            }
                        }
                    });
                } else {
                    console.log('found match 0!');
                    arr.push(file);

                    if (++j == files.length) {
                        callback(arr);
                    }
                }
            });
        }

        //console.log(files);
        for (var i = 0; i < files.length; ++i) {
            if (files[i].directory && files[i].file) {
                // ignore?
                if (++j == files.length) {
                    callback(arr);
                }
            } else if (files[i].directory) {
                recurse(files[i].directory);
            } else if (files[i].file) {
                // check if the file contains an undefined value
                var add = true;
                for (var key in files[i]) {
                    if (!files[i].hasOwnProperty(key)) {
                        continue;
                    }

                    if (files[i][key] === undefined) {
                        add = false;
                        findFile(files[i], key);
                    }
                }

                // add file
                if (add) {
                    arr.push(files[i]);

                    if (++j == files.length) {
                        callback(arr);
                    }
                }
            } else {
                // fallback (such as empty directories)
                if (++j == files.length) {
                    callback(arr);
                }
            }
        }
    });
}

// update database statistics to the client
function updateStats() {
    komponist.stats(function (err, stats) {
        if (err) return console.log(err);

        //console.log(stats);
        var html = '<small>' + stats.artists + ' artists, ' + stats.albums + ' albums, ' + stats.songs + ' songs (' + toFriendlyDDHHMM(stats.db_playtime) + '). Last database update: ' + new Date(stats.db_update * 1000).toLocaleString() + '</small>';
        //console.log(html);
        $('#stats').html(html);
    });
}

// sometimes when komponist returns a length 0 or 1 item, it returns an object
// instead of any array. This is used to fix that. (less need for jquery.each)
// also used to avoid issues when converting an array which is already an
// array)
function toArray(obj) {
    if (!Array.isArray(obj)) {
        obj = [obj];

        if (obj.length == 1 && $.isEmptyObject(obj[0]))
            return [];

        return obj;
    } else {
        if (obj.length == 1 && $.isEmptyObject(obj[0]))
            return [];

        return obj;
    }
}

// select a bootstrap table row.
// ele: element to add 'selected' class, par: the table,
// style: the background color
function rowSelect(ele, par, style) {
    // bg to td instead of tr because of override
    $(par + ' td').removeClass(style);
    $(ele).removeClass('selected');
    // fix hover issues
    $(ele).children().addClass(style);
    $(ele).addClass('selected');
}

function buttonSelect(ele, par) {
    $(par).children().removeClass('active');
    $(ele).addClass('active');
}

function reflowAll() {
    $(mpcp.browser.table + '.table').trigger('reflow');
    $(mpcp.libraryArtists.table + '.table').trigger('reflow');
    $(mpcp.libraryAlbums.table + '.table').trigger('reflow');
    $(mpcp.librarySongs.table + '.table').trigger('reflow');
}

// creates a search input setup (input, search callback [returns searchVal],
// reset callback, input clear button, time it takes to search
function createSearch(input, callSearch, callReset, inputClear, time) {
    if (!time) time = 3000;

    function getSearchVal() { return $(input).val().toLowerCase(); }

    // searching the database, instant searching is "slowed"
    // for better client and server performance
    var searchInterval;
    var lastVal = '';
    $(input).focus(function () {
        // makes the instant search not as instant (instead of
        // relying on every keyUp)
        searchInterval = setInterval(function () {
            var searchVal = getSearchVal();
            //console.log('attempting searching for ' + searchVal);
            if (searchVal && searchVal != lastVal) {
                callSearch(searchVal);
                lastVal = searchVal;
            } else if (searchVal === '' && lastVal !== '') {
                callReset();
            }
        }, time);
    });

    $(input).focusout(function () {
        clearInterval(searchInterval);
        var searchVal = getSearchVal();
        if (searchVal === '' && lastVal !== '') {
            lastVal = '';
            callReset();
        }
    });

    $(inputClear).click(function () {
        //console.log('clearing search');
        $(input).val('');
        $(input).focus();
        lastVal = '';
        callReset();

        // not the best way of doing things...
        if (mpcp.library.bringBack) {
            mpcp.browser.hide();
            mpcp.library.show();
            mpcp.library.bringBack = false;
        }
    });

    // detect enter key
    $(input).keyup(function (e) {
        if (e.keyCode == 13) {
            var searchVal = getSearchVal();
            //console.log('attempting searching for ' + searchVal);
            if (searchVal === '') {
                callReset();
            } else {
                callSearch(searchVal);
                lastVal = searchVal;
            }
        }
    });
}

// hides table rows as the user searches (input text box, table, data-*,
// clear input button)
function lazySearch(input, table, data, inputClear, time) {
    if (!time) time = 1000;

    createSearch(
        input,
        function (search) {
            $(table + ' .gen').each(function (item, val) {
                var str = String($(val).data()[data]).toLowerCase();
                if (~str.indexOf(search)) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        },
        function () {
            $(table + ' .gen').show();
        },
        inputClear,
        time
    );
}

// a specialized function to convert the multiselect object to an array
function toArraySelected(obj) {
    var arr = [];
    for(var i = 0; i < obj.selected.length; ++i) {
        arr.push(obj.selected[i]);
    }
    obj.selected = arr;
}

// the header with music controls
mpcp.player = {
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

            mpcp.player.title = getSimpleTitle(
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
            $('#time-total').html(' / ' + toMMSS(song.Time));

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
                $('#time-current').html(toMMSS(status.elapsed));
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
        if (vote.enabled) {
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
        if (vote.enabled) {
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

        createSearch(
            '#search-browser', mpcp.browser.search,
            mpcp.browser.update, '#search-clear');
    }
};

// the playlist
mpcp.playlist = {
    isDragging: false,
    table: '#playlist-song-list',
    tbody: '#playlist-song-list .append',
    // scroll down to bottom of playlist
    scrollDown: false,
    // current playlist title
    current: '',
    // force a playlist update
    doUpdate: true,
    // list used for other functions
    list: {files: [], positions: []},
    // local copy of mpd json response
    local: {},
    // selected items from multiSelect
    selected: [],
    // add pulse effect on next update
    toPulse: [],
    // check if searching as to keep search while updating
    isSearching: false,
    // current search term
    searchTerm: '',
    // scroll to position after playlist update
    goAfterUpdate: false,
    // remove after skipping songs
    skipToRemove: false,
    // callback after dom updates
    callbackUpdates: [],

    // used to update the current playlist
    updateAll: function () {
        // do not use 'this'. Can be used in a callback.
        if (!this.doUpdate) {
            this.doUpdate = true;
            return;
        }

        console.log('updating playlist');

        // reset list
        this.list = {files: [], positions: []};

        if (this.isSearching) {
            this.search();
        } else {
            // we update the player first to update the current song positison
            // which is used for 'movetocurrent', the 'remove last song' bug
            // and other operations
            mpcp.player.updateAll(function () {
                komponist.playlistinfo(function (err, playlistLoad) {
                    $('#playlist-title strong').html(mpcp.playlist.current);
                    $('#playlist-title strong').attr('title',
                        mpcp.playlist.current);

                    if (err) {
                        console.log(err);
                        mpcp.playlist.callbackUpdate();
                        return;
                    }

                    $(mpcp.playlist.table + ' .gen').remove();
                    mpcp.playlist.local = playlistLoad;

                    if ($.isEmptyObject(playlistLoad[0])) {
                        var html = '<tr class="rem gen"><td><em class="text-muted">The playlist is empty! Songs can be added from the browser or by opening a playlist.</em></td></tr>';
                        $(mpcp.playlist.table).append(html);
                        // fix for removing the last song that's
                        // playling from the playlist
                        mpcp.playlist.doUpdate = true;
                        mpcp.player.updateAll();
                        mpcp.pages.update('playlist');
                        sortHelper.reloadSortable(mpcp.playlist);
                        mpcp.browser.updatePosition();
                        console.log('Empty playlist');
                        mpcp.playlist.callbackUpdate();
                        return;
                    }

                    // TODO figure out a way to use mpcp.playlist.local
                    // efficiently with mpcp.browser.updatePlaylist instead of
                    // utilizing mpcp.playlist.list
                    for (var i = 0; i < mpcp.playlist.local.length; ++i) {
                        mpcp.playlist.list.files.push(
                            mpcp.playlist.local[i].file);
                        mpcp.playlist.list.positions.push(
                            mpcp.playlist.local[i].Pos);
                    }

                    // since goToCurrent runs updateLocal, skip the regular
                    // updateLocal
                    if (mpcp.playlist.goAfterUpdate) {
                        mpcp.playlist.goAfterUpdate = false;
                        mpcp.playlist.goToCurrent();
                        mpcp.playlist.callbackUpdate();
                    } else {
                        mpcp.playlist.updateLocal();
                    }
                });
            });
        }
    },

    updateLocal: function (callback) {
        if (!this.doUpdate) {
            this.doUpdate = true;
            return;
        }

        console.log('update playlist locally');

        // length is always 1 for this.local, this fixes the empty
        // object
        if (this.local.length <= 1) {
            if ((this.local[0] && Object.getOwnPropertyNames(
                    this.local[0]).length <= 0) ||
                    this.local.length <= 0) {
                this.callbackUpdate();
                return;
            }
        }

        $(this.table + ' .gen').remove();

        var html = '',
            i,
            // item start and end from current page
            start =  (mpcp.pages.currentPlaylist - 1) *
                mpcp.pages.maxPlaylist,
            end   = ((mpcp.pages.currentPlaylist - 1) *
                mpcp.pages.maxPlaylist) + mpcp.pages.maxPlaylist;

        //console.log(end);
        // make all toPulse to ints
        for (i = 0; i < this.toPulse.length; ++i) {
            this.toPulse[i] = parseInt(this.toPulse[i]);
        }

        for (i = 0; i < this.local.length; ++i) {
            var value = this.local[i];

            value.Pos = parseInt(value.Pos);
            value.Id  = parseInt(value.Id);
            //console.log(value.file);

            // show only necessary files
            if (mpcp.pages.enabledPlaylist) {
                if (i < start)
                    continue;
                else if (i >= end)
                    break;
            }

            var title =
                getSimpleTitle(value.Title, value.Artist, value.file),
                current = 'gen';

            // highlight current song on first load
            if (mpcp.player.current && value.Id == mpcp.player.current.Id)
                current += ' bg-success';

            if (mpcp.settings.pulse &&
                    ~this.toPulse.indexOf(value.Id)) {
                // pulses twice because of lag
                current += ' pulse2';
            }

            //console.log(i + ': start');

            html += '<tr class="drag context-menu ' + current + '" title="' + title + '" data-fileid="' + value.Id + '" data-file="' + value.file + '" data-pos="' + value.Pos +  '"><td class="playlist-song-list-icons"><span class="glyphicon glyphicon-play song-play faded text-success" title="Play song"></span>' + (value.Pos + 1) + '.</td><td class="playlist-song-title"><table class="fixed-table"><tr><td>' + title + '</td></tr></table></td><td class="playlist-song-list-icons text-right"><span class="song-remove faded text-danger glyphicon glyphicon-remove" title="Remove song from playlist"></span></td></tr>';

        }

        this.toPulse = [];

        $(this.tbody).append(html);

        sortHelper.reloadSortable(this);
        mpcp.browser.updatePosition();
        mpcp.pages.update('playlist');

        // scroll down after adding a song
        if (this.scrollDown) {
            console.log('scroll');
            this.scrollDown = false;
            $('#pslwrap').scrollTop($(this.table)[0].scrollHeight);
        }

        this.callbackUpdate();
        if (callback) callback();
    },

    initSortable: function () {
        var sort = sortable(this.tbody, {
            connectWith: 'connected'
        })[0];

        sort.addEventListener('sortstart', function (e) {
            if (sortHelper.check(e, mpcp.playlist))
                return;

            mpcp.playlist.isDragging = true;

            sortHelper.clone(e, mpcp.playlist);

            //console.log($(e.srcElement).parent());
            //console.log(e);
            // check is things are selected before continuing.
            // If right click is outside selected, clear selection
            // (like in all file managers).
            var inside = false;
            for (var i = 0; i < mpcp.playlist.selected.length; ++i) {
                //console.log(mpcp.playlist.selected[i]);
                if (mpcp.playlist.selected[i].isEqualNode(
                        e.detail.item)) {
                    console.log('setting inside to true');
                    inside = true;
                    break;
                }
            }

            // if its not in mpcp.playlist.selected, update it.
            if (!inside) {
                console.log('updating mpcp.playlist.selected');
                clearSelected(mpcp.playlist);
            }
        });

        sort.addEventListener('sortstop', function (e) {
            //console.log(e);
            if (sortHelper.check(e, mpcp.playlist))
                return;
        });

        sort.addEventListener('sortupdate', function (e) {
            if (sortHelper.check(e, mpcp.playlist))
                return;

            mpcp.playlist.isDragging = false;

            if (mpcp.pb.isDragging) {
                mpcp.pb.isDragging = false;
                sortHelper.removeItem(e);
                return;
            }

            //console.log(e);
            console.log('sort update for playlist');

            var index = e.detail.index;

            //console.log(mpcp.pages.currentPlaylist);
            // check if nothing is in playlist
            if (index == 1 &&
                    $($(mpcp.playlist.tbody).children()[0]).hasClass(
                        'rem')) {
                mpcp.playlist.fromSortableSender(e, 0);
                return;
            } else if (index + 1 ==
                    $(mpcp.playlist.tbody).children().length) {
                // last item in playlist
                mpcp.playlist.fromSortableSender(e, index);
                return;
            }

            // grabs the item that used to be in that position.
            // grabs the pos as newIndex
            var newPos = $(mpcp.playlist.table + ' .gen').
                eq(index + 1).data().pos;

            var oldPos = $(mpcp.playlist.table + ' .gen').
                eq(index).data().pos;

            if (oldPos < newPos)
                newPos--;

            // dragged from browser
            if (mpcp.browser.isDragging) {
                mpcp.browser.isDragging = false;
                mpcp.playlist.fromSortableSender(e, newPos);
            } else {
                mpcp.playlist.fromSortableSelf(e, newPos);
            }

            $(e.detail.item).remove();
        });
    },

    // drag and drop came from a different table
    fromSortableSender: function (e, newIndex) {
        //console.log(e.detail.item);
        console.log('from sortable sender (playlist)');
        $(mpcp.browser.clone).removeClass('info');

        if (mpcp.browser.selected.length) {
            mpcp.browser.addMulti(newIndex);
            return;
        } else if (mpcp.librarySongs.selected.length) {
            mpcp.librarySongs.addMulti(newIndex);
            return;
        } else if ($(e.detail.item).hasClass('artist') &&
                mpcp.libraryArtists.selected.length) {
            mpcp.library.addMulti(mpcp.libraryArtists, newIndex, true);
            return;
        } else if ($(e.detail.item).hasClass('album') &&
                mpcp.libraryAlbums.selected.length) {
            mpcp.library.addMulti(mpcp.libraryAlbums, newIndex, true);
            return;
        }

        var artist, album, i;

        // file
        // note: multiselect is checked in addDir and addSong!
        if ($(e.detail.item).hasClass('file')) {
            var file = e.detail.item.dataset.fileid;
            // check if nothing in playlist
            if (this.local.length <= 1) {
                this.addid(file, undefined, true);
            } else {
                this.addSong(file, newIndex, true);
            }
        } else if ($(e.detail.item).hasClass('directory')) {
            // directory
            var dir = e.detail.item.dataset.dirid;
            console.log('add dir ' + dir);

            if (this.local.length <= 1) {
                this.addDir(dir, undefined, true);
            } else {
                this.addDir(dir, newIndex, true);
            }
        } else if ($(e.detail.item).hasClass('album')) {
            artist = e.detail.item.dataset.artist;
            album  = e.detail.item.dataset.album;

            mpcp.library.getSongsFromAlbum(artist, album, function (files) {
                for (i = 0; i < files.length; ++i) {
                    mpcp.playlist.addSong(files[i].file, newIndex, true);
                }
            });
        } else if ($(e.detail.item).hasClass('artist')) {
            artist = e.detail.item.dataset.artist;

            mpcp.library.getSongsFromAlbum(
                    artist, undefined, function (files) {
                        for (i = 0; i < files.length; ++i) {
                            mpcp.playlist.addSong(files[i].file, newIndex, true);
                        }
                    });
        } else {
            console.log('not supported drag for: ' + $(e.detail.item).attr('class'));
        }
    },

    // drag and drop came from the same table
    fromSortableSelf: function (e, newIndex) {
        console.log('from sortable self (playlist)');

        var file;

        if (this.selected.length) {
            $(this.selected).each(function (item, tr) {
                file = $(tr).data().fileid;

                mpcp.playlist.toPulse.push(file);

                var pos = $(tr).data().pos,
                    index;

                // if original location is below the "move to"
                // location
                if (pos > newIndex) {
                    index = newIndex + item;
                    //console.log('dragged playlist: ' + file + ' to ' +
                    //index);
                    komponist.moveid(file, index, function (err) {
                        if (err) console.log(err);
                    });
                } else {
                    // else if original location is about the
                    // "move to" location
                    index = newIndex;
                    //console.log('dragged playlist: ' + file + ' to ' +
                    //index);
                    komponist.moveid(file, index, function (err) {
                        if (err) console.log(err);
                    });
                }
            });

            clearSelected(this);
        } else {
            file = e.detail.item.dataset.fileid;
            this.toPulse.push(file);
            //console.log('dragged playlist: ' + file + ' to ' + newIndex);

            komponist.moveid(file, newIndex, function (err) {
                if (err) console.log(err);
            });
        }
    },

    // wrapper for komponist.addid
    addid: function (file, to, callback) {

        if (isNumber(to))
            komponist.addid(file, to, function (err, val) {
                if (err)
                    console.log(err);
                else
                    mpcp.playlist.toPulse.push(val.Id);

                mpcp.playlist.addCallbackUpdate(callback);
            });
        else
            komponist.addid(file, function (err, val) {
                if (err)
                    console.log(err);
                else
                    mpcp.playlist.toPulse.push(val.Id);

                mpcp.playlist.addCallbackUpdate(callback);
            });
    },

    // wrapper for komponist.add
    add: function (dir, to, callback) {
        if (isNumber(to)) {
            getAllInfo(dir, function (files) {
                if (!files.length) {
                    console.log('Nothing in db');
                    if (callback) callback();
                    return;
                }

                //console.log(files);
                var j = 0;

                $(files).each(function (item, value) {
                    //console.log(value);
                    if (value.file) {
                        mpcp.playlist.addid(value.file, to++, function () {
                            if (++j == Object.keys(files).length)
                                mpcp.playlist.addCallbackUpdate(callback);
                        });
                    } else {
                        if (++j == Object.keys(files).length)
                            mpcp.playlist.addCallbackUpdate(callback);
                    }
                });
            });
        } else {
            komponist.add(dir, function (err, val) {
                //val returns an empty object (I was hoping for an Id list)
                //console.log(val);
                if (err)
                    console.log(err);
                //else
                //mpcp.playlist.toPulse.push(val.Id);

                mpcp.playlist.addCallbackUpdate(callback);
            });
        }
    },

    // addSong
    addSong: function (file, to, dontScroll, callback) {
        console.log('adding song to playlist');

        if (!dontScroll) {
            this.doUpdate = false;
            if (to === undefined || isNaN(to)) {
                mpcp.pages.go('playlist', mpcp.pages.totalPlaylist);
                this.scrollDown = true;
            } else if (mpcp.player.current &&
                    to == mpcp.player.current.Pos + 1) {
                this.goToCurrent();
            } else {
                this.goToPos(to);
            }
        }

        this.addid(file, to, callback);
    },

    // addDir
    addDir: function (dir, to, dontScroll, callback) {
        console.log('adding dir to playlist');

        if (!dontScroll) {
            this.doUpdate = false;
            if (to === undefined || isNaN(to)) {
                mpcp.pages.go('playlist', mpcp.pages.totalPlaylist);
                this.scrollDown = true;
            } else {
                this.goToPos(to);
            }
        }

        this.add(dir, to, callback);
    },

    // wrapper for komponist.findadd
    findAdd: function (artist, album) {
        if (!album) {
            komponist.findadd('artist', artist, function (err, files) {
                setSongs(err, files);
            });
        } else {
            komponist.findadd(
                    'artist', artist, 'album', album, function (err, files) {
                setSongs(err, files);
            });
        }

        function setSongs (err, files) {
            if (err) console.log(err);
            // no files in response

            mpcp.playlist.doUpdate = false;
            mpcp.pages.go('playlist', mpcp.pages.totalPlaylist);
            mpcp.playlist.scrollDown = true;
        }
    },

    // plays the song in the playlist
    playSong: function (file) {
        console.log('play song from playlist: ' + file);
        komponist.playid(file, function (err, val) {
            // false positive error
            if (err && err.message !=
                    'Integer expected: undefined [2@0] {playid}') {
                console.log('Error: No song found to play');
                console.log(err);
            }
        });
    },

    // wrapper for playSong, given an element
    play: function (ele) {
        var file = $(ele).data().fileid;
        this.playSong(file);
    },

    // update the current playlist title
    updateTitle: function (title) {
        console.log('got pl title from another user: ' + title);

        mpcp.history.add('Loaded playlist: ' + title);
        this.current = title.replace(/ /g, '\u00a0');

        // fixes a bug where the playlist doesn't get updated
        // after a new one is loadded
        this.updateAll();
    },

    // remove duplicate files from the playlist
    removeDuplicates: function (callback) {
        console.log('remove duplicates');
        var duplicate = {},
            j = 0;

        $(this.local).each(function (item, file) {
            if (duplicate[file.file] && (mpcp.player.current === null ||
                        file.Pos != mpcp.player.current.Pos)) {
                komponist.deleteid(file.Id, function (err, val) {
                    if (err) {
                        console.log('Error: Cannot remove duplicate file, this might be a bug');
                        console.log(err);
                    }

                    if (++j == Object.keys(mpcp.playlist.local).length &&
                            callback)
                        mpcp.playlist.addCallbackUpdate(callback);
                });
            } else {
                duplicate[file.file] = true;

                if (++j == Object.keys(mpcp.playlist.local).length && callback)
                    mpcp.playlist.addCallbackUpdate(callback);
            }
        });
    },

    // TODO Goal: remove song from playlist without mpd updating the playlist
    // locally. Have to update this.local .Pos to work, or somehow
    // use numbered table rows instead of using Pos.
    // remove song from the playlist. The element must be removed
    // manually before or after calling!
    removeSong: function (fileid) {
        komponist.deleteid(fileid, function (err, val) {
            if (err) console.log('No song with id ' + fileid + ' to delete!');
        });

        // playlist doesn't get updated when the same song being removed is
        // playling (future me: this happens with not only pause, but other
        // times as well, so dont check for a pause flag!)
        if (mpcp.player.current && fileid == mpcp.player.current.Id)
            socket.send(JSON.stringify(
                    {'type': 'update-playlist'}), function (err) {
                if (err) console.log(err);
            });
    },

    // wrapper for removeSong, given an element
    remove: function (ele) {
        //console.log(this.selected);
        var file;

        // multiselect check (any left clicks)
        if (this.selected.length) {
            $(this.selected).each(function (item, tr) {
                //console.log(tr);
                file = $(tr).data().fileid;
                mpcp.playlist.removeSong(file);
            });

            // clear this.selected just in case.
            clearSelected(this);
        } else {
            // single file (fallback)
            file = $(ele).data().fileid;
            this.removeSong(file);
        }
    },

    // adds the song after the currently playing song
    addToCurrent: function (file, type) {
        var newPos = mpcp.player.current.Pos + 1;
        this.goAfterUpdate = true;

        if (mpcp.browser.selected.length) {
            mpcp.browser.addMulti(newPos);
            return;
        }

        if (type == 'file') {
            this.addSong(file, newPos, true);
        } else if (type == 'dir') {
            this.addDir(file, newPos, true);
        }
    },

    // move song to the top of the playlist
    moveToTop: function (file, type) {
        //console.log(file);
        // goes to page first because of pulse being cleared
        $('#pslwrap').scrollTop($(this.table));
        mpcp.pages.go('playlist', 1);

        // multiselect check
        if (this.selected.length) {
            $(this.selected).each(function (item, tr) {
                //console.log(tr);
                file = $(tr).data().fileid;
                this.toPulse.push(file);

                komponist.moveid(file, item, function (err) {
                    if (err) console.log(err);
                });
            });

            // clear this.selected just in case.
            clearSelected(this);
        } else {
            this.toPulse.push(file);
            console.log(file);

            komponist.moveid(file, 0, function (err) {
                if (err) console.log(err);
            });
        }
    },

    // move song to the currently playing song in the playlist
    moveToCurrent: function (file) {
        //console.log(mpcp.player.current.Pos);
        //console.log(file);

        var newPos = mpcp.player.current.Pos + 1;

        // multiselect check
        if (this.selected.length) {
            // only do this if the the moved songs are above the current song
            var lastPos = $(this.selected[
                    this.selected.length-1]).
                data().pos;

            this.goAfterUpdate = true;

            $(this.selected).each(function (item, tr) {
                var fileid = $(tr).data().fileid,
                    pos    = $(file).data().pos;

                mpcp.playlist.toPulse.push(fileid);

                // currently playing song is above file to be moved
                if (mpcp.player.current && mpcp.player.current.Pos < pos)
                    newPos = mpcp.player.current.Pos + 1 + item;
                // currently playing song is below file to be moved
                else if ((mpcp.player.current &&
                        mpcp.player.current.Pos > pos) ||
                            mpcp.player.current)
                    newPos = mpcp.player.current.Pos;
                // currently playing song is the same file to be moved
                else
                    newPos = 0 + item;

                //console.log(newPos);
                komponist.moveid(fileid, newPos, function (err) {
                    if (err) console.log(err);
                });
            });

            // clear this.selected just in case.
            clearSelected(this);
        } else {
            this.goAfterUpdate = true;
            var fileid = $(file).data().fileid,
                pos    = $(file).data().pos;

            this.toPulse.push(fileid);

            // currently playing song is above file to be moved
            if (mpcp.player.current && mpcp.player.current.Pos < pos)
                newPos = mpcp.player.current.Pos + 1;
            // currently playing song is below file to be moved
            else if ((mpcp.player.current && mpcp.player.current.Pos > pos) ||
                    mpcp.player.current)
                newPos = mpcp.player.current.Pos;
            // currently playing song is the same file to be moved
            else
                newPos = 0;

            //console.log(newPos);
            komponist.moveid(fileid, newPos, function (err) {
                if (err) console.log(err);
            });
        }
    },

    // move song to the bottom of the playlist
    moveToBottom: function (file) {
        var index = this.local.length;
        //console.log(index);

        // goes to page first because of pulse being cleared
        mpcp.pages.go('playlist', mpcp.pages.totalPlaylist);
        $('#pslwrap').scrollTop($(this.table)[0].scrollHeight);

        // multiselect check
        if (this.selected.length) {
            $(this.selected).each(function (item, tr) {
                file = $(tr).data().fileid;
                this.toPulse.push(file);

                komponist.moveid(file, (index - 1), function (err) {
                    if (err) console.log(err);
                });
            });

            // clear this.selected just in case.
            clearSelected(this);
        } else {
            //console.log(file);
            this.toPulse.push(file);

            komponist.moveid(file, (index - 1), function (err) {
                if (err) console.log(err);
            });
        }
    },

    // go to the page that the position of the song is located in
    goToPos: function (pos) {
        mpcp.pages.go('playlist', pos / mpcp.pages.maxPlaylist + 1);
    },

    // goes to the current song in the playlist.
    goToCurrent: function (callback) {
        console.log('go to current');

        if (!mpcp.player.current) {
            console.log('no song selected');
            if (callback) callback();
            return;
        }

        // scroll to top to avoid scrolling bugs
        $('#pslwrap').scrollTop($(this.table));

        // go to the page the song is playing on
        this.goToPos(mpcp.player.current.Pos);
        // try to go above the element, so the item is semi-centered
        var to = (mpcp.player.current.Pos % mpcp.pages.maxPlaylist) - 5;

        if (to < 1) to = 1;

        console.log('scroll to ' + to);

        var toOffset = $(this.tbody + ' .gen:nth-child(' + to + ')');

        if (toOffset.length) {
            var offset = toOffset.offset().top;
            $('#pslwrap').scrollTop(offset);
        }

        if (callback) callback();
    },

    // show song information to the user
    getSongInfo: function (file) {
        komponist.playlistfind('file', file, function (err, value) {
            parseSongInfo(err, value[0]);
        });
    },

    search: function (val) {
        if (!val)
            val = mpcp.playlist.searchTerm;
        else
            mpcp.playlist.searchTerm = val;

        // set to true (in case of after clicking clear)
        mpcp.playlist.isSearching = true;

        komponist.playlistsearch('any', val, function(err, response) {
            if (err) return console.log(err);

            //console.log(response);

            $(mpcp.playlist.table + ' .gen').remove();
            mpcp.playlist.local = response;

            if ($.isEmptyObject(response[0])) {
                var html = '<tr class="gen"><td><em class="text-muted">No songs found</em></td></tr>';
                $(mpcp.playlist.table).append(html);
                // fix for removing the last song that's
                // playling from the playlist
                mpcp.playlist.doUpdate = true;
                mpcp.player.updateAll();
                mpcp.pages.update('playlist');
                mpcp.browser.updatePosition();
                return console.log('No songs found in playlist search');
            }

            // TODO figure out a way to use this.local
            // efficiently with mpcp.browser.updatePlaylist instead of
            // utilizing this.list
            $(mpcp.playlist.local).each(function (item, value) {
                mpcp.playlist.list.files.push(value.file);
                mpcp.playlist.list.positions.push(value.Pos);
            });

            mpcp.playlist.updateLocal(function () {
                // fixes issues such as the last song not updating the player;
                mpcp.player.updateAll();
            });
        });
    },

    // open playlist from stored element
    openFromStored: function (callback) {
        // disable events
        $(document).off('keydown');
        if ($('#playlist-open-modal .selected').length) {
            var file = $('#playlist-open-modal .selected').data().fileid;
            mpcp.stored.open(file, callback);
        } else {
            lazyToast.warning('No playlist was selected', 'Playlist');
            if (callback) callback();
        }
    },

    // save playlist from stored element
    saveFromStored: function (callback) {
        // disable events
        $(document).off('keydown');
        console.log('confirm save playlist');
        var file = $('#playlist-save-input').val();
        mpcp.stored.save(file, callback);
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
            var callback = this.callbackUpdates[0];
            this.callbackUpdates.splice(0, 1);

            if (!this.callbackUpdates.length)
                return callback();
            else
                callback();
        }
    },

    clear: function (callback) {
        console.log('clear playlist');
        this.addCallbackUpdate(callback);

        // this is done server-side to fix a bug:
        // refresh -> add -> play -> clear does not work
        socket.send(JSON.stringify({'type': 'clear-playlist'}),
                function (err) {
            if (err) console.log(err);
        });
    },

    scramble: function (callback) {
        console.log('scramble playlist');
        komponist.shuffle(function (err) {
            if (err) console.log(err);
            mpcp.playlist.addCallbackUpdate(callback);
        });
    },

    initEvents: function () {
        $('#new-playlist').click(function () { mpcp.pb.newLocal(); });

        $('#scramble').click(function () {
            mpcp.playlist.scramble();
        });

        $('#remove-duplicates').click(function () {
            mpcp.playlist.removeDuplicates();
        });

        $('#open-playlist').click(function () {
            console.log('open playlists');
            mpcp.stored.updatePlaylists('#playlist-open-modal');
        });

        $('#save-playlist').click(function () {
            console.log('save playlist');
            mpcp.stored.updatePlaylists('#playlist-save-modal');
        });

        $('#playlist-save-confirm').click(function () {
            mpcp.playlist.saveFromStored();
        });

        $('#playlist-open-confirm').click(function () {
            mpcp.playlist.openFromStored();
        });

        $('#clear-playlist').click(function () {
            mpcp.playlist.clear();
        });

        $('#playlist-search-toggle').click(function () {
            if ($('#playlist-search-toggle').hasClass('active')) {
                $('#playlist-search-toggle').removeClass('active');
                $('#playlist-search').hide();
                mpcp.playlist.isSearching = false;
                $('#search-playlist').val('');
                mpcp.playlist.searchTerm = '';
                mpcp.playlist.updateAll();
            } else {
                $('#playlist-search-toggle').addClass('active');
                $('#playlist-search').show();
                $('#search-playlist').focus();
                mpcp.playlist.isSearching = true;
            }
        });

        createSearch('#search-playlist', this.search, function () {
                mpcp.playlist.isSearching = false;
                mpcp.playlist.updateAll();
            }, '#search-playlist-clear');

        $(document).on('click', '.song-remove', function () {
            var ele = $(this).parent().parent();
            //console.log(ele);
            mpcp.playlist.remove(ele);
        });

        $(document).on('dblclick', this.tbody + ' tr', function () {
            var file = $(this).data().fileid;
            mpcp.playlist.playSong(file);
        });

        $(document).on('click', '.song-play', function () {
            var file = $(this).parent().parent().data().fileid;
            mpcp.playlist.playSong(file);
        });

        multiSelect(this, ['song-remove']);

        this.initSortable();
    }
};

// the file browser
mpcp.browser = {
    isDragging: false,
    table: '#file-browser-song-list',
    tbody: '#file-browser-song-list .append',
    // current directory the user is in
    current: '/',
    previous: '/',
    searching: false,
    searchTerm: '',
    // local copy of html items
    localFolders: [],
    localFiles: [],
    // selected items from multiselect
    selected: [],
    // whether to update the browser on the next update or not
    doUpdate: true,
    // toggle between library and browser
    hidden: false,
    // used for dragging while selected
    clone: null,

    // check which dir the user is in.
    // only update that dir
    update: function (dir, poppedState, callback) {
        if (mpcp.browser.hidden && !mpcp.library.hidden) {
            // update library here. Just use mpcp.browser.update as a general
            // library/browser update. May change later to reduce coupling.
            mpcp.libraryArtists.update(mpcp.library.artist);
            mpcp.libraryAlbums.update(mpcp.library.artist, mpcp.library.album);
            if (callback) callback();
            return;
        }

        // db update (ignore back / forward buttons)
        if (!dir && !poppedState && !mpcp.browser.doUpdate) {
            console.log('do not update this...');
            // doUpdate gets set to true in the onMessage update-browser
            //mpcp.browser.doUpdate = true;
            if (callback) callback();
            return;
        }

        if (dir) mpcp.browser.current = dir;

        //console.log('previous directory: ' + mpcp.browser.previous);
        console.log('reloading directory: ' + mpcp.browser.current);

        if ((!poppedState && mpcp.browser.previous != mpcp.browser.current) ||
                (!poppedState && mpcp.browser.searching)) {
            mpcp.browser.searching = false;
            mpcp.browser.addToHistory();
            $('#slwrap').scrollTop($(mpcp.browser.table));
        }

        mpcp.browser.updateBrowser(mpcp.browser.current, callback);

        if (dir) mpcp.browser.previous = dir;
    },

    addToHistory: function () {
        if (this.current == '/' || this.current === '') {
            console.log('adding /browser/ to history');
            window.history.pushState('', 'MPCParty', '/browser/');
        } else {
            console.log('adding /browser/' + this.current +
                ' to history');
            window.history.pushState('', this.current + ' - MPCParty',
                    '/browser/' + this.current);
        }
    },

    // shows directories. use '/' for root
    updateBrowser: function (directory, callback) {
        // location bar:
        // split directory based on /'s
        // create a list item for each dir split
        $('#location .loc-dir').remove();
        // toString incase of number only directories
        var dirs  = directory.toString().split('/'),
            dirId = dirs[0],
            html  = '',
            i;

        if (this.current != '/')
            for (i = 0; i < dirs.length; ++i) {
                html += '<li class="loc-dir" data-dirid="' + dirId + '">' +
                    dirs[i] + '</li>';
                dirId += '/' + dirs[i+1];
            }

        $('#location ol').append(html);

        komponist.lsinfo(directory, function (err, files) {
            //console.log(files);
            if (err) return console.log(err);

            $(mpcp.browser.table + ' .gen').remove();
            mpcp.browser.localFolders = [];
            mpcp.browser.localFiles = [];
            files = toArray(files);

            if (!files.length) {
                html = '<tr class="directory gen"><td colspan="6">' +
                    '<em class="text-muted">Empty directory</em></td></tr>';
                $(mpcp.browser.table).append(html);
                mpcp.pages.update('browser');
                console.log('Empty directory');
                if (callback) callback();
                return;
            }

            var html = '';

            // initialize html for browser
            for (i = 0; i < files.length; ++i) {
                html = mpcp.browser.getHtmlFolders(files[i]);

                if (html !== '')
                    mpcp.browser.localFolders.push(html);
                else {
                    html = mpcp.browser.getHtmlFiles(files[i]);
                    if (html !== '') mpcp.browser.localFiles.push(html);
                }
            }

            mpcp.browser.updateLocal(callback);
        });
    },

    // replaces the browser with search results
    // searches for all files based on file name and tag
    search: function (name, poppedState) {
        console.log('mpcp.browser.search: ' + name);

        if (mpcp.browser.hidden) {
            mpcp.browser.show();
            mpcp.library.hide();
            mpcp.library.bringBack = true;
        }

        // search for tag
        komponist.search('any', name, function (err, anyFiles) {
            if (err) {
                return console.log(err);
            }

            // search for file name
            komponist.search('file', name, function (err, files) {
                if (err) {
                    return console.log(err);
                }

                anyFiles = toArray(anyFiles);
                files = toArray(files);

                //console.log(anyFiles);
                //console.log(files);

                var all = anyFiles.concat(files);

                // remove duplicate objects, if there is a "more official" way
                // of doing this, or a quicker way of doing this, do tell or
                // fix.
                var unique = [];

                for (var i = 0; i < all.length; ++i) {
                    var duplicates = 0;

                    for (var j = 0; j < unique.length; ++j) {
                        if (all[i].file == unique[j].file)
                            ++duplicates;
                    }

                    if (!duplicates) {
                        unique.push(all[i]);
                    }
                }

                //console.log(unique);
                callback(unique);
            });
        });

        function callback(files) {
            if (mpcp.browser.searchTerm == name) {
                // just don't add repeated search to history
                poppedState = true;
            }

            // do this after (in case of error)
            $(mpcp.browser.table + ' .gen').remove();
            mpcp.browser.searching = true;
            mpcp.browser.searchTerm = name;
            mpcp.browser.localFolders = [];
            mpcp.browser.localFiles = [];
            var html;

            if (!files.length) {
                // note: when the search is nothing, it does not save to
                // history
                html = '<tr class="directory gen"><td colspan="6">' +
                    '<em class="text-muted">No songs found</em></td></tr>';
                $(mpcp.browser.table).append(html);
                mpcp.pages.update('browser');
                return console.log('No songs found');
            }

            html = '';

            for (var i = 0; i < files.length; ++i) {
                html = mpcp.browser.getHtmlFiles(files[i]);

                if (html !== '')
                    mpcp.browser.localFiles.push(html);
            }

            if (!poppedState) {
                console.log('pushing history search');
                window.history.pushState('', name + ' - MPCParty',
                    '/search/' + encodeURIComponent(name));
            }

            mpcp.browser.updateLocal();
        }
    },

    getHtmlFolders: function (value) {
        var tableStart  = '<table class="fixed-table"><tr><td>',
            tableEnd    = '</td></tr></table>',
            strippedDir = '',
            html        = '';

        if (value.directory) {
            //console.log('dir');

            strippedDir = stripSlash(value.directory);

            html = '<tr class="context-menu directory gen" data-dirid="' + value.directory + '"><td class="song-list-icons"><span class="text-warning glyphicon glyphicon-folder-open"></span> <span class="folder-open faded glyphicon glyphicon-share-alt" title="Open directory. Note: You can double click the directory to open"></span></a></td><td colspan="3" title="' + strippedDir + '">' + tableStart + strippedDir + tableEnd + '</td><td colspan="2" class="song-list-icons text-right"><span class="dir-add faded text-success glyphicon glyphicon-plus" title="Add whole directory of songs to the bottom of the playlist"></span></td></tr>';

        }

        return html;
    },

    getHtmlFiles: function (value) {
        var tableStart = '<table class="fixed-table"><tr><td>',
            tableEnd   = '</td></tr></table>',
            stripFile  = '',
            html       = '';

        if (value.file) {
            //console.log('file');

            value.Album  = (!value.Album ? mpcp.settings.unknown :
                value.Album);
            value.Artist = (!value.Artist ? mpcp.settings.unknown :
                value.Artist);
            stripFile    = stripSlash(value.file);
            value.Title  = (!value.Title ? stripFile : value.Title);

            html = '<tr class="context-menu file gen" data-fileid="' + value.file + '"><td class="song-list-icons pos"><span class="text-primary glyphicon glyphicon-file"></span></td><td title="' + value.Title + '">' + tableStart + value.Title + tableEnd + '</td><td title="' + value.Artist + '">' + tableStart + value.Artist + tableEnd + '</td><td title="' + value.Album + '">' + tableStart + value.Album + tableEnd + '</td><td class="nowrap">' + toMMSS(value.Time) + '</td><td class="song-list-icons text-right"><span class="song-add faded text-success glyphicon glyphicon-plus" title="Add song to the bottom of the playlist"></span></td></tr>';

        }

        return html;
    },

    // update the song positions, instead of reloading the whole browser
    updatePosition: function () {
        console.log('updatePosition');
        var tr = $('.song-list tbody').children();

        komponist.currentsong(function (err, song) {
            if (err) return console.log(err);

            if ($.isEmptyObject(song))
                mpcp.player.setCurrent(null);
            else
                mpcp.player.setCurrent(song);

            if (mpcp.player.current) {
                $('#title-pos').html((mpcp.player.current.Pos + 1) + '. ');
            }
        });

        $.each(tr, function (name, element) {
            if (!$(element).hasClass('file')) return true;

            var fileid = $(element).data().fileid,
            icon   = '',
            index  = mpcp.playlist.list.files.indexOf(fileid);

            if (index != -1) {
                icon = (parseInt(mpcp.playlist.list.positions[index]) + 1) +
                    '.';
                $(element).children('.pos').html(icon);
            } else {
                icon = '<span class="text-primary glyphicon glyphicon-file">' +
                    '</span>';
                $(element).children('.pos').html(icon);
            }
        });
    },

    updateLocal: function (callback) {
        console.log('update local browser');

        // this.local* always has a length of 1, but may have an empty
        // object. This fixes removeal of "Empty directory"
        if (this.localFolders.length <= 1 &&
                this.localFiles.length <= 1) {
            if ((this.localFolders[0] && Object.getOwnPropertyNames(
                        this.localFolders[0]).length <= 0) &&
                    (this.localFiles[0] && Object.getOwnPropertyNames(
                        this.localFiles[0]).length <= 0)) {
                if (callback) callback();
                return;
            } else if (this.localFolders.length <= 0 &&
                    this.localFiles.length <= 0) {
                if (callback) callback();
                return;
            }
        }

        $(this.table + ' .gen').remove();

        var start = 0,
            end   = this.localFolders.length + this.localFiles.length,
            html  = '';

        if (mpcp.pages.enabledBrowser) {
            start = (mpcp.pages.currentBrowser - 1) * mpcp.pages.maxBrowser;
            end = (((mpcp.pages.currentBrowser - 1) * mpcp.pages.maxBrowser) +
                mpcp.pages.maxBrowser) - 1;
        }

        var current = start,
            i;
        //console.log(start);
        //console.log(end);

        for (i = current; i < this.localFolders.length; ++i) {
            if (current > end || current > mpcp.browser.localFolders.length)
                break;

            html += mpcp.browser.localFolders[i];
            current++;
        }

        i = current - this.localFolders.length;
        //console.log(current);
        //console.log(i);

        for (; i < this.localFiles.length; ++i) {
            if (current > end || current - mpcp.browser.localFolders.length >
                    mpcp.browser.localFiles.length)
                break;

            html += mpcp.browser.localFiles[i];
            current++;
        }

        $(this.tbody).append(html);

        //console.log(current);

        sortHelper.reloadSortable(mpcp.browser);
        this.updatePosition();
        mpcp.pages.update('browser');

        if (callback) callback();
    },

    createSortable: function (obj) {
        console.log('creating sortable for: ' + obj.tbody);
        var sort = sortable(obj.tbody, {
            connectWith: 'connected'
        })[0];

        sort.addEventListener('sortstart', function (e) {
            //console.log(e);
            if (sortHelper.check(e, obj))
                return;

            mpcp.browser.isDragging = true;

            console.log('start ' + obj.tbody);

            sortHelper.clone(e, obj);

            //console.log(e);
            // check is things are selected before continuing.
            // If right click is outside selected, clear selection
            // (like in all file managers).
            var inside = false;
            for (var i = 0; i < obj.selected.length; ++i) {
                // compare titles because of generated tr's after drag
                if (obj.tbody == mpcp.libraryArtists.tbody ||
                        obj.tbody == mpcp.libraryAlbums.tbody) {
                    if ($(obj.selected[i]).attr('title') ==
                            $(e.detail.item).attr('title')) {
                        console.log('setting inside to true (dup)');
                        inside = true;
                        break;
                    }
                } else {
                    if (obj.selected[i].isEqualNode(e.detail.item)) {
                        console.log('setting inside to true');
                        inside = true;
                        break;
                    }
                }
            }

            // if its not in *.selected, update it.
            if (!inside) {
                if (mpcp.libraryArtists.selected.length) {
                    saveSelected(mpcp.libraryArtists);
                }
                if (mpcp.libraryAlbums.selected.length) {
                    saveSelected(mpcp.libraryAlbums);
                }

                console.log('clearing ' + obj.tbody + ' selected');
                clearSelected(obj);
            }
        });

        sort.addEventListener('sortstop', function (e) {
            if (sortHelper.check(e, obj))
                return;

            console.log('sort stop for ' + obj.tbody);

            if (mpcp.libraryArtists.saved.length) {
                restoreSelected(mpcp.libraryArtists);
            }

            if (mpcp.libraryAlbums.saved.length) {
                restoreSelected(mpcp.libraryAlbums);
            }
        });

        sort.addEventListener('sortupdate', function (e) {
            if (sortHelper.check(e, obj))
                return;

            mpcp.browser.isDragging = false;

            console.log('sort update for ' + obj.tbody);

            // just delete the dropped item, because we don't want the
            // browser to change
            sortHelper.removeItem(e);
        });
    },

    // show song information to the user
    getSongInfo: function (file) {
        komponist.find('file', file, function (err, value) {
            parseSongInfo(err, value[0]);
        });
    },

    // add all songs in this.current to playlist
    addAll: function (callback) {
        console.log('add all songs from ' + this.current);

        if (this.searching) {
            komponist.search('any', this.searchTerm,
                    function (err, files) {
                if (err) {
                    console.log(err);
                    if (callback) callback();
                    return;
                }

                if ($.isEmptyObject(files[0])) {
                    console.log('No songs found');
                    if (callback) callback();
                    return;
                }

                if (mpcp.pb.current !== null)
                    mpcp.pb.addSong(files, null, callback);
                else
                    $(files).each(function (item, value) {
                        komponist.add(value.file, function (err) {
                            if (err) console.log(err);
                            if (callback) callback();
                        });
                    });
            });
        } else {
            if (mpcp.pb.current) {
                getAllInfo(this.current, function (files) {
                    mpcp.pb.addSong(files, null, callback);
                });
            } else {
                komponist.lsinfo(this.current, function (err, files) {
                    //console.log(files);

                    if (err) {
                        console.log(err);
                        if (callback) callback();
                        return;
                    }

                    files = toArray(files);

                    if (!files.length) {
                        console.log('Empty directory');
                        if (callback) callback();
                        return;
                    }

                    $(files).each(function (item, value) {
                        if (value.directory) {
                            komponist.add(value.directory, function (err) {
                                if (err) console.log(err);
                                if (callback) callback();
                            });
                        }

                        if (value.file) {
                            komponist.add(value.file, function (err) {
                                if (err) console.log(err);
                                if (callback) callback();
                            });
                        }
                    });
                });
            }
        }
    },

    // used when the user manually opens the browser
    open: function (callback) {
        mpcp.settings.saveBrowser('browser');
        $(this.table + '.table').trigger('reflow');
        this.addToHistory();
        this.update(null, false, callback);
    },

    show: function () {
        if (!this.hidden) return;
        this.hidden = false;
        buttonSelect("#open-file-browser", "#browser-selection");
        $('#browser').show();
    },

    hide: function () {
        $('#browser').hide();
        this.hidden = true;
        clearSelected(mpcp.browser);
    },

    addMulti: function (to, callback) {
        console.log('browser add multi');
        toArraySelected(mpcp.browser);
        var i, tr, dir, file, j = 0;

        function addFile(file) {
            mpcp.playlist.addSong(file, to, dontScroll, function () {
                if (++j == mpcp.browser.selected.length && callback)
                    callback();
            });
        }

        function addDir(dir) {
            mpcp.playlist.addDir(dir, to, dontScroll, function () {
                if (++j == mpcp.browser.selected.length && callback)
                    callback();
            });
        }

        if (mpcp.pb.current) {
            var arr = [];

            for (i = 0; i < this.selected.length; ++i) {
                tr = this.selected[i];
                if ($(tr).hasClass('file')) {
                    file = $(tr).data().fileid;
                    console.log('adding ----- ' + file);
                    arr.push(['id', file]);
                } else if ($(tr).hasClass('directory')) {
                    dir = $(tr).data().dirid;
                    arr.push(['dir', dir]);
                }
            }

            mpcp.pb.addArr(arr, to, callback);
        } else {
            var dontScroll = false;
            // dont scroll if drag and drop ("to" would not be null)
            if (to && mpcp.player.current && to != mpcp.player.current.Pos + 1)
                dontScroll = true;

            // reverse because not incrementing to variable because
            // scrolling to center will be overridden in addSong
            this.selected.reverse();
            for (i = 0; i < this.selected.length; ++i) {
                tr = this.selected[i];
                if ($(tr).hasClass('file')) {
                    file = $(tr).data().fileid;
                    addFile(file);
                } else if ($(tr).hasClass('directory')) {
                    dir = $(tr).data().dirid;
                    addDir(dir);
                } else {
                    if (++j == this.selected.length && callback)
                        callback();
                }
            }
        }

        clearSelected(mpcp.browser);
    },

    addExternal: function (file, to, callback) {
        if (this.selected.length)
            this.addMulti(to, callback);
        else if (mpcp.pb.current)
            mpcp.pb.addid(file, to, callback);
        else
            mpcp.playlist.addSong(file, to, false, callback);
    },

    addExternalDir: function (dir, to, callback) {
        if (this.selected.length)
            this.addMulti(to, callback);
        else if (mpcp.pb.current)
            mpcp.pb.add(dir, null, callback);
        else
            mpcp.playlist.add(dir, to, callback);
    },

    initEvents: function () {
        $('#update').click(function () {
            console.log('update database');
            // set to false until broadcast updates everyone
            // for now, the other clients will still receive multiple updates
            mpcp.browser.doUpdate = false;

            $('#update .glyphicon').addClass('spinning');

            komponist.update(function (err) {
                // check if this is satus.updating_db is undefined
                // if so, it is done updating (hopefully)
                if (err) return console.log(err);

                var updateInterval = setInterval(function () {
                    console.log('checking if update db is done...');

                    komponist.status(function (err, status) {
                        if (err) {
                            $('#update .glyphicon').removeClass('spinning');
                            clearInterval(updateInterval);
                            lazyToast.error(
                                'Error getting the status from MPD!');

                            return console.log(err);
                        }

                        // incase job id is 0/1, just check if undefined
                        if (status.updating_db === undefined) {
                            // stop interval and send update-browser
                            // to everyone
                            clearInterval(updateInterval);
                            $('#update .glyphicon').removeClass('spinning');
                            lazyToast.info(
                                'Music library updated!', 'Library');

                            socket.send(JSON.stringify(
                                    {'type': 'update-browser'}),
                                    function (err) {
                                if (err) console.log(err);
                            });
                        }
                    });
                }, 500);
            });
        });

        $('#home').click(function () {
            console.log('home');
            mpcp.browser.update('/');
        });

        $(document).on('click', '.song-add', function () {
            var file = $(this).parent().parent().data().fileid;
            mpcp.browser.addExternal(file);
        });

        $(document).on('dblclick', 'tr.file', function () {
            var file = $(this).data().fileid;
            mpcp.browser.addExternal(file);
        });

        $(document).on('dblclick', '.song-list tr.directory', function () {
            var dir = $(this).data().dirid;
            mpcp.browser.update(dir);
        });

        $(document).on('click', '.song-list .folder-open', function () {
            var dir = $(this).parent().parent().data().dirid;
            mpcp.browser.update(dir);
        });

        $(document).on('click', '.dir-add', function () {
            var dir = $(this).parent().parent().data().dirid;
            mpcp.browser.addExternalDir(dir);
        });

        $(document).on('click', '.loc-dir', function () {
            var file = $(this).data().dirid;
            //console.log(file);
            mpcp.browser.update(file);
        });

        // add all songs from mpcp.browser.current
        $('#add-all').click(function () {
            mpcp.browser.addAll();
        });

        $('#open-file-browser').click(function () {
            mpcp.browser.open();
        });

        floatTable(this.table + '.table');

        // this cannot be part of .song-list because of a bug with sortColumn
        // (overwrites contens from one tabe to other tables).
        tableSort(this.table, this.table + '-col-number',
            1, 'number');
        tableSort(this.table, this.table + '-col-title',
            2, 'string');
        tableSort(this.table, this.table + '-col-artist',
            3, 'string');
        tableSort(this.table, this.table + '-col-album',
            4, 'string');
        tableSort(this.table, this.table + '-col-time',
            5, '00:00');

        multiSelect(mpcp.browser, ['song-add', 'dir-add']);

        this.createSortable(mpcp.browser);
    }
};

// separate mutliselect for artist
mpcp.libraryArtists = {
    selected: [],
    saved: [],
    table: '#library-artists-list',
    tbody: '#library-artists-list .append',

    // put artists in table
    // artistUse: highlight in table
    update: function (artistUse, callback) {
        if (this.hidden) {
            if (callback) callback();
            return;
        }

        console.log('update artists');

        komponist.list('artist', function (err, files) {
            if (err) {
                console.log(err);
                if (callback) callback();
                return;
            }

            //console.log(files);

            $(mpcp.libraryArtists.table + ' .gen').remove();
            files = toArray(files);

            var html = '';

            if (!files.length || files[0].Artist === '') {
                html = '<tr class="gen"><td colspan="2">' +
                    '<em class="text-muted">No artists</em></td></tr>';
                $(mpcp.libraryArtists.table).append(html);
                console.log('No artists found');
                if (callback) callback();
                return;
            }

            var tableStart = '<table class="fixed-table"><tr><td>',
                tableEnd   = '</td></tr></table>',
                addClass   = '';

            for (var i = 0; i < files.length; ++i) {
                var artist = files[i].Artist;

                if (artist == artistUse) addClass = 'info';

                html += '<tr class="context-menu gen artist ' + addClass + '" data-artist="' + artist + '" title="' + artist + '"><td>' + tableStart + artist + tableEnd + '</td><td class="song-list-icons text-right"><span class="artist-add faded text-success glyphicon glyphicon-plus" title="Add artist to the bottom of the playlist"></span></td></tr>';
                addClass = '';
            }

            $(mpcp.libraryArtists.tbody).append(html);

            sortHelper.reloadSortable(mpcp.libraryArtists);

            if (callback) callback();
        });
    },

    initEvents: function () {
        lazySearch('#search-artists', this.table, 'artist',
            '#search-artists-clear');

        mpcp.browser.createSortable(this);

        $(document).on('click', this.table + ' .gen', function () {
            var artist = $(this).data().artist;
            mpcp.libraryAlbums.update(artist);
        });

        $(document).on('click', '.artist-add', function () {
            var artist = $(this).parent().parent().data().artist;
            mpcp.library.addExternal(mpcp.libraryArtists, artist);
        });

        $(document).on('dblclick', '.artist', function () {
            var artist = $(this).parent().parent().data().artist;
            mpcp.library.addExternal(mpcp.libraryArtists, artist);
        });

        floatTable(this.table, '#library-artists-wrap');

        tableSort(this.table, '#library-col-artists', 1, 'string');

        multiSelect(this, ['artist-add'], ['body'], false);
    }
};

// separate mutliselect for album
mpcp.libraryAlbums = {
    selected: [],
    saved: [],
    table: '#library-albums-list',
    tbody: '#library-albums-list .append',

    // put albums in table
    // albumUse: highlight in table
    update: function (artist, albumUse, poppedState, callback) {
        // if still null, return (user updates library without clicking an
        // artist)
        if (!artist) {
            if (callback) callback();
            return;
        }

        console.log('update albums');
        mpcp.library.artist = artist;

        komponist.list('album', artist, function (err, files) {
            if (err) {
                console.log(err);
                mpcp.librarySongs.update(
                    artist, albumUse, poppedState, callback);
                return;
            }

            $(mpcp.libraryAlbums.table + ' .gen').remove();
            files = toArray(files);

            var html       = '',
                tableStart = '<table class="fixed-table"><tr><td>',
                tableEnd   = '</td></tr></table>',
                addClass   = '';

            if (!albumUse)
                addClass = 'info';

            // All row
            html += '<tr class="context-menu gen album library-artist-all ' + addClass + '" data-artist="' + artist + '" title="All"><td>' + tableStart + 'All' + tableEnd + '</td><td class="song-list-icons text-right"><span class="album-add faded text-success glyphicon glyphicon-plus" title="Add album to the bottom of the playlist"></span></td></tr>';
            addClass = '';

            //console.log(files);

            if (!files.length || files[0].Album === '') {
                html = '<tr class="gen"><td colspan="6">' +
                    '<em class="text-muted">No albums</em></td></tr>';
                $(mpcp.libraryAlbums.tbody).append(html);
                console.log('No albums found');
                mpcp.librarySongs.update(
                    artist, albumUse, poppedState, callback);
                return;
            }

            for (var i = 0; i < files.length; ++i) {
                var album = files[i].Album;

                if (album == albumUse)
                    addClass = 'info';

                html += '<tr class="context-menu gen album ' + addClass + '" data-artist="' + artist + '" data-album="' + album + '" title="' + album + '"><td>' + tableStart + album + tableEnd + '</td><td class="song-list-icons text-right"><span class="album-add faded text-success glyphicon glyphicon-plus" title="Add album to the bottom of the playlist"></span></td></tr>';
                addClass = '';
            }

            $(mpcp.libraryAlbums.tbody).append(html);

            sortHelper.reloadSortable(mpcp.libraryAlbums);

            // show all songs initially
            mpcp.librarySongs.update(artist, albumUse, poppedState, callback);
        });
    },

    initEvents: function () {
        lazySearch('#search-albums', this.table, 'album',
            '#search-albums-clear');

        mpcp.browser.createSortable(this);

        $(document).on('click', this.table + ' .gen', function () {
            var artist = $(this).data().artist,
                album  = $(this).data().album;
            mpcp.librarySongs.update(artist, album);
        });

        $(document).on('click', '.album-add', function () {
            var artist = $(this).parent().parent().data().artist,
                album  = $(this).parent().parent().data().album;
            mpcp.library.addExternal(mpcp.libraryAlbums, artist, album);
        });

        $(document).on('dblclick', '.album', function () {
            var artist = $(this).parent().parent().data().artist,
                album  = $(this).parent().parent().data().album;
            mpcp.library.addExternal(mpcp.libraryAlbums, artist, album);
        });

        floatTable(this.table, '#library-albums-wrap');

        tableSort(this.table, '#library-col-albums', 1, 'string');

        multiSelect(this, ['album-add'], ['body'], false);
    }
};

mpcp.librarySongs = {
    // used for song selection
    selected: [],
    // used for saving selected temporarily
    saved: [],
    table: '#library-songs-list',
    tbody: '#library-songs-list .append',
    // used for dragging while selected
    clone: null,

    // put songs in table
    update: function (artist, album, poppedState, callback) {
        // if still null, return (user updates library without clicking an
        // artist)
        if (!artist) {
            if (callback) callback();
            return;
        }

        console.log('update songs');
        mpcp.library.album = album;

        if (!album) {
            komponist.find('artist', artist, function (err, files) {
                setSongs(err, files);
            });
        } else {
            komponist.find('artist', artist, 'album', album,
                    function (err, files) {
                setSongs(err, files);
            });
        }

        if (!poppedState) mpcp.library.addToHistory();

        function setSongs(err, files) {
            if (err) {
                console.log(err);
                if (callback) callback();
                return;
            }

            //console.log(files);

            $(mpcp.librarySongs.table + ' .gen').remove();
            files = toArray(files);

            var html = '';

            if (!files.length || (files.length == 1 && !files[0].Album &&
                    !files[0].Artist)) {
                html = '<tr class="gen"><td colspan="6">' +
                    '<em class="text-muted">No songs found</em></td></tr>';
                $(mpcp.librarySongs.tbody).append(html);
                return console.log('No songs found');
            }

            var tableStart = '<table class="fixed-table"><tr><td>',
                tableEnd   = '</td></tr></table>';

            for (var i = 0; i < files.length; ++i) {
                html += mpcp.browser.getHtmlFiles(files[i]);
            }

            $(mpcp.librarySongs.tbody).append(html);
            sortHelper.reloadSortable(mpcp.librarySongs);
            mpcp.browser.updatePosition();
            if (callback) callback();
        }
    },

    addMulti: function (to) {
        mpcp.browser.selected = this.selected;
        mpcp.browser.addMulti(to);
        clearSelected(mpcp.librarySongs);
        $(mpcp.librarySongs.clone).removeClass('info');
        return;
    },

    // assume library.artist and library.album is already set
    // this only searches for the title atm
    search: function (title, callback) {
        console.log('library search: ' + title);

        function compare(files) {
            $(files).each(function (item, file) {
                $(mpcp.librarySongs.tbody + ' .gen').each(function (item, val) {
                    if ($(val).data().fileid == file.file) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            });

            if (callback) callback();
        }

        if (mpcp.library.artist && mpcp.library.album) {
            //console.log('search artist and album');
            komponist.search('artist', mpcp.library.artist, 'album',
                    mpcp.library.album, 'title', title, function (err, files) {
                if (err) return console.log(err);
                compare(files);
            });
        } else if (mpcp.library.artist) {
            //console.log('search artist');
            komponist.search('artist', mpcp.library.artist,
                    'title', title, function (err, files) {
                if (err) return console.log(err);
                compare(files);
            });
        } else {
            console.log('no artist or album selected?');
            if (callback) callback();
        }
    },

    initEvents: function () {
        mpcp.browser.createSortable(this);

        // we only really care about the title (hopefully, only exception is
        // when in the 'all' album)
        createSearch(
            '#search-songs',
            this.search,
            function () {
                $(mpcp.librarySongs.table + ' .gen').show();
            },
            '#search-songs-clear',
            1000);

        floatTable(this.table, '#library-songs-wrap');

        // this cannot be part of .song-list because of a bug with sortColumn
        // (overwrites contens from one tabe to other tables).
        tableSort(this.table, this.table + '-col-number',
            1, 'number');
        tableSort(this.table, this.table + '-col-title',
            2, 'string');
        tableSort(this.table, this.table + '-col-artist',
            3, 'string');
        tableSort(this.table, this.table + '-col-album',
            4, 'string');
        tableSort(this.table, this.table + '-col-time',
            5, '00:00');

        multiSelect(this, ['song-add']);
    }
};

// the library (alternative to file browser)
// controls the main #library
mpcp.library = {
    hidden: true,
    // used when searching globally and other things
    bringBack: false,
    // save these when updating the library externally
    artist: null,
    album: null,

    addToHistory: function () {
        if (!mpcp.library.artist) {
            console.log('adding /library/ to history');
            window.history.pushState('','MPCParty', '/library/');
            return;
        }

        var albumHistory = '',
            artistHistory = encodeURIComponent(mpcp.library.artist);

        if (mpcp.library.album)
            albumHistory = '/' + encodeURIComponent(mpcp.library.album);

        var url = artistHistory + albumHistory;
        console.log('adding /library/' + url + ' to history');
        window.history.pushState('', url + ' - MPCParty', '/library/' + url);
    },

    // manually open from the user
    open: function (callback) {
        mpcp.settings.saveBrowser('library');
        this.addToHistory();
        mpcp.libraryArtists.update(mpcp.library.artist, callback);
    },

    show: function () {
        if (!this.hidden) return;

        this.hidden = false;
        $('#library').show();
        buttonSelect("#open-library", "#browser-selection");
        $(mpcp.libraryArtists.table + '.table').trigger('reflow');
        $(mpcp.libraryAlbums.table + '.table').trigger('reflow');
        $(this.table + '.table').trigger('reflow');
        //restoreSelected(mpcp.libraryArtists);
        //restoreSelected(mpcp.libraryAlbums);
    },

    hide: function () {
        this.hidden = true;
        $('#library').hide();
        saveSelected(mpcp.libraryArtists);
        clearSelected(mpcp.libraryArtists);
        saveSelected(mpcp.libraryAlbums);
        clearSelected(mpcp.libraryAlbums);
    },

    // obj, libraryArtist or libraryAlbum
    addMulti: function (obj, to, dontScroll) {
        toArraySelected(obj);
        var i, tr, artist, album;

        function sendToPb(art, alb) {
            mpcp.library.getSongsFromAlbum(art, alb, function (files) {
                mpcp.pb.addSong(files, to);
            });
        }

        function sendToPl(art, alb) {
            mpcp.library.getSongsFromAlbum(artist, album, function (files) {
                // reverse because not incrementing to variable because
                // scrolling to center will be overridden in addSong
                files = files.reverse();
                for (var i = 0; i < files.length; ++i) {
                    mpcp.playlist.addSong(files[i].file, to, dontScroll);
                }
            });
        }

        obj.selected.reverse();

        if (mpcp.pb.current) {
            for (i = 0; i < obj.selected.length; ++i) {
                tr     = obj.selected[i];
                artist = $(tr).data().artist;
                album  = $(tr).data().album;
                sendToPb(artist, album);
            }
        } else {
            for (i = 0; i < obj.selected.length; ++i) {
                tr     = obj.selected[i];
                artist = $(tr).data().artist;
                album  = $(tr).data().album;
                sendToPl(artist, album);
            }
        }

        clearSelected(obj);
    },

    // return a file list from an album
    getSongsFromAlbum: function (artist, album, callback) {
        // TODO fix special characters
        if (!album) {
            komponist.find('artist', artist, function (err, files) {
                setSongs(err, files);
            });
        } else {
            komponist.find('artist', artist, 'album', album,
                    function (err, files) {
                setSongs(err, files);
            });
        }

        function setSongs (err, files) {
            //console.log(files);
            files = toArray(files);

            if (!files.length || (files.length == 1 && !files[0].Album &&
                        !files[0].Artist)) {
                console.log('No songs found');
                lazyToast.warning('This may be an issue with special characters: ' + album, 'No songs found');
                return;
            }

            if (callback) callback(files);
        }
    },

    addExternal: function (obj, artist, album, to, dontScroll) {
        if (obj.selected.length)
            this.addMulti(obj, to, dontScroll);
        else if (mpcp.pb.current)
            this.getSongsFromAlbum(artist, album, function (files) {
                mpcp.pb.addSong(files, to, dontScroll);
            });
        else
            this.getSongsFromAlbum(artist, album, function (files) {
                for (var i = 0; i < files.length; ++i)
                    mpcp.playlist.addSong(files[i].file, to);
            });
    },

    // decode the url when loading the page
    decodeRequest: function (request) {
        var artist = request,
            album  = null;

        if (!request) request = '';
        //console.log(request);

        if (request.indexOf('/') != -1) {
            artist = request.slice(0, request.indexOf('/'));
            album  = request.slice(request.indexOf('/') + 1, request.length);
        }

        artist = decodeURIComponent(artist);

        if (album) album = decodeURIComponent(album);

        //console.log(artist);
        //console.log(mpcp.library.artist);
        //console.log(album);
        //console.log(mpcp.library.album);

        mpcp.browser.hide();
        this.show();

        // we don't need to update everything if everything is the same
        // (like coming from the browser)
        if (mpcp.library.album !== null && mpcp.library.album === album) return;

        if (mpcp.library.artist != artist) mpcp.libraryArtists.update(artist);

        mpcp.libraryAlbums.update(artist, album, true);
    },

    initEvents: function () {
        $('#open-library').click(function () {
            mpcp.library.open();
        });

        mpcp.libraryAlbums.initEvents();
        mpcp.libraryArtists.initEvents();
        mpcp.librarySongs.initEvents();
    }
};

// the stored playlists
mpcp.stored = {
    // used for saving external playlists
    fileArr: [],
    // used for returning values for opening playlists
    call: null,
    // current is used to tell what the save operation is (native being mpd)
    current: 'native',
    // whether to update the list
    doUpdate: true,
    // total number of places that update(id) is used (for doUpdate)
    // may be changed in the future to be more dynamic
    totalIds: 2,
    currentId: 0,
    // currently opened modal (open or save)
    active: '',

    // used show all playlists
    // fileArr is used when saving the playlist externally after clicking save
    updatePlaylists: function (id, type, callback) {
        if (type) {
            if (typeof type == 'function') {
                this.call = type;
                this.current = 'native';
            } else if (Array.isArray(type)) {
                this.fileArr = type;
                this.current = 'fileids';
            }
        } else if (!this.doUpdate) {
            if (++this.currentId >= this.totalIds) {
                this.doUpdate = true;
                this.currentId = 0;

                if ($('.playlists .append').children('.gen') < 1) {
                    var html = '<tr class="gen"><td colspan="2"><em class="text-muted">No playlists found</em></td></tr>';
                    $(id +' .playlists tbody').append(html);
                    console.log('no playlists found (dont update)');
                }
            }

            if (callback) callback();
            return console.log('no update');
        } else {
            this.current = 'native';
        }

        console.log('update stored playlists table');

        komponist.listplaylists(function (err, playlists) {
            //console.log(id + ':');
            //console.log(playlists);
            if (err) {
                if (err.message == 'No such file or directory [52@0] {listplaylists}') {
                    lazyToast.error('Is there a playlist directory and correct write permissions?', 'Cannot read playlist directory!');
                }

                html = '<em class="gen text-muted">No saved playlists</em>';
                $(id +' .modal-body').append(html);
                console.log(err);
                if (callback) callback();
                return;
            }

            if (id == '#playlist-open-modal')
                mpcp.stored.active = 'open';
            else if (id == '#playlist-save-modal')
                mpcp.stored.active = 'save';

            $(id +' .modal-body .gen').remove();

            var html = '';

            if (!Array.isArray(playlists))
                playlists = [playlists];

            if (!playlists.length) {
                html = '<em class="gen text-muted">No saved playlists</em>';
                $(id +' .modal-body').append(html);
                return console.log('No playlists');
            }

            var i = 0;

            $(playlists).each(function (item, value) {
                komponist.listplaylist(value.playlist, function (err, songs) {
                    if (err && err.message ==
                            'No such playlist [50@0] {listplaylist}') {
                        console.log('no playlist found: "' +
                            value.playlist + '"');
                    } else if (err) {
                        console.log(err);
                    }

                    if (!Array.isArray(songs))
                        songs = [songs];

                    value.playlist = value.playlist.replace(/ /g, '\u00a0');
                    html += '<tr class="gen" data-fileid="' + value.playlist + '"><td>' + value.playlist + '</td><td>' + songs.length + '</td><td class="text-right"><span class="faded playlist-remove text-danger glyphicon glyphicon-remove" data-fileid="' + value.playlist + '" title="Remove the playlist"></span></td>';
                    if (++i == playlists.length) {
                        $(id +' .playlists tbody').append(html);
                        if (callback) callback();
                    }
                });
            });
        });
    },

    // save the playlist. Wrapper for komponist.save()
    save: function (file, callback) {
        file = file.toString().trim().replace(/\u00a0/g, " ");
        console.log(file);

        // When titles are "", it updates the current playlist, kind of.
        // It works via playlist buffer, but not the playlist.
        // So I'd rather disable the feature in case people get confused.
        if (file === "") {
            lazyToast.warning('You must provide a title!', 'Playlist');
            $('#playlist-save-modal').modal('hide');

            if (callback) callback();
            return console.log('invalid title');
        }

        if (this.current == 'fileids') {
            if (!this.fileArr.length) {
                lazyToast.warning('Playlist empty!', 'Playlist');
                $('#playlist-save-modal').modal('hide');

                if (callback) callback();
                return console.log('empty playlist');
            }

            // overwrite any existing playlist
            komponist.rm(file, function (err, val) {
                if (err) {
                    if (err.message == 'No such playlist [50@0] {rm}')
                        console.log('No playlist to overwrite, continue...');
                    else
                        console.log(err);
                }

                //console.log(mpcp.stored.fileArr);

                // continue saving...
                var saved              = true,
                updatedCurrentPlaylist = false,
                invalid                = false,
                noFile                 = false,
                notFound               = false,
                unknown                = false,
                err2,
                // since everything is async, we have to use a deferred object.
                // i is counting the elements being added, which resolves the
                // deferred.
                i   = 0,
                def = $.Deferred();

                function addSongToPlaylist(file, song) {
                    komponist.playlistadd(file, song, function (err2, val) {
                        // I would like to break from the each loop when an
                        // error occurs, but getting that set up is hackish.
                        // For now, it will run the each loop every time an
                        // error is caught
                        ++i;

                        if (err2) {
                            if (err2.message == 'playlist name is invalid: playlist names may not contain slashes, newlines or carriage returns [2@0] {playlistadd}') {
                                invalid = true;
                            } else if (err2.message == 'No such file or directory [52@0] {playlistadd}') {
                                noFile = true;
                            } else if (err2.message ==  'Not found [50@0] {playlistadd}') {
                                // read MESSAGE1
                                err2 = song;
                                notFound = true;
                            } else {
                                unknown = true;
                            }

                            saved = false;
                            // resolves earlier because output would be the
                            // same anyways
                            console.log(err2);
                            def.resolve();
                            return;
                        }

                        if (i == mpcp.stored.fileArr.length) {
                            if (mpcp.playlist.current == file)
                                updatedCurrentPlaylist = true;
                            def.resolve();
                        }
                    });
                }

                for (var j = 0; j < mpcp.stored.fileArr.length; ++j) {
                    // this if statement doesn't actually work, async makes
                    // this loop happen too quickly
                    if (!saved) return false;
                    addSongToPlaylist(file, mpcp.stored.fileArr[j]);
                }

                def.done(function () {
                    // in deferred because the loop can execute the
                    // playlistadd multiple times
                    if (invalid) {
                        lazyToast.warning('Playlist may not contain slashes, newlines, or carriage returns.', 'Invalid Characters', 10000);
                    } else if (noFile) {
                        lazyToast.error('Is there a playlist directory and correct write permissions?', 'Cannot read playlist directory!');
                    } else if (notFound) {
                        // read MESSAGE1
                        lazyToast.error('File not found: ' + err2, 'Playlist');
                    } else if (unknown) {
                        lazyToast.error(err2, 'Unhandled Error');
                    }

                    if (saved) {
                        file = file.replace(/ /g, '\u00a0');
                        lazyToast.info(
                            file + ' playlist saved!', 'Playlist update');

                        if (updatedCurrentPlaylist) {
                            var msg = 'You must open the updated playlist for it to update the current playlist.';
                            mpcp.history.add(msg, 'info');
                            toastr.info(msg + '<button title="Reloads the playlist" class="playlist-reload btn btn-default pull-right"><span class="glyphicon glyphicon-repeat"></span></button>', 'Playlist update', {
                                'closeButton': true,
                                'positionClass': 'toast-bottom-left',
                                'preventDuplicates': false,
                                'timeOut': '-1',
                                'extendedTimeOut': '-1'
                            });
                        }

                        // clear fileArr after saving
                        mpcp.stored.fileArr = [];
                    }

                    if (callback) callback();
                });
            });
        } else {
            var trs = $(mpcp.playlist.tbody).children('.gen').not('.rem');

            // horrible check, whats the better way to check for
            // 'Empty playlist'?
            if (trs.length < 1 || (
                    trs[0].childNodes[0].childNodes[0].childNodes[0] &&
                    $(trs[0].childNodes[0].childNodes[0].childNodes[0].data).
                    selector == 'Empty playlist')) {
                lazyToast.warning('Playlist empty!', 'Playlist');
                $('#playlist-save-modal').modal('hide');

                if (callback) callback();
                return console.log('playlist empty');
            }

            komponist.rm(file, function (err, val) {
                if (err) {
                    if (err.message == 'No such playlist [50@0] {rm}')
                        console.log('No playlist to overwrite, continue...');
                    else
                        console.log(err);
                }

                // continue saving...
                komponist.save(file, function (err, val) {
                    file = file.replace(/ /g, '\u00a0');

                    if (err) {
                        console.log(err.message);

                        if (err.message == 'No such file or directory [52@0] {save}') {
                            lazyToast.error('Is there a playlist directory and correct write permissions?', 'Cannot read playlist directory!');
                        } else if (err.message == 'playlist name is invalid: playlist names may not contain slashes, newlines or carriage returns [2@0] {save}') {
                            lazyToast.warning('Playlist may not contain slashes, newlines, or carriage returns.', 'Invalid Characters', 10000);
                        }

                        if (callback) callback();
                        return console.log(err);
                    }

                    lazyToast.info(
                        file + ' playlist saved!', 'Playlist update');

                    // set title locally before sending to clients
                    $('#playlist-title strong').html(file);
                    $('#playlist-title strong').attr('title', file);

                    socket.send(JSON.stringify({
                            'type': 'playlist-title', 'info': file
                            }), function (err) {
                        if (err) console.log(err);
                    });

                    if (callback) callback();
                });
            });
        }

        $('#playlist-save-modal').modal('hide');
    },

    externalSave: function (callback) {
        var trs = $(mpcp.pb.tbody).children('.gen').not('.rem'),
        fileIds = [];

        for (var i = 0; i < trs.length; ++i)
            fileIds[i] = $(trs[i]).data().fileid;

        mpcp.stored.updatePlaylists('#playlist-save-modal', fileIds, callback);
    },

    removePlaylist: function (file, tr, callback) {
        file = file.replace(/\u00a0/g, " ");
        // client side deletion, less jaring (stops flashing the list)
        mpcp.stored.doUpdate = false;
        console.log('delete playlist ' + file);

        komponist.rm(file, function (err) {
            if (err) {
                lazyToast.error(err, 'Error removing playlist!');
                console.log(err);
            } else {
                $(tr).remove();
            }

            if (callback) callback();
        });
    },

    // open the playlist. Wrapper for komponist.open()
    open: function (file, callback) {
        file = file.toString().replace(/\u00a0/g, " ");
        if (this.call !== null) {
            console.log('calling fn..');
            this.call(file, callback);
            this.call = null;
        } else {
            console.log('confirm open playlist');
            console.log(file);
            // stops duplicate updating because of socket sending
            mpcp.playlist.doUpdate = false;

            komponist.clear(function (err) {
                if (err) console.log(err);

                komponist.load(file, function (err) {
                    if (err) {
                        lazyToast.error('Error loading the playlist! ' +
                            err.message);
                        console.log(err);
                        if (callback) callback();
                        return;
                    }

                    // set title locally before sending to clients
                    $('#playlist-title strong').html(file);
                    $('#playlist-title strong').attr('title', file);

                    socket.send(JSON.stringify({
                            'type': 'playlist-title', 'info': file
                            }), function (err) {
                        if (err) console.log(err);
                    });

                    mpcp.playlist.addCallbackUpdate(callback);
                });
            });

        }
        $('#playlist-open-modal').modal('hide');
    },

    initEvents: function () {
        $(document).on('click', '.playlists .gen', function () {
            console.log('select playlist');
            // unbind any previous keydowns
            $(document).off('keydown');
            rowSelect(this, '.playlists', 'bg-primary');

            var file = $(this).data().fileid;
            $('#playlist-save-input').val(file);

            var ele = this;

            $(document).keydown(function (e) {
                switch (e.keyCode) {
                    // enter key
                    case 13:
                        if (mpcp.stored.active == 'open')
                            mpcp.playlist.openFromStored();
                        else if (mpcp.stored.active == 'save')
                            mpcp.playlist.saveFromStored();

                        break;

                    // down arrow
                    case 40:
                        if (!$(ele).next().length) break;

                        $(ele).removeClass('selected');
                        $('.playlists td').removeClass('bg-primary');
                        ele = $(ele).next();
                        $(ele).children().addClass('bg-primary');
                        $(ele).addClass('selected');

                        file = $(ele).data().fileid;
                        $('#playlist-save-input').val(file);
                        break;

                    // up arrow
                    case 38:
                        if (!$(ele).prev().length) break;

                        $(ele).removeClass('selected');
                        $('.playlists td').removeClass('bg-primary');
                        ele = $(ele).prev();
                        $(ele).children().addClass('bg-primary');
                        $(ele).addClass('selected');

                        file = $(ele).data().fileid;
                        $('#playlist-save-input').val(file);
                        break;
                }
            });
        });

        $(document).on('click', '.playlist-remove', function () {
            var file = $(this).data().fileid,
                tr   = $(this).parent().parent();

            mpcp.stored.removePlaylist(file, tr);
        });

        $(document).on('dblclick', '#playlist-open-modal .gen', function () {
            mpcp.playlist.openFromStored();
        });

        $(document).on('dblclick', '#playlist-save-modal .gen', function () {
            mpcp.playlist.saveFromStored();
        });

        // reset vars
        $('#playlist-open-modal').on('hidden.bs.modal', function () {
            mpcp.stored.call = null;
            mpcp.stored.active = '';
        });

        $('#playlist-save-modal').on('hidden.bs.modal', function () {
            mpcp.stored.fileArr = [];
            mpcp.stored.active = '';
        });

        $('#playlist-save-clear').click(function () {
            $('#playlist-save-input').val('');
            $('#playlist-save-input').focus();

            // unbind any previous keydowns
            $(document).off('keydown');
            // bg to td instead of tr because of override
            $('.playlists td').removeClass('bg-primary');
            $(this).removeClass('selected');
        });

        $('#playlist-save-input').focus(function () {
            $(document).keydown(function (e) {
                if (e.keyCode == 13) mpcp.playlist.saveFromStored();
            });
        });

        // separate for open and save because of duplication issues
        tableSort('#playlist-open-modal table',
            '#playlist-open-modal .col-playlists-title', 1, 'string');
        tableSort('#playlist-open-modal table',
            '#playlist-open-modal .col-playlists-songs', 2, 'number');
        tableSort('#playlist-save-modal table',
            '#playlist-save-modal .col-playlists-title', 1, 'string');
        tableSort('#playlist-save-modal table',
            '#playlist-save-modal .col-playlists-songs', 2, 'number');
    }
};

// progress bar simulation for the player
mpcp.progressbar = {
    progress: 0,
    musicprogress: 0,

    progressfn: function () {
        // avoid 'this' as it's in a new scope of setInterval
        ++mpcp.progressbar.progress;
        $('#music-time').val(mpcp.progressbar.progress);
        $('#time-current').html(toMMSS(mpcp.progressbar.progress));
    },

    stopProgress: function () {
        //console.log('stop progressbar');
        clearInterval(this.musicprogress);
    },

    startProgress: function () {
        this.stopProgress(); // stops in case of duplicates;
        //console.log('start progressbar');
        this.musicprogress = setInterval(this.progressfn, 1000);
    },

    initEvents: function () {
        $('#music-time').on('change', function () {
            // DO NOT USE seekcur, it introduces the SKIPPING BUG
            // on SOME systems.
            komponist.seek(mpcp.player.current.Pos, this.value,
                    function (err) {
                console.log('Seeking...');
                if (err) console.log('no song playing to seek');
            });
        });
    }
};

// the playlist buffer
mpcp.pb = {
    isDragging: false,
    current: null,
    selector: '#pb',
    table: '#pb-song-list',
    tbody: '#pb-song-list .append',
    minimized: false,
    // selected items from multiSelect
    selected: [],

    // future: share playlists to edit?
    newLocal: function () {
        if (this.minimized) {
            this.minimized = false;
            this.resume();
        } else if (!this.current) {
            this.current = 'local';
            $('#pb').css('display', 'flex');
            this.clear();
        }
    },

    getHtml: function (title, file) {
        var extra = '';
        if (mpcp.settings.pulse) extra += 'pulse';

        return '<tr class="gen context-menu ' + extra + '" title="' + title + '" data-title="' + title + '" data-fileid="' + file + '"><td class="playlist-song-list-icons"></td><td class="playlist-song-title"><table class="fixed-table"><tr><td>' + title + '</td></tr></table></td><td class="playlist-song-list-icons text-right"><span class="pb-song-remove faded text-danger glyphicon glyphicon-remove" title="Remove song from playlist"></span></td></tr>';
    },

    // file object, position to put song
    // file can be an array of 'file' objects
    addSong: function (file, pos, callback) {
        //console.log('adding song to pb: ' + this.current);
        //console.log(file);
        this.removeNothingMessage();

        var title, html;
        //console.log(file);

        if (Array.isArray(file)) {
            for (var i = 0; i < file.length; ++i) {
                title = getSimpleTitle(file[i].Title, file[i].Artist,
                    file[i].file);
                html += this.getHtml(title, file[i].file);
            }
        } else {
            title = getSimpleTitle(file.Title, file.Artist, file.file);
            html = this.getHtml(title, file.file);
        }

        if (pos >= 0) {
            if (!pos) {
                $(this.tbody).prepend(html);
                $('#pb-main').scrollTop($(this.table));
            } else {
                //console.log('add to ' + pos);
                $(this.tbody + ' > .gen:nth-child(' + (pos) + ')').after(html);
            }
        } else {
            //console.log('add to bottom');
            $(this.tbody).append(html);
            $('#pb-main').scrollTop($(this.table)[0].scrollHeight);
        }

        sortHelper.reloadSortable(this);
        this.move();

        if (callback) callback();
    },

    initSortable: function () {
        var sort = sortable(this.tbody, {
            items: ':not(.rem)',
            connectWith: 'connected'
        })[0];

        sort.addEventListener('sortstart', function (e) {
            if (sortHelper.check(e, mpcp.pb))
                return;

            mpcp.pb.isDragging = true;

            sortHelper.clone(e, mpcp.pb);

            //console.log(e);
            // check is things are selected before continuing.
            // If right click is outside selected, clear selection
            // (like in all file managers).
            var inside = false;
            for (var i = 0; i < mpcp.pb.selected.length; ++i) {
                //console.log(mpcp.playlist.selected[i]);
                if (mpcp.pb.selected[i].isEqualNode(e.detail.item)) {
                    console.log('setting inside to true');
                    inside = true;
                    break;
                }
            }

            // if its not in mpcp.playlist.selected, update it.
            if (!inside) {
                console.log('updating this.selected');
                clearSelected(mpcp.pb);
            }
        });

        sort.addEventListener('sortupdate', function (e) {
            if (sortHelper.check(e, mpcp.pb))
                return;

            mpcp.pb.isDragging = false;

            if (mpcp.playlist.isDragging) {
                mpcp.playlist.isDragging = false;
                sortHelper.removeItem(e);
                return;
            }

            //console.log(e);
            console.log('sort update for pb');

            var index;

            //console.log(mpcp.browser.isDragging);
            if (mpcp.browser.isDragging) {
                mpcp.browser.isDragging = false;
                index = e.detail.index;
                mpcp.pb.fromSortableSender(e, index);
            } else {
                sortHelper.removeClone();
            }

            if (mpcp.pb.selected.length) {
                var dropped = e.detail.item,
                    last;

                index = mpcp.pb.selected.index(dropped);

                $(mpcp.pb.selected).each(function (item, tr) {
                    var file = $(tr).data().fileid;

                    // if dropped item is further down than the current tr
                    if (index > item) {
                        //console.log(file + ': insert before');
                        $(tr).insertBefore(dropped);
                    } else if (index < item) {
                        //console.log(file + ': insert after');
                        // put tr after the last placed element
                        if (!last)
                            $(tr).insertAfter(dropped);
                        else
                            $(tr).insertAfter(last);

                        last = tr;
                    }
                    // else dont do anything
                    // (the item that was dropped)
                });

                clearSelected(mpcp.pb);
            }

            mpcp.pb.move();
        });
    },

    // dragging from another drag table
    // mutliselect is handled in addDir and addfile
    fromSortableSender: function (e, index) {
        // check if "playlist buffer is empty" is showing
        if (index == 1 && $($(this.tbody).children()[0]).hasClass('rem'))
            index = 0;

        // remove the dragged element
        var rem = index + 1;

        if ($($(this.tbody).children()[0]).hasClass('rem'))
            ++rem;

        $(this.tbody + ' .gen:nth-child(' + (rem) + ')').remove();

        // mutli select check
        if (mpcp.browser.selected.length) {
            // just remove info from browser.
            $(mpcp.browser.clone).removeClass('info');
            mpcp.browser.addMulti(index);
            return;
        } else if (mpcp.librarySongs.selected.length) {
            mpcp.librarySongs.addMulti(index);
            return;
        } else if ($(e.detail.item).hasClass('artist') &&
                mpcp.libraryArtists.selected.length) {
            mpcp.library.addMulti(mpcp.libraryArtists, index, true);
            return;
        } else if ($(e.detail.item).hasClass('album') &&
                mpcp.libraryAlbums.selected.length) {
            mpcp.library.addMulti(mpcp.libraryAlbums, index, true);
            return;
        }

        var artist, album;

        if ($(e.detail.item).hasClass('file')) {
            var fileName = e.detail.item.dataset.fileid;
            this.addid(fileName, index);
        } else if ($(e.detail.item).hasClass('directory')) {
            // directory
            var dir = e.detail.item.dataset.dirid;
            this.add(dir, index);
        } else if ($(e.detail.item).hasClass('album')) {
            artist = e.detail.item.dataset.artist;
            album  = e.detail.item.dataset.album;

            mpcp.library.getSongsFromAlbum(artist, album, function (files) {
                mpcp.pb.addSong(files, index);
            });
        } else if ($(e.detail.item).hasClass('artist')) {
            artist = e.detail.item.dataset.artist;

            mpcp.library.getSongsFromAlbum(artist, null, function (files) {
                mpcp.pb.addSong(files, index);
            });
        } else {
            console.log('not supported drag for: ' + $(e.detail.item).attr('class'));
        }

        $(e.detail.item).remove();
    },

    // wrapper (similar to komponist.addid)
    addid: function (fileid, pos, callback) {
        //console.log(fileid);
        komponist.find('file', fileid, function (err, value) {
            if (err) {
                console.log(err);
                if (callback) callback();
                return;
            }

            //console.log(value);
            value = value[0];

            if (value.file && !value.directory) {
                mpcp.pb.addSong(value, pos, callback);
            }
        });
    },

    // add an array so the DOM is only updated once
    // arr: [type][value]
    addArr: function (arr, pos, rootCallback) {
        // converts to a files array for addSong
        var newArr = [],
            j      = 0;

        function callback() {
            mpcp.pb.addSong(newArr, pos, rootCallback);
        }

        function setFile(fileid) {
            komponist.find('file', content, function (err, value) {
                if (err) return console.log(err);

                value = value[0];

                if (value.file && !value.directory) {
                    //console.log(value);
                    newArr.push(value);
                    if (++j == arr.length) callback();
                }
            });
        }

        function setDir(dir) {
            getAllInfo(dir, function (files) {
                newArr = newArr.concat(files);
                if (++j == arr.length) callback();
            });
        }

        //console.log(arr);
        for (var i = 0; i < arr.length; i++) {
            var val     = arr[i][0],
                content = arr[i][1];

            // fileid
            if (val == 'id') {
                setFile(content);
            }
            // dir
            else if (val == 'dir') {
                setDir(content);
            }
            // file
            else if (val == 'file') {
                newArr.push(content);
                j += 1;
            } else {
                console.log(val + ' is not supported?');
                j += 1;
            }

            if (j == arr.length) callback();
        }
    },

    // wrapper (similar to komponist.add)
    add: function (dir, pos, callback) {
        // FUTURE SELF: DO NOT USE LISTALLINFO, IT WILL HAVE THE "OFF BY ONE"
        // BUG, KEEP THIS 'getAllInfo'.
        // Option 1: Loop through all directories recursively running lsinfo
        // Option 2: Run listall, then loop through each item to get metadata
        // Option 1 sends less requests to the server, so we'll implement that.
        // Add All and Multiselect directories is still based on how fast the
        // server can respond per directory (so it can look random)
        getAllInfo(dir, function (files) {
            //console.log(files);
            mpcp.pb.addSong(files, pos, callback);
        });
    },

    // remove song from the pb
    removeSong: function (element) {
        // multiselect check (any left clicks)
        if (this.selected.length) {
            $(this.selected).each(function (item, tr) {
                //console.log(tr);
                $(tr).remove();
            });

            // clear this.selected just in case.
            clearSelected(this);
        } else {
            $(element).remove();
        }

        this.move();
    },

    // just updates the numbers column in the table
    move: function () {
        var pos = 0;
        $(this.tbody + ' .gen').each(function () {
            $(this).children().first().html(++pos + '.');
        });

        if (!pos) this.showNothingMessage();
    },

    // open the playlist to the pb
    open: function (file, callback) {
        komponist.listplaylistinfo(file, function (err, val) {
            if (err) {
                console.log(err);
                if (callback) callback();
                return;
            }

            mpcp.pb.clear();
            mpcp.pb.addSong(val, null, callback);
        });
    },

    // clear the pb
    clear: function () {
        $(this.table + ' .gen').remove();
        this.showNothingMessage();
    },

    // close the pb (and clear)
    close: function () {
        this.current = null;
        $(this.selector).hide();
        this.clear();
    },

    // minimize the pb (dont clear)
    minimize: function () {
        this.current = null;
        this.minimized = true;
        $(this.selector).hide();
        $('#pb-tab').show();
    },

    // resume after minimize
    resume: function () {
        this.minimized = false;
        this.current = 'local';
        $('#pb-tab').hide();
        $(this.selector).css('display', 'flex');
    },

    // scramble the pb
    scramble: function (callback) {
        $(this.tbody).randomize('.gen');
        this.move();
        if (callback) callback();
    },

    // remove duplicate songs in the pb
    removeDuplicates: function (callback) {
        console.log('remove duplicates');
        var duplicate = {};

        $(this.table + ' .gen').each(function () {
            var title = $(this).attr('title');

            if (duplicate[title])
                mpcp.pb.removeSong(this);
            else
                duplicate[title] = true;
        });

        if (callback) callback();
    },

    // move rows to top of pb
    moveToTop: function (tr) {
        if (this.selected.length) {
            $(this.selected).each(function (item, tr) {
                $(tr).prependTo(mpcp.pb.tbody);
            });

            clearSelected(this);
        } else {
            $(tr).prependTo(this.tbody);
        }

        $('#pb-main').scrollTop($(this.table));
        this.move();
    },

    // move rows to bottom of pb
    moveToBottom: function (tr) {
        if (this.selected.length) {
            $(this.selected).each(function (item, tr) {
                $(tr).appendTo(this.tbody);
            });

            clearSelected(this);
        } else {
            $(tr).appendTo(this.tbody);
        }

        $('#pb-main').scrollTop($(this.table)[0].scrollHeight);
        this.move();
    },

    showNothingMessage: function () {
        var html = '<tr class="rem gen"><td><em class="text-muted">The playlist buffer is empty! Songs can be added from the browser or by opening a playlist.</em></td></tr>';
        $(this.tbody).append(html);
        sortHelper.reloadSortable(this);
    },

    removeNothingMessage: function () {
        $(this.tbody + ' .rem').remove();
    },

    initEvents: function () {
        $(document).on('click', '.pb-song-remove', function () {
            var file = $(this).parent().parent();
            mpcp.pb.removeSong(file);
        });

        $(document).on('click', '#pb-clear', function () { mpcp.pb.clear(); });

        $(document).on('click', '#pb-close', function () { mpcp.pb.close(); });

        $(document).on('click', '#pb-save', function () {
            mpcp.stored.externalSave();
        });

        $(document).on('click', '#pb-minimize', function () {
            mpcp.pb.minimize();
        });

        $(document).on('click', '#pb-tab', function () { mpcp.pb.resume(); });

        $(document).on('click', '#pb-open', function () {
            mpcp.stored.updatePlaylists('#playlist-open-modal', mpcp.pb.open);
        });

        $(document).on('click', '#pb-scramble', function () {
            mpcp.pb.scramble();
        });

        $(document).on('click', '#pb-remove-duplicates', function () {
            mpcp.pb.removeDuplicates();
        });

        multiSelect(this, ['pb-song-remove']);

        $('#pb-search-toggle').click(function () {
            if ($('#pb-search-toggle').hasClass('active')) {
                $('#pb-search-toggle').removeClass('active');
                $('#pb-search').hide();
                $('#search-pb').val('');
                $(mpcp.pb.tbody).children().show();
            } else {
                $('#pb-search-toggle').addClass('active');
                $('#pb-search').show();
                $('#search-pb').focus();
            }
        });

        lazySearch('#search-pb', this.table, 'title', '#search-pb-clear');

        this.initSortable();
    }
};

// vote to skip (most of it is server side)
var vote = {
    // gets from socket connection
    received: false,
    enabled: false,
    needed: 1,

    // send a message to the client (using setTitle as the message)
    message: function (current, id) {
        lazyToast.info(vote.setTitles(current, id), 'Song Skip');
    },

    // create a title for the next and previous buttons
    setTitles: function (current, id) {
        var msg = 'Skip to ' + id + ' song: ' + current + ' / ' + vote.needed +
            ' from ' + users.total + ' clients.';
        $('#' + id).attr('title', msg);
        return msg;
    }
};

// may utilize in the future for logging users who has voted and for
// sharing pb's with other users
var users = {
    //ip:hostname
    hostnames: {},
    // total number of users
    total: 1,

    // populate user list
    populate: function (hostnames) {
        this.hostnames = hostnames;
        var html = '';
        $('#user-list .gen').remove();

        for (var ip in hostnames) {
            html += '<li class="gen"><a class="no-hover">' + hostnames[ip] +
                '</a></li>';
        }

        $('#user-list').append(html);
    },

    // returns the hostname (or ip)
    get: function (ip) {
       if (this.hostnames[ip] === undefined) return ip;

       return this.hostnames[ip];
    }
};

// notification history
mpcp.history = {
    // max items in history
    max: 20,
    // type: bootstrap color type
    add: function (title, type) {
        if (!type)
            type = '';
        else
            type = 'bg-' + type;

        var html = '<tr class="' + type + '"><td>' + getTime() + '</td><td>' + title + '</td><td><span class="history-remove faded text-danger glyphicon glyphicon-remove" title="Remove item from history"></span></td></tr>';
        $('#history').prepend(html);

        if ($('#history').children().length > this.max)
            $('#history tr:last-child').remove();
    },

    initEvents: function () {
        $(document).on('click', '.history-remove', function () {
            $(this).parent().parent().remove();
        });
    }
};

// page support for browser, playlist, etc
mpcp.pages = {
    // enable page support
    enabledPlaylist: true,
    enabledBrowser: false,
    // maximum items per page (playlist or browser)
    maxPlaylist: 200,
    maxBrowser: 200,
    // total pages
    totalPlaylist: 1,
    totalBrowser: 1,
    // current page
    currentPlaylist: 1,
    currentBrowser: 1,

    // updates the max pages
    update: function (type) {
        console.log('pages update for ' + type);

        if (type == 'playlist') {
            this.totalPlaylist =
                Math.ceil(mpcp.playlist.local.length / this.maxPlaylist);

            // just in case
            if (this.totalPlaylist <= 0) this.totalPlaylist = 1;

            $('#playlist-pages .total-pages').html(this.totalPlaylist);
            $('#playlist-pages input').prop('max', this.totalPlaylist);

            // checks while user updating maximum item values
            if($('#playlist-pages input').val() > this.totalPlaylist) {
                console.log('changing to max page');
                $('#playlist-pages input').val(this.totalPlaylist);
                this.go('playlist', this.totalPlaylist);
            }
        } else if (type == 'browser') {
            this.totalBrowser = Math.ceil((mpcp.browser.localFolders.length +
                    mpcp.browser.localFiles.length) / this.maxBrowser);

            // just in case
            if (this.totalBrowser <= 0) this.totalBrowser = 1;

            $('#browser-pages .total-pages').html(this.totalBrowser);
            $('#browser-pages input').prop('max', this.totalBrowser);

            // checks while user updating maximum item values
            if($('#browser-pages input').val() > this.totalBrowser) {
                console.log('changing to max page');
                $('#browser-pages input').val(this.totalBrowser);
                this.go('browser', this.totalBrowser);
            }
        }
    },

    // type: browser or playlist, page: the page to go
    go: function (type, page) {
        page = Math.floor(page);
        console.log('go to page ' + page + ' on ' + type);

        if (type == 'playlist' && this.enabledPlaylist) {
            if (page < 1 || page > this.totalPlaylist) return;

            this.currentPlaylist = parseInt(page);
            $('#playlist-pages input').val(this.currentPlaylist);
            mpcp.playlist.updateLocal();
            $('#pslwrap').scrollTop($(mpcp.playlist.table));
        } else if (type == 'browser' && this.enabledBrowser) {
            if (page < 1 || page > this.totalBrowser) return;

            this.currentBrowser = parseInt(page);
            $('#browser-pages input').val(this.currentBrowser);
            mpcp.browser.updateLocal();
            $('#slwrap').scrollTop($(mpcp.browser.table));
        }
    },

    // show page footer
    show: function (type) {
        console.log('show pages: ' + type);

        if (type == 'playlist')
            $('#playlist-pages').show();
        else if (type == 'browser')
            $('#browser-pages').show();
        else
            $('.pages').show();
    },

    // hide page footer
    hide: function (type) {
        console.log('hide pages: ' + type);

        if (type == 'playlist')
            $('#playlist-pages').hide();
        else if (type == 'browser')
            $('#browser-pages').hide();
        else
            $('.pages').hide();
    },

    initEvents: function () {
        // playlist pages event handling
        $('#playlist-pages input').change(function () {
            mpcp.pages.go('playlist', this.value);
        });

        $('#playlist-pages .first').click(function () {
            mpcp.pages.go('playlist', 1);
        });

        $('#playlist-pages .previous').click(function () {
            mpcp.pages.go('playlist', mpcp.pages.currentPlaylist - 1);
        });

        $('#playlist-pages .next').click(function () {
            mpcp.pages.go('playlist', mpcp.pages.currentPlaylist + 1);
        });

        $('#playlist-pages .last').click(function () {
            mpcp.pages.go('playlist', mpcp.pages.totalPlaylist);
        });

        // browser pages event handling
        $('#browser-pages input').change(function () {
            mpcp.pages.go('browser', this.value);
        });

        $('#browser-pages .first').click(function () {
            mpcp.pages.go('browser', 1);
        });

        $('#browser-pages .previous').click(function () {
            mpcp.pages.go('browser', mpcp.pages.currentBrowser - 1);
        });

        $('#browser-pages .next').click(function () {
            mpcp.pages.go('browser', mpcp.pages.currentBrowser + 1);
        });

        $('#browser-pages .last').click(function () {
            mpcp.pages.go('browser', mpcp.pages.totalBrowser);
        });
    }
};

// saved user settings
// since all storage is text, the if statements check if their undefined.
mpcp.settings = {
    // default theme to use
    theme: 'default-thin',
    // show pulsing effect
    pulse: true,
    // 'unknown' text
    unknown: 'unknown',
    // which browser to use (library or browser)
    browser: 'browser',
    // used for unknown pop states
    lastBrowser: 'browser',
    // show consume warning
    consumeWarning: true,

    // initially load all the settings
    loadAll: function () {
        this.loadTheme();
        this.loadHistoryMax();
        this.loadItemsMax();
        this.loadPagination();
        this.loadShowAllErrors();
        this.loadPulse();
        this.loadUnknown();
        this.loadSkipToRemove();
        this.loadBrowser();
        this.loadConsumeWarning();
    },

    loadTheme: function () {
        var theme = localStorage.getItem('mpcp-theme');

        if (theme) this.theme = theme;

        $('#themes').val(this.theme);

        $('#theme').load(function () {
            console.log('theme loaded');
            // reflow header on theme change
            reflowAll();
        }).attr('href', '/css/themes/' + this.theme + '/main.css');
    },

    saveTheme: function (theme) {
        console.log('changed theme');
        localStorage.setItem('mpcp-theme', theme);
        this.loadTheme();
    },

    loadHistoryMax: function () {
        var max = localStorage.getItem('mpcp-history-max');

        if (max) mpcp.history.max = max;

        $('#history-max').val(mpcp.history.max);
    },

    saveHistoryMax: function (max) {
        console.log('changed max history items');
        localStorage.setItem('mpcp-history-max', max);
        this.loadHistoryMax();
    },

    loadItemsMax: function (type, force) {
        var max;

        if (type == 'playlist' || type === undefined) {
            max = localStorage.getItem('mpcp-items-max-playlist');

            if (max) mpcp.pages.maxPlaylist = parseInt(max);

            $('#items-max-playlist').val(mpcp.pages.maxPlaylist);
        }

        if (type == 'browser' || type === undefined) {
            max = localStorage.getItem('mpcp-items-max-browser');

            if (max) mpcp.pages.maxBrowser = parseInt(max);

            $('#items-max-browser').val(mpcp.pages.maxBrowser);
        }

        if (type !== undefined) mpcp.pages.update(type);

        if (force && type == 'playlist') mpcp.playlist.updateLocal();
        if (force && type == 'browser') mpcp.browser.updateLocal();
    },

    saveItemsMax: function (type, max) {
        console.log('changed max items for ' + type);

        if (type == 'playlist')
            localStorage.setItem('mpcp-items-max-playlist', max);
        else if (type == 'browser')
            localStorage.setItem('mpcp-items-max-browser', max);

        this.loadItemsMax(type, true);
    },

    loadPagination: function (type, force) {
        var use;

        if (type == 'playlist' || type === undefined) {
            use = localStorage.getItem('mpcp-use-pages-playlist');

            if (use) mpcp.pages.enabledPlaylist = (use === 'true');

            $('#use-pages-playlist').prop(
                'checked', mpcp.pages.enabledPlaylist);

            if (mpcp.pages.enabledPlaylist)
                mpcp.pages.show('playlist');
            else
                mpcp.pages.hide('playlist');
        }

        if (type == 'browser' || type === undefined) {
            use = localStorage.getItem('mpcp-use-pages-browser');

            if (use) mpcp.pages.enabledBrowser = (use === 'true');

            $('#use-pages-browser').prop('checked', mpcp.pages.enabledBrowser);

            if (mpcp.pages.enabledBrowser)
                mpcp.pages.show('browser');
            else
                mpcp.pages.hide('browser');
        }

        if (force && type == 'playlist') mpcp.playlist.updateLocal();
        if (force && type == 'browser') mpcp.browser.updateLocal();
    },

    savePagination: function (type, use) {
        console.log('changed use pagination for ' + type);

        if (type == 'playlist')
            localStorage.setItem('mpcp-use-pages-playlist', use);
        else if (type == 'browser')
            localStorage.setItem('mpcp-use-pages-browser', use);

        this.loadPagination(type, true);
    },

    loadShowAllErrors: function () {
        var use = localStorage.getItem('mpcp-show-all-errors'),
            show = false;

        if (use && use === 'true') show = true;

        $('#show-all-errors').prop('checked', show);
    },

    saveShowAllErrors: function (use) {
        console.log('changed show all errors');
        localStorage.setItem('mpcp-show-all-errors', use);
    },

    loadPulse: function () {
        var use = localStorage.getItem('mpcp-use-pulse');

        if (use && use === 'false') this.pulse = false;

        $('#use-pulse').prop('checked', this.pulse);
    },

    savePulse: function (use) {
        console.log('changed pulse');
        this.pulse = use;

        if (mpcp.pb.current) {
            if (use)
                $(mpcp.pb.tbody).children().addClass('pulse');
            else
                $(mpcp.pb.tbody).children().removeClass('pulse');
        }

        localStorage.setItem('mpcp-use-pulse', use);
    },

    loadUnknown: function () {
        var use = localStorage.getItem('mpcp-use-unknown');

        if (use !== undefined && use === '') {
            this.unknown = '';
            $('#use-unknown').prop('checked', false);
        } else {
            this.unknown = 'unknown';
            $('#use-unknown').prop('checked', true);
        }
    },

    saveUnknown: function (use) {
        console.log('changed unknown');

        if (use) {
            localStorage.setItem('mpcp-use-unknown', 'unknown');
            this.loadUnknown();
        } else {
            localStorage.setItem('mpcp-use-unknown', '');
            this.loadUnknown();
        }

        mpcp.browser.update();
    },

    loadSkipToRemove: function () {
        var use = localStorage.getItem('mpcp-use-skip-to-remove');

        if (use && use == 'true') {
            mpcp.playlist.skipToRemove = true;
        } else {
            mpcp.playlist.skipToRemove = false;
        }

        $('#use-skip-to-remove').prop('checked', mpcp.playlist.skipToRemove);
    },

    saveSkipToRemove: function (use) {
        console.log('changed skip-to-remove');
        localStorage.setItem('mpcp-use-skip-to-remove', use);
        this.loadSkipToRemove();
    },

    loadBrowser: function (activate) {
        var use = localStorage.getItem('mpcp-browser');

        if (use) this.browser = use;

        if (activate) {
            if (use && use == 'library') {
                mpcp.library.show();
                mpcp.browser.hide();
            } else {
                mpcp.library.hide();
                mpcp.browser.show();
            }
        } else {
            this.lastBrowser = this.browser;
            mpcp.library.hide();
            mpcp.browser.hide();
        }
    },

    saveBrowser: function (use) {
        console.log('changed browser');
        this.lastBrowser = this.browser;
        localStorage.setItem('mpcp-browser', use);
        this.loadBrowser(true);
    },

    loadConsumeWarning: function () {
        var use = localStorage.getItem('mpcp-use-consume-warning');

        if (use && use === 'false') this.consumeWarning = false;

        $('#use-consume-warning').prop(
            'checked', this.consumeWarning);
    },

    saveConsumeWarning: function (use) {
        console.log('changed consume warning');
        this.consumeWarning = use;

        if (use && $('#consume').is(':checked'))
            $('#warning-consume').css('display', 'block');
        else
            $('#warning-consume').css('display', 'none');

        localStorage.setItem('mpcp-use-consume-warning', use);
    },

    initEvents: function () {
        // settings event handling
        // client config
        $('#themes').change(function () {
            mpcp.settings.saveTheme(this.value);
        });

        $('#history-max').change(function () {
            mpcp.settings.saveHistoryMax(this.value);
        });

        $('#items-max-playlist').change(function () {
            mpcp.settings.saveItemsMax('playlist', this.value);
        });

        $('#items-max-browser').change(function () {
            mpcp.settings.saveItemsMax('browser', this.value);
        });

        $('#use-pages-playlist').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.savePagination('playlist', use);
        });

        $('#use-pages-browser').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.savePagination('browser', use);
        });

        $('#use-pulse').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.savePulse(use);
        });

        $('#use-unknown').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.saveUnknown(use);
        });

        $('#use-skip-to-remove').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.saveSkipToRemove(use);
        });

        $('#show-all-errors').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.saveShowAllErrors(use);
        });

        // server config
        $('#crossfade').on('input change', function () {
            komponist.crossfade(this.value, function (err) {
                if (err) console.log(err);
            });
        });

        $('#consume').change(function () {
            var use = $(this).prop('checked');
            use = use ? 1 : 0;

            komponist.consume(use, function (err) {
                if (err) console.log(err);
            });
        });

        $('#use-consume-warning').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.saveConsumeWarning(use);
        });
    }
};

// the video (audio) player
mpcp.video = {
    // current tile on player.
    title: '',

    // download the video
    download: function (url) {
        if (url !== '') socket.send(JSON.stringify(
                {'type': 'download-video', 'info': url}), function (err) {
            if (err) console.log(err);
        });
    },

    // grab url from player element
    downloadFromPlayer: function () {
        var url = $('#download-player-url').val();
        this.download(url);
    },

    // play the Player (after download)
    play: function () {
        // if there is no title, and the user clicks play, just download
        // the video.
        if (this.title === '') {
            this.downloadFromPlayer();
        } else {
            socket.send(JSON.stringify(
                    {'type': 'download-video-play'}), function (err) {
                if (err) console.log(err);
            });
        }
    },

    // pause or play the Player
    pause: function () {
        socket.send(JSON.stringify(
                {'type': 'download-video-pause'}), function (err) {
            if (err) console.log(err);
        });
    },

    // stop the Player
    stop: function () {
        socket.send(JSON.stringify(
                {'type': 'download-video-stop'}), function (err) {
            if (err) console.log(err);
        });
    },

    setVolume: function (volume) {
        socket.send(JSON.stringify({
                'type': 'download-video-volume', 'info': volume
                }), function (err) {
            if (err) console.log(err);
        });
    },

    setTitle: function (title) {
        this.title = title;
        $('#download-player-title').html(title);
    },

    setStatus: function (str) {
        $('#download-player-status').html(str);

        if (~str.indexOf('Play')) {
            $('#download-player-btn')
                .removeClass('btn-default')
                .addClass('btn-success')
                .removeClass('btn-warning');
            $('#download-player-pause').removeClass('active');
        } else if (~str.indexOf('Paus')) {
            $('#download-player-btn')
                .removeClass('btn-default')
                .removeClass('btn-success')
                .addClass('btn-warning');
            $('#download-player-pause').addClass('active');
        } else if (~str.indexOf('Stop')) {
            $('#download-player-btn')
                .addClass('btn-default')
                .removeClass('btn-success')
                .removeClass('btn-warning');
            $('#download-player-pause').removeClass('active');
        } else if (~str.indexOf('Download')) {
            $('#download-player-btn')
                .removeClass('btn-default')
                .removeClass('btn-success')
                .addClass('btn-warning');
            $('#download-player-pause').removeClass('active');
        }
    },

    initEvents: function () {
        $('#download-player-search').click(function () {
            mpcp.video.downloadFromPlayer();
        });

        $('#download-player-play').click(function () {
            mpcp.video.play();
        });

        $('#download-player-pause').click(function () {
            mpcp.video.pause();
        });

        $('#download-player-stop').click(function () {
            mpcp.video.stop();
        });

        // 'input change' allows arrow keys to work
        $('#download-player-volume').on('input change', function () {
            mpcp.video.setVolume(this.value);
        });

        // detect enter key
        $('#download-player-url').keyup(function (e) {
            if (e.keyCode == 13) {
                var url = $('#download-player-url').val();
                mpcp.video.download(url);
            }
        });
    }
};

// called in socket init
function initAfterConnection() {
    console.log('initAfterConnection');
    //mpcp.player.updateAll(); // inside of mpcp.playlist.updateTitle
    mpcp.player.updateMixer();
    //mpcp.playlist.updateAll(); // inside of mpcp.playlist.updateTitle
    //mpcp.browser.update(); // done lower in the function
    updateStats();

    var path = window.location.pathname.
        slice(1, window.location.pathname.length).
        replace(/%20/g, ' '),
        action = path.slice(0, path.indexOf('/')),
        request = path.slice(path.indexOf('/') + 1, path.length);

    //console.log(path);
    //console.log(action);
    //console.log(request);

    // check action
    if (action == 'search') {
        mpcp.browser.show();
        request = decodeURIComponent(request);
        mpcp.browser.search(request);
        $('#search-browser').val(request);
    } else if (action == 'library') {
        mpcp.library.decodeRequest(request);
    } else if (action == 'browser') {
        mpcp.browser.show();
        mpcp.browser.current  = request;
        mpcp.browser.previous = request;
        mpcp.browser.update();
    } else {
        // else check settings
        if (mpcp.settings.browser == 'library') {
            mpcp.library.show();
            mpcp.libraryArtists.update();
        } else {
            mpcp.browser.show();
            mpcp.browser.update();
        }
    }

    mpcp.browser.initEvents();

    // sometimes the socket doesn't send the vote updates,
    // this is used for that
    setTimeout(function () {
        if (!vote.received) {
            console.log('server didnt send votes, asking for votes');
            socket.send(JSON.stringify(
                    {'type': 'get-votes'}), function (err) {
                if (err) console.log(err);
            });
        }
    }, 200);
}

komponist.on('changed', function (system) {
    console.log('changed: ' + system);

    switch (system) {
        case 'player':
            mpcp.player.updateAll();
            break;

        case 'playlist':
            mpcp.playlist.updateAll();
            break;

        case 'mixer':
            mpcp.player.updateMixer();
            break;

        case 'options':
            mpcp.player.updateControls();
            break;

        case 'update':
            mpcp.browser.update();
            updateStats();
            break;

        case 'stored_playlist':
            mpcp.stored.updatePlaylists('#playlist-open-modal');
            mpcp.stored.updatePlaylists('#playlist-save-modal');
            break;
    }
});

// misc events
$(document).on('click', '.stop-click-event', function (event) {
    // stop bootstrap from closing the dropdown
    event.stopPropagation();
});

$(document).on('click', '.stop-server', function () {
    console.log('you stopped the server');
    socket.send(JSON.stringify({'type': 'stop-server'}), function (err) {
        if (err) console.log(err);
    });
});

$(document).on('click', '.playlist-reload', function () {
    socket.send(JSON.stringify({
            'type': 'playlist-reload', 'info': mpcp.playlist.current
            }), function (err) {
        if (err) console.log(err);
    });
});

// Web socket configuration
socket.onmessage = function (event) {
    if (!event.data) return;

    //console.log(event.data);

    var msg = JSON.parse(event.data);

    switch(msg.type) {
        case 'current-info':
            vote.received = true;
            users.total   = msg['total-clients'];
            vote.needed   = msg['song-skip-total'];
            vote.setTitles( msg['song-skip-previous'], 'previous');
            vote.setTitles( msg['song-skip-next'],     'next');
            break;

        case 'init':
            mpcp.playlist.updateTitle(msg['playlist-title']);
            vote .enabled =      msg['song-vote'];
            mpcp.video.setVolume(msg['player-volume']);
            mpcp.video.setStatus(msg['player-status']);
            mpcp.video.setTitle (msg['player-title']);
            initAfterConnection();
            break;

        // playlist
        // when song is playing, the playlist doesn't get updated,
        // this is used to force the update
        case 'clear-playlist':
            console.log('user clear-playlist called');
            mpcp.playlist.updateTitle('');
            //mpcp.player.updateAll(); // inside mpcp.playlist.updateAll
            mpcp.playlist.updateAll();
            break;

        case 'update-playlist':
            console.log('user update-playlist called');
            mpcp.playlist.updateAll();
            break;

        case 'update-browser':
            console.log('user update-browser called');
            mpcp.browser.doUpdate = true;
            mpcp.browser.update();
            updateStats();
            break;

        case 'playlist-title':
            mpcp.playlist.updateTitle(msg.info);
            break;

        // player
        case 'song-next':
            msg.info += ' skipped to the next song.';
            mpcp.history.add(msg.info, 'info');

            // don't show notification if only 1 person is using the client
            if (users.total <= 1) return;

            lazyToast.info(msg.info, 'Song Skipped', 10000);
            break;

        case 'song-previous':
            msg.info += ' skipped to the previous song.';
            mpcp.history.add(msg.info, 'info');

            // don't show notification if only 1 person is using the client
            if (users.total <= 1) return;

            lazyToast.info(msg.info, 'Song Skipped', 10000);
            break;

        // stored
        case 'playlist-reload':
            mpcp.stored.open(msg.info);
            break;

        // vote
        case 'song-vote-next':
            console.log('received skip');
            vote.message(msg.info, 'next');
            break;

        case 'song-vote-previous':
            console.log('received skip');
            vote.message(msg.info, 'previous');
            break;

        case 'request-vote-update-from-server':
            // assums a vote reset
            $('#next').removeClass('active');
            $('#previous').removeClass('active');
            break;

        case 'skipped':
            console.log('skip successful received');
            $('#next').removeClass('active');
            $('#previous').removeClass('active');
            var str = '';

            for (var i in msg.info) {
                str += users.get(msg.info[i]) + ', ';
            }

            if (users.total > 1) {
                str += 'skipped: ' + mpcp.player.title + '.';
                lazyToast.info(str, 'Song Skip');
                mpcp.history.add(str, 'info');
            } else
                mpcp.history.add('Skipped: ' + mpcp.player.title, 'info');

            vote.setTitles(0, 'previous');
            vote.setTitles(0, 'next');
            break;

        case 'user-skip-next':
            $('#next').addClass('active');
            break;

        case 'user-skip-previous':
            $('#previous').addClass('active');
            break;

        case 'hostnames':
            console.log('received hostnames update');
            users.populate(msg.info);
            break;

        // video
        case 'download-video':
            mpcp.video.setStatus('Downloading and converting video...');
            break;

        case 'download-video-title':
            console.log('received download player title: ' + msg.info);
            mpcp.video.setTitle(msg.info);
            break;

        case 'download-video-play':
            mpcp.video.setStatus('Playing...');
            break;

        case 'download-video-pause':
            //console.log(msg.info);
            if (msg.info) {
                mpcp.video.setStatus('Paused...');
            } else {
                mpcp.video.setStatus('Playing...');
            }
            break;

        case 'download-video-stop':
            mpcp.video.setStatus('Stopping...');
            break;

        case 'download-video-volume':
            $('#download-player-volume').val(msg.info);
            break;

        case 'download-video-status':
            if (~msg.info.indexOf('Error')) {
                // downloading errror
                $('#download-player-btn')
                    .addClass('btn-default')
                    .removeClass('btn-warning');
                $('#download-player-pause').removeClass('active');
            }
            $('#download-player-status').html(msg.info);
            break;
    }
};

socket.onclose = function (event) {
    mpcp.disconnect.callSocketClose();
};

// server disconnect handling
mpcp.disconnect = {
    secInterval: null,
    retryTimeout: null,

    callSocketClose: function () {
        clearInterval(this.secInterval);
        clearTimeout(this.retryTimeout);

        console.log('WebSocket disconnected');
        // timeout to not show if refreshing the page
        setTimeout(function () {
            var msg = 'The page will refresh when it comes back online.';
            lazyToast.error(msg + '<br>Retrying in <span id="count">1</span> second(s)... <button title="Force a retry" class="retry-server btn btn-warning pull-right"><span class="glyphicon glyphicon-repeat"></span></button>', 'Server Disconnected!', 5000, false);
        }, 200);
        this.retryWebSocket(1);
    },

    retryWebSocket: function (attempts) {
        socket = new WebSocket('ws://' + host);

        socket.onclose = function () {
            var seconds = attempts;
            $('#count').html(seconds--);

            mpcp.disconnect.secInterval = setInterval(function () {
                $('#count').html(seconds--);
            }, 1000);

            mpcp.disconnect.retryTimeout = setTimeout(function () {
                clearInterval(mpcp.disconnect.secInterval);
                console.log('WebSocket closed, retrying... ' + attempts);
                // Connection has closed so try to reconnect every few seconds
                // max is 5 seconds
                if (attempts < 5) ++attempts;
                mpcp.disconnect.retryWebSocket(attempts);
            }, attempts * 1000);
        };

        socket.onopen = function (event) {
            // refresh browser on restart, maybe there is a better way
            // (komponist needs to reconnect to its socket as well)
            console.log('WebSocket connected');
            window.location.reload();
        };
    },

    initEvents: function () {
        $(document).on('click', '.retry-server', function () {
            mpcp.disconnect.callSocketClose();
        });
    }
};

var lazyToast = {
    info: function (msg, title, timeout, addHistory) {
        if (!title) title = 'Info';
        if (!timeout) timeout = 5000;

        if (addHistory) mpcp.history.add(msg, 'info');

        toastr.info(msg, title, {
            'closeButton': true,
            'positionClass': 'toast-bottom-left',
            'preventDuplicates': true,
            'timeOut': timeout
        });
    },

    error: function (msg, title, timeout, addHistory) {
        if (!title) title = 'Error';

        if (addHistory) mpcp.history.add(msg, 'danger');

        toastr.error(msg, title, {
            'closeButton': true,
            'positionClass': 'toast-bottom-left',
            'preventDuplicates': true,
            'timeOut': '-1',
            'extendedTimeOut': '-1'
        });
    },

    warning: function (msg, title, timeout, addHistory) {
        if (!title) title = 'Warning';
        if (!timeout) timeout = 5000;

        if (addHistory) mpcp.history.add(msg, 'warning');

        toastr.warning(msg, title, {
            'closeButton': true,
            'positionClass': 'toast-bottom-left',
            'preventDuplicates': false,
            'timeOut': timeout
        });
    }
};

// since there is not a clean way to handle multiple connected tables,
// we will use these helpers to detect which tables are which and
// provide other functions to mitigate the issue.
// Basically, every drag operation is cloned. And the dragee will
// check where the drag came from. The dragee will tell the sortHelper
// what to do with the duplicated objects.
var sortHelper = {
    // clone everything we copy, so we can remove the dud if the
    // user drags to the wrong table
    cloned: null,
    clone: function (e, obj) {
        sortHelper.cloned = $(e.detail.item).clone();
        obj.clone = $(sortHelper.cloned).insertAfter(e.detail.item);
        sortHelper.reloadSortable(obj);
    },

    removeClone: function (e, obj) {
        $(sortHelper.cloned).remove();
    },

    // remove the dud (since the clone replaced it)
    removeItem: function (e) {
        $(e.detail.item).remove();
    },

    // return true if not correct obj (not itself)
    check: function (e, obj) {
        var trTable = '#' + $(e.detail.item).parent().parent().attr('id') +
            ' .append';
        var table = obj.tbody;

        if (~trTable.indexOf('undefined')) return true;
        if (e.isTrusted) return true;

        //console.log(trTable);
        //console.log(table);
        //console.log(e);
        //console.log(obj);

        // this took me way too long to get this combination correct...
        if (trTable != table) {
            //console.log('NOT TABLE: ' + table + ' vs ' + trTable);
            return true;
        }

        return false;
    },

    reloadSortable: function (obj) {
        console.log('reloading: ' + obj.tbody);
        sortable(obj.tbody);
    }
};

// gracefully close the socket
$(window).on('beforeunload', function () {
    socket.close();
});

// handle back and forwards
window.onpopstate = function (event) {
    var url    = decodeURIComponent(document.location.pathname),
        option = url.substr(1, nthOccurrence(url, '/', 2) - 1),
        folder;

    console.log('poppedState: ' + option);
    if (option == 'browser') {
        folder = url.replace('/browser/', '');
        mpcp.library.hide();
        mpcp.browser.show();
        if (folder === '') folder = '/';
        mpcp.browser.update(folder, true);
    } else if (option == 'search') {
        var search = url.replace('/search/', '');
        mpcp.browser.search(search, true);
    } else if (option == 'library') {
        var request = document.location.pathname.replace('/library/', '');
        mpcp.library.decodeRequest(request);
    } else {
        // unknown, use mpcp.settings.browser
        if (mpcp.settings.lastBrowser == 'library') {
            mpcp.browser.hide();
            mpcp.library.show();
            mpcp.library.decodeRequest();
        } else {
            mpcp.library.hide();
            mpcp.browser.show();
            mpcp.browser.update('/', true);
        }
    }
};

// table sorting
function tableSort(table, thead, index, format) {
    var sortOrder = 'asc';
    $(document).on('click', thead, function () {
        if (sortOrder == 'asc') {
            $(table).sortColumn({
                index: index, order: 'desc', format: format
            });
            sortOrder = 'desc';
        } else {
            $(table).sortColumn({
                index: index, order: 'asc', format: format
            });
            sortOrder = 'asc';
        }
    });
}

// thead floating
function floatTable(table, par) {
    $(table).floatThead({
        position: 'fixed',
        scrollContainer: function ($table) {
            return $table.closest(par);
        },
        autoReflow: true
    });
}

// context menu
function contextResponse(key, table, tr) {
    console.log(key);

    switch(key) {
        // playlist
        case 'mttPlaylist':
            mpcp.playlist.moveToTop(tr.data().fileid);
            break;
        case 'mtbPlaylist':
            mpcp.playlist.moveToBottom(tr.data().fileid);
            break;
        case 'mtc':
            mpcp.playlist.moveToCurrent(tr);
            break;
        case 'remPlaylist':
            mpcp.playlist.remove(tr);
            break;
        case 'play':
            mpcp.playlist.play(tr);
            break;
        // pb
        case 'mttPb':
            mpcp.pb.moveToTop(tr);
            break;
        case 'mtbPb':
            mpcp.pb.moveToBottom(tr);
            break;
        case 'remPb':
            mpcp.pb.removeSong(tr);
            break;
        case 'infoBrowser':
            mpcp.browser.getSongInfo(tr.data().fileid);
            break;
        case 'infoPlaylist':
            mpcp.playlist.getSongInfo(tr.data().file);
            break;
    }

    // browser
    // directory
    if ($(tr).hasClass('directory')) {
        var dirid = tr.data().dirid;

        switch(key) {
            case 'attPlaylist':
                if (mpcp.browser.selected.length) {
                    mpcp.browser.addMulti(0);
                } else {
                    mpcp.playlist.addDir(dirid, 0);
                }
                break;
            case 'attPb':
                if (mpcp.browser.selected.length) {
                    mpcp.browser.addMulti(0);
                } else {
                    mpcp.pb.add(dirid, 0);
                }
                break;
            case 'atbPlaylist':
                if (mpcp.browser.selected.length) {
                    mpcp.browser.addMulti();
                } else {
                    mpcp.playlist.addDir(dirid);
                }
                break;
            case 'atbPb':
                if (mpcp.browser.selected.length) {
                    mpcp.browser.addMulti();
                } else {
                    mpcp.pb.add(dirid);
                }
                break;
            case 'atc':
                mpcp.playlist.addToCurrent(dirid, 'dir');
                break;
        }
    }

    // file
    if ($(tr).hasClass('file')) {
        var fileid = tr.data().fileid;

        switch(key) {
            case 'attPlaylist':
            case 'attPb':
                mpcp.browser.addExternal(fileid, 0);
                break;
            case 'atbPlaylist':
            case 'atbPb':
                mpcp.browser.addExternal(fileid);
                break;
            case 'atc':
                mpcp.browser.addExternal(fileid, mpcp.player.current.Pos + 1);
                break;
        }
    }

    // library
    if ($(tr).hasClass('artist') || $(tr).hasClass('album')) {
        var artist = $(tr).data().artist,
            album  = $(tr).data().album;

        switch(key) {
            case 'attPlaylist':
            case 'attPb':
                if ($(tr).hasClass('artist'))
                    mpcp.library.addExternal(
                        mpcp.libraryArtists, artist, album, 0, false);
                else if ($(tr).hasClass('album'))
                    mpcp.library.addExternal(
                        mpcp.libraryAlbums, artist, album, 0, false);
                break;
            case 'atbPlaylist':
            case 'atbPb':
                if ($(tr).hasClass('artist'))
                    mpcp.library.addExternal(
                        mpcp.libraryArtists, artist, album, undefined, false);
                else if ($(tr).hasClass('album'))
                    mpcp.library.addExternal(
                        mpcp.libraryAlbums, artist, album, undefined, false);
                break;
            case 'atc':
                if ($(tr).hasClass('artist') &&
                        mpcp.libraryArtists.selected.length) {
                    mpcp.library.addExternal(mpcp.libraryArtists, artist, album,
                        mpcp.player.current.Pos + 1, false);
                } else if ($(tr).hasClass('album') &&
                        mpcp.libraryAlbums.selected.length) {
                    mpcp.library.addExternal(mpcp.libraryAlbums, artist, album,
                        mpcp.player.current.Pos + 1, false);
                } else {
                    mpcp.library.getSongsFromAlbum(artist, album,
                            function (files) {
                        for (var i = 0; i < files.length; ++i) {
                            mpcp.playlist.addToCurrent(files[i].file, 'file');
                        }
                    });
                }
                break;
        }
    }
}

// enable the custom context menu
$.contextMenu({
    selector: '.context-menu',
    // above pb
    zIndex: 1003,
    build: function ($trigger, e) {
        // check if selected before continuing.
        // If right click is outside selected, clear selection (like in all
        // file managers).
        var inside = false,
            i;

        function checkInside(obj) {
            for (i = 0; i < obj.selected.length; ++i) {
                //console.log(mpcp.playlist.selected[i]);
                if (obj.selected[i].isEqualNode(e.currentTarget)) {
                    console.log('setting inside to true');
                    inside = true;
                    break;
                }
            }
        }

        checkInside(mpcp.playlist);
        checkInside(mpcp.browser);
        checkInside(mpcp.pb);
        checkInside(mpcp.libraryArtists);
        checkInside(mpcp.libraryAlbums);

        // if its not in .selected, update it.
        if (!inside) {
            //console.log('updating .selected');
            clearSelected(mpcp.playlist);
            clearSelected(mpcp.pb);
            clearSelected(mpcp.browser);

            saveSelected(mpcp.libraryArtists);
            clearSelected(mpcp.libraryArtists);
            saveSelected(mpcp.libraryAlbums);
            clearSelected(mpcp.libraryAlbums);
        }

        var table = $trigger.parent().parent(),
            items = {},
            // can't get the title of contextmenu to work, so I'm using a menu
            // item as a title.
            title = $trigger.attr('title');

        if (table.hasClass('song-list'))
            title = $trigger.children('td:nth-child(2)').attr('title');

        //console.log($trigger);
        //console.log(title);

        // only apply when playlist buffer is active and not right clicking
        // the playlist
        if (mpcp.pb.current && table.attr('id') != 'playlist-song-list') {
            // browser
            if (table.hasClass('song-list')) {
                items = {
                    'title': {name: title},
                    'attPb': {name: 'Add to top of playlist buffer'},
                    'atbPb': {name: 'Add to bottom of playlist buffer'}
                };

                if (!$($trigger).hasClass('directory'))
                    items.infoBrowser = {name: 'Song information'};
             // only on pb
             } else if (table.attr('id') == 'pb-song-list') {
                items = {
                    'title':       {name: title},
                    'mttPb':       {name: 'Move to top of playlist buffer'},
                    'mtbPb':       {name: 'Move to bottom of playlist buffer'},
                    'remPb':       {name: 'Remove'},
                    'infoBrowser': {name: 'Song information'}
                };
             } else if (table.hasClass('library-list-context')) {
                items = {
                    'title': {name: title},
                    'attPb': {name: 'Add to top of playlist buffer'},
                    'atbPb': {name: 'Add to bottom of playlist buffer'}
                };
            } else {
                items = {
                    'temp': {name: 'Context menu not implemented yet for pb'}
                };
            }
        }
        // only on playlist
        else if (table.attr('id') == 'playlist-song-list') {
            // song is playing
            if (mpcp.player.current)
                items = {
                    'title':        {name: title},
                    'play':         {name: 'Play song'},
                    'mttPlaylist':  {name: 'Move to top of playlist'},
                    'mtc':          {name: 'Move after current playing song'},
                    'mtbPlaylist':  {name: 'Move to bottom of playlist'},
                    'remPlaylist':  {name: 'Remove'},
                    'infoPlaylist': {name: 'Song information'}
                };
            // song is not playing
            else if (!mpcp.player.current)
                items = {
                    'title':        {name: title},
                    'play':         {name: 'Play song'},
                    'mttPlaylist':  {name: 'Move to top of playlist'},
                    'mtbPlaylist':  {name: 'Move to bottom of playlist'},
                    'remPlaylist':  {name: 'Remove'},
                    'infoPlaylist': {name: 'Song information'}
                };
        }
        // only on browser
        else if (table.hasClass('song-list')) {
            // song is playing
            if (mpcp.player.current)
                items = {
                    'title':       {name: title},
                    'attPlaylist': {name: 'Add to top of playlist'},
                    'atc':         {name: 'Add after current playing song'},
                    'atbPlaylist': {name: 'Add to bottom of playlist'}
                };
            // song is not playing
            else if (!mpcp.player.current)
                items = {
                    'title':       {name: title},
                    'attPlaylist': {name: 'Add to top of playlist'},
                    'atbPlaylist': {name: 'Add to bottom of playlist'}
                };

            if (!$($trigger).hasClass('directory'))
                items.infoBrowser = {name: 'Song information'};
            // only on browser
        } else if (table.hasClass('library-list-context')) {
                // song is playing
                if (mpcp.player.current)
                    items = {
                        'title':       {name: title},
                        'attPlaylist': {name: 'Add to top of playlist'},
                        'atc':         {name: 'Add after current playing song'},
                        'atbPlaylist': {name: 'Add to bottom of playlist'}
                    };
                // song is not playing
                else if (!mpcp.player.current)
                    items = {
                        'title':       {name: title},
                        'attPlaylist': {name: 'Add to top of playlist'},
                        'atbPlaylist': {name: 'Add to bottom of playlist'}
                    };

                if (!$($trigger).hasClass('directory'))
                    items.infoBrowser = {name: 'Song information'};
        } else {
            items = {
                'temp': {name: 'Context menu not implemented yet'}
            };
        }

        return {
            callback: function (key, options) {
                //console.log("clicked: " + key);
                //console.log(options);
                var table = $(options.$trigger).parent().parent();
                contextResponse(key, table, options.$trigger);
            },
            items: items
        };
    },
    events: {
        hide: function (options) {
            if (mpcp.libraryArtists.saved.length) {
                restoreSelected(mpcp.libraryArtists);
            }
            if (mpcp.libraryAlbums.saved.length) {
                restoreSelected(mpcp.libraryAlbums);
            }
        }
    }
});

// disable form submissions because everything runs on a single page
$('form').submit(function (e) {
    e.preventDefault();
    return false;
});

// MultiSelect. Multiselections handled by respective object.
// Events handled in callback and contextMenu.
// table for multislection, obj used for multiselection (must contain selected
// variable. Because it needs to pass by reference to selected.
function multiSelect(obj, cancel, exclude, deselect) {
    var disable = ['tbody'];

    if (exclude) disable = disable.concat(exclude);

    if (deselect === undefined) deselect = true;

    $(obj.table).multiSelect({
        actcls: 'info',
        selector: 'tr.gen',
        except: disable,
        deselect: deselect,
        cancel: cancel,
        callback: function (items, e) {
            if (!items.length) return;
            obj.selected = items;
        }
    });
}

// save the list temporarily
function saveSelected(obj) {
    //console.log('saving list temp: ' + this.selected.length);
    obj.saved = obj.selected;
}

// restore the list
function restoreSelected(obj) {
    //console.log('restore list temp: ' + this.saved.length);
    obj.selected = obj.saved;
    obj.saved = [];
}

function clearSelected(obj) {
    console.log('clearing selected: ' + obj.table);

    $(obj.selected).each(function (item, tr) {
        //console.log(tr);
        $(tr).removeClass('info');
    });

    obj.selected = [];
}

// enables resizable playlist buffer
$('#pb').resizable({
    handles: 'n, w, s, e, nw, ne, sw, se',
    minHeight: 140,
    minWidth: 160
});

// make pb draggable because why not
$('#pb').draggable({
    containment: 'body',
    handle: '#pb-header'
});

$('#pb-tab').draggable({
    axis: 'x',
    containment: 'body'
});

// enables resizable testing
$('#testing').resizable({
    handles: 'n, w, s, e, nw, ne, sw, se',
    minHeight: 140,
    minWidth: 140
});

// make testing draggable because why not
$('#testing').draggable({
    containment: 'body',
    handle: '#testing-header'
});

mpcp.settings.loadAll();

mpcp.progressbar.initEvents();
mpcp.player     .initEvents();
mpcp.playlist   .initEvents();
// gets called in initAfterConnection(). For some reason it was setting the
// current page to /browser/ when sharing a link
//mpcp.browser    .initEvents();
mpcp.settings   .initEvents();
mpcp.pages      .initEvents();
mpcp.pb         .initEvents();
mpcp.history    .initEvents();
mpcp.stored     .initEvents();
mpcp.video      .initEvents();
mpcp.disconnect .initEvents();
mpcp.library    .initEvents();

});

