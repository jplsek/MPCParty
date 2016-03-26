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
        days    = Math.floor(secNum / (60 * 60 * 24)),
        hours   = Math.floor(secNum / (60 * 60)) - (days * 24),
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

        var i = 0;
        for (i; i < elems.length; ++i) $this.append(elems[i]);
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

    komponist.lsinfo(dir, function (err, files) {
        if (err) {
            console.log(err);
            callback(arr);
        }

        // make object to array (single items usually ... hopefully)
        if (!Array.isArray(files))
            files = [files];

        if (!files.length) callback(arr);

        //console.log(files);
        var i = 0;

        $(files).each(function (item, value) {
            if (value.directory && value.file) {
                // ignore?
                if (++i == files.length) {
                    callback(arr);
                }
            } else if (value.directory) {
                // recurse through directory
                getAllInfo(value.directory, function (newArr) {
                    arr = arr.concat(newArr);

                    if (++i == files.length) {
                        callback(arr);
                    }
                });
            } else if (value.file) {
                // add file
                arr.push(value);

                if (++i == files.length) {
                    callback(arr);
                }
            } else {
                // fallback (such as empty directories)
                if (++i == files.length) {
                    callback(arr);
                }
            }
        });
    });
}

// update database statistics to the client
function updateStats() {
    komponist.stats(function (err, stats) {
        //console.log(stats);
        var html = '<small>' + stats.artists + ' artists, ' + stats.albums + ' albums, ' + stats.songs + ' songs (' + toFriendlyDDHHMM(stats.db_playtime) + '). Last database update: ' + new Date(stats.db_update * 1000).toLocaleString() + '</small>';
        //console.log(html);
        $('#stats').html(html);
    });
}

// sometimes when komponist returns a length 0 or 1 item, it returns an object
// instead of any array. This is used to fix that. (less need for jquery.each)
function toArray(obj) {
    if (!Array.isArray(obj))
        return [obj];
    else
        return obj;
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
            if (err) return console.log(err);

            //console.log(song);

            if ($.isEmptyObject(song)) {
                $('#title-text').html
                    ('<em title="No song selected">No song selected</em>');
                document.title = 'MPCParty';
                $('#title-pos').html('');
                $('#time-total').html('-- / --');
                player.current = null;
                return console.log('No song selected');
            }

            player.title = getSimpleTitle(song.Title, song.Artist, song.file);

            if (player.current && player.current.file != song.file) {
                history.add('Playing: ' + player.title);
            }

            player.current = song;

            $('#title-text').html(player.title).attr('title', player.title);
            document.title =  player.title + ' - MPCParty';
            $('#title-pos').html((parseInt(song.Pos) + 1) + '. ');
            $('#music-time').attr('max', song.Time);
            $('#time-total').html(' / ' + toMMSS(song.Time));

            // highlight song in playlist with song.Id and data-fileid
            // this happens with only a player update
            $('#playlist-song-list .gen').each(function () {
                var id = $(this).data().fileid;
                if (parseInt(id) == parseInt(player.current.Id)) {
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
            }
            if (parseInt(status.random) == 1) {
                $('#random').addClass('active');
            }

            // repeat
            if (parseInt(status.repeat) === 0) {
                $('#repeat').removeClass('active');
            }
            if (parseInt(status.repeat) == 1) {
                $('#repeat').addClass('active');
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
                komponist.next(function (err) {
                    if (err) console.log(err);
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
                komponist.previous(function (err) {
                    if (err) console.log(err);
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

        // searching the database, instant searching is "slowed"
        // for better client and server performance
        var searchInterval;
        var lastVal = '';
        $('#search-browser').focus(function () {
            // makes the instant search not as instant (instead of
            // relying on every keyUp)
            searchInterval = setInterval(function () {
                var searchVal = $('#search-browser').val();
                //console.log('attempting searching for ' + searchVal);
                if (searchVal && searchVal != lastVal) {
                    browser.search(searchVal);
                    lastVal = searchVal;
                } else if (searchVal === '' && lastVal !== '') {
                    browser.update();
                }
            }, 3000);
        });

        $('#search-browser').focusout(function () {
            clearInterval(searchInterval);
            var searchVal = $('#search-browser').val();
            if (searchVal === '' && lastVal !== '') {
                lastVal = '';
                browser.update();
            }
        });

        $('#search-clear').click(function () {
            //console.log('clearing search');
            $('#search-browser').val('');
            $('#search-browser').focus();
            lastVal = '';
            browser.update();
        });

        // detect enter key
        $('#search-browser').keyup(function (e) {
            if (e.keyCode == 13) {
                var searchVal = $('#search-browser').val();
                //console.log('attempting searching for ' + searchVal);
                if (searchVal === '') {
                    browser.update();
                } else {
                    browser.search(searchVal);
                    lastVal = searchVal;
                }
            }
        });
    }
};

// the playlist
var playlist = {
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

    // used to update the current playlist
    updateAll: function () {
        console.log('updating playlist');

        // reset list
        playlist.list = {files: [], positions: []};

        if (this.isSearching) {
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
                        var html = '<tr class="gen"><td><em>Empty playlist</em></td></tr>';
                        $('#playlist-song-list').append(html);
                        // fix for removing the last song that's
                        // playling from the playlist
                        playlist.doUpdate = true;
                        player.updateAll();
                        pages.update('playlist');
                        browser.updatePosition();
                        return console.log('Empty playlist');
                    }

                    // TODO figure out a way to use playlist.local efficiently
                    // with browser.updatePlaylist instead of utilizing
                    // playlist.list
                    for (var i in playlist.local) {
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
            // item start and end from current page
            start =  (pages.currentPlaylist - 1) * pages.maxPlaylist,
            end   = ((pages.currentPlaylist - 1) * pages.maxPlaylist) +
                pages.maxPlaylist;

        //console.log(end);

        for (var i in playlist.local) {
            var value = playlist.local[i];
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
            if (player.current && parseInt(value.Id) ==
                    parseInt(player.current.Id))
                current += ' bg-success';

            if (settings.pulse)
                for (var j in playlist.toPulse) {
                    if (playlist.toPulse[j] == value.Id) {
                        // pulses twice because of lag
                        current += ' pulse2';
                        break;
                    }
                }
            //console.log(i + ': start');

            html += '<tr class="drag context-menu ' + current + '" title="' + title + '" data-fileid="' + value.Id + '" data-file="' + value.file + '" data-pos="' + value.Pos +  '"><td class="playlist-song-list-icons"><span class="glyphicon glyphicon-play song-play faded text-success" title="Play song"></span>' + (parseInt(value.Pos) + 1) + '.</td><td class="playlist-song-title"><table class="fixed-table"><tr><td>' + title + '</td></tr></table></td><td class="playlist-song-list-icons text-right"><span class="song-remove faded text-danger glyphicon glyphicon-remove" title="Remove song from playlist"></span></td></tr>';

        }

        playlist.toPulse = [];

        $('#playlist-song-list .append').append(html);

        // draggable playlist event
        $('#playlist-song-list .append').sortable({
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
                //console.log(pages.currentPlaylist);
                //console.log(ui.item.index());
                // grabs the item that used to be in that position.
                // grabs the pos as newIndex
                var newPos = $('#playlist-song-list .gen').
                        eq(ui.item.index() + 1).data().pos;

                var oldPos = $('#playlist-song-list .gen').
                        eq(ui.item.index()).data().pos;

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

    // drag and drop came from a different table
    fromSender: function (ui, newIndex) {
        //console.log(ui.item);
        var file;
        if (browser.selected.length)
            browser.selected = browser.selected.toArray().reverse();

        // file
        // note: multiselect is checked in addDir and addSong!
        if ($(ui.item).hasClass('file')) {
            file = ui.item.data().fileid;
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

    // addSong, if multiselect, it sends to addMulti
    addSong: function (file, to, dontScroll) {
        console.log('adding song to playlist');

        if (browser.selected.length) {
            this.addMulti(to, dontScroll);
        } else {
            if (!dontScroll)
                if (to === undefined || isNaN(to)) {
                    pages.go('playlist', pages.totalPlaylist);
                    this.scrollDown = true;
                } else {
                    this.goToPos(to);
                }

            this.addid(file, to);
        }
    },

    // addDir, if multiselect, it sends to addMulti
    addDir: function (dir, to, dontScroll) {
        console.log('adding dir to playlist');

        // check multiselect
        if (browser.selected.length) {
            this.addMulti(to, dontScroll);
        } else {
            if (!dontScroll)
                if (to === undefined || isNaN(to)) {
                    pages.go('playlist', pages.totalPlaylist);
                    this.scrollDown = true;
                } else {
                    this.goToPos(to);
                }

            this.add(dir, to);
        }
    },

    // add from multiselect
    addMulti: function (to, dontScroll) {
        console.log('addMulti to playlist');

        if (!dontScroll)
            if (to === undefined || isNaN(to)) {
                pages.go('playlist', pages.totalPlaylist);
                this.scrollDown = true;
            } else {
                this.goToPos(to);
            }

        if (!to) browser.selected = browser.selected.toArray().reverse();

        // TODO when there is both a file and directory, it will refresh
        // the playlist twice (then the browser twice). This also semi-brakes
        // the pulsing effect
        $(browser.selected).each(function (item, tr) {
            if ($(tr).hasClass('file')) {
                var file = $(tr).data().fileid;
                playlist.addid(file, to);
            } else if ($(tr).hasClass('directory')) {
                var dir = $(tr).data().dirid;
                playlist.add(dir, to);
            }
        });

        browser.clearSelected();
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
        var newPos = parseInt(player.current.Pos) + 1;
        this.goAfterUpdate = true;

        if (browser.selected.length)
            browser.selected = browser.selected.toArray().reverse();

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

        var newPos = parseInt(player.current.Pos) + 1;

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
                    newPos = parseInt(player.current.Pos) + 1 + item;
                // currently playing song is below file to be moved
                else if ((player.current && player.current.Pos > pos) ||
                        player.current)
                    newPos = parseInt(player.current.Pos);
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
                newPos = parseInt(player.current.Pos) + 1;
            // currently playing song is below file to be moved
            else if ((player.current && player.current.Pos > pos) ||
                    player.current)
                newPos = parseInt(player.current.Pos);
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
        // scroll to top to avoid scrolling bugs
        $('#pslwrap').scrollTop($('#playlist-song-list'));

        // go to the page the song is playing on
        this.goToPos(player.current.Pos);
        // try to go above the element, so the item is semi-centered
        var to = (player.current.Pos % pages.maxPlaylist) - 5;

        if (to < 1) to = 1;

        console.log('scroll to ' + to);

        var toOffset = $('#playlist-song-list .append .gen:nth-child(' +
            to + ')');

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
        if (!val)
            val = playlist.searchTerm;
        else
            playlist.searchTerm = val;

        // set to true (in case of after clicking clear)
        this.isSearching = true;

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
            console.log('confirm save playlist');
            var file = $('#playlist-save-input').val();
            stored.save(file);
        });

        $('#playlist-open-confirm').click(function () {
            if ($('#playlist-open-modal .selected').length) {
                var file = $('#playlist-open-modal .selected').data().fileid;
                stored.open(file);
            }
        });

        $('#clear-playlist').click(function () {
            console.log('clear playlist');

            socket.send(JSON.stringify(
                    {'type': 'playlist-title', 'info': ''}), function (err) {
                if (err) console.log(err);
            });

            komponist.clear(function (err) {
                if (err) console.log(err);
            });
        });

        $('#playlist-search-toggle').click(function () {
            if ($('#playlist-search-toggle').hasClass('active')) {
                $('#playlist-search-toggle').removeClass('active');
                $('#playlist-search').hide();
                playlist.isSearching = false;
                $('#search-playlist').val('');
                lastVal = '';
                playlist.searchTerm = '';
                playlist.updateAll();
            } else {
                $('#playlist-search-toggle').addClass('active');
                $('#playlist-search').show();
                $('#search-playlist').focus();
                playlist.isSearching = true;
            }
        });

        // searching the database, instant searching is "slowed"
        // for better client and server performance
        var searchInterval;
        var lastVal = '';
        $('#search-playlist').focus(function () {
            // makes the instant search not as instant (instead of
            // relying on every keyUp)
            searchInterval = setInterval(function () {
                var searchVal = $('#search-playlist').val();
                //console.log('attempting searching for ' + searchVal);
                if (searchVal && searchVal != lastVal) {
                    playlist.search(searchVal);
                    lastVal = searchVal;
                } else if (searchVal === '' && lastVal !== '') {
                    playlist.updateLocal();
                }
            }, 3000);
        });

        $('#search-playlist').focusout(function () {
            clearInterval(searchInterval);
            var searchVal = $('#search-playlist').val();
            if (searchVal === '' && lastVal !== '') {
                lastVal = '';
                // to not confuse the user
                playlist.isSearching = false;
                playlist.updateAll();
            }
        });

        $('#search-playlist-clear').click(function () {
            //console.log('clearing search');
            $('#search-playlist').val('');
            $('#search-playlist').focus();
            // to not confuse the user
            playlist.isSearching = false;
            lastVal = '';
            playlist.updateAll();
        });

        // detect enter key
        $('#search-playlist').keyup(function (e) {
            if (e.keyCode == 13) {
                var searchVal = $('#search-playlist').val();
                //console.log('attempting searching for ' + searchVal);
                if (searchVal === '') {
                    playlist.updateAll();
                } else {
                    playlist.search(searchVal);
                    lastVal = searchVal;
                }
            }
        });

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

    // check which dir the user is in.
    // only update that dir
    update: function (dir, poppedState) {

        // db update (ignore back / forward buttons)
        if (!dir && !poppedState && !this.doUpdate) {
            console.log('do not update browser...');
            // doUpdate gets set to true in the onMessage update-browser
            //this.doUpdate = true;
            return;
        }

        if (dir) this.current = dir;

        //console.log('previous directory: ' + this.previous);
        console.log('reloading directory: ' + this.current);

        if ((!poppedState && this.previous != this.current) ||
                (!poppedState && this.searching)) {
            this.searching = false;
            if (this.current == '/' || this.current === '') {
                console.log('adding / to history');
                window.history.pushState('', 'MPCParty', '/');
            } else {
                console.log('adding /browser/' + this.current + ' to history');
                window.history.pushState('', this.current + ' - MPCParty',
                    '/browser/' + this.current);
            }

            $('#slwrap').scrollTop($('#song-list'));
        }
        browser.updateBrowser(this.current);

        if (dir) this.previous = dir;
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
            i     = 0;

        if (this.current != '/')
            for (i; i < dirs.length; ++i) {
                html += '<li class="loc-dir" data-fileid="' + dirId + '">' +
                    dirs[i] + '</li>';
                dirId += '/' + dirs[i+1];
            }

        $('#location ol').append(html);

        komponist.lsinfo(directory, function (err, files) {
            //console.log(files);

            $('#song-list .gen').remove();
            browser.localFolders = [];
            browser.localFiles = [];
            files = toArray(files);

            if (!files.length) {
                html = '<tr class="directory gen"><td colspan="6">' +
                    '<em>Empty directory</em></td></tr>';
                $('#song-list').append(html);
                pages.update('browser');
                return console.log('Empty directory');
            }

            var html = '';

            for (i in files) {
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
    search: function (name, poppedState) {
        console.log('browser.search: ' + name);

        komponist.search('any', name, function (err, files) {
            if (err) return console.log(err);

            // do this after (in case of error)
            $('#song-list .gen').remove();
            browser.searching = true;
            browser.searchTerm = name;
            browser.localFolders = [];
            browser.localFiles = [];
            var html;

            if ($.isEmptyObject(files[0])) {
                html = '<tr class="directory gen"><td colspan="6">' +
                    '<em>No songs found</em></td></tr>';
                $('#song-list').append(html);
                pages.update('browser');
                return console.log('No songs found');
            }

            html = '';

            for (var i in files) {
                html = browser.getHtmlFiles(files[i]);

                if (html !== '')
                    browser.localFiles.push(html);
            }

            if (!poppedState) {
                console.log('pushing history search');
                window.history.pushState('', name + ' - MPCParty',
                    '/search/' + name);
            }

            browser.updateLocal();
        });
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
        var tr = $('#song-list tbody').children();

        komponist.currentsong(function (err, song) {
            if ($.isEmptyObject(song))
                player.current = null;
            else
                player.current = song;

            if (player.current) {
                $('#title-pos').html((parseInt(player.current.Pos) + 1) + '. ');
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
            if ((browser.localFolders[0] &&
                    Object.getOwnPropertyNames(
                        browser.localFolders[0]).length <= 0) &&
                    (browser.localFiles[0] && Object.getOwnPropertyNames(
                        browser.localFiles[0]).length <= 0))
                return;
            else if (browser.localFolders.length <= 0 &&
                    browser.localFiles.length <= 0)
                return;
        }

        $('#song-list .gen').remove();
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

        for (i; i < browser.localFiles.length; ++i) {
            if (current > end || current - browser.localFolders.length >
                    browser.localFiles.length)
                break;

            html += browser.localFiles[i];
            current++;
        }

        $('#song-list .append').append(html);

        //console.log(current);

        // draggable bowser
        // used: jsfiddle.net/BrianDillingham/v265q/320
        $('#song-list .append').sortable({
            items: 'tr.gen',
            connectWith: '.connected',
            placeholder: 'no-placeholder',
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
            },
            // above flothead and pb
            zIndex: 1003
        }).disableSelection();

        browser.updatePosition();
        pages.update('browser');
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
            komponist.lsinfo(browser.current, function (err, files) {
                //console.log(files);

                if (err) return console.log(err);

                files = toArray(files);

                if (!files.length) {
                    return console.log('Empty directory');
                }

                $(files).each(function (item, value) {
                    if (value.directory) {
                        if (pb.current !== null)
                            pb.addDir(value.directory);
                        else
                            komponist.add(value.directory, function (err) {
                                if (err) console.log(err);
                            });
                    }

                    if (value.file) {
                        if (pb.current !== null)
                            pb.addFile(value.file);
                        else
                            komponist.add(value.file, function (err) {
                                if (err) console.log(err);
                            });
                    }
                });
            });
        }
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
            if (pb.current !== null)
                pb.addFile(file);
            else
                playlist.addSong(file);
        });

        $(document).on('dblclick', '#song-list tr.file', function () {
            var file = $(this).data().fileid;
            if (pb.current !== null)
                pb.addFile(file);
            else
                playlist.addSong(file);
        });

        $(document).on('dblclick', '#song-list tr.directory', function () {
            var dir = $(this).data().dirid;
            browser.update(dir);
        });

        $(document).on('click', '#song-list .folder-open', function () {
            var dir = $(this).parent().parent().data().dirid;
            browser.update(dir);
        });

        $(document).on('click', '.dir-add', function () {
            var dir = $(this).parent().parent().data().dirid;
            if (pb.current !== null)
                pb.addDir(dir);
            else
                playlist.addDir(dir);
        });

        $(document).on('click', '.loc-dir', function () {
            var file = $(this).data().fileid;
            //console.log(file);
            browser.update(file);
        });

        // add all songs from browser.current
        $('#add-all').click(function () {
            browser.addAll();
        });
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
                    html += '<tr class="gen" data-fileid="' + value.playlist + '"><td>' + value.playlist + '</td><td>' + songs.length + '</td><td class="text-right"><span class="faded playlist-remove text-danger glyphicon glyphicon-remove" data-fileid="' + value.playlist + '"></span></td>';
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

                //console.log(stored.fileArr);
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
                                // if this error happens, it *might* be the
                                // fault of js, as somehow the string is
                                // getting stripped. Restarting the server
                                // fixes this issue, but I'd like this to get
                                // fixed...
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
            var trs = $('#playlist-song-list .append').children('.gen');

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
            // bg to td instead of tr because of override
            $('.playlists td').removeClass('bg-primary');
            $(this).removeClass('selected');
            $(this).children().addClass('bg-primary');
            $(this).addClass('selected');
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
            var file = $(this).data().fileid;
            stored.open(file);
        });

        $(document).on('dblclick', '#playlist-save-modal .gen', function () {
            var file = $('#playlist-save-input').val();
            stored.save(file);
        });

        $(document).on('click', '#playlist-save-modal .gen', function () {
            console.log('appending playlist to text');
            var file = $(this).data().fileid;
            $('#playlist-save-input').val(file);
        });

        // reset vars
        $('#playlist-open-modal').on('hidden.bs.modal', function () {
            stored.call = null;
        });

        $('#playlist-save-modal').on('hidden.bs.modal', function () {
            stored.fileArr = [];
        });
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
        } else {
            pb.current = 'local';
            $('#pb').css('display', 'flex');
            this.count = 0;
            this.clear();
        }
    },

    getHtml: function (title, file) {
        var extra = '';
        if (settings.pulse) extra += 'pulse';

        return '<tr class="gen context-menu ' + extra + '" title="' + title + '" data-fileid="' + file + '"><td class="playlist-song-list-icons"></td><td class="playlist-song-title"><table class="fixed-table"><tr><td>' + title + '</td></tr></table></td><td class="playlist-song-list-icons text-right"><span class="pb-song-remove faded text-danger glyphicon glyphicon-remove" title="Remove song from playlist"></span></td></tr>';
    },

    // file object, position to put song
    // file can be an array of 'file' objects
    addSong: function (file, pos) {
        //console.log('adding song to pb: ' + pb.current);
        //console.log(file);

        if (pb.current != 'local') {
            conole.log('not implemented');
        }

        var title, html;
        //console.log(file);

        if (Array.isArray(file)) {
            for (var i in file) {
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

        // draggable playlist
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

        pb.move();
    },

    // dragging from another drag table
    // mutliselect is handled in addDir and addfile
    fromSender: function (ui, index) {
        // file
        if ($(ui.item).hasClass('file')) {
            var fileName = ui.item.data().fileid;
            pb.addFile(fileName, index);
        } else if ($(ui.item).hasClass('directory')) {
            // directory
            var dir = ui.item.data().dirid;
            pb.addDir(dir, index);
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

    // add file to pb
    addFile: function (file, pos) {
        if (browser.selected.length) {
            pb.addMulti(pos);
        } else {
            pb.addid(file, pos);
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
            pb.addSong(files, pos);
        });
    },

    // add dir to pb
    addDir: function (dir, pos) {
        if (browser.selected.length) {
            pb.addMulti(pos);
        } else {
            pb.add(dir, pos);
        }
    },

    // multi-select adding to pb
    addMulti: function (pos) {
        $(browser.selected).each(function (item, tr) {
            if ($(tr).hasClass('file')) {
                var file = $(tr).data().fileid;
                pb.addid(file, pos++);
            } else if ($(tr).hasClass('directory')) {
                var dir = $(tr).data().dirid;
                console.log(dir);
                pb.add(dir, pos++);
            }
        });

        browser.clearSelected();
    },

    // remove song from the pb
    removeSong: function (element) {
        // multiselect check (any left clicks)
        if (pb.selected.length) {
            $(pb.selected).each(function (item, tr) {
                //console.log(tr);
                $(tr).remove();
                --this.count;
            });

            // clear playlist.selected just in case.
            pb.clearSelected();
        } else {
            $(element).remove();
            --this.count;
        }

        this.move();
    },

    // just updates the numbers column in the table
    move: function () {
        var pos = 0;
        $(pb.table + ' .gen').each(function () {
            $(this).children().first().html(++pos + '.');
        });
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
        this.count = 0;
        $(this.table + ' .gen').remove();
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
            this.selected = this.selected.toArray().reverse();

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
    }
};

// vote to skip (most of it is server side)
var vote = {
    // gets from socket connection
    received: false,
    enabled: false,
    clients: 1,
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
            ' from ' + vote.clients + ' clients.';
        $('#' + id).attr('title', msg);
        return msg;
    }
};

// may utilize in the future for logging users who has voted and for
// sharing pb's with other users
var users = {
    //ip:hostname
    hostnames: {},

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
            $('#slwrap').scrollTop($('#song-list'));
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
    pulse: true,
    // 'unknown' text
    unknown: 'unknown',

    // initially load all the settings
    loadAll: function () {
        this.loadTheme();
        this.loadHistoryMax();
        this.loadItemsMax();
        this.loadPagination();
        this.loadShowAllErrors();
        this.loadPulse();
        this.loadUnknown();
    },

    loadTheme: function () {
        var theme = localStorage.getItem('mpcp-theme');

        if (theme) settings.theme = theme;

        $('#themes').val(settings.theme);

        $('#theme').load(function () {
            console.log('theme loaded');
            // reflow header on theme change
            $('#song-list.table').trigger('reflow');
        }).attr('href', '/css/themes/' + settings.theme + '.css');
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
            settings.unknown = '';
            $('#use-unknown').prop('checked', false);
        } else {
            settings.unknown = 'unknown';
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

    initEvents: function () {
        // settings event handling
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

        $('#show-all-errors').change(function () {
            var use = $(this).prop('checked');
            settings.saveShowAllErrors(use);
        });

        $('#crossfade').on('input change', function () {
            komponist.crossfade(this.value, function (err) {
                if (err) console.log(err);
            });
        });
    }
};

// the video (audio) player
var video = {
    // download the video
    download: function (url) {
        if (url !== '') socket.send(JSON.stringify(
                {'type': 'download-video', 'info': url}), function (err) {
            if (err) console.log(err);
        });
    },

    // play the Player (after download)
    play: function () {
        socket.send(JSON.stringify(
                {'type': 'download-video-play'}), function (err) {
            if (err) console.log(err);
        });
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
            var url = $('#download-player-url').val();
            video.download(url);
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

function updateAll() {
    //player.updateAll(); // inside of playlist.updateTitle
    player.updateMixer();
    //playlist.updateAll(); // inside of playlist.updateTitle
    //browser.update(); // done lower in the function
    updateStats();

    // sometimes the socket doesn't send the vote updates,
    // this is used for that
    var voteCheck = setInterval(function () {
        if (socket.readyState == 1) {
            setTimeout(function () {
                if (!vote.received) {
                    console.log('server didnt send votes, asking for votes');
                    socket.send(JSON.stringify(
                            {'type': 'get-votes'}), function (err) {
                        if (err) console.log(err);
                    });
                }
            }, 100);
            clearInterval(voteCheck);
        }
    }, 100);

    var path = window.location.pathname.
        slice(1, window.location.pathname.length).
        replace(/%20/g, ' '),
    action = path.slice(0, path.indexOf('/')),
    request = path.slice(path.indexOf('/') + 1, path.length);

    //console.log(path);
    //console.log(action);
    //console.log(request);

    if (action == 'search') {
        browser.search(request);
        $('#search-browser').val(request);
    } else {
        browser.current  = request;
        browser.previous = request;
        browser.update();
    }
}

komponist.once('ready', updateAll, false);

komponist.on('changed', function (system) {
    console.log('changed: ' + system);

    switch (system) {
        case 'player':
            player.updateAll();
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

    // I don't really know what's going on here (past me didn't put a comment),
    // but I'll allow it for now
    if (system == 'playlist' && playlist.doUpdate) {
        playlist.updateAll();
    } else {
        playlist.doUpdate = true;
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
            vote.clients  = msg['total-clients'];
            vote.needed   = msg['song-skip-total'];
            vote.setTitles( msg['song-skip-previous'], 'previous');
            vote.setTitles( msg['song-skip-next'], 'next');
            break;

        case 'init':
            playlist.updateTitle(msg['playlist-title']);
            vote .enabled = msg['song-vote'];
            video.setVolume(msg['player-volume']);
            video.setStatus(msg['player-status']);
            video.setTitle (msg['player-title']);
            break;

        // playlist
        // when song is playing, the playlist doesn't get updated,
        // this is used to force the update
        case 'clear-playlist':
            console.log('user clear-playlist called');
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

            if (vote.clients != 1) {
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
        browser.update(folder, true);
    } else if (option == 'search') {
        var search = url.replace('/search/', '');
        browser.search(search, true);
    } else {
        // fallback to browser (poppedState is empty)
        folder = url.replace('/browser/', '');
        browser.update(folder, true);
    }
};

// table sorting
var sortOrder1='asc';
$(document).on('click', '#col-number', function () {
    if (sortOrder1=='asc') {
        $('#song-list').sortColumn({
            index: 1, order: 'desc', format: 'number'
        });
        sortOrder1='desc';
    } else {
        $('#song-list').sortColumn({
            index: 1, order: 'asc', format: 'number'
        });
        sortOrder1='asc';
    }
});

var sortOrder2='asc';
$(document).on('click', '#col-title', function () {
    if (sortOrder2=='asc') {
        $('#song-list').sortColumn({
            index: 2, order: 'desc', format: 'string'
        });
        sortOrder2='desc';
    } else {
        $('#song-list').sortColumn({
            index: 2, order: 'asc', format: 'string'
        });
        sortOrder2='asc';
    }
});

var sortOrder3='asc';
$(document).on('click', '#col-artist', function () {
    if (sortOrder3=='asc') {
        $('#song-list').sortColumn({
            index: 3, order: 'desc', format: 'string'
        });
        sortOrder3='desc';
    } else {
        $('#song-list').sortColumn({
            index: 3, order: 'asc', format: 'string'
        });
        sortOrder3='asc';
    }
});

var sortOrder4='asc';
$(document).on('click', '#col-album', function () {
    if (sortOrder4=='asc') {
        $('#song-list').sortColumn({
            index: 4, order: 'desc', format: 'string'
        });
        sortOrder4='desc';
    } else {
        $('#song-list').sortColumn({
            index: 4, order: 'asc', format: 'string'
        });
        sortOrder4='asc';
    }
});

var sortOrder5='asc';
$(document).on('click', '#col-time', function () {
    if (sortOrder5=='asc') {
        $('#song-list').sortColumn({
            index: 5, order: 'desc', format: '00:00'
        });
        sortOrder5='desc';
    } else {
        $('#song-list').sortColumn({
            index: 5, order: 'asc', format: '00:00'
        });
        sortOrder5='asc';
    }
});

// playlists table sorting
// separate for open and save because of duplication issues
var sortOrder6='asc';
$(document).on('click', '#playlist-open-modal .col-playlists-title', function () {
    if (sortOrder6=='asc') {
        $('#playlist-open-modal table').sortColumn({
            index: 1, order: 'desc', format: 'string'
        });
        sortOrder6='desc';
    } else {
        $('#playlist-open-modal table').sortColumn({
            index: 1, order: 'asc', format: 'string'
        });
        sortOrder6='asc';
    }
});

var sortOrder7='asc';
$(document).on('click', '#playlist-open-modal .col-playlists-songs', function () {
    if (sortOrder7=='asc') {
        $('#playlist-open-modal table').sortColumn({
            index: 2, order: 'desc', format: 'number'
        });
        sortOrder7='desc';
    } else {
        $('#playlist-open-modal table').sortColumn({
            index: 2, order: 'asc', format: 'number'
        });
        sortOrder7='asc';
    }
});

var sortOrder8='asc';
$(document).on('click', '#playlist-save-modal .col-playlists-title', function () {
    if (sortOrder8=='asc') {
        $('#playlist-save-modal table').sortColumn({
            index: 1, order: 'desc', format: 'string'
        });
        sortOrder8='desc';
    } else {
        $('#playlist-save-modal table').sortColumn({
            index: 1, order: 'asc', format: 'string'
        });
        sortOrder8='asc';
    }
});

var sortOrder9='asc';
$(document).on('click', '#playlist-save-modal .col-playlists-songs', function () {
    if (sortOrder9=='asc') {
        $('#playlist-save-modal table').sortColumn({
            index: 2, order: 'desc', format: 'number'
        });
        sortOrder9='desc';
    } else {
        $('#playlist-save-modal table').sortColumn({
            index: 2, order: 'asc', format: 'number'
        });
        sortOrder9='asc';
    }
});

// seperate scrolling for main
$('#song-list.table').floatThead({
    position: 'fixed',
    scrollContainer: function ($table) {
        return $table.closest('#slwrap');
    },
    autoReflow: true
});

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

        if (key == 'attPlaylist')
            playlist.addDir(dirid, 0);
        else if (key == 'attPb')
            pb.addDir(dirid, 0);

        if (key == 'atbPlaylist')
            playlist.addDir(dirid);
        else if (key == 'atbPb')
            pb.addDir(dirid);

        if (key == 'atc') playlist.addToCurrent(dirid, 'dir');
    }

    // file
    if ($(tr).hasClass('file')) {
        var fileid = tr.data().fileid;

        if (key == 'attPlaylist')
            playlist.addSong(fileid, 0);
        else if (key == 'attPb')
            pb.addFile(fileid, 0);

        if (key == 'atbPlaylist') playlist.addSong(fileid);
        if (key == 'atbPb') pb.addFile(fileid);
        if (key == 'atc') playlist.addToCurrent(fileid, 'file');
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

        for (i = 0; i < playlist.selected.length; ++i) {
            //console.log(playlist.selected[i]);
            if (playlist.selected[i].isEqualNode(e.currentTarget)) {
                console.log('setting inside to true');
                inside = true;
                break;
            }
        }

        for (i = 0; i < browser.selected.length; ++i) {
            //console.log(browser.selected[i]);
            if (browser.selected[i].isEqualNode(e.currentTarget)) {
                console.log('setting inside to true');
                inside = true;
                break;
            }
        }

        for (i = 0; i < pb.selected.length; ++i) {
            //console.log(playlist.selected[i]);
            if (pb.selected[i].isEqualNode(e.currentTarget)) {
                console.log('setting inside to true');
                inside = true;
                break;
            }
        }

        // if its not in .selected, update it.
        if (!inside) {
            //console.log('updating .selected');
            playlist.clearSelected();
            pb.      clearSelected();
            browser. clearSelected();
        }

        var table = $trigger.parent().parent(),
            items = {},
            // can't get the title of contextmenu to work, so I'm using a menu
            // item as a title.
            title = $trigger.attr('title');

        if (table.attr('id') == 'song-list')
            title = $trigger.children('td:nth-child(2)').attr('title');

        //console.log($trigger);
        //console.log(title);

        // only apply when playlist buffer is active and not right clicking
        // the playlist
        if (pb.current !== null && table.attr('id') != 'playlist-song-list') {
            // browser
            if (table.attr('id') == 'song-list') {
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
            }
        }
        // only on playlist
        else if (table.attr('id') == 'playlist-song-list') {
            // song is playing
            if (player.current !== null)
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
            else if (player.current === null)
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
        else if (table.attr('id') == 'song-list') {
            // song is playing
            if (player.current !== null)
                items = {
                    'title':       {name: title},
                    'attPlaylist': {name: 'Add to top of playlist'},
                    'atc':         {name: 'Add after current playing song'},
                    'atbPlaylist': {name: 'Add to bottom of playlist'}
                };
            // song is not playing
            else if (player.current === null)
                items = {
                    'title':       {name: title},
                    'attPlaylist': {name: 'Add to top of playlist'},
                    'atbPlaylist': {name: 'Add to bottom of playlist'}
                };

            if (!$($trigger).hasClass('directory'))
                items.infoBrowser = {name: 'Song information'};
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
    }
});

// disable form submissions because everything runs on a single page
$('form').submit(function (e) {
    e.preventDefault();
    return false;
});

// MultiSelect. Multiselections  handled by playlist.*. Events handled in
// callback and contextMenu.
$('#playlist-song-list').multiSelect({
    actcls: 'info',
    selector: 'tr.gen',
    callback: function (items, e) {
        // don't clear playlist.selected when clicking song-remove
        // and if song-remove is part of the playlist.selected list
        //console.log(e);
        //console.log(items);
        //console.log(playlist.selected);

        // checks if song-remove clicked is inside the playlist.selected
        // so it wont delete previous playlist.selected if it was
        // clicked outside of playlist.selected
        var inside = false;
        for (var i = 0; i < playlist.selected.length; ++i) {
            //console.log(playlist.selected[i]);
            if ($(e.target).hasClass('song-remove') &&
                    playlist.selected[i].isEqualNode(e.currentTarget)) {
                console.log('plms: setting inside to true');
                inside = true;
                break;
            }
        }

        // if its not in playlist.selected, update it.
        if (!inside) {
            //console.log('updating playlist.selected');
            playlist.selected = items;
        }
    }
});

// enable mutltiselect for the browser
$('#song-list').multiSelect({
    actcls: 'info',
    selector: 'tr.gen',
    callback: function (items, e) {
        // don't clear browser.selected when clicking song-add
        // and if song-remove is part of the playlist.selected list
        //console.log(e);
        //console.log(items);
        //console.log(playlist.selected);

        // checks if song-remove clicked is inside the playlist.selected
        // so it wont delete previous playlist.selected if it was
        // clicked outside of playlist.selected
        var inside = false;
        for (var i = 0; i < browser.selected.length; ++i) {
            //console.log(browser.selected[i]);
            if (($(e.target).hasClass('song-add') ||
                    $(e.target).hasClass('dir-add')) &&
                    browser.selected[i].isEqualNode(e.currentTarget)) {
                console.log('slms: setting inside to true');
                inside = true;
                break;
            }
        }

        // if its not in browser.selected, update it.
        if (!inside) {
            //console.log('updating playlist.selected');
            browser.selected = items;
        }
    }
});

// enable multiselect for the playlist buffer
$('#pb-song-list').multiSelect({
    actcls: 'info',
    selector: 'tr.gen',
    callback: function (items, e) {
        // don't clear pb.selected when clicking song-remove
        // and if song-remove is part of the playlist.selected list
        //console.log(e);
        //console.log(items);
        //console.log(playlist.selected);

        // checks if pb-song-remove clicked is inside the playlist.selected
        // so it wont delete previous playlist.selected if it was
        // clicked outside of playlist.selected
        var inside = false;
        for (var i = 0; i < pb.selected.length; ++i) {
            //console.log(pb.selected[i]);
            if ($(e.target).hasClass('pb-song-remove') &&
                    pb.selected[i].isEqualNode(e.currentTarget)) {
                console.log('pbms: setting inside to true');
                inside = true;
                break;
            }
        }

        // if its not in pb.selected, update it.
        if (!inside) {
            //console.log('updating playlist.selected');
            pb.selected = items;
        }
    }
});

// enables resizable playlist buffer
$('#pb').resizable({
    handles: 'n, w, s, e, nw, ne, sw, se',
    minHeight: 140,
    minWidth: 140
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

settings.loadAll();

progressbar.initEvents();
player     .initEvents();
playlist   .initEvents();
browser    .initEvents();
settings   .initEvents();
pages      .initEvents();
pb         .initEvents();
history    .initEvents();
stored     .initEvents();
video      .initEvents();
disconnect .initEvents();

});

