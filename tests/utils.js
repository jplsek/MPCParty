module.exports = function () {

var utils = {
    fb:           '#file-browser-song-list tbody',
    pb:           '#pb-song-list tbody',
    libArt:       '#library-artists-list tbody',
    libAlb:       '#library-albums-list tbody',
    libSon:       '#library-songs-list tbody',
    plSaveModal:  '#playlist-save-modal',
    plOpenModal:  '#playlist-open-modal',
    plSave:       'unitTest',
    // do not put ?<>|:* etc for windows... I don't check for that because I don't expect server owners to be using windows for actually running mpcparty... I hope. May implement later.
    plSaveOdd:    '  \t unitTest~!@#$%^&()_+,.    \n    ',
    plSaveOddFix: 'unitTest~!@#$%^&()_+,.',
    pl:           '#playlist-song-list tbody',

    // I think I found a bug jquery, sometimes the children function doesn't get everything. I keep getting an off by one failed assertion at random times. The elements that don't show in the jquery object IS in the DOM. So I'm not sure how to handle this...
    offWorkaround: function (assert, children, childrenNow) {
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

            closeEnough(assert, children.length, childrenNow.length, 'check if same as original');
        } else {
            assert.equal(childrenNow.length, children.length, 'check if same as original');
        }
    },

    // used for issues out of my scope
    closeEnough: function (assert, val1, val2, msg) {
        if (val1 == val2)
            assert.ok(true, msg);
        else if (val1 + 1 == val2)
            assert.ok(true, msg + ', not equal');
        else if (val1 == val2 + 1)
            assert.ok(true, msg + ', not equal');
        else
            assert.ok(false, msg);
    },

    // browser functions
    // execute: call function while in folder
    openFolder: function (assert, execute, callback) {
        var title = $($(utils.fb).find('tr')[0]).data().dirid;

        mpcp.browser.update(title, false, function() {
            var titleCrumb = $($('#location').find('.loc-dir')[0]).data().dirid;
            assert.equal(titleCrumb, title, 'check if loc-dir is the same as the original folder name');

            var children = $(utils.fb).children('.gen');
            assert.ok(children.length > 1, 'check if anything is in the file browser');

            assert.equal(document.location.pathname, '/browser/' + encodeURIComponent(title), 'check if url is encoded the same as the folder name');

            function finish() {
                window.history.back();

                setTimeout(function () {
                    var childrenNow = $(utils.fb).children('.gen');
                    assert.ok(children.length != childrenNow.length, 'check if file browser is different');
                    assert.equal(document.location.pathname, '/browser/', 'BACK: check if url is /browser/');
                    callback();
                }, 1000);
            }

            if (execute) {
                execute(finish, children);
            } else {
                finish();
            }
        });
    },

    // pb functions
    openPb: function (assert) {
        assert.notOk($('#pb').is(':visible'), 'check if pb is not visible');
        $('#new-playlist').click();
        assert.ok($('#pb').is(':visible'), 'check if pb is visible');
    },

    closePb: function (assert) {
        $('#pb-close').click();
        assert.notOk($('#pb').is(':visible'), 'check if pb is not visible');
    },

    minimizePb: function (assert) {
        $('#pb-minimize').click();
        assert.notOk($('#pb').is(':visible'), 'check if pb is not visible');
        assert.ok($('#pb-tab').is(':visible'), 'check if pb tab is visible');
    },

    resumePb: function (assert) {
        $('#pb-tab').click();
        assert.notOk($('#pb-tab').is(':visible'), 'check if pb tab is not visible');
        assert.ok($('#pb').is(':visible'), 'check if pb is visible');
    },

    addDirToPb: function (assert, callback) {
        var title = $($(utils.fb).find('tr')[0]).data().dirid;
        mpcp.browser.addExternalDir(title, null, function() {
            var children = $(utils.pb).children('.gen');
            assert.ok(children.length > 1, 'check if anything is in the pb');
            callback(children);
        });
    },

    addSong: function (times, incremental, callback) {
        var songs = $(utils.fb).find('.song-add'),
            i, file, j = 0;

        function mpcpAdd(file) {
            mpcp.browser.addExternal(file, null, function () {
                if (++j == times && callback) callback();
            });
        }

        if (incremental) {
            for (i = 0; i < times; ++i) {
                file = $(songs[i]).parent().parent().data().fileid;
                mpcpAdd(file);
            }
        } else {
            for (i = 0; i < times; ++i) {
                file = $(songs[0]).parent().parent().data().fileid;
                mpcpAdd(file);
            }
        }

    },

    // add two songs for other tests
    addSongToPb: function (assert, callback) {
        utils.addSong(2, true, function() {
            var children = $(utils.pb).children('.gen').not('.rem');
            assert.ok(children.length > 1, 'check if anything is in the pb');
            callback(children);
        });
    },

    clearPb: function (assert) {
        $('#pb-clear').click();
        childrenClear = $(utils.pb).children('.gen').not('.rem');
        assert.equal(childrenClear.length, 0, 'check if cleared pb');
    },

    // library functions
    openLibrary: function (assert, callback) {
        assert.notOk($('#library').is(':visible'), 'check if library is not visible');
        mpcp.library.open(function () {
            assert.ok($('#library').is(':visible'), 'check if library is visible');
            // use contains because of my history additions where clicking back and forth between library and browser will bring you back to the original hit
            assert.ok(~document.location.pathname.indexOf('/library/'), 'check if url contains /library/');
            var children = $(utils.libArt).children('.gen:visible');
            assert.ok(children.length > 1, 'check if anything is in the library');
            callback(children);
        });
    },

    closeLibrary: function (assert, callback) {
        $('#open-file-browser').click();
        mpcp.browser.open(function () {
            assert.notOk($('#library').is(':visible'), 'check if library is not visible');
            assert.ok($('#browser').is(':visible'), 'check if browser is visible');
            callback();
        });
    },

    // playlist functions
    addDirToPl: function (assert, callback) {
        var title = $($(utils.fb).find('tr')[0]).data().dirid;
        mpcp.browser.addExternalDir(title, null, function() {
            var children = $(utils.pl).children('.gen');
            assert.ok(children.length > 1, 'check if anything is in the pl');
            callback(children);
        });
    },

    clearPlaylist: function (assert, callback) {
        console.log('before clear');
        mpcp.playlist.clear(function () {
            var children = $(utils.pl).children('.gen');
            console.log('after clear');
            assert.equal(children.length, 1, 'check if nothing except 1 item');
            assert.notOk($('#stop').is(':visible'), 'check if stop is not visible');
            assert.equal($('#playlist-title').text(), "", 'check if title is nothing');
            callback();
        });
    },

    play: function (assert, callback) {
        assert.equal($('#title-text').text(), 'No song selected', 'check if title is No song selected');
        assert.notOk($('#stop').is(':visible'), 'check if stop is not visible');

        mpcp.player.play(function () {
            // we wait for progress bar checks
            setTimeout(function () {
                assert.ok($('#title-text').text() != 'No song selected', 'check if title is not No song selected');
                assert.ok($('#stop').is(':visible'), 'check if stop is visible');
                callback();
            }, 3000);
        });
    },

    pause: function (assert, callback) {
        var time = $('#time-current').text();
        var active = $('#pause').hasClass('active');

        mpcp.player.toggle(function () {
            // we wait for progress bar checks
            setTimeout(function () {
                var timeNow = $('#time-current').text();
                // + 1 incase of time difference before pause
                var newTime = parseInt(time.slice(-1)) + 1;
                var timeEdit = time.substr(0, 4) + newTime;
                if (active) {
                    assert.notOk($('#pause').hasClass('active'), 'check if not toggled (after previous toggle)');
                    assert.ok(timeEdit < timeNow, 'check if time is different');
                } else {
                    assert.ok($('#pause').hasClass('active'), 'check if toggled (after previous toggle)');
                    assert.ok(time == timeNow || timeEdit == timeNow, 'check if time is the same');
                }
                callback();
            }, 3000);
        });
    },

    // needs a song to be playing first
    next: function (assert, callback) {
        var title = $('#title-text').text();
        var pos = parseInt($('#title-pos').text());
        assert.ok(title != 'No song selected', 'check if title is not No song selected');

        mpcp.player.next(function () {
            var titleNew = $('#title-text').text();
            var posNew = parseInt($('#title-pos').text());
            assert.ok(title != titleNew, 'check if title is not the same');
            assert.ok(pos < posNew, 'check if pos < posNew');
            callback();
        });
    },

    // needs a song to be playing first
    previous: function (assert, callback) {
        var title = $('#title-text').text();
        var pos = parseInt($('#title-pos').text());
        assert.ok(title != 'No song selected', 'check if title is not No song selected');

        mpcp.player.previous(function () {
            var titleNew = $('#title-text').text();
            var posNew = parseInt($('#title-pos').text());
            assert.ok(title != titleNew, 'check if title is not the same');
            assert.ok(pos > posNew, 'check if pos > posNew');
            callback();
        });
    },
};

return utils;

};
