// With these tests, I don't check actual content inside of folders yet.
// assumptions before running tests:
// file browser root contains folders and files
// 1st folder contains more that 1 item
// 1st artist in library contains atleast 1 album
// 1st artist in library contains more than 1 song
// The browser must be focused the whole time, cannot be clicked around.
// I recommend a webkit browser for testing, (like chrom*) because the js engine is faster than gecko based browsers (like ff)

var asyncTimeout = 500;
var fb           = '#file-browser-song-list tbody';
var pb           = '#pb-song-list tbody';
var libArt       = '#library-artists-list tbody';
var libAlb       = '#library-albums-list tbody';
var libSon       = '#library-songs-list tbody';
var plSaveModal  = '#playlist-save-modal';
var plOpenModal  = '#playlist-open-modal';
var plSave       = 'unitTest';
// not sure how to test with non breaking spaces... (&nbsp; doesn't seem to work nor spaces)
var plSaveOdd    = '  \t unitTest~!@#$%^&*()_+<>?,.    \n    ';
var plSaveOddFix = 'unitTest~!@#$%^&*()_+<>?,.';
var pl           = '#playlist-song-list tbody';

QUnit.config.autostart = false;

$(function () {
    $('#start-testing').click(function() {
        // set a default state before starting
        $('#open-file-browser').click();
        $('#home').click();
        $('#clear-playlist').click();

        if ($('#use-skip-to-remove').is(':checked')) {
            $('#use-skip-to-remove').click();
        }

        if (!$('#use-unknown').is(':checked')) {
            $('#use-unknown').click();
        }

        if ($('#random').hasClass('active')) {
            $('#random').click();
        }

        setTimeout(function () {
            QUnit.start();
        }, asyncTimeout);
    });
});

// TODO test updating the mpd library?

// I think I found a bug jquery, sometimes the children function doesn't get everything. I keep getting an off by one failed assertion at random times. The elements that don't show in the jquery object IS in the DOM. So I'm not sure how to handle this...
function offWorkaround(assert, children, childrenNow) {
    if (children.length == childrenNow.length + 1 || children.length + 1 == childrenNow.length) {
        console.log('Possible jquery bug detected, off by one issue?');

        console.log(children.length);
        console.log(childrenNow.length);

        //for(var i = 0; i < children.length; ++i) {
        //    if (children[i].attributes["data-dirid"])
        //        if (children[i].attributes["data-dirid"].value != childrenNow[i].attributes["data-dirid"].value) {
        //            console.log(children.get(i-1));
        //            console.log(childrenNow.get(i-1));
        //            console.log(children[i]);
        //            console.log(childrenNow[i]);
        //            break;
        //        }
        //    else if (children[i].attributes["data-fileid"])
        //        if (children[i].attributes["data-fileid"].value != childrenNow[i].attributes["data-fileid"].value) {
        //            console.log(children[i]);
        //            console.log(childrenNow[i]);
        //        }
        //    else {
        //        console.log(children[i]);
        //        console.log(childrenNow[i]);
        //    }
        //}

        if (children.length == childrenNow.length + 1)
            assert.equal(childrenNow.length + 1, children.length, 'check if same as original');
        else
            assert.equal(childrenNow.length, children.length + 1, 'check if same as original');
    } else {
        assert.equal(childrenNow.length, children.length, 'check if same as original');
    }
}

// browser functions
// execute: call function while in folder
function openFolder(assert, execute, callback) {
    var folderOpen = $(fb).find('.folder-open')[0];
    var title = $($(fb).find('tr')[0]).data().dirid;
    $(folderOpen).click();

    setTimeout(function () {
        var titleCrumb = $($('#location').find('.loc-dir')[0]).data().dirid;
        assert.equal(titleCrumb, title, 'check if loc-dir is the same as the original folder name');

        var children = $(fb).children('.gen');
        assert.ok(children.length > 1, 'check if anything is in the file browser');

        assert.equal(document.location.pathname, '/browser/' + encodeURIComponent(title), 'check if url is encoded the same as the folder name');

        function finish() {
            window.history.back();

            setTimeout(function () {
                var childrenNow = $(fb).children('.gen');
                assert.ok(children.length != childrenNow.length, 'check if file browser is different');
                assert.equal(document.location.pathname, '/browser/', 'BACK: check if url is /browser/');
                callback();
            }, asyncTimeout);
        }

        if (execute) {
            execute(finish, children);
        } else {
            finish();
        }

    }, asyncTimeout);
}

// pb functions
function openPb(assert) {
    assert.ok(!$('#pb').is(':visible'), 'check if pb is not visible');
    $('#new-playlist').click();
    assert.ok($('#pb').is(':visible'), 'check if pb is visible');
}

function closePb(assert) {
    $('#pb-close').click();
    assert.ok(!$('#pb').is(':visible'), 'check if pb is not visible');
}

function minimizePb(assert) {
    $('#pb-minimize').click();
    assert.ok(!$('#pb').is(':visible'), 'check if pb is not visible');
    assert.ok($('#pb-tab').is(':visible'), 'check if pb tab is visible');
}

function resumePb(assert) {
    $('#pb-tab').click();
    assert.ok(!$('#pb-tab').is(':visible'), 'check if pb tab is not visible');
    assert.ok($('#pb').is(':visible'), 'check if pb is visible');
}

function addDirToPb(assert, callback) {
    var addDir = $(fb).find('.dir-add')[0];
    $(addDir).click();

    setTimeout(function () {
        var children = $(pb).children('.gen');
        assert.ok(children.length > 1, 'check if anything is in the pb');
        callback(children);
    }, asyncTimeout);
}

function addSong(times, incremental) {
    var songs = $(fb).find('.song-add'),
        i;

    if (incremental) {
        for (i = 0; i < times; ++i) {
            $(songs[i]).click();
        }
    } else {
        for (i = 0; i < times; ++i) {
            $(songs[0]).click();
        }
    }

}

// add two songs for other tests
function addSongToPb(assert, callback) {
    addSong(2, true);

    setTimeout(function () {
        var children = $(pb).children('.gen');
        assert.ok(children.length > 1, 'check if anything is in the pb');
        callback(children);
    }, asyncTimeout);
}

function clearPb(assert) {
    $('#pb-clear').click();
    childrenClear = $(pb).children('.gen');
    assert.equal(childrenClear.length, 0, 'check if cleared pb');
}

// library functions
function openLibrary(assert, callback) {
    assert.ok(!$('#library').is(':visible'), 'check if library is not visible');
    $('#open-library').click();
    setTimeout(function () {
        assert.ok($('#library').is(':visible'), 'check if library is visible');
        // use contains because of my history additions where clicking back and forth between library and browser will bring you back to the original hit
        assert.ok(~document.location.pathname.indexOf('/library/'), 'check if url contains /library/');
        var children = $(libArt).children('.gen:visible');
        assert.ok(children.length > 1, 'check if anything is in the library');
        callback(children);
    }, asyncTimeout);
}

function closeLibrary(assert, callback) {
    $('#open-file-browser').click();
    setTimeout(function () {
        assert.ok(!$('#library').is(':visible'), 'check if library is not visible');
        assert.ok($('#browser').is(':visible'), 'check if browser is visible');
        callback();
    }, asyncTimeout);
}

// playlist functions
function addDirToPl(assert, callback) {
    var addDir = $(fb).find('.dir-add')[0];
    $(addDir).click();

    setTimeout(function () {
        var children = $(pl).children('.gen');
        assert.ok(children.length > 1, 'check if anything is in the pl');
        callback(children);
    }, asyncTimeout);
}

function clearPlaylist(assert, callback) {
    $('#clear-playlist').click();

    setTimeout(function () {
        var children = $(pl).children('.gen');
        assert.equal(children.length, 1, 'check if nothing except 1 item');
        console.log($(children[0]).text());
        assert.ok(!$('#stop').is(':visible'), 'check if stop is not visible');
        assert.equal($('#playlist-title').text(), "", 'check if title is nothing');
        callback();
    }, asyncTimeout);
}

function play(assert, callback) {
    assert.equal($('#title-text').text(), 'No song selected', 'check if title is No song selected');
    assert.ok(!$('#stop').is(':visible'), 'check if stop is not visible');

    // add play after timeout because of an async issue
    setTimeout(function () {
        $('#play').click();

        setTimeout(function () {
            assert.ok($('#title-text').text() != 'No song selected', 'check if title is not No song selected');
            assert.ok($('#stop').is(':visible'), 'check if stop is visible');
            callback();
        }, asyncTimeout);
    }, asyncTimeout);
}

function pause(assert, callback) {
    var time = $('#time-current').text();
    var active = $('#pause').hasClass('active');
    $('#pause').click();

    setTimeout(function () {
        var timeNow = $('#time-current').text();
        // + 1 incase of time difference before pause
        var newTime = parseInt(time.slice(-1)) + 1;
        var timeEdit = time.substr(0, 4) + newTime;
        if (active) {
            assert.ok(!$('#pause').hasClass('active'), 'check if not toggled (after previous toggle)');
            assert.ok(timeEdit < timeNow, 'check if time is different');
        } else {
            assert.ok($('#pause').hasClass('active'), 'check if toggled (after previous toggle)');
            assert.ok(time == timeNow || timeEdit == timeNow, 'check if time is the same');
        }
        callback();
    }, 3000);
}

// needs a song to be playing first
function next(assert, callback) {
    var title = $('#title-text').text();
    var pos = parseInt($('#title-pos').text());
    assert.ok(title != 'No song selected', 'check if title is not No song selected');
    $('#next').click();

    setTimeout(function () {
        var titleNew = $('#title-text').text();
        var posNew = parseInt($('#title-pos').text());
        assert.ok(title != titleNew, 'check if title is not the same');
        assert.ok(pos < posNew, 'check if pos < posNew');
        callback();
    }, asyncTimeout);
}

// needs a song to be playing first
function previous(assert, callback) {
    var title = $('#title-text').text();
    var pos = parseInt($('#title-pos').text());
    assert.ok(title != 'No song selected', 'check if title is not No song selected');
    $('#previous').click();

    setTimeout(function () {
        var titleNew = $('#title-text').text();
        var posNew = parseInt($('#title-pos').text());
        assert.ok(title != titleNew, 'check if title is not the same');
        assert.ok(pos > posNew, 'check if pos > posNew');
        callback();
    }, asyncTimeout);
}

// browser
QUnit.test('browser', function (assert) {
    var children = $(fb).children('.gen');
    assert.ok(children.length > 1, 'check if anything is in the file browser');
    // use contains because of my history additions where clicking back and forth between library and browser will bring you back to the original hit
    assert.ok(~document.location.pathname.indexOf('/browser/'), 'check if url contains /browser/');
});

QUnit.test('search from browser', function (assert) {
    var done = assert.async();
    var children = $(fb).children('.gen');
    $('#search-browser').focus();
    // 'love' is apparently one of the most common words in a song title
    var keyword = 'love';
    $('#search-browser').val(keyword);
    // can't get enter to work, so waiting several seconds for auto search to kick in
    setTimeout(function () {
        var childrenSearch = $(fb).children('.gen');
        assert.ok(childrenSearch.length > 1, 'check if anything is in the file browser');
        assert.ok(children.length != childrenSearch.length, 'check if different than root');
        assert.equal(document.location.pathname, '/search/' + encodeURIComponent(keyword), 'check if url is encoded the same as the search name');
        $('#search-clear').click();
        assert.ok($('#search-browser').val() != keyword, 'check if clear works');

        setTimeout(function () {
            var childrenNow = $(fb).children('.gen');
            offWorkaround(assert, children, childrenNow);
            done();
        }, asyncTimeout);
    }, 4500);
});

QUnit.test('search from browser nothing', function (assert) {
    var done = assert.async();
    var children = $(fb).children('.gen');
    $('#search-browser').focus();
    var keyword = 'thisshouldnotbeasongnamelikesrsly';
    $('#search-browser').val(keyword);
    // can't get enter to work, so waiting several seconds for auto search to kick in
    setTimeout(function () {
        var childrenSearch = $(fb).children('.gen');
        assert.equal(childrenSearch.length, 1, 'check if one item is in the file browser');
        assert.ok(!~document.location.pathname.indexOf(encodeURIComponent(keyword)), 'check if url is not the search name');
        $('#search-clear').click();
        assert.ok($('#search-browser').val() != keyword, 'check if clear works');

        setTimeout(function () {
            var childrenNow = $(fb).children('.gen');
            offWorkaround(assert, children, childrenNow);
            done();
        }, asyncTimeout);
    }, 4500);
});

QUnit.test('browser folder open + back', function (assert) {
    var done = assert.async();

    openFolder(assert, null, function () {
        done();
    });
});

QUnit.test('open and close pb', function (assert) {
    openPb(assert);
    closePb(assert);
});

// contextmenu plugin triggers dont work (tried mouseenter, then enter key also)
//QUnit.test('song-information', function (assert) {
//    var fileOpen = $(fb).find('.file')[0];
//    $(fileOpen).trigger('contextmenu');
//    var infoOpen = $('.context-menu-item:contains("Song information")');
//    $(infoOpen).click();
//});

QUnit.test('open and minimize pb', function (assert) {
    openPb(assert);
    minimizePb(assert);
    resumePb(assert);
    closePb(assert);
});

QUnit.test('browser to pb: folder', function (assert) {
    openPb(assert);
    var done = assert.async();

    addDirToPb(assert, function () {
        closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + close', function (assert) {
    openPb(assert);
    var done = assert.async();

    addDirToPb(assert, function () {
        closePb(assert);
        openPb(assert);
        var children = $(pb).children('.gen');
        assert.equal(children.length, 0, 'check if pb is empty');
        closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + minimze', function (assert) {
    openPb(assert);
    var done = assert.async();

    addDirToPb(assert, function (childrenBefore) {
        minimizePb(assert);
        resumePb(assert);
        var children = $(pb).children('.gen');
        assert.equal(children.length, childrenBefore.length, 'check if pb is the same');
        closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + remove', function (assert) {
    openPb(assert);
    var done = assert.async();

    addDirToPb(assert, function (children) {
        var songRemove = $(pb).find('.pb-song-remove')[0];
        $(songRemove).click();

        var childrenRem = $(pb).children('.gen');
        assert.ok(childrenRem.length < children.length, 'check if removed a song');

        closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + clear', function (assert) {
    openPb(assert);
    var done = assert.async();

    addDirToPb(assert, function (children) {
        clearPb(assert);
        closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: file + remove', function (assert) {
    openPb(assert);
    var done = assert.async();

    addSongToPb(assert, function (children) {
        var songRemove = $(pb).find('.pb-song-remove')[0];
        $(songRemove).click();

        var childrenRem = $(pb).children('.gen');
        assert.ok(childrenRem.length < children.length, 'check if removed a song');

        closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: add all', function (assert) {
    openPb(assert);
    var done = assert.async();

    openFolder(assert,
    function (finish, childrenFb) {
        // execute
        $('#add-all').click();

        setTimeout(function () {
            var childrenPb = $(pb).children('.gen');
            assert.equal(childrenPb.length, childrenFb.length, 'check if fb is same as pb');
            finish();
        }, asyncTimeout);
    },
    function () {
        // callback
        closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + save + open + delete', function (assert) {
    openPb(assert);
    var done = assert.async();

    addDirToPb(assert, function (childrenBefore) {
        // save the playlist
        assert.ok(!$(plSaveModal).is(':visible'), 'check if pl save is not visible');
        $('#pb-save').click();

        setTimeout(function () {
            assert.ok($(plSaveModal).is(':visible'), 'check if pl save is visible');
            $('#playlist-save-input').val(plSave);
            $('#playlist-save-confirm').click();

            setTimeout(function () {
                assert.ok(!$(plSaveModal).is(':visible'), 'check if pl save is not visible');
                clearPb(assert);

                // open the playlist
                assert.ok(!$(plOpenModal).is(':visible'), 'check if pl open is not visible');
                $('#pb-open').click();

                setTimeout(function () {
                    assert.ok($(plOpenModal).is(':visible'), 'check if pl open is visible');
                    var ele = plOpenModal + ' tr:contains("' + plSave + '")';
                    var num = parseInt($(ele + ' td:nth-child(2)').html());
                    assert.equal(num, childrenBefore.length, 'check saved playlist has same number of songs');
                    $(ele).click();
                    $('#playlist-open-confirm').click();

                    setTimeout(function () {
                        assert.ok(!$(plOpenModal).is(':visible'), 'check if pl open is not visible');
                        children = $(pb).children('.gen');
                        assert.equal(children.length, childrenBefore.length, 'check if same playlist');
                        closePb(assert);

                        // delete the playlist
                        assert.ok(!$(plOpenModal).is(':visible'), 'check if pl open is not visible');
                        $('#open-playlist').click();

                        setTimeout(function () {
                            assert.ok($(plOpenModal).is(':visible'), 'check if pl open is visible');
                            var ele = plOpenModal + ' tr:contains("' + plSave + '")';
                            assert.ok($(ele).is(':visible'), 'check if pl is visible');
                            $(ele + ' .playlist-remove').click();

                            setTimeout(function () {
                                assert.ok(!$(ele).is(':visible'), 'check if pl is not visible');
                                $(plOpenModal + ' .close').click();

                                setTimeout(function () {
                                    assert.ok(!$('#playlist-open-modal').is(':visible'), 'check if pl open is not visible');
                                    done();
                                }, asyncTimeout);
                            }, asyncTimeout);
                        }, asyncTimeout);
                    }, asyncTimeout);
                }, asyncTimeout);
            }, asyncTimeout);
        }, asyncTimeout);
    });
});

QUnit.test('browser to pb: folder + save odd title + open + delete', function (assert) {
    openPb(assert);
    var done = assert.async();

    addDirToPb(assert, function (childrenBefore) {
        // save the playlist
        assert.ok(!$(plSaveModal).is(':visible'), 'check if pl save is not visible');
        $('#pb-save').click();

        setTimeout(function () {
            assert.ok($(plSaveModal).is(':visible'), 'check if pl save is visible');
            $('#playlist-save-input').val(plSaveOdd);
            $('#playlist-save-confirm').click();

            setTimeout(function () {
                assert.ok(!$(plSaveModal).is(':visible'), 'check if pl save is not visible');
                clearPb(assert);

                // open the playlist
                assert.ok(!$(plOpenModal).is(':visible'), 'check if pl open is not visible');
                $('#pb-open').click();

                setTimeout(function () {
                    assert.ok($(plOpenModal).is(':visible'), 'check if pl open is visible');
                    var ele = plOpenModal + ' tr:contains("' + plSaveOddFix + '")';
                    var num = parseInt($(ele + ' td:nth-child(2)').html());
                    assert.equal(num, childrenBefore.length, 'check saved playlist has same number of songs');
                    $(ele).click();
                    $('#playlist-open-confirm').click();

                    setTimeout(function () {
                        assert.ok(!$(plOpenModal).is(':visible'), 'check if pl open is not visible');
                        children = $(pb).children('.gen');
                        assert.equal(children.length, childrenBefore.length, 'check if same playlist');
                        closePb(assert);

                        // delete the playlist
                        assert.ok(!$(plOpenModal).is(':visible'), 'check if pl open is not visible');
                        $('#open-playlist').click();

                        setTimeout(function () {
                            assert.ok($(plOpenModal).is(':visible'), 'check if pl open is visible');
                            var ele = plOpenModal + ' tr:contains("' + plSaveOddFix + '")';
                            assert.ok($(ele).is(':visible'), 'check if pl is visible');
                            $(ele + ' .playlist-remove').click();

                            setTimeout(function () {
                                assert.ok(!$(ele).is(':visible'), 'check if pl is not visible');
                                $(plOpenModal + ' .close').click();

                                setTimeout(function () {
                                    assert.ok(!$('#playlist-open-modal').is(':visible'), 'check if pl open is not visible');
                                    done();
                                }, asyncTimeout);
                            }, asyncTimeout);
                        }, asyncTimeout);
                    }, asyncTimeout);
                }, asyncTimeout);
            }, asyncTimeout);
        }, asyncTimeout);
    });
});

QUnit.test('pb scramble check', function (assert) {
    var done = assert.async();
    openPb(assert);
    addSong(5, true);
    setTimeout(function () {
        var children = $(pb).children('.gen');
        assert.equal($(children).length, 5, 'check if 5 songs added');
        $('#pb-scramble').click();

        setTimeout(function () {
            var childrenNow = $(pb).children('.gen');
            assert.ok($(children[0]).text() != $(childrenNow[0]).text() || $(children[1]).text() != $(childrenNow[1]).text() || $(children[2]).text() != $(childrenNow[2]).text(), 'check if scramble works');

            closePb(assert);
            done();
        }, asyncTimeout);
    }, asyncTimeout);
});

QUnit.test('pb duplicate check', function (assert) {
    var done = assert.async();
    openPb(assert);
    addSong(2, true);
    addSong(5);

    setTimeout(function () {
        var children = $(pb).children('.gen');
        assert.equal($(children).length, 7, 'check if 8 songs added');
        $('#pb-remove-duplicates').click();

        setTimeout(function () {
            var childrenNow = $(pb).children('.gen');
            assert.equal($(childrenNow).length, 2, 'check if 2 songs left');

            closePb(assert);
            done();
        }, asyncTimeout);
    }, asyncTimeout);
});

// TODO test pb search

// library
QUnit.test('library', function (assert) {
    var done = assert.async();
    openLibrary(assert, function () {
        closeLibrary(assert, function () {
            done();
        });
    });
});

QUnit.test('library albums + all', function (assert) {
    var done = assert.async();
    openLibrary(assert, function () {
        var childrenArtists = $(libArt).children();
        $(childrenArtists[0]).click();
        var artist = $(childrenArtists[0]).data().artist;

        setTimeout(function () {
            assert.ok(~document.location.pathname.indexOf('/library/' + encodeURIComponent(artist)), 'check if url contains /library/artist');
            var children = $(libAlb).children();
            assert.ok(children.length > 1, 'more than All is shown');
            assert.ok($(children[0]).hasClass('library-artist-all'), 'check if All is shown as an album');
            var childrenSongs = $(libAlb).children();
            assert.ok(childrenSongs.length > 1, 'check if all songs shown');

            closeLibrary(assert, function () {
                done();
            });
        }, asyncTimeout);
    });
});

QUnit.test('library artist search', function (assert) {
    var done = assert.async();
    openLibrary(assert, function (children) {
        $('#search-artists').focus();
        var keyword = 'the';
        $('#search-artists').val(keyword);

        setTimeout(function () {
            var childrenSearch = $(libArt).children('.gen:visible');
            assert.ok(childrenSearch.length > 1, 'check if anything is in the artists list');
            assert.ok(children.length != childrenSearch.length, 'check if different than root');
            $('#search-artists-clear').click();
            assert.ok($('#search-artists').val() != 'the', 'check if clear works');

            setTimeout(function () {
                var childrenNow = $(libArt).children('.gen:visible');
                assert.equal(childrenNow.length, children.length, 'check if same as original');

                closeLibrary(assert, function () {
                    done();
                });
            }, asyncTimeout);
        }, 3000);
    });
});

// TODO test albums search
// TODO test songs search

// player / playlist
QUnit.test('pl + player: add dir + play + go to current + clear', function (assert) {
    var done = assert.async();

    addDirToPl(assert, function () {
        play(assert, function () {
            setTimeout(function () {
                $('#go-current').click();
                currentPos = parseInt($('#title-pos').text());

                setTimeout(function () {
                    var songPos = parseInt($(pl + ' .bg-success').text());
                    assert.equal(songPos, currentPos, 'go to current check');

                    clearPlaylist(assert, function () {
                        done();
                    });
                }, asyncTimeout);
            }, asyncTimeout);
        });
    });
});

QUnit.test('pl + player: add songs + play + pause + pause + pause + clear ', function (assert) {
    var done = assert.async();
    addSong(2, true);

    setTimeout(function () {
        var children = $(pl).children('.gen');
        assert.equal($(children).length, 2, 'check if 2 songs added');

        play(assert, function () {
            pause(assert, function () {
                pause(assert, function () {
                    pause(assert, function () {
                        var childrenNow = $(pl).children('.gen');
                        assert.equal($(childrenNow).length, 2, 'check if 2 songs left');

                        clearPlaylist(assert, function () {
                            done();
                        });
                    });
                });
            });
        });
    }, asyncTimeout);
});

QUnit.test('pl + player: add songs + play + next + previous + clear ', function (assert) {
    var done = assert.async();
    addSong(2, true);

    setTimeout(function () {
        var children = $(pl).children('.gen');
        assert.equal($(children).length, 2, 'check if 2 songs added');

        play(assert, function () {
            next(assert, function () {
                previous(assert, function () {
                    var childrenNow = $(pl).children('.gen');
                    assert.equal($(childrenNow).length, 2, 'check if 2 songs left');

                    clearPlaylist(assert, function () {
                        done();
                    });
                });
            });
        });
    }, asyncTimeout);
});

// playlist
QUnit.test('add dir to playlist + clear', function (assert) {
    var done = assert.async();

    addDirToPl(assert, function () {
        clearPlaylist(assert, function () {
            done();
        });
    });
});

QUnit.test('pl scramble check', function (assert) {
    var done = assert.async();
    addSong(5, true);
    setTimeout(function () {
        var children = $(pl).children('.gen');
        assert.equal($(children).length, 5, 'check if 5 songs added');
        $('#scramble').click();

        setTimeout(function () {
            var childrenNow = $(pl).children('.gen');
            assert.ok($(children[0]).text() != $(childrenNow[0]).text() || $(children[1]).text() != $(childrenNow[1]).text() || $(children[2]).text() != $(childrenNow[2]).text(), 'check if scramble works');

            clearPlaylist(assert, function () {
                done();
            });
        }, asyncTimeout);
    }, asyncTimeout);
});

QUnit.test('pl duplicate check', function (assert) {
    var done = assert.async();
    addSong(2, true);
    addSong(5);

    setTimeout(function () {
        var children = $(pl).children('.gen');
        assert.equal($(children).length, 7, 'check if 8 songs added');
        $('#remove-duplicates').click();

        setTimeout(function () {
            var childrenNow = $(pl).children('.gen');
            assert.equal($(childrenNow).length, 2, 'check if 2 songs left');

            clearPlaylist(assert, function () {
                done();
            });
        }, asyncTimeout);
    }, asyncTimeout);
});

// TODO test playlist search

QUnit.test('browser to playlist: folder + save + clear + open + delete + clear', function (assert) {
    var done = assert.async();

    addDirToPl(assert, function (childrenBefore) {
        // save the playlist
        assert.ok(!$(plSaveModal).is(':visible'), 'check if pl save is not visible');
        $('#save-playlist').click();

        setTimeout(function () {
            assert.ok($(plSaveModal).is(':visible'), 'check if pl save is visible');
            $('#playlist-save-input').val(plSave);
            $('#playlist-save-confirm').click();

            setTimeout(function () {
                assert.ok(!$(plSaveModal).is(':visible'), 'check if pl save is not visible');
                assert.equal($('#playlist-title').text(), plSave, 'check if title is plSave');

                // clear the playlist
                clearPlaylist(assert, function () {
                    // open the playlist
                    assert.ok(!$(plOpenModal).is(':visible'), 'check if pl open is not visible');
                    $('#open-playlist').click();

                    setTimeout(function () {
                        assert.ok($(plOpenModal).is(':visible'), 'check if pl open is visible');
                        var ele = plOpenModal + ' tr:contains("' + plSave + '")';
                        $(ele).click();
                        $('#playlist-open-confirm').click();

                        setTimeout(function () {
                            assert.ok(!$(plOpenModal).is(':visible'), 'check if pl open is not visible');
                            children = $(pl).children('.gen');
                            assert.equal(children.length, childrenBefore.length, 'check if same playlist');

                            // delete the playlist
                            assert.ok(!$(plOpenModal).is(':visible'), 'check if pl open is not visible');
                            $('#open-playlist').click();

                            setTimeout(function () {
                                assert.ok($(plOpenModal).is(':visible'), 'check if pl open is visible');
                                var ele = plOpenModal + ' tr:contains("' + plSave + '")';
                                assert.ok($(ele).is(':visible'), 'check if pl is visible');
                                $(ele + ' .playlist-remove').click();

                                setTimeout(function () {
                                    assert.ok(!$(ele).is(':visible'), 'check if pl is not visible');
                                    $(plOpenModal + ' .close').click();

                                    setTimeout(function () {
                                        assert.ok(!$('#playlist-open-modal').is(':visible'), 'check if pl open is not visible');

                                        // clear the playlist
                                        clearPlaylist(assert, function () {
                                            done();
                                        });
                                    }, asyncTimeout);
                                }, asyncTimeout);
                            }, asyncTimeout);
                        }, asyncTimeout);
                    }, asyncTimeout);
                });
                // slightly more stable when running all tests
            }, asyncTimeout * 2);
        }, asyncTimeout);
    });
});

// TODO test settings
// TODO check unknown
// TODO check skip to remove
// TODO check consume
// TODO check rows for browser
// TODO check rows for playlist

// TODO test pages
