module.exports = function () {

var utils = {
    fb:           '#file-browser-song-list tbody',
    pe:           '#pe-song-list tbody',
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

    // browser functions
    // execute: call function while in folder
    openFolder: function (assert, execute, callback) {
        var title = $($(utils.fb).find('tr')[0]).data().path;

        mpcp.browser.update(title, false, function() {
            var titleCrumb = $($('#location').find('.loc-dir')[0]).data().path;
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

    // pe functions
    openpe: function (assert) {
        assert.notOk($('#pe').is(':visible'), 'check if pe is not visible');
        $('#new-playlist').click();
        assert.ok($('#pe').is(':visible'), 'check if pe is visible');
    },

    closepe: function (assert) {
        $('#pe-close').click();
        assert.notOk($('#pe').is(':visible'), 'check if pe is not visible');
    },

    minimizepe: function (assert) {
        $('#pe-minimize').click();
        assert.notOk($('#pe').is(':visible'), 'check if pe is not visible');
        assert.ok($('#pe-tab').is(':visible'), 'check if pe tab is visible');
    },

    resumepe: function (assert) {
        $('#pe-tab').click();
        assert.notOk($('#pe-tab').is(':visible'), 'check if pe tab is not visible');
        assert.ok($('#pe').is(':visible'), 'check if pe is visible');
    },

    addDirTope: function (assert, callback) {
        var title = $($(utils.fb).find('tr')[0]).data().path;
        mpcp.browser.addExternalDir(title, null, function() {
            var children = $(utils.pe).children('.gen');
            assert.ok(children.length > 1, 'check if anything is in the pe');
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
                file = $(songs[i]).parent().parent().data().path;
                mpcpAdd(file);
            }
        } else {
            for (i = 0; i < times; ++i) {
                file = $(songs[0]).parent().parent().data().path;
                mpcpAdd(file);
            }
        }

    },

    // add two songs for other tests
    addSongTope: function (assert, callback) {
        utils.addSong(2, true, function() {
            var children = $(utils.pe).children('.gen').not('.rem');
            assert.ok(children.length > 1, 'check if anything is in the pe');
            callback(children);
        });
    },

    clearpe: function (assert) {
        $('#pe-clear').click();
        childrenClear = $(utils.pe).children('.gen').not('.rem');
        assert.equal(childrenClear.length, 0, 'check if cleared pe');
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
        var title = $($(utils.fb).find('tr')[0]).data().path;
        mpcp.browser.addExternalDir(title, null, function() {
            var children = $(utils.pl).children('.gen');
            assert.ok(children.length > 1, 'check if anything is in the pl');
            callback(children);
        });
    },

    clearPlaylist: function (assert, callback) {
        console.log('before clear');
        mpcp.playlist.clear(function () {
            // just wait for dom. May fix later...
            setTimeout(() => {
                var children = $(utils.pl).children('.gen');
                console.log(children);
                console.log('after clear');
                assert.equal(children.length, 1, 'check if nothing except 1 item');
                assert.notOk($('#stop').is(':visible'), 'check if stop is not visible');
                assert.equal($('#music-time').width(), 0, 'progressbar == 0');
                assert.equal($('#time-current').text(), '', 'current time is none');
                assert.equal($('#time-total').text(), '-- / --', 'total time is none');
                assert.equal($('#playlist-title').text(), "", 'check if title is nothing');
                callback();
            }, 1000);
        });
    },

    play: function (assert, callback) {
        assert.equal($('#title-text').text(), 'No song selected', 'check if title is No song selected');
        assert.notOk($('#stop').is(':visible'), 'check if stop is not visible');
        assert.equal($('#time-current').text(), '', 'current time is none');
        assert.equal($('#time-total').text(), '-- / --', 'total time is none');

        mpcp.player.play(function () {
            // we wait for progress bar checks
            setTimeout(function () {
                assert.ok($('#music-time').width() > 0, 'progressbar > 0');
                assert.notEqual($('#time-current').text(), '', 'current time is not none');
                assert.notEqual($('#title-text').text(), 'No song selected', 'check if title is not No song selected');
                assert.ok($('#stop').is(':visible'), 'check if stop is visible');
                callback();
            }, 3000);
        });
    },

    stop: function (assert, callback) {
        assert.ok($('#stop').is(':visible'), 'check if stop is visible');

        mpcp.player.stop(function () {
            assert.notOk($('#stop').is(':visible'), 'check if stop is not visible');
            assert.equal($('#music-time').width(), 0, 'progressbar == 0');
            assert.equal($('#time-current').text(), '00:00', 'current time is 00:00');
            assert.notEqual($('#time-total').text(), '-- / --', 'current time is not none');
            callback();
        });
    },

    pause: function (assert, callback) {
        var time = $('#time-current').text();
        var active = $('#pause').hasClass('active');

        mpcp.player.pause(function () {
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

    mute: function (assert, callback) {
        mpcp.player.setvol(0, function () {
            // wait for animations
            setTimeout(function () {
                assert.equal($('#volume').height(), 0, 'volume is 0');
                assert.ok($('#volume-speaker').hasClass('fa-volume-off'), 'speaker is mute icon');
                callback();
            }, 1100);
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
