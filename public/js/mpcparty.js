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

// create the popup window for song information
function parseSongInfo(err, values) {
    if (err || !values || Object.keys(values).length < 1) {
        toastr.warning('This is most likely a bug with MPCParty or the song is not in the live database.', 'Error getting song information.', {
            'closeButton': true,
            'positionClass': 'toast-bottom-left',
            'preventDuplicates': false,
            'timeOut': '10000'
        });
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
// ele: element to add 'selected' class, par: the table, style: the background color
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
    $('#file-browser-song-list.table').trigger('reflow');
    $('#library-artists-list.table').trigger('reflow');
    $('#library-albums-list.table').trigger('reflow');
    $('#library-songs-list.table').trigger('reflow');
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
        if (library.bringBack) {
            browser.hide();
            library.show();
            library.bringBack = false;
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
var player = {
    // current song to highlight the playlist
    current: null,
    // current song title
    title: '',
    // current state of the player
    state: '',

    updateAll: function (callback) {
        // set song title
        komponist.currentsong(function (err, song) {
            if (err) {
                if (callback) callback();
                return console.log(err);
            }

            //console.log(song);

            if ($.isEmptyObject(song)) {
                $('#title-text').html
                    ('<em class="text-muted" title="No song selected">No song selected</em>');
                document.title = 'MPCParty';
                $('#title-pos').html('');
                $('#time-total').html('<span class="text-muted">-- / --</span>');
                player.setCurrent(null);
                if (callback) callback();
                return console.log('No song selected');
            }

            player.title = getSimpleTitle(song.Title, song.Artist, song.file);

            if (player.current && player.current.file != song.file) {
                history.add('Playing: ' + player.title);
            }

            player.setCurrent(song);

            $('#title-text').html(player.title).attr('title', player.title);
            document.title =  player.title + ' - MPCParty';
            $('#title-pos').html((parseInt(song.Pos) + 1) + '. ');
            $('#music-time').attr('max', song.Time);
            $('#time-total').html(' / ' + toMMSS(song.Time));

            // highlight song in playlist with song.Id and data-fileid
            // this happens with only a player update
            $('#playlist-song-list .gen').each(function () {
                var id = $(this).data().fileid;
                if (parseInt(id) == player.current.Id) {
                    $(this).addClass('bg-success');
                } else {
                    $(this).removeClass('bg-success');
                }
            });

            if (callback) callback();
        });

        this.updateControls();
    },

    // set player properties
    updateControls: function () {
        komponist.status(function (err, status) {
            //console.log(status);
            if (err) return console.log(err);

            $('#music-time').val(status.elapsed);
            if (player.current !== null && status.state == 'stop') {
                $('#time-current').html('00:00');
            } else if (!status.elapsed) {
                $('#time-current').html('');
            } else {
                $('#time-current').html(toMMSS(status.elapsed));
            }

            progressbar.progress = parseInt(status.elapsed);

            console.log('state: ' + status.state);
            player.state = status.state;

            switch (status.state) {
                case 'stop':
                    $('#stop').hide();
                    $('#pause').hide();
                    $('#play').show();
                    progressbar.stopProgress();
                    break;

                case 'play':
                    $('#stop').show();
                    $('#pause').show();
                    $('#play').hide();
                    $('#pause').removeClass('active');
                    progressbar.startProgress();
                    break;

                case 'pause':
                    $('#play').hide();
                    $('#pause').addClass('active');
                    progressbar.stopProgress();
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
                if (settings.consumeWarning)
                    $('#warning-consume').css('display', 'block');
            }

            $('#crossfade').val(status.xfade);
        });
    },

    // set interface properties
    updateMixer: function () {
        komponist.status(function (err, status) {
            //console.log(status);
            if (err) return console.log(err);

            $('#volume').val(status.volume);

            if (status.error) {
                history.add(status.error, 'danger');
                toastr.error(status.error, 'Error', {
                    'closeButton': true,
                    'positionClass': 'toast-bottom-left',
                    'preventDuplicates': true,
                    'timeOut': '-1',
                    'extendedTimeOut': '-1'
                });
            }
        });
    },

    // set int's so there is less parsing when accessing player.current
    setCurrent: function (song) {
        if (song) {
            song.Id  = parseInt(song.Id);
            song.Pos = parseInt(song.Pos);
        }

        player.current = song;
    },

    initEvents: function () {
        $('#pause').click(function () {
            console.log('toggle');
            komponist.toggle(function (err) {
                if (err) console.log(err);
            });
        });

        $('#play').click(function () {
            console.log('play');
            komponist.play(function (err) {
                if (err) console.log(err);
            });
        });

        $('#stop').click(function () {
            console.log('stop');
            komponist.stop(function (err) {
                if (err) console.log(err);
            });
        });

        $('#next').click(function () {
            if (vote.enabled) {
                if (!$(this).hasClass('active')) {
                    socket.send(JSON.stringify({
                            'type': 'song-vote-next', 'info': 'yes'
                            }), function (err) {
                        if (err) console.log(err);
                    });
                    $(this).addClass('active');
                } else {
                    $(this).removeClass('active');
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
                var current = player.current;
                komponist.next(function (err) {
                    if (err) console.log(err);

                    if (playlist.skipToRemove) {
                        playlist.removeSong(current.Id);
                    }
                });
            }
        });

        $('#previous').click(function () {
            if (vote.enabled) {
                if (!$(this).hasClass('active')) {
                    socket.send(JSON.stringify({
                            'type': 'song-vote-previous', 'info': 'yes'
                            }), function (err) {
                        if (err) console.log(err);
                    });
                    $(this).addClass('active');
                } else {
                    $(this).removeClass('active');
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
                var current = player.current;
                komponist.previous(function (err) {
                    if (err) console.log(err);

                    if (playlist.skipToRemove) {
                        playlist.removeSong(current.Id);
                    }
                });
            }
        });

        $('#go-current').click(function () {
            console.log('go to current');
            playlist.goToCurrent();
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

        createSearch('#search-browser', browser.search, browser.update,
            '#search-clear');
    }
};

// the playlist
var playlist = {
    table: '#playlist-song-list .append',
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

    // used to update the current playlist
    updateAll: function () {
        // do not use 'this'. Can be used in a callback.
        if (!playlist.doUpdate) {
            playlist.doUpdate = true;
            return;
        }

        console.log('updating playlist');

        // reset list
        playlist.list = {files: [], positions: []};

        if (playlist.isSearching) {
            playlist.search();
        } else {
            // we update the player first to update the current song positison
            // which is used for 'movetocurrent', the 'remove last song' bug
            // and other operations
            player.updateAll(function () {
                komponist.playlistinfo(function (err, playlistLoad) {
                    $('#playlist-title strong').html(playlist.current);
                    $('#playlist-title strong').attr('title',
                        playlist.current);

                    if (err) return console.log(err);

                    $('#playlist-song-list .gen').remove();
                    playlist.local = playlistLoad;

                    if ($.isEmptyObject(playlistLoad[0])) {
                        var html = '<tr class="rem gen"><td><em class="text-muted">The playlist is empty! Songs can be added from the browser or by opening a playlist.</em></td></tr>';
                        $('#playlist-song-list').append(html);
                        // fix for removing the last song that's
                        // playling from the playlist
                        playlist.doUpdate = true;
                        player.updateAll();
                        pages.update('playlist');
                        playlist.initDrag();
                        browser.updatePosition();
                        return console.log('Empty playlist');
                    }

                    // TODO figure out a way to use playlist.local efficiently
                    // with browser.updatePlaylist instead of utilizing
                    // playlist.list
                    for (var i = 0; i < playlist.local.length; ++i) {
                        playlist.list.files.push(playlist.local[i].file);
                        playlist.list.positions.push(playlist.local[i].Pos);
                    }

                    // since goToCurrent runs updateLocal, skip the regular
                    // updateLocal
                    if (playlist.goAfterUpdate) {
                        playlist.goAfterUpdate = false;
                        playlist.goToCurrent();
                    } else {
                        playlist.updateLocal();
                    }
                });
            });
        }
    },

    updateLocal: function (callback) {
        if (!playlist.doUpdate) {
            playlist.doUpdate = true;
            return;
        }

        console.log('update playlist locally');

        // length is always 1 for playlist.local, this fixes the empty object
        if (playlist.local.length <= 1) {
            if (playlist.local[0] &&
                    Object.getOwnPropertyNames(playlist.local[0]).length <= 0)
                return;
            else if (playlist.local.length <= 0)
                return;
        }

        $('#playlist-song-list .gen').remove();

        var html = '',
            i,
            // item start and end from current page
            start =  (pages.currentPlaylist - 1) * pages.maxPlaylist,
            end   = ((pages.currentPlaylist - 1) * pages.maxPlaylist) +
                pages.maxPlaylist;

        //console.log(end);
        // make all toPulse to ints
        for (i = 0; i < playlist.toPulse.length; ++i) {
            playlist.toPulse[i] = parseInt(playlist.toPulse[i]);
        }

        for (i = 0; i < playlist.local.length; ++i) {
            var value = playlist.local[i];

            value.Pos = parseInt(value.Pos);
            value.Id  = parseInt(value.Id);
            //console.log(value.file);

            // show only necessary files
            if (pages.enabledPlaylist) {
                if (i < start)
                    continue;
                else if (i >= end)
                    break;
            }

            var title =
                getSimpleTitle(value.Title, value.Artist, value.file),
                current = 'gen';

            // highlight current song on first load
            if (player.current && value.Id == player.current.Id)
                current += ' bg-success';

            if (settings.pulse && ~playlist.toPulse.indexOf(value.Id)) {
                // pulses twice because of lag
                current += ' pulse2';
            }

            //console.log(i + ': start');

            html += '<tr class="drag context-menu ' + current + '" title="' + title + '" data-fileid="' + value.Id + '" data-file="' + value.file + '" data-pos="' + value.Pos +  '"><td class="playlist-song-list-icons"><span class="glyphicon glyphicon-play song-play faded text-success" title="Play song"></span>' + (value.Pos + 1) + '.</td><td class="playlist-song-title"><table class="fixed-table"><tr><td>' + title + '</td></tr></table></td><td class="playlist-song-list-icons text-right"><span class="song-remove faded text-danger glyphicon glyphicon-remove" title="Remove song from playlist"></span></td></tr>';

        }

        playlist.toPulse = [];

        $(playlist.table).append(html);

        playlist.initDrag();
        browser.updatePosition();
        pages.update('playlist');

        // scroll down after adding a song
        if (playlist.scrollDown) {
            console.log('scroll');
            playlist.scrollDown = false;
            $('#pslwrap').scrollTop($('#playlist-song-list')[0].scrollHeight);
        }

        if (typeof callback == 'function') callback();
    },

    initDrag: function () {
        // draggable playlist event
        $(playlist.table).sortable({
            items: 'tr.gen',
            appendTo: 'parent',
            helper: 'clone',
            start: function (e, ui) {
                //console.log(e);
                //console.log(ui);
                // check is things are selected before continuing.
                // If right click is outside selected, clear selection
                // (like in all file managers).
                var inside = false;
                for (var i = 0; i < playlist.selected.length; ++i) {
                    //console.log(playlist.selected[i]);
                    if (playlist.selected[i].isEqualNode(ui.item.context)) {
                        console.log('setting inside to true');
                        inside = true;
                        break;
                    }
                }

                // if its not in playlist.selected, update it.
                if (!inside) {
                    console.log('updating playlist.selected');
                    playlist.clearSelected();
                }
            },
            update: function (e, ui) {
                var index = ui.item.index();
                //console.log(pages.currentPlaylist);
                // check if nothing is in playlist
                if (index == 1 &&
                        $($(playlist.table).children()[0]).hasClass('rem')) {
                    playlist.fromSender(ui, 0);
                    return;
                } else if (index + 1 == $(playlist.table).children().length) {
                    // last item in playlist
                    playlist.fromSender(ui, index);
                    return;
                }

                // grabs the item that used to be in that position.
                // grabs the pos as newIndex
                var newPos = $('#playlist-song-list .gen').
                    eq(index + 1).data().pos;

                var oldPos = $('#playlist-song-list .gen').
                    eq(index).data().pos;

                if (oldPos < newPos)
                    newPos--;

                // dragged from browser
                if (ui.sender) {
                    playlist.fromSender(ui, newPos);
                } else {
                    playlist.fromSelf(ui, newPos);
                }
            },
        }).disableSelection();

    },

    // drag and drop came from a different table
    fromSender: function (ui, newIndex) {
        //console.log(ui.item);
        if (browser.selected.length) {
            browser.addMulti(newIndex);
            return;
        } else if ($(ui.item).hasClass('artist') &&
                libraryArtist.selected.length) {
            library.addMulti(libraryArtist, newIndex, true);
            return;
        } else if ($(ui.item).hasClass('album') &&
                libraryAlbum.selected.length) {
            library.addMulti(libraryAlbum, newIndex, true);
            return;
        }

        var artist, album, i;

        // file
        // note: multiselect is checked in addDir and addSong!
        if ($(ui.item).hasClass('file')) {
            var file = ui.item.data().fileid;
            // check if nothing in playlist
            if (playlist.local.length <= 1) {
                playlist.addid(file, undefined, true);
            } else {
                playlist.addSong(file, newIndex, true);
            }
        } else if ($(ui.item).hasClass('directory')) {
            // directory
            var dir = ui.item.data().dirid;
            console.log('add dir ' + dir);

            if (playlist.local.length <= 1) {
                playlist.addDir(dir, undefined, true);
            } else {
                playlist.addDir(dir, newIndex, true);
            }
        } else if ($(ui.item).hasClass('album')) {
            artist = $(ui.item).data().artist;
            album  = $(ui.item).data().album;

            library.getSongsFromAlbum(artist, album, function (files) {
                for (i = 0; i < files.length; ++i) {
                    playlist.addSong(files[i].file, newIndex, true);
                }
            });
        } else if ($(ui.item).hasClass('artist')) {
            artist = $(ui.item).data().artist;

            library.getSongsFromAlbum(artist, undefined, function (files) {
                for (i = 0; i < files.length; ++i) {
                    playlist.addSong(files[i].file, newIndex, true);
                }
            });
        } else {
            console.log('not supported drag for: ' + $(ui.item).attr('class'));
        }
    },

    // drag and drop came from the same table
    fromSelf: function (ui, newIndex) {
        var file;
        if (playlist.selected.length) {
            $(playlist.selected).each(function (item, tr) {
                file = $(tr).data().fileid;

                playlist.toPulse.push(file);

                var pos = $(tr).data().pos,
                    index;

                // if original location is below the "move to"
                // location
                if (pos > newIndex) {
                    index = newIndex + item;
                    //console.log('dragged playlist: ' + file + ' to ' + index);
                    komponist.moveid(file, index, function (err) {
                        if (err) console.log(err);
                    });
                } else {
                    // else if original location is about the
                    // "move to" location
                    index = newIndex;
                    //console.log('dragged playlist: ' + file + ' to ' + index);
                    komponist.moveid(file, index, function (err) {
                        if (err) console.log(err);
                    });
                }
            });

            playlist.clearSelected();
        } else {
            file = ui.item.data().fileid;
            playlist.toPulse.push(file);
            //console.log('dragged playlist: ' + file + ' to ' + newIndex);
            komponist.moveid(file, newIndex, function (err) {
                if (err) console.log(err);
            });
        }
    },

    // wrapper for komponist.addid
    addid: function (file, to) {
        if (to === undefined || isNaN(to))
            komponist.addid(file, function (err, val) {
                if (err)
                    console.log(err);
                else
                    playlist.toPulse.push(val.Id);
            });
        else
            komponist.addid(file, to, function (err, val) {
                if (err)
                    console.log(err);
                else
                    playlist.toPulse.push(val.Id);
            });
    },

    // wrapper for komponist.add
    add: function (dir, to) {
        if (to === undefined || isNaN(to))
            komponist.add(dir, function (err, val) {
                //val returns an empty object (I was hoping for an Id list)
                //console.log(val);
                if (err)
                    console.log(err);
                //else
                    //playlist.toPulse.push(val.Id);
            });
        else
            getAllInfo(dir, function (files) {
                //console.log(files);
                if (!files.length)
                    return console.log('Nothing in db');

                $(files).each(function (item, value) {
                    //console.log(value);
                    if (value.file)
                        playlist.addid(value.file, to++);
                });
            });
    },

    // addSong
    addSong: function (file, to, dontScroll) {
        console.log('adding song to playlist');

        if (!dontScroll) {
            playlist.doUpdate = false;
            if (to === undefined || isNaN(to)) {
                pages.go('playlist', pages.totalPlaylist);
                this.scrollDown = true;
            } else if (to == player.current.Pos + 1) {
                this.goToCurrent();
            } else {
                this.goToPos(to);
            }
        }

        this.addid(file, to);
    },

    // addDir
    addDir: function (dir, to, dontScroll) {
        console.log('adding dir to playlist');

        if (!dontScroll) {
            playlist.doUpdate = false;
            if (to === undefined || isNaN(to)) {
                pages.go('playlist', pages.totalPlaylist);
                this.scrollDown = true;
            } else {
                this.goToPos(to);
            }
        }

        this.add(dir, to);
    },

    // wrapper for komponist.findadd
    findAdd: function (artist, album) {
        if (!album) {
            komponist.findadd('artist', artist, function (err, files) {
                setSongs(err, files);
            });
        } else {
            komponist.findadd('artist', artist, 'album', album, function (err, files) {
                setSongs(err, files);
            });
        }

        function setSongs (err, files) {
            if (err) console.log(err);
            // no files in response

            playlist.doUpdate = false;
            pages.go('playlist', pages.totalPlaylist);
            playlist.scrollDown = true;
        }
    },

    // plays the song in the playlist
    playSong: function (file) {
        console.log('play song from playlist');
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

        history.add('Loaded playlist: ' + title);
        this.current = title.replace(/ /g, '\u00a0');

        // fixes a bug where it doesn't get updated while a song is playing
        player.updateAll();
        // fixes a bug where the playlist doesn't get updated
        // after a new one is loadded
        this.updateAll();
    },

    // remove duplicate files from the playlist
    removeDuplicates: function () {
        console.log('remove duplicates');
        var duplicate = {};

        $(this.local).each(function (item, file) {
            if (duplicate[file.file] && (player.current === null ||
                        file.Pos != player.current.Pos)) {
                komponist.deleteid(file.Id, function (err, val) {
                    if (err) {
                        console.log('Error: ' +
                            'Cannot remove duplicate file, this might be a bug');
                        console.log(err);
                    }
                });
            } else {
                duplicate[file.file] = true;
            }
        });
    },

    // TODO Goal: remove song from playlist without mpd updating the playlist
    // locally. Have to update playlist.local .Pos to work, or somehow use
    // numbered table rows instead of using Pos.
    // remove song from the playlist. The element must be removed manually
    // before or after calling!
    removeSong: function (fileid) {
        komponist.deleteid(fileid, function (err, val) {
            if (err) console.log('No song with id ' + fileid + ' to delete!');
        });

        // playlist doesn't get updated when the same song being removed is
        // playling (future me: this happens with not only pause, but other
        // times as well, so dont check for a pause flag!)
        if (player.current && fileid == player.current.Id)
            socket.send(JSON.stringify(
                    {'type': 'update-playlist'}), function (err) {
                if (err) console.log(err);
            });
    },

    // wrapper for removeSong, given an element
    remove: function (ele) {
        //console.log(playlist.selected);
        var file;

        // multiselect check (any left clicks)
        if (playlist.selected.length) {
            $(playlist.selected).each(function (item, tr) {
                //console.log(tr);
                file = $(tr).data().fileid;
                playlist.removeSong(file);
            });

            // clear playlist.selected just in case.
            playlist.clearSelected();
        } else {
            // single file (fallback)
            file = $(ele).data().fileid;
            playlist.removeSong(file);
        }
    },

    // adds the song after the currently playing song
    addToCurrent: function (file, type) {
        var newPos = player.current.Pos + 1;
        this.goAfterUpdate = true;

        if (browser.selected.length) {
            browser.addMulti(newPos);
            return;
        }

        if (type == 'file') {
            playlist.addSong(file, newPos, true);
        } else if (type == 'dir') {
            playlist.addDir(file, newPos, true);
        }
    },

    // move song to the top of the playlist
    moveToTop: function (file, type) {
        //console.log(file);
        // goes to page first because of pulse being cleared
        $('#pslwrap').scrollTop($('#playlist-song-list'));
        pages.go('playlist', 1);

        // multiselect check
        if (playlist.selected.length) {
            $(playlist.selected).each(function (item, tr) {
                //console.log(tr);
                file = $(tr).data().fileid;
                playlist.toPulse.push(file);

                komponist.moveid(file, item, function (err) {
                    if (err) console.log(err);
                });
            });

            // clear playlist.selected just in case.
            playlist.clearSelected();
        } else {
            playlist.toPulse.push(file);
            console.log(file);

            komponist.moveid(file, 0, function (err) {
                if (err) console.log(err);
            });
        }
    },

    // move song to the currently playing song in the playlist
    moveToCurrent: function (file) {
        //console.log(player.current.Pos);
        //console.log(file);

        var newPos = player.current.Pos + 1;

        // multiselect check
        if (playlist.selected.length) {
            // only do this if the the moved songs are above the current song
            var lastPos = $(playlist.selected[playlist.selected.length-1]).
                data().pos;

            this.goAfterUpdate = true;

            $(playlist.selected).each(function (item, tr) {
                var fileid = $(tr).data().fileid,
                    pos    = $(file).data().pos;

                playlist.toPulse.push(fileid);

                // currently playing song is above file to be moved
                if (player.current && player.current.Pos < pos)
                    newPos = player.current.Pos + 1 + item;
                // currently playing song is below file to be moved
                else if ((player.current && player.current.Pos > pos) ||
                        player.current)
                    newPos = player.current.Pos;
                // currently playing song is the same file to be moved
                else
                    newPos = 0 + item;

                //console.log(newPos);
                komponist.moveid(fileid, newPos, function (err) {
                    if (err) console.log(err);
                });
            });

            // clear playlist.selected just in case.
            playlist.clearSelected();
        } else {
            this.goAfterUpdate = true;
            var fileid = $(file).data().fileid,
                pos    = $(file).data().pos;

            playlist.toPulse.push(fileid);

            // currently playing song is above file to be moved
            if (player.current && player.current.Pos < pos)
                newPos = player.current.Pos + 1;
            // currently playing song is below file to be moved
            else if ((player.current && player.current.Pos > pos) ||
                    player.current)
                newPos = player.current.Pos;
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
        pages.go('playlist', pages.totalPlaylist);
        $('#pslwrap').scrollTop($('#playlist-song-list')[0].scrollHeight);

        // multiselect check
        if (playlist.selected.length) {
            $(playlist.selected).each(function (item, tr) {
                file = $(tr).data().fileid;
                playlist.toPulse.push(file);

                komponist.moveid(file, (index - 1), function (err) {
                    if (err) console.log(err);
                });
            });

            // clear playlist.selected just in case.
            playlist.clearSelected();
        } else {
            //console.log(file);
            playlist.toPulse.push(file);

            komponist.moveid(file, (index - 1), function (err) {
                if (err) console.log(err);
            });
        }
    },

    clearSelected: function () {
        $(playlist.selected).each(function (item, tr) {
            //console.log(tr);
            $(tr).removeClass('info');
        });

        playlist.selected = [];
    },

    // go to the page that the position of the song is located in
    goToPos: function (pos) {
        pages.go('playlist', pos / pages.maxPlaylist + 1);
    },

    // goes to the current song in the playlist.
    goToCurrent: function () {
        if (!player.current) return console.log('no song selected');

        // scroll to top to avoid scrolling bugs
        $('#pslwrap').scrollTop($('#playlist-song-list'));

        // go to the page the song is playing on
        this.goToPos(player.current.Pos);
        // try to go above the element, so the item is semi-centered
        var to = (player.current.Pos % pages.maxPlaylist) - 5;

        if (to < 1) to = 1;

        console.log('scroll to ' + to);

        var toOffset = $(playlist.table + ' .gen:nth-child(' + to + ')');

        if (toOffset.length) {
            var offset = toOffset.offset().top;
            $('#pslwrap').scrollTop(offset);
        }
    },

    // show song information to the user
    getSongInfo: function (file) {
        komponist.playlistfind('file', file, function (err, value) {
            parseSongInfo(err, value[0]);
        });
    },

    search: function (val) {
        // do not use 'this' keyword. May be used in callback.
        if (!val)
            val = playlist.searchTerm;
        else
            playlist.searchTerm = val;

        // set to true (in case of after clicking clear)
        playlist.isSearching = true;

        komponist.playlistsearch('any', val, function(err, response) {
            if (err) return console.log(err);

            //console.log(response);

            $('#playlist-song-list .gen').remove();
            playlist.local = response;

            if ($.isEmptyObject(response[0])) {
                var html = '<tr class="gen"><td><em>No songs found</em></td></tr>';
                $('#playlist-song-list').append(html);
                // fix for removing the last song that's
                // playling from the playlist
                playlist.doUpdate = true;
                player.updateAll();
                pages.update('playlist');
                browser.updatePosition();
                return console.log('No songs found in playlist search');
            }

            // TODO figure out a way to use playlist.local efficiently with
            // browser.updatePlaylist instead of utilizing playlist.list
            $(playlist.local).each(function (item, value) {
                playlist.list.files.push(value.file);
                playlist.list.positions.push(value.Pos);
            });

            playlist.updateLocal(function () {
                // fixes issues such as the last song not updating the player;
                player.updateAll();
            });
        });
    },

    // open playlist from stored element
    openFromStored: function () {
        // disable events
        $(document).off('keydown');
        if ($('#playlist-open-modal .selected').length) {
            var file = $('#playlist-open-modal .selected').data().fileid;
            stored.open(file);
        } else {
            toastr.warning('No playlist was selected', 'Playlist', {
                'closeButton': true,
                'positionClass': 'toast-bottom-left',
                'preventDuplicates': true,
            });
        }
    },

    // save playlist from stored element
    saveFromStored: function () {
        // disable events
        $(document).off('keydown');
        console.log('confirm save playlist');
        var file = $('#playlist-save-input').val();
        stored.save(file);
    },

    initEvents: function () {
        $('#new-playlist').click(function () { pb.newLocal(); });

        $('#scramble').click(function () {
            komponist.shuffle(function (err) {
                if (err) console.log(err);
            });
        });

        $('#remove-duplicates').click(function () {
            playlist.removeDuplicates();
        });

        $('#open-playlist').click(function () {
            console.log('open playlists');
            stored.updatePlaylists('playlist-open-modal');
        });

        $('#save-playlist').click(function () {
            console.log('save playlist');
            stored.updatePlaylists('playlist-save-modal');
        });

        $('#playlist-save-confirm').click(function () {
            playlist.saveFromStored();
        });

        $('#playlist-open-confirm').click(function () {
            playlist.openFromStored();
        });

        $('#clear-playlist').click(function () {
            console.log('clear playlist');

            // this is done server-side to fix a bug:
            // refresh -> add -> play -> clear does not work
            socket.send(JSON.stringify(
                {'type': 'clear-playlist'}), function (err) {
                    if (err) console.log(err);
            });
        });

        $('#playlist-search-toggle').click(function () {
            if ($('#playlist-search-toggle').hasClass('active')) {
                $('#playlist-search-toggle').removeClass('active');
                $('#playlist-search').hide();
                playlist.isSearching = false;
                $('#search-playlist').val('');
                playlist.searchTerm = '';
                playlist.updateAll();
            } else {
                $('#playlist-search-toggle').addClass('active');
                $('#playlist-search').show();
                $('#search-playlist').focus();
                playlist.isSearching = true;
            }
        });

        createSearch('#search-playlist', playlist.search, function () {
                playlist.isSearching = false;
                playlist.updateAll();
            }, '#search-playlist-clear');

        $(document).on('click', '.song-remove', function () {
            var ele = $(this).parent().parent();
            //console.log(ele);
            playlist.remove(ele);
        });

        $(document).on('dblclick', '#playlist-song-list tr', function () {
            var file = $(this).data().fileid;
            playlist.playSong(file);
        });

        $(document).on('click', '.song-play', function () {
            var file = $(this).parent().parent().data().fileid;
            playlist.playSong(file);
        });

        multiSelect('#playlist-song-list', playlist, ['song-remove']);
    }
};

// the file browser
var browser = {
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
    // the cloned tr in the browser when dragging
    cloned: null,
    // whether to update the browser on the next update or not
    doUpdate: true,
    // toggle between library and browser
    hidden: false,

    // check which dir the user is in.
    // only update that dir
    update: function (dir, poppedState) {
        // NOTE: do not use 'this' keyword, as this can be in a callback
        // function
        if (browser.hidden && !library.hidden) {
            // update library here. Just use browser.update as a general
            // library/browser update. May change later to reduce coupling.
            library.updateArtists(library.artist);
            library.updateAlbums(library.artist, library.album);
            library.updateSongs(library.artist, library.album);
            return;
        }

        // db update (ignore back / forward buttons)
        if (!dir && !poppedState && !browser.doUpdate) {
            console.log('do not update browser...');
            // doUpdate gets set to true in the onMessage update-browser
            //browser.doUpdate = true;
            return;
        }

        if (dir) browser.current = dir;

        //console.log('previous directory: ' + browser.previous);
        console.log('reloading directory: ' + browser.current);

        if ((!poppedState && browser.previous != browser.current) ||
                (!poppedState && browser.searching)) {
            browser.searching = false;
            browser.addToHistory();
            $('#slwrap').scrollTop($('#file-browser-song-list'));
        }
        browser.updateBrowser(browser.current);

        if (dir) browser.previous = dir;
    },

    addToHistory: function () {
        if (browser.current == '/' || browser.current === '') {
            console.log('adding /browser/ to history');
            window.history.pushState('', 'MPCParty', '/browser/');
        } else {
            console.log('adding /browser/' + browser.current + ' to history');
            window.history.pushState('', browser.current + ' - MPCParty',
                    '/browser/' + browser.current);
        }
    },

    // shows directories. use '/' for root
    updateBrowser: function (directory) {
        // location bar:
        // split directory based on /'s
        // create a list item for each dir split
        $('#location .loc-dir').remove();
        // toString incase of number only directories
        var dirs  = directory.toString().split('/'),
            dirId = dirs[0],
            html  = '',
            i;

        if (browser.current != '/')
            for (i = 0; i < dirs.length; ++i) {
                html += '<li class="loc-dir" data-dirid="' + dirId + '">' +
                    dirs[i] + '</li>';
                dirId += '/' + dirs[i+1];
            }

        $('#location ol').append(html);

        komponist.lsinfo(directory, function (err, files) {
            //console.log(files);
            if (err) return console.log(err);

            $('#file-browser-song-list .gen').remove();
            browser.localFolders = [];
            browser.localFiles = [];
            files = toArray(files);

            if (!files.length) {
                html = '<tr class="directory gen"><td colspan="6">' +
                    '<em class="text-muted">Empty directory</em></td></tr>';
                $('#file-browser-song-list').append(html);
                pages.update('browser');
                return console.log('Empty directory');
            }

            var html = '';

            // initialize html for browser
            for (i = 0; i < files.length; ++i) {
                html = browser.getHtmlFolders(files[i]);

                if (html !== '')
                    browser.localFolders.push(html);
                else {
                    html = browser.getHtmlFiles(files[i]);
                    if (html !== '') browser.localFiles.push(html);
                }
            }

            browser.updateLocal();
        });
    },

    // replaces the browser with search results
    // searches for all files based on file name and tag
    search: function (name, poppedState) {
        console.log('browser.search: ' + name);

        if (browser.hidden) {
            browser.show();
            library.hide();
            library.bringBack = true;
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
            if (browser.searchTerm == name) {
                // just don't add repeated search to history
                poppedState = true;
            }

            // do this after (in case of error)
            $('#file-browser-song-list .gen').remove();
            browser.searching = true;
            browser.searchTerm = name;
            browser.localFolders = [];
            browser.localFiles = [];
            var html;

            if (!files.length) {
                // note: when the search is nothing, it does not save to
                // history
                html = '<tr class="directory gen"><td colspan="6">' +
                    '<em>No songs found</em></td></tr>';
                $('#file-browser-song-list').append(html);
                pages.update('browser');
                return console.log('No songs found');
            }

            html = '';

            for (var i = 0; i < files.length; ++i) {
                html = browser.getHtmlFiles(files[i]);

                if (html !== '')
                    browser.localFiles.push(html);
            }

            if (!poppedState) {
                console.log('pushing history search');
                window.history.pushState('', name + ' - MPCParty',
                    '/search/' + encodeURIComponent(name));
            }

            browser.updateLocal();
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

            value.Album  = (!value.Album ? settings.unknown : value.Album);
            value.Artist = (!value.Artist ? settings.unknown : value.Artist);
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
                player.setCurrent(null);
            else
                player.setCurrent(song);

            if (player.current) {
                $('#title-pos').html((player.current.Pos + 1) + '. ');
            }
        });

        $.each(tr, function (name, element) {
            if (!$(element).hasClass('file')) return true;

            var fileid = $(element).data().fileid,
            icon   = '',
            index  = playlist.list.files.indexOf(fileid);

            if (index != -1) {
                icon = (parseInt(playlist.list.positions[index]) + 1) + '.';
                $(element).children('.pos').html(icon);
            } else {
                icon = '<span class="text-primary glyphicon glyphicon-file">' +
                    '</span>';
                $(element).children('.pos').html(icon);
            }
        });
    },

    updateLocal: function () {
        console.log('update local browser');

        // browser.local* always has a length of 1, but may have an empty
        // object. This fixes removeal of "Empty directory"
        if (browser.localFolders.length <= 1 &&
                browser.localFiles.length <= 1) {
            if ((browser.localFolders[0] && Object.getOwnPropertyNames(
                        browser.localFolders[0]).length <= 0) &&
                    (browser.localFiles[0] && Object.getOwnPropertyNames(
                        browser.localFiles[0]).length <= 0))
                return;
            else if (browser.localFolders.length <= 0 &&
                    browser.localFiles.length <= 0)
                return;
        }

        $('#file-browser-song-list .gen').remove();

        var start = 0,
            end   = browser.localFolders.length + browser.localFiles.length,
            html  = '';

        if (pages.enabledBrowser) {
            start = (pages.currentBrowser - 1) * pages.maxBrowser;
            end = (((pages.currentBrowser - 1) * pages.maxBrowser) +
                pages.maxBrowser) - 1;
        }

        var current = start,
            i;
        //console.log(start);
        //console.log(end);

        for (i = current; i < browser.localFolders.length; ++i) {
            if (current > end || current > browser.localFolders.length)
                break;

            html += browser.localFolders[i];
            current++;
        }

        i = current - browser.localFolders.length;
        //console.log(current);
        //console.log(i);

        for (; i < browser.localFiles.length; ++i) {
            if (current > end || current - browser.localFolders.length >
                    browser.localFiles.length)
                break;

            html += browser.localFiles[i];
            current++;
        }

        $('#file-browser-song-list .append').append(html);

        //console.log(current);

        browser.createDraggable('#file-browser-song-list', browser);
        browser.updatePosition();
        pages.update('browser');
    },

    // draggable song-list
    // used: jsfiddle.net/BrianDillingham/v265q/320
    createDraggable: function (ele, obj) {
        $(ele + ' .append').sortable({
            items: 'tr.gen',
            connectWith: '.connected',
            placeholder: 'no-placeholder',
            start: function (e, ui) {
                //console.log(e);
                //console.log(ui);
                // check is things are selected before continuing.
                // If right click is outside selected, clear selection
                // (like in all file managers).
                var inside = false;
                for (var i = 0; i < obj.selected.length; ++i) {
                    // compare titles because of generated tr's after drag
                    if (ele == '#library-artists-list' ||
                            ele == '#library-albums-list') {
                        if ($(obj.selected[i]).attr('title') ==
                                $(ui.item.context).attr('title')) {
                            console.log('setting inside to true (dup)');
                            inside = true;
                            break;
                        }
                    } else {
                        if (obj.selected[i].isEqualNode(ui.item.context)) {
                            console.log('setting inside to true');
                            inside = true;
                            break;
                        }
                    }
                }

                // if its not in playlist.selected, update it.
                if (!inside) {
                    if (libraryArtist.selected.length) {
                        libraryArtist.saveSelected();
                    }
                    if (libraryAlbum.selected.length) {
                        libraryAlbum.saveSelected();
                    }

                    console.log('clearing ' + ele + ' selected');
                    obj.clearSelected();
                }
            },
            helper: function (e, tr) {
                // clones the tr to not "remove" from browser
                this.copyHelper = tr.clone().insertAfter(tr);
                //$(this).data('copied', false);
                //this.copiedtr = tr;
                browser.cloned = this.copyHelper;
                return tr.clone();
            },
            stop: function (e, ui) {
                // remove the original tr in case user drops back
                // into browser (keeps cloned)
                var tr = ui.item[0];
                if (tr) $(tr).remove();

                if (libraryArtist.saved.length) {
                    libraryArtist.restoreSelected();
                }
                if (libraryAlbum.saved.length) {
                    libraryAlbum.restoreSelected();
                }
            },
            // above flothead and pb
            zIndex: 1003
        }).disableSelection();
    },

    clearSelected: function () {
        $(this.selected).each(function (item, tr) {
            //console.log(tr);
            $(tr).removeClass('info');
        });

        if (this.cloned) this.cloned.removeClass('info');
        this.selected = [];
    },

    // show song information to the user
    getSongInfo: function (file) {
        komponist.find('file', file, function (err, value) {
            parseSongInfo(err, value[0]);
        });
    },

    // add all songs in browser.current to playlist
    addAll: function () {
        console.log('add all songs from ' + browser.current);

        if (browser.searching) {
            komponist.search('any', browser.searchTerm, function (err, files) {
                if (err) return console.log(err);

                if ($.isEmptyObject(files[0])) {
                    return console.log('No songs found');
                }

                if (pb.current !== null)
                    pb.addSong(files);
                else
                    $(files).each(function (item, value) {
                        komponist.add(value.file, function (err) {
                            if (err) console.log(err);
                        });
                    });
            });
        } else {
            if (pb.current) {
                getAllInfo(browser.current, function (files) {
                    pb.addSong(files);
                });
            } else {
                komponist.lsinfo(browser.current, function (err, files) {
                    //console.log(files);

                    if (err) return console.log(err);

                    files = toArray(files);

                    if (!files.length) return console.log('Empty directory');

                    $(files).each(function (item, value) {
                        if (value.directory) {
                            komponist.add(value.directory, function (err) {
                                if (err) console.log(err);
                            });
                        }

                        if (value.file) {
                            komponist.add(value.file, function (err) {
                                if (err) console.log(err);
                            });
                        }
                    });
                });
            }
        }
    },

    show: function () {
        if (!browser.hidden) return;
        browser.hidden = false;
        buttonSelect("#open-file-browser", "#browser-selection");
        $('#browser').show();
    },

    hide: function () {
        $('#browser').hide();
        browser.hidden = true;
        browser.clearSelected();
    },

    addMulti: function (to) {
        toArraySelected(browser);
        var i, tr, dir, file;

        if (pb.current) {
            var arr = [];

            for (i = 0; i < browser.selected.length; ++i) {
                tr = browser.selected[i];
                if ($(tr).hasClass('file')) {
                    file = $(tr).data().fileid;
                    arr.push(['id', file]);
                } else if ($(tr).hasClass('directory')) {
                    dir = $(tr).data().dirid;
                    arr.push(['dir', dir]);
                }
            }

            pb.addArr(arr, to);
        } else {
            var dontScroll = false;
            // dont scroll if drag and drop ("to" would not be null)
            if (to && to != player.current.Pos + 1) dontScroll = true;

            // reverse because not incrementing to variable because
            // scrolling to center will be overridden in addSong
            browser.selected.reverse();
            for (i = 0; i < browser.selected.length; ++i) {
                tr = browser.selected[i];
                if ($(tr).hasClass('file')) {
                    file = $(tr).data().fileid;
                    playlist.addSong(file, to, dontScroll);
                } else if ($(tr).hasClass('directory')) {
                    dir = $(tr).data().dirid;
                    playlist.addDir(dir, to, dontScroll);
                }
            }
        }

        browser.clearSelected();
    },

    addExternal: function (file, to) {
        if (browser.selected.length)
            browser.addMulti(to);
        else if (pb.current)
            pb.addid(file, to);
        else
            playlist.addSong(file, to);
    },

    initEvents: function () {
        $('#update').click(function () {
            console.log('update database');
            // set to false until broadcast updates everyone
            // for now, the other clients will still receive multiple updates
            browser.doUpdate = false;

            var msg = 'Updating music library...';
            toastr.warning(msg, 'Library', {
                'closeButton': true,
                'positionClass': 'toast-bottom-left',
                'preventDuplicates': true,
                'timeOut': '-1'
            });

            komponist.update(function (err) {
                // check if this is satus.updating_db is undefined
                // if so, it is done updating (hopefully)
                if (err) return console.log(err);

                var updateInterval = setInterval(function () {
                    console.log('checking if update db is done...');

                    komponist.status(function (err, status) {
                        if (err) {
                            clearInterval(updateInterval);
                            return console.log(err);
                        }

                        // incase job id is 0/1, just check if undefined
                        if (status.updating_db === undefined) {
                            // stop interval and send update-browser
                            // to everyone
                            clearInterval(updateInterval);

                            toastr.remove();

                            msg = 'Music library updated!';
                            history.add(msg, 'info');
                            toastr.info(msg, 'Library', {
                                'closeButton': true,
                                'positionClass': 'toast-bottom-left',
                                'preventDuplicates': true,
                                'timeOut': '5000'
                            });

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
            browser.update('/');
        });

        $(document).on('click', '.song-add', function () {
            var file = $(this).parent().parent().data().fileid;
            browser.addExternal(file);
        });

        $(document).on('dblclick', 'tr.file', function () {
            var file = $(this).data().fileid;
            browser.addExternal(file);
        });

        $(document).on('dblclick', '.song-list tr.directory', function () {
            var dir = $(this).data().dirid;
            browser.update(dir);
        });

        $(document).on('click', '.song-list .folder-open', function () {
            var dir = $(this).parent().parent().data().dirid;
            browser.update(dir);
        });

        $(document).on('click', '.dir-add', function () {
            var dir = $(this).parent().parent().data().dirid;
            browser.addExternal(dir);
        });

        $(document).on('click', '.loc-dir', function () {
            var file = $(this).data().dirid;
            //console.log(file);
            browser.update(file);
        });

        // add all songs from browser.current
        $('#add-all').click(function () {
            browser.addAll();
        });

        $('#open-file-browser').click(function () {
            settings.saveBrowser('browser');
            $('#file-browser-song-list.table').trigger('reflow');
            browser.update();
            browser.addToHistory();
        });

        floatTable('#file-browser-song-list.table', '#slwrap');

        // this cannot be part of .song-list because of a bug with sortColumn
        // (overwrites contens from one tabe to other tables).
        tableSort('#file-browser-song-list',
                '#file-browser-song-list-col-number', 1, 'number');
        tableSort('#file-browser-song-list',
                '#file-browser-song-list-col-title',  2, 'string');
        tableSort('#file-browser-song-list',
                '#file-browser-song-list-col-artist', 3, 'string');
        tableSort('#file-browser-song-list',
                '#file-browser-song-list-col-album',  4, 'string');
        tableSort('#file-browser-song-list',
                '#file-browser-song-list-col-time',   5, '00:00');

        multiSelect('#file-browser-song-list', browser, ['song-add', 'dir-add']);
    }
};

// separate mutliselect for artist
var libraryArtist = {
    selected: [],
    saved: [],

    clearSelected: function () {
        // for createDraggable.
        libraryArtist.selected = [];
    },

    // save the list temporarily
    saveSelected: function () {
        console.log('saving t...' + libraryArtist.selected.length);
        libraryArtist.saved = libraryArtist.selected;
    },

    // restore the list
    restoreSelected: function () {
        console.log('restore t...' + libraryArtist.saved.length);
        libraryArtist.selected = libraryArtist.saved;
        libraryArtist.saved = [];
    }
};

// separate mutliselect for album
var libraryAlbum = {
    selected: [],
    saved: [],

    clearSelected: function () {
        // for createDraggable.
        libraryAlbum.selected = [];
    },

    // save the list temporarily
    saveSelected: function () {
        //console.log('saving b...' + libraryAlbum.selected.length);
        libraryAlbum.saved = libraryAlbum.selected;
    },

    // restore the list
    restoreSelected: function () {
        //console.log('restore b...' + libraryAlbum.saved.length);
        libraryAlbum.selected = libraryAlbum.saved;
        libraryAlbum.saved = [];
    }
};

// the library (alternative to file browser)
var library = {
    hidden: true,
    // used when searching globally and other things
    bringBack: false,
    // used for artist and album selection
    selected: [],
    // used for saving selected temporarily
    saved: [],
    // save these when updating the library externally
    artist: null,
    album: null,

    // put artists in table
    // artistUse: highlight in table
    updateArtists: function (artistUse) {
        if (this.hidden) return;

        console.log('update artists');

        komponist.list('artist', function (err, files) {
            if (err) return console.log(err);

            //console.log(files);

            $('#library-artists-list .gen').remove();
            files = toArray(files);

            var html = '';

            if (!files.length || files[0].Artist === '') {
                html = '<tr class="gen"><td colspan="2">' +
                    '<em class="text-muted">No artists</em></td></tr>';
                $('#library-artists-list .append').append(html);
                return console.log('No artists found');
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

            browser.createDraggable('#library-artists-list', libraryArtist);
            $('#library-artists-list .append').append(html);
        });
    },

    // put albums in table
    // albumUse: highlight in table
    updateAlbums: function (artist, albumUse) {
        // if still null, return (user updates library without clicking an
        // artist)
        if (!artist) return;

        console.log('update albums');
        library.artist = artist;

        komponist.list('album', artist, function (err, files) {
            if (err) return console.log(err);

            $('#library-albums-list .gen').remove();
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
                    '<em>No albums</em></td></tr>';
                $('#library-albums-list .append').append(html);
                return console.log('No albums found');
            }

            for (var i = 0; i < files.length; ++i) {
                var album = files[i].Album;

                if (album == albumUse)
                    addClass = 'info';

                html += '<tr class="context-menu gen album ' + addClass + '" data-artist="' + artist + '" data-album="' + album + '" title="' + album + '"><td>' + tableStart + album + tableEnd + '</td><td class="song-list-icons text-right"><span class="album-add faded text-success glyphicon glyphicon-plus" title="Add album to the bottom of the playlist"></span></td></tr>';
                addClass = '';
            }

            $('#library-albums-list .append').append(html);

            browser.createDraggable('#library-albums-list', libraryAlbum);
        });
    },

    // put songs in table
    updateSongs: function (artist, album, poppedState) {
        // if still null, return (user updates library without clicking an
        // artist)
        if (!artist) return;

        console.log('update songs');
        library.album = album;

        if (!album) {
            komponist.find('artist', artist, function (err, files) {
                setSongs(err, files);
            });
        } else {
            komponist.find('artist', artist, 'album', album, function (err, files) {
                setSongs(err, files);
            });
        }

        if (!poppedState) library.addToHistory();

        function setSongs(err, files) {
            if (err) return console.log(err);

            //console.log(files);

            $('#library-songs-list .gen').remove();
            files = toArray(files);

            var html = '';

            if (!files.length || (files.length == 1 && !files[0].Album &&
                    !files[0].Artist)) {
                html = '<tr class="gen"><td colspan="6">' +
                    '<em>No songs</em></td></tr>';
                $('#library-songs-list .append').append(html);
                return console.log('No songs found');
            }

            var tableStart = '<table class="fixed-table"><tr><td>',
                tableEnd   = '</td></tr></table>';

            for (var i = 0; i < files.length; ++i) {
                html += browser.getHtmlFiles(files[i]);
            }

            $('#library-songs-list .append').append(html);
            browser.createDraggable('#library-songs-list', browser);
            browser.updatePosition();
            //$('#library-songs-list.table').trigger('reflow');
        }
    },

    addToHistory: function () {
        if (!library.artist) {
            console.log('adding /library/ to history');
            window.history.pushState('','MPCParty', '/library/');
            return;
        }

        var albumHistory = '',
            artistHistory = encodeURIComponent(library.artist);

        if (library.album)
            albumHistory = '/' + encodeURIComponent(library.album);

        var url = artistHistory + albumHistory;
        console.log('adding /library/' + url + ' to history');
        window.history.pushState('', url + ' - MPCParty', '/library/' + url);
    },

    show: function () {
        if (!library.hidden) return;

        library.hidden = false;
        $('#library').show();
        buttonSelect("#open-library", "#browser-selection");
        $('#library-artists-list.table').trigger('reflow');
        $('#library-albums-list.table').trigger('reflow');
        $('#library-songs-list.table').trigger('reflow');
        //libraryArtist.restoreSelected();
        //libraryAlbum.restoreSelected();
    },

    hide: function () {
        library.hidden = true;
        $('#library').hide();
        libraryArtist.saveSelected();
        libraryAlbum.saveSelected();
        libraryArtist.clearSelected();
        libraryAlbum.clearSelected();
    },

    // obj, libraryArtist or libraryAlbum
    addMulti: function (obj, to, dontScroll) {
        toArraySelected(obj);
        var i, tr, artist, album;

        function sendToPb(art, alb) {
            library.getSongsFromAlbum(art, alb, function (files) {
                pb.addSong(files, to);
            });
        }

        function sendToPl(art, alb) {
            library.getSongsFromAlbum(artist, album, function (files) {
                // reverse because not incrementing to variable because
                // scrolling to center will be overridden in addSong
                files = files.reverse();
                for (var i = 0; i < files.length; ++i) {
                    playlist.addSong(files[i].file, to, dontScroll);
                }
            });
        }

        if (pb.current) {
            for (i = 0; i < obj.selected.length; ++i) {
                tr     = obj.selected[i];
                artist = $(tr).data().artist;
                album  = $(tr).data().album;
                sendToPb(artist, album);
            }
        } else {
            obj.selected.reverse();
            for (i = 0; i < obj.selected.length; ++i) {
                tr     = obj.selected[i];
                artist = $(tr).data().artist;
                album  = $(tr).data().album;
                sendToPl(artist, album);
            }
        }
    },

    // return a file list from an album
    getSongsFromAlbum: function (artist, album, callback) {
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
                return console.log('No songs found');
            }

            if (callback) callback(files);
        }
    },

    addExternal: function (obj, artist, album, to, dontScroll) {
        if (obj.selected.length)
            library.addMulti(obj, to, dontScroll);
        else if (pb.current)
            library.getSongsFromAlbum(artist, album, function (files) {
                pb.addSong(files, to, dontScroll);
            });
        else
            library.getSongsFromAlbum(artist, album, function (files) {
                for (var i = 0; i < files.length; ++i)
                    playlist.addSong(files[i].file, to);
            });
    },

    // search library. assume library.artist and library.album is already set
    search: function (title) {
        function compare(files) {
            //console.log(files);
            $(files).each(function(item, file) {
                $('#library-songs-list .gen').each(function (item, val) {
                    if ($(val).data().fileid == file.file) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                });
            });
        }

        if (library.artist && library.album) {
            //console.log('search artist and album');
            komponist.search('artist', library.artist, 'album', library.album,
                    'title', title, function (err, files) {
                if (err) return console.log(err);
                compare(files);
            });
        } else if (library.artist) {
            //console.log('search artist');
            komponist.search('artist', library.artist,
                    'title', title, function (err, files) {
                if (err) return console.log(err);
                compare(files);
            });
        } else {
            console.log('no artist or album selected?');
        }
    },

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
        //console.log(album);

        browser.hide();
        library.show();

        // we don't need to update everything if everything is the same
        // (like coming from the browser)
        if (library.album !== null && library.album == album) return;

        if (library.artist != artist) library.updateArtists(artist);

        library.updateAlbums(artist, album);
        library.updateSongs(artist, album, true);
    },

    initEvents: function () {
        lazySearch('#search-artists', '#library-artists-list', 'artist',
            '#search-artists-clear');
        lazySearch('#search-albums',  '#library-albums-list',  'album',
            '#search-albums-clear');
        // we only really care about the title (hopefully, only exception is
        // when in the 'all' album)
        createSearch(
            '#search-songs',
            library.search,
            function () {
                $('#library-songs-list .gen').show();
            },
            '#search-songs-clear',
            1000);

        $('#open-library').click(function () {
            settings.saveBrowser('library');
            library.updateArtists(library.artist);
            library.addToHistory();
        });

        $(document).on('click', '#library-artists-list .gen', function () {
            var artist = $(this).data().artist;

            library.updateAlbums(artist);

            // show all songs initially
            library.updateSongs(artist);
        });

        $(document).on('click', '#library-albums-list .gen', function () {
            var artist = $(this).data().artist,
                album  = $(this).data().album;

            library.updateSongs(artist, album);
        });

        $(document).on('click', '.artist-add', function () {
            var artist = $(this).parent().parent().data().artist;
            library.addExternal(libraryArtist, artist);
        });

        $(document).on('click', '.album-add', function () {
            var artist = $(this).parent().parent().data().artist,
                album  = $(this).parent().parent().data().album;
            library.addExternal(libraryAlbum, artist, album);
        });

        $(document).on('dblclick', '.artist', function () {
            var artist = $(this).parent().parent().data().artist;
            library.addExternal(libraryArtist, artist);
        });

        $(document).on('dblclick', '.album', function () {
            var artist = $(this).parent().parent().data().artist,
                album  = $(this).parent().parent().data().album;
            library.addExternal(libraryAlbum, artist, album);
        });

        floatTable('#library-artists-list.table', '#library-artists-wrap');
        floatTable('#library-albums-list.table',  '#library-albums-wrap');
        floatTable('#library-songs-list.table',   '#library-songs-wrap');

        // songs
        // this cannot be part of .song-list because of a bug with sortColumn
        // (overwrites contens from one tabe to other tables).
        tableSort('#library-songs-list', '#library-songs-list-col-number',
                1, 'number');
        tableSort('#library-songs-list', '#library-songs-list-col-title',
                2, 'string');
        tableSort('#library-songs-list', '#library-songs-list-col-artist',
                3, 'string');
        tableSort('#library-songs-list', '#library-songs-list-col-album',
                4, 'string');
        tableSort('#library-songs-list', '#library-songs-list-col-time',
                5, '00:00');

        // artist
        tableSort('#library-artists-list', '#library-col-artist', 1, 'string');

        // album
        tableSort('#library-albums-list', '#library-col-album', 1, 'string');

        multiSelect('#library-songs-list', browser, ['song-add']);
        multiSelect('#library-artists-list',
                libraryArtist, ['artist-add'], ['body'], false);
        multiSelect('#library-albums-list',
                libraryAlbum, ['album-add'], ['body'], false);
    }
};

// the stored playlists
var stored = {
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
    updatePlaylists: function (id, type) {
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
            }

            return;
        } else {
            this.current = 'native';
        }

        console.log('update stored playlists table');

        komponist.listplaylists(function (err, playlists) {
            //console.log(id + ':');
            //console.log(playlists);
            if (err) {
                if (err.message == 'No such file or directory [52@0] {listplaylists}') {
                    var msg = 'Is there a playlist directory and correct write permissions?';
                    history.add(msg, 'danger');
                    toastr.error(msg, 'Cannot read playlist directory!', {
                        'closeButton': true,
                        'positionClass': 'toast-bottom-left',
                        'preventDuplicates': true,
                        'timeOut': '-1',
                        'extendedTimeOut': '-1'
                    });
                }
                html = '<em class="gen">No saved playlists</em>';
                $('#' + id +' .modal-body').append(html);
                return console.log(err);
            }

            if (id == 'playlist-open-modal')
                stored.active = 'open';
            else if (id == 'playlist-save-modal')
                stored.active = 'save';

            $('#' + id +' .modal-body .gen').remove();

            var html = '';

            if (!Array.isArray(playlists))
                playlists = [playlists];

            if (!playlists.length) {
                html = '<em class="gen">No saved playlists</em>';
                $('#' + id +' .modal-body').append(html);
                return console.log('No playlists');
            }

            var i = 0;
            $(playlists).each(function (item, value) {
                komponist.listplaylist(value.playlist, function (err, songs) {
                    if (err) console.log(err);

                    if (!Array.isArray(songs))
                        songs = [songs];

                    value.playlist = value.playlist.replace(/ /g, '\u00a0');
                    html += '<tr class="gen" data-fileid="' + value.playlist + '"><td>' + value.playlist + '</td><td>' + songs.length + '</td><td class="text-right"><span class="faded playlist-remove text-danger glyphicon glyphicon-remove" data-fileid="' + value.playlist + '" title="Remove the playlist"></span></td>';
                    if (++i == playlists.length) {
                        $('#' + id +' .playlists tbody').append(html);
                    }
                });
            });
        });
    },

    // save the playlist. Wrapper for komponist.save()
    save: function (file) {
        file = file.toString().trim().replace(/\u00a0/g, " ");
        var msg = '';

        if (this.current == 'fileids') {
            if (!this.fileArr.length) {
                msg = 'Playlist empty!';
                history.add(msg, 'warning');

                toastr.warning(msg, 'Playlist', {
                    'closeButton': true,
                    'positionClass': 'toast-bottom-left',
                    'preventDuplicates': false
                });

                $('#playlist-save-modal').modal('hide');

                return console.log('empty playlist');
            }

            // overwrite any existing playlist
            komponist.rm(file, function (err, val) {
                // TODO handle error better
                if (err) console.log('No playlist to overwrite, continue...');
                //console.log(stored.fileArr);

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

                $(stored.fileArr).each(function () {
                    // this if statement doesn't actually work, async makes
                    // this loop happen too quickly
                    if (!saved) return false;
                    var song = this;

                    komponist.playlistadd(file, this, function (errPlAdd, val) {
                        err2 = errPlAdd;
                        // I would like to break from the each loop when an error
                        // occurs, but getting that set up is hackish. For now,
                        // it will run the each loop every time an error is
                        // caught
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
                            def.resolve();
                            return console.log(err2);
                        }

                        if (playlist.current == file)
                            updatedCurrentPlaylist = true;

                        if (i == stored.fileArr.length) def.resolve();
                    });
                });

                def.done(function () {
                    // in deferred because the loop can execute the playlistadd multiple times
                    if (invalid) {
                        msg = 'Playlist may not contain slashes, newlines, or carriage returns.';
                        history.add(msg, 'warning');
                        toastr.warning(msg, 'Invalid Characters', {
                            'closeButton': true,
                            'positionClass': 'toast-bottom-left',
                            'preventDuplicates': false,
                            'timeOut': '10000'
                        });
                    } else if (noFile) {
                        msg = 'Is there a playlist directory and correct write permissions?';
                        history.add(msg, 'danger');
                        toastr.error(msg, 'Cannot read playlist directory!', {
                            'closeButton': true,
                            'positionClass': 'toast-bottom-left',
                            'preventDuplicates': true,
                            'timeOut': '-1',
                            'extendedTimeOut': '-1'
                        });
                    } else if (notFound) {
                        // read MESSAGE1
                        msg = 'File not found: ' + err2;
                        history.add(msg, 'danger');
                        toastr.error(msg, 'Playlist', {
                            'closeButton': true,
                            'positionClass': 'toast-bottom-left',
                            'preventDuplicates': true,
                            'timeOut': '-1',
                            'extendedTimeOut': '-1'
                        });
                    } else if (unknown) {
                        msg = err2;
                        history.add(msg, 'danger');
                        toastr.error(msg, 'Unhandled Error', {
                            'closeButton': true,
                            'positionClass': 'toast-bottom-left',
                            'preventDuplicates': true,
                            'timeOut': '-1',
                            'extendedTimeOut': '-1'
                        });
                    }

                    if (saved) {
                        file = file.replace(/ /g, '\u00a0');
                        msg = file + ' playlist saved!';
                        history.add(msg, 'info');

                        toastr.info(msg, 'Playlist update', {
                            'closeButton': true,
                            'positionClass': 'toast-bottom-left',
                            'preventDuplicates': false
                        });

                        if (updatedCurrentPlaylist) {
                            msg = 'You must open the updated playlist for it to update the current playlist.';
                            history.add(msg, 'info');
                            toastr.info(msg + '<button title="Reloads the playlist" class="playlist-reload btn btn-default pull-right"><span class="glyphicon glyphicon-repeat"></span></button>', 'Playlist update', {
                                'closeButton': true,
                                'positionClass': 'toast-bottom-left',
                                'preventDuplicates': false,
                                'timeOut': '-1',
                                'extendedTimeOut': '-1'
                            });
                        }

                        // clear fileArr after saving
                        stored.fileArr = [];
                    }
                });
            });
        } else {
            var trs = $(playlist.table).children('.gen');

            // horrible check, whats the better way to check for
            // 'Empty playlist'?
            if (trs.length < 1 || (
                    trs[0].childNodes[0].childNodes[0].childNodes[0] &&
                    $(trs[0].childNodes[0].childNodes[0].childNodes[0].data).
                    selector == 'Empty playlist')) {
                msg = 'Playlist empty!';
                history.add(msg, 'warning');

                toastr.warning(msg, 'Playlist', {
                    'closeButton': true,
                    'positionClass': 'toast-bottom-left',
                    'preventDuplicates': false
                });

                $('#playlist-save-modal').modal('hide');
                return console.log('playlist empty');
            }

            komponist.rm(file, function (err, val) {
                // TODO check specific error messages
                if (err) console.log('No playlist to overwrite');

                // continue saving...
                komponist.save(file, function (err, val) {
                    file = file.replace(/ /g, '\u00a0');

                    if (err) {
                        console.log(err.message);

                        if (err.message == 'No such file or directory [52@0] {save}') {
                            msg = 'Is there a playlist directory and correct write permissions?';
                            history.add(msg, 'danger');
                            toastr.error(msg, 'Cannot read playlist directory!', {
                                'closeButton': true,
                                'positionClass': 'toast-bottom-left',
                                'preventDuplicates': true,
                                'timeOut': '-1',
                                'extendedTimeOut': '-1'
                            });
                        } else if (err.message == 'playlist name is invalid: playlist names may not contain slashes, newlines or carriage returns [2@0] {save}') {
                            msg = 'Playlist may not contain slashes, newlines, or carriage returns.';
                            history.add(msg, 'warning');
                            toastr.warning(msg, 'Invalid Characters', {
                                'closeButton': true,
                                'positionClass': 'toast-bottom-left',
                                'preventDuplicates': false,
                                'timeOut': '10000'
                            });
                        }
                        return console.log(err);
                    }

                    msg = file + ' playlist saved!';
                    history.add(msg, 'info');
                    toastr.info(msg, 'Playlist update', {
                        'closeButton': true,
                        'positionClass': 'toast-bottom-left',
                        'preventDuplicates': false
                    });

                    socket.send(JSON.stringify({
                            'type': 'playlist-title', 'info': file
                            }), function (err) {
                        if (err) console.log(err);
                    });
                });
            });
        }

        $('#playlist-save-modal').modal('hide');
    },

    // open the playlist. Wrapper for komponist.open()
    open: function (file) {
        file = file.toString().replace(/\u00a0/g, " ");
        if (this.call !== null) {
            console.log('calling fn..');
            this.call(file);
            this.call = null;
        } else {
            console.log('confirm open playlist');
            console.log(file);
            // stops duplicate updating because of socket sending
            playlist.doUpdate = false;

            komponist.clear(function (err) {
                if (err) console.log(err);
            });

            komponist.load(file, function (err) {
                if (err) console.log(err);
            });

            socket.send(JSON.stringify({
                    'type': 'playlist-title', 'info': file
                    }), function (err) {
                if (err) console.log(err);
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
                        if (stored.active == 'open')
                            playlist.openFromStored();
                        else if (stored.active == 'save')
                            playlist.saveFromStored();

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
            var file = $(this).data().fileid.replace(/\u00a0/g, " "),
                that = this;

            // client side deletion, less jaring (stops flashing the list)
            stored.doUpdate = false;

            komponist.rm(file, function (err) {
                if (err) {
                    toastr.error(err, 'Error removing playlist!', {
                        'closeButton': true,
                        'positionClass': 'toast-bottom-left',
                        'preventDuplicates': true,
                        'timeOut': '-1',
                        'extendedTimeOut': '-1'
                    });
                    history.add(err, 'danger');
                    console.log(err);
                } else {
                    $(that).parent().parent().remove();
                }
            });
            console.log('delete playlist ' + file);
        });

        $(document).on('dblclick', '#playlist-open-modal .gen', function () {
            playlist.openFromStored();
        });

        $(document).on('dblclick', '#playlist-save-modal .gen', function () {
            playlist.saveFromStored();
        });

        // reset vars
        $('#playlist-open-modal').on('hidden.bs.modal', function () {
            stored.call = null;
            stored.active = '';
        });

        $('#playlist-save-modal').on('hidden.bs.modal', function () {
            stored.fileArr = [];
            stored.active = '';
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
                if (e.keyCode == 13) playlist.saveFromStored();
            });
        });

        // separate for open and save because of duplication issues
        tableSort('#playlist-open-modal table', '#playlist-open-modal .col-playlists-title', 1, 'string');
        tableSort('#playlist-open-modal table', '#playlist-open-modal .col-playlists-songs', 2, 'number');
        tableSort('#playlist-save-modal table', '#playlist-save-modal .col-playlists-title', 1, 'string');
        tableSort('#playlist-save-modal table', '#playlist-save-modal .col-playlists-songs', 2, 'number');
    }
};

// progress bar simulation for the player
var progressbar = {
    progress: 0,
    musicprogress: 0,

    progressfn: function () {
        // avoid 'this' as it's in a new scope of setInterval
        ++progressbar.progress;
        $('#music-time').val(progressbar.progress);
        $('#time-current').html(toMMSS(progressbar.progress));
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
            komponist.seek(player.current.Pos, this.value, function (err) {
                console.log('Seeking...');
                if (err) console.log('no song playing to seek');
            });
        });
    }
};

// the playlist buffer
var pb = {
    current: null,
    selector: '#pb',
    table: '#pb .append',
    minimized: false,
    // selected items from multiSelect
    selected: [],

    // future: share playlists to edit?
    newLocal: function () {
        if (this.minimized) {
            this.minimized = false;
            this.resume();
        } else if (!pb.current) {
            pb.current = 'local';
            $('#pb').css('display', 'flex');
            this.clear();
        }
    },

    getHtml: function (title, file) {
        var extra = '';
        if (settings.pulse) extra += 'pulse';

        return '<tr class="gen context-menu ' + extra + '" title="' + title + '" data-title="' + title + '" data-fileid="' + file + '"><td class="playlist-song-list-icons"></td><td class="playlist-song-title"><table class="fixed-table"><tr><td>' + title + '</td></tr></table></td><td class="playlist-song-list-icons text-right"><span class="pb-song-remove faded text-danger glyphicon glyphicon-remove" title="Remove song from playlist"></span></td></tr>';
    },

    // file object, position to put song
    // file can be an array of 'file' objects
    addSong: function (file, pos) {
        //console.log('adding song to pb: ' + pb.current);
        //console.log(file);
        pb.removeNothingMessage();

        if (pb.current != 'local') {
            conole.log('not implemented');
        }

        var title, html;
        //console.log(file);

        if (Array.isArray(file)) {
            for (var i = 0; i < file.length; ++i) {
                title = getSimpleTitle(file[i].Title, file[i].Artist,
                    file[i].file);
                html += pb.getHtml(title, file[i].file);
            }
        } else {
            title = getSimpleTitle(file.Title, file.Artist, file.file);
            html = pb.getHtml(title, file.file);
        }

        if (pos >= 0) {
            if (!pos) {
                $(pb.table).prepend(html);
                $('#pb-main').scrollTop($('#pb-song-list'));
            } else {
                //console.log('add to ' + pos);
                $(pb.table + ' > .gen:nth-child(' + (pos) + ')').after(html);
                pb.move();
            }
        } else {
            //console.log('add to bottom');
            $(pb.table).append(html);
            $('#pb-main').scrollTop($('#pb-song-list')[0].scrollHeight);
        }

        pb.initDrag();
        pb.move();
    },

    initDrag: function () {
        $('#pb-song-list .append').sortable({
            items: '.gen',
            appendTo: 'parent',
            helper: 'clone',
            start: function (e, ui) {
                //console.log(e);
                //console.log(ui);
                // check is things are selected before continuing.
                // If right click is outside selected, clear selection
                // (like in all file managers).
                var inside = false;
                for (var i = 0; i < pb.selected.length; ++i) {
                    //console.log(playlist.selected[i]);
                    if (pb.selected[i].isEqualNode(ui.item.context)) {
                        console.log('setting inside to true');
                        inside = true;
                        break;
                    }
                }

                // if its not in playlist.selected, update it.
                if (!inside) {
                    console.log('updating pb.selected');
                    pb.clearSelected();
                }
            },
            update: function (e, ui) {
                var index;

                if (ui.sender) {
                    //console.log(ui.item);
                    index = ui.item.index();
                    pb.fromSender(ui, index);
                }

                if (pb.selected.length) {
                    index = (pb.selected).index(dropped);
                    var dropped = ui.item[0],
                    last;

                    $(pb.selected).each(function (item, tr) {
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

                    pb.clearSelected();
                }
                pb.move();
            },
        }).disableSelection();
    },

    // dragging from another drag table
    // mutliselect is handled in addDir and addfile
    fromSender: function (ui, index) {
        // check if "playlist buffer is empty" is showing
        if (index == 1 && $($(pb.table).children()[0]).hasClass('rem'))
            index = 0;

        // file
        if (browser.selected.length) {
            browser.addMulti(index);
            return;
        } else if ($(ui.item).hasClass('artist') &&
                libraryArtist.selected.length) {
            library.addMulti(libraryArtist, index, true);
            return;
        } else if ($(ui.item).hasClass('album') &&
                libraryAlbum.selected.length) {
            library.addMulti(libraryAlbum, index, true);
            return;
        }

        var artist, album;

        if ($(ui.item).hasClass('file')) {
            var fileName = ui.item.data().fileid;
            pb.addid(fileName, index);
        } else if ($(ui.item).hasClass('directory')) {
            // directory
            var dir = ui.item.data().dirid;
            pb.add(dir, index);
        } else if ($(ui.item).hasClass('album')) {
            artist = $(ui.item).data().artist;
            album  = $(ui.item).data().album;

            library.getSongsFromAlbum(artist, album, function (files) {
                pb.addSong(files, index);
            });
        } else if ($(ui.item).hasClass('artist')) {
            artist = $(ui.item).data().artist;

            library.getSongsFromAlbum(artist, null, function (files) {
                pb.addSong(files, index);
            });
        } else {
            console.log('not supported drag for: ' + $(ui.item).attr('class'));
        }
    },

    // wrapper (similar to komponist.addid)
    addid: function (fileid, pos) {
        komponist.find('file', fileid, function (err, value) {
            if (err) return console.log(err);

            value = value[0];

            if (value.file && !value.directory) {
                //console.log(value);
                pb.addSong(value, pos);
            }
        });
    },

    // add an array so the DOM is only updated once
    // arr: [type][value]
    addArr: function (arr, pos) {
        // converts to a files array for addSong
        var newArr = [],
            j      = 0;

        function callback() {
            pb.addSong(newArr, pos);
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
    add: function (dir, pos) {
        // FUTURE SELF: DO NOT USE LISTALLINFO, IT WILL HAVE THE "OFF BY ONE"
        // BUG, KEEP THIS 'getAllInfo'.
        // Option 1: Loop through all directories recursively running lsinfo
        // Option 2: Run listall, then loop through each item to get metadata
        // Option 1 sends less requests to the server, so we'll implement that.
        // Add All and Multiselect directories is still based on how fast the
        // server can respond per directory (so it can look random)
        getAllInfo(dir, function (files) {
            //console.log(files);
            pb.addSong(files, pos);
        });
    },

    // remove song from the pb
    removeSong: function (element) {
        // multiselect check (any left clicks)
        if (pb.selected.length) {
            $(pb.selected).each(function (item, tr) {
                //console.log(tr);
                $(tr).remove();
            });

            // clear playlist.selected just in case.
            pb.clearSelected();
        } else {
            $(element).remove();
        }

        this.move();
    },

    // just updates the numbers column in the table
    move: function () {
        var pos = 0;
        $(pb.table + ' .gen').each(function () {
            $(this).children().first().html(++pos + '.');
        });

        if (!pos) pb.showNothingMessage();
    },

    // open the playlist to the pb
    open: function (file) {
        komponist.listplaylistinfo(file, function (err, val) {
            if (err) return console.log(err);

            pb.clear();
            pb.addSong(val);
        });
    },

    // clear the pb
    clear: function () {
        $(this.table + ' .gen').remove();
        pb.showNothingMessage();
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
    scramble: function () {
        $(this.table).randomize('.gen');
        this.move();
    },

    // remove duplicate songs in the pb
    removeDuplicates: function () {
        console.log('remove duplicates');
        var duplicate = {};

        $(this.table + ' .gen').each(function () {
            var title = $(this).attr('title');

            if (duplicate[title])
                pb.removeSong(this);
            else
                duplicate[title] = true;
        });
    },

    // move rows to top of pb
    moveToTop: function (tr) {
        if (this.selected.length) {
            $(this.selected).each(function (item, tr) {
                $(tr).prependTo(pb.table);
            });

            this.clearSelected();
        } else {
            $(tr).prependTo(this.table);
        }

        $('#pb-main').scrollTop($('#pb-song-list'));
        this.move();
    },

    // move rows to bottom of pb
    moveToBottom: function (tr) {
        if (this.selected.length) {
            $(this.selected).each(function (item, tr) {
                $(tr).appendTo(pb.table);
            });

            this.clearSelected();
        } else {
            $(tr).appendTo(this.table);
        }

        $('#pb-main').scrollTop($('#pb-song-list')[0].scrollHeight);
        this.move();
    },

    clearSelected: function () {
        $(this.selected).each(function (item, tr) {
            //console.log(tr);
            $(tr).removeClass('info');
        });

        this.selected = [];
    },

    showNothingMessage: function () {
        var html = '<tr class="rem gen"><td><em class="text-muted">The playlist buffer is empty! Songs can be added from the browser or by opening a playlist.</em></td></tr>';
        $(pb.table).append(html);
        pb.initDrag();
    },

    removeNothingMessage: function () {
        $(pb.table + ' .rem').remove();
    },

    initEvents: function () {
        $(document).on('click', '.pb-song-remove', function () {
            var file = $(this).parent().parent();
            pb.removeSong(file);
        });

        $(document).on('click', '#pb-clear', function () { pb.clear(); });

        $(document).on('click', '#pb-close', function () { pb.close(); });

        $(document).on('click', '#pb-save', function () {
            var trs = $(pb.table).children('.gen'),
                fileIds = [];

            for (var i = 0; i < trs.length; ++i)
                fileIds[i] = $(trs[i]).data().fileid;

            stored.updatePlaylists('playlist-save-modal', fileIds);
        });

        $(document).on('click', '#pb-minimize', function () { pb.minimize(); });

        $(document).on('click', '#pb-tab', function () { pb.resume(); });

        $(document).on('click', '#pb-open', function () {
            stored.updatePlaylists('playlist-open-modal', pb.open);
        });

        $(document).on('click', '#pb-scramble', function () { pb.scramble(); });

        $(document).on('click', '#pb-remove-duplicates', function () {
            pb.removeDuplicates();
        });

        multiSelect('#pb-song-list', pb, ['pb-song-remove']);

        $('#pb-search-toggle').click(function () {
            if ($('#pb-search-toggle').hasClass('active')) {
                $('#pb-search-toggle').removeClass('active');
                $('#pb-search').hide();
                $('#search-pb').val('');
                $('#pb-song-list tbody').children().show();
            } else {
                $('#pb-search-toggle').addClass('active');
                $('#pb-search').show();
                $('#search-pb').focus();
            }
        });

        lazySearch('#search-pb',  '#pb-song-list',  'title',
            '#search-pb-clear');
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
        var msg = vote.setTitles(current, id);
        toastr.info(msg, 'Song Skip', {
            'closeButton': true,
            'positionClass': 'toast-bottom-left',
            'preventDuplicates': true
        });
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
            html += '<li class="gen"><a class="no-hover">' + hostnames[ip] + '</a></li>';
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
var history = {
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
var pages = {
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
                Math.ceil(playlist.local.length / this.maxPlaylist);

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
            this.totalBrowser = Math.ceil((browser.localFolders.length +
                    browser.localFiles.length) / this.maxBrowser);

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
            if (page < 1 || page > pages.totalPlaylist) return;

            this.currentPlaylist = parseInt(page);
            $('#playlist-pages input').val(this.currentPlaylist);
            playlist.updateLocal();
            $('#pslwrap').scrollTop($('#playlist-song-list'));
        } else if (type == 'browser' && this.enabledBrowser) {
            if (page < 1 || page > pages.totalBrowser) return;

            this.currentBrowser = parseInt(page);
            $('#browser-pages input').val(this.currentBrowser);
            browser.updateLocal();
            $('#slwrap').scrollTop($('#file-browser-song-list'));
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
            pages.go('playlist', this.value);
        });

        $('#playlist-pages .first').click(function () {
            pages.go('playlist', 1);
        });

        $('#playlist-pages .previous').click(function () {
            pages.go('playlist', pages.currentPlaylist - 1);
        });

        $('#playlist-pages .next').click(function () {
            pages.go('playlist', pages.currentPlaylist + 1);
        });

        $('#playlist-pages .last').click(function () {
            pages.go('playlist', pages.totalPlaylist);
        });

        // browser pages event handling
        $('#browser-pages input').change(function () {
            pages.go('browser', this.value);
        });

        $('#browser-pages .first').click(function () {
            pages.go('browser', 1);
        });

        $('#browser-pages .previous').click(function () {
            pages.go('browser', pages.currentBrowser - 1);
        });

        $('#browser-pages .next').click(function () {
            pages.go('browser', pages.currentBrowser + 1);
        });

        $('#browser-pages .last').click(function () {
            pages.go('browser', pages.totalBrowser);
        });
    }
};

// saved user settings
// since all storage is text, the if statements check if their undefined.
var settings = {
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

        if (theme) settings.theme = theme;

        $('#themes').val(settings.theme);

        $('#theme').load(function () {
            console.log('theme loaded');
            // reflow header on theme change
            reflowAll();
        }).attr('href', '/css/themes/' + settings.theme + '/main.css');
    },

    saveTheme: function (theme) {
        console.log('changed theme');
        localStorage.setItem('mpcp-theme', theme);
        settings.loadTheme();
    },

    loadHistoryMax: function () {
        var max = localStorage.getItem('mpcp-history-max');

        if (max) history.max = max;

        $('#history-max').val(history.max);
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

            if (max) pages.maxPlaylist = parseInt(max);

            $('#items-max-playlist').val(pages.maxPlaylist);
        }

        if (type == 'browser' || type === undefined) {
            max = localStorage.getItem('mpcp-items-max-browser');

            if (max) pages.maxBrowser = parseInt(max);

            $('#items-max-browser').val(pages.maxBrowser);
        }

        if (type !== undefined) pages.update(type);

        if (force && type == 'playlist') playlist.updateLocal();
        if (force && type == 'browser') browser.updateLocal();
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

            if (use) pages.enabledPlaylist = (use === 'true');

            $('#use-pages-playlist').prop('checked', pages.enabledPlaylist);

            if (pages.enabledPlaylist)
                pages.show('playlist');
            else
                pages.hide('playlist');
        }

        if (type == 'browser' || type === undefined) {
            use = localStorage.getItem('mpcp-use-pages-browser');

            if (use) pages.enabledBrowser = (use === 'true');

            $('#use-pages-browser').prop('checked', pages.enabledBrowser);

            if (pages.enabledBrowser)
                pages.show('browser');
            else
                pages.hide('browser');
        }

        if (force && type == 'playlist') playlist.updateLocal();
        if (force && type == 'browser') browser.updateLocal();
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

        if (use && use === 'false') settings.pulse = false;

        $('#use-pulse').prop('checked', settings.pulse);
    },

    savePulse: function (use) {
        console.log('changed pulse');
        settings.pulse = use;

        if (pb.current) {
            if (use)
                $(pb.table).children().addClass('pulse');
            else
                $(pb.table).children().removeClass('pulse');
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

        browser.update();
    },

    loadSkipToRemove: function () {
        var use = localStorage.getItem('mpcp-use-skip-to-remove');

        if (use && use == 'true') {
            playlist.skipToRemove = true;
        } else {
            playlist.skipToRemove = false;
        }

        $('#use-skip-to-remove').prop('checked', playlist.skipToRemove);
    },

    saveSkipToRemove: function (use) {
        console.log('changed skip-to-remove');
        localStorage.setItem('mpcp-use-skip-to-remove', use);
        this.loadSkipToRemove();
    },

    loadBrowser: function (activate) {
        var use = localStorage.getItem('mpcp-browser');

        if (use) settings.browser = use;

        if (activate) {
            if (use && use == 'library') {
                library.show();
                browser.hide();
            } else {
                library.hide();
                browser.show();
            }
        } else {
            settings.lastBrowser = settings.browser;
            library.hide();
            browser.hide();
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

        if (use && use === 'false') settings.consumeWarning = false;

        $('#use-consume-warning').prop('checked', settings.consumeWarning);
    },

    saveConsumeWarning: function (use) {
        console.log('changed consume warning');
        settings.consumeWarning = use;

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
            settings.saveTheme(this.value);
        });

        $('#history-max').change(function () {
            settings.saveHistoryMax(this.value);
        });

        $('#items-max-playlist').change(function () {
            settings.saveItemsMax('playlist', this.value);
        });

        $('#items-max-browser').change(function () {
            settings.saveItemsMax('browser', this.value);
        });

        $('#use-pages-playlist').change(function () {
            var use = $(this).prop('checked');
            settings.savePagination('playlist', use);
        });

        $('#use-pages-browser').change(function () {
            var use = $(this).prop('checked');
            settings.savePagination('browser', use);
        });

        $('#use-pulse').change(function () {
            var use = $(this).prop('checked');
            settings.savePulse(use);
        });

        $('#use-unknown').change(function () {
            var use = $(this).prop('checked');
            settings.saveUnknown(use);
        });

        $('#use-skip-to-remove').change(function () {
            var use = $(this).prop('checked');
            settings.saveSkipToRemove(use);
        });

        $('#show-all-errors').change(function () {
            var use = $(this).prop('checked');
            settings.saveShowAllErrors(use);
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
            settings.saveConsumeWarning(use);
        });
    }
};

// the video (audio) player
var video = {
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
        video.download(url);
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
            video.downloadFromPlayer();
        });

        $('#download-player-play').click(function () {
            video.play();
        });

        $('#download-player-pause').click(function () {
            video.pause();
        });

        $('#download-player-stop').click(function () {
            video.stop();
        });

        // 'input change' allows arrow keys to work
        $('#download-player-volume').on('input change', function () {
            video.setVolume(this.value);
        });

        // detect enter key
        $('#download-player-url').keyup(function (e) {
            if (e.keyCode == 13) {
                var url = $('#download-player-url').val();
                video.download(url);
            }
        });
    }
};

// called in socket init
function initAfterConnection() {
    console.log('initAfterConnection');
    //player.updateAll(); // inside of playlist.updateTitle
    player.updateMixer();
    //playlist.updateAll(); // inside of playlist.updateTitle
    //browser.update(); // done lower in the function
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
        browser.show();
        request = decodeURIComponent(request);
        browser.search(request);
        $('#search-browser').val(request);
    } else if (action == 'library') {
        library.decodeRequest(request);
    } else if (action == 'browser') {
        browser.show();
        browser.current  = request;
        browser.previous = request;
        browser.update();
    } else {
        // else check settings
        if (settings.browser == 'library') {
            library.show();
            library.updateArtists();
        } else {
            browser.show();
            browser.update();
        }
    }

    browser.initEvents();

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
            player.updateAll();
            break;

        case 'playlist':
            playlist.updateAll();
            break;

        case 'mixer':
            player.updateMixer();
            break;

        case 'options':
            player.updateControls();
            break;

        case 'update':
            browser.update();
            updateStats();
            break;

        case 'stored_playlist':
            stored.updatePlaylists('playlist-open-modal');
            stored.updatePlaylists('playlist-save-modal');
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
            'type': 'playlist-reload', 'info': playlist.current
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
            playlist.updateTitle(msg['playlist-title']);
            vote .enabled =      msg['song-vote'];
            video.setVolume(     msg['player-volume']);
            video.setStatus(     msg['player-status']);
            video.setTitle (     msg['player-title']);
            initAfterConnection();
            break;

        // playlist
        // when song is playing, the playlist doesn't get updated,
        // this is used to force the update
        case 'clear-playlist':
            console.log('user clear-playlist called');
            playlist.updateTitle('');
            //player.updateAll(); // inside playlist.updateAll
            playlist.updateAll();
            break;

        case 'update-playlist':
            console.log('user update-playlist called');
            playlist.updateAll();
            break;

        case 'update-browser':
            console.log('user update-browser called');
            browser.doUpdate = true;
            browser.update();
            updateStats();
            break;

        case 'playlist-title':
            playlist.updateTitle(msg.info);
            break;

        // player
        case 'song-next':
            msg.info += ' skipped to the next song.';
            history.add(msg.info, 'info');

            // don't show notification if only 1 person is using the client
            if (users.total <= 1) return;

            toastr.info(msg.info, 'Song Skipped', {
                'closeButton': true,
                'positionClass': 'toast-bottom-left',
                'preventDuplicates': true,
                'timeOut': '10000'
            });
            break;

        case 'song-previous':
            msg.info += ' skipped to the previous song.';
            history.add(msg.info, 'info');

            // don't show notification if only 1 person is using the client
            if (users.total <= 1) return;

            toastr.info(msg.info, 'Song Skipped', {
                'closeButton': true,
                'positionClass': 'toast-bottom-left',
                'preventDuplicates': true,
                'timeOut': '10000',
            });
            break;

        // stored
        case 'playlist-reload':
            stored.open(msg.info);
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
                str += 'skipped: ' + player.title + '.';
                toastr.info(str, 'Song Skip', {
                    'closeButton': true,
                    'positionClass': 'toast-bottom-left',
                    'preventDuplicates': true
                });
                history.add(str, 'info');
            } else
                history.add('Skipped: ' + player.title, 'info');

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
            video.setStatus('Downloading and converting video...');
            break;

        case 'download-video-title':
            console.log('received download player title: ' + msg.info);
            video.setTitle(msg.info);
            break;

        case 'download-video-play':
            video.setStatus('Playing...');
            break;

        case 'download-video-pause':
            //console.log(msg.info);
            if (msg.info) {
                video.setStatus('Paused...');
            } else {
                video.setStatus('Playing...');
            }
            break;

        case 'download-video-stop':
            video.setStatus('Stopping...');
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
    disconnect.callSocketClose();
};

// server disconnect handling
var disconnect = {
    secInterval: null,
    retryTimeout: null,

    callSocketClose: function () {
        clearInterval(this.secInterval);
        clearTimeout(this.retryTimeout);

        console.log('WebSocket disconnected');
        // timeout to not show if refreshing the page
        setTimeout(function () {
            var msg = 'The page will refresh when it comes back online.';
            history.add(msg, 'danger');
            toastr.error(msg + '<br>Retrying in <span id="count">1</span> second(s)... <button title="Force a retry" class="retry-server btn btn-warning pull-right"><span class="glyphicon glyphicon-repeat"></span></button>', 'Server Disconnected!', {
                'closeButton': true,
                'positionClass': 'toast-bottom-left',
                'timeOut': '-1',
                'extendedTimeOut': '-1'
            });
        }, 200);
        this.retryWebSocket(1);
    },

    retryWebSocket: function (attempts) {
        socket = new WebSocket('ws://' + host);

        socket.onclose = function () {
            var seconds = attempts;
            $('#count').html(seconds--);

            disconnect.secInterval = setInterval(function () {
                $('#count').html(seconds--);
            }, 1000);

            disconnect.retryTimeout = setTimeout(function () {
                clearInterval(disconnect.secInterval);
                console.log('WebSocket closed, retrying... ' + attempts);
                // Connection has closed so try to reconnect every few seconds
                // max is 5 seconds
                if (attempts < 5) ++attempts;
                disconnect.retryWebSocket(attempts);
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
            disconnect.callSocketClose();
        });
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
        library.hide();
        browser.show();
        if (folder === '') folder = '/';
        browser.update(folder, true);
    } else if (option == 'search') {
        var search = url.replace('/search/', '');
        browser.search(search, true);
    } else if (option == 'library') {
        var request = document.location.pathname.replace('/library/', '');
        library.decodeRequest(request);
    } else {
        // unknown, use settings.browser
        if (settings.lastBrowser == 'library') {
            browser.hide();
            library.show();
            library.decodeRequest();
        } else {
            library.hide();
            browser.show();
            browser.update('/', true);
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
            playlist.moveToTop(tr.data().fileid);
            break;
        case 'mtbPlaylist':
            playlist.moveToBottom(tr.data().fileid);
            break;
        case 'mtc':
            playlist.moveToCurrent(tr);
            break;
        case 'remPlaylist':
            playlist.remove(tr);
            break;
        case 'play':
            playlist.play(tr);
            break;
        // pb
        case 'mttPb':
            pb.moveToTop(tr);
            break;
        case 'mtbPb':
            pb.moveToBottom(tr);
            break;
        case 'remPb':
            pb.removeSong(tr);
            break;
        case 'infoBrowser':
            browser.getSongInfo(tr.data().fileid);
            break;
        case 'infoPlaylist':
            playlist.getSongInfo(tr.data().file);
            break;
    }

    // browser
    // directory
    if ($(tr).hasClass('directory')) {
        var dirid = tr.data().dirid;

        switch(key) {
            case 'attPlaylist':
                if (browser.selected.length) {
                    browser.addMulti(0);
                } else {
                    playlist.addDir(dirid, 0);
                }
                break;
            case 'attPb':
                if (browser.selected.length) {
                    browser.addMulti(0);
                } else {
                    pb.add(dirid, 0);
                }
                break;
            case 'atbPlaylist':
                if (browser.selected.length) {
                    browser.addMulti();
                } else {
                    playlist.addDir(dirid);
                }
                break;
            case 'atbPb':
                if (browser.selected.length) {
                    browser.addMulti();
                } else {
                    pb.add(dirid);
                }
                break;
            case 'atc':
                playlist.addToCurrent(dirid, 'dir');
                break;
        }
    }

    // file
    if ($(tr).hasClass('file')) {
        var fileid = tr.data().fileid;

        switch(key) {
            case 'attPlaylist':
            case 'attPb':
                browser.addExternal(fileid, 0);
                break;
            case 'atbPlaylist':
            case 'atbPb':
                browser.addExternal(fileid);
                break;
            case 'atc':
                browser.addExternal(fileid, player.current.Pos + 1);
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
                    library.addExternal(
                        libraryArtist, artist, album, 0, false);
                else if ($(tr).hasClass('album'))
                    library.addExternal(
                        libraryAlbum, artist, album, 0, false);
                break;
            case 'atbPlaylist':
            case 'atbPb':
                if ($(tr).hasClass('artist'))
                    library.addExternal(
                        libraryArtist, artist, album, undefined, false);
                else if ($(tr).hasClass('album'))
                    library.addExternal(
                        libraryAlbum, artist, album, undefined, false);
                break;
            case 'atc':
                if ($(tr).hasClass('artist') && libraryArtist.selected.length) {
                    library.addExternal(libraryArtist, artist, album,
                        player.current.Pos + 1, false);
                } else if ($(tr).hasClass('album') && libraryAlbum.selected.length) {
                    library.addExternal(libraryAlbum, artist, album,
                        player.current.Pos + 1, false);
                } else {
                    library.getSongsFromAlbum(artist, album, function (files) {
                        for (var i = 0; i < files.length; ++i) {
                            playlist.addToCurrent(files[i].file, 'file');
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
                //console.log(playlist.selected[i]);
                if (obj.selected[i].isEqualNode(e.currentTarget)) {
                    console.log('setting inside to true');
                    inside = true;
                    break;
                }
            }
        }

        checkInside(playlist);
        checkInside(browser);
        checkInside(pb);
        checkInside(libraryArtist);
        checkInside(libraryAlbum);

        // if its not in .selected, update it.
        if (!inside) {
            //console.log('updating .selected');
            playlist.clearSelected();
            pb.      clearSelected();
            browser. clearSelected();

            libraryArtist.saveSelected();
            libraryArtist.clearSelected();
            libraryAlbum. saveSelected();
            libraryAlbum. clearSelected();
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
        if (pb.current && table.attr('id') != 'playlist-song-list') {
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
            if (player.current)
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
            else if (!player.current)
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
            if (player.current)
                items = {
                    'title':       {name: title},
                    'attPlaylist': {name: 'Add to top of playlist'},
                    'atc':         {name: 'Add after current playing song'},
                    'atbPlaylist': {name: 'Add to bottom of playlist'}
                };
            // song is not playing
            else if (!player.current)
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
                if (player.current)
                    items = {
                        'title':       {name: title},
                        'attPlaylist': {name: 'Add to top of playlist'},
                        'atc':         {name: 'Add after current playing song'},
                        'atbPlaylist': {name: 'Add to bottom of playlist'}
                    };
                // song is not playing
                else if (!player.current)
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
            if (libraryArtist.saved.length) {
                libraryArtist.restoreSelected();
            }
            if (libraryAlbum.saved.length) {
                libraryAlbum.restoreSelected();
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
function multiSelect(ele, obj, cancel, exclude, deselect) {
    var disable = ['tbody'];

    if (exclude) disable = disable.concat(exclude);

    if (deselect === undefined) deselect = true;

    // enable mutltiselect for the browser
    $(ele).multiSelect({
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

settings.loadAll();

progressbar.initEvents();
player     .initEvents();
playlist   .initEvents();
// gets called in initAfterConnection(). For some reason it was setting the
// current page to /browser/ when sharing a link
//browser    .initEvents();
settings   .initEvents();
pages      .initEvents();
pb         .initEvents();
history    .initEvents();
stored     .initEvents();
video      .initEvents();
disconnect .initEvents();
library    .initEvents();

});

