module.exports = function (utils) {

// I'm hoping not all of them contain this keyword...
var keyword = 'e';

QUnit.test('open and close pe', function (assert) {
    utils.openpe(assert);
    utils.closepe(assert);
});

// contextmenu plugin triggers dont work (tried mouseenter, then enter key also)
//QUnit.test('song-information', function (assert) {
//    var fileOpen = $(utils.fb).find('.file')[0];
//    $(fileOpen).trigger('contextmenu');
//    var infoOpen = $('.context-menu-item:contains("Song information")');
//    $(infoOpen).click();
//});

QUnit.test('open and minimize pe', function (assert) {
    utils.openpe(assert);
    utils.minimizepe(assert);
    utils.resumepe(assert);
    utils.closepe(assert);
});

QUnit.test('browser to pe: folder', function (assert) {
    utils.openpe(assert);
    var done = assert.async();

    utils.addDirTope(assert, function () {
        utils.closepe(assert);
        done();
    });
});

QUnit.test('browser to pe: folder + close', function (assert) {
    utils.openpe(assert);
    var done = assert.async();

    utils.addDirTope(assert, function () {
        utils.closepe(assert);
        utils.openpe(assert);
        var children = $(utils.pe).children('.gen').not('.rem');
        assert.equal(children.length, 0, 'check if pe is empty');
        utils.closepe(assert);
        done();
    });
});

QUnit.test('browser to pe: folder + minimze', function (assert) {
    utils.openpe(assert);
    var done = assert.async();

    utils.addDirTope(assert, function (childrenBefore) {
        utils.minimizepe(assert);
        utils.resumepe(assert);
        var children = $(utils.pe).children('.gen');
        assert.equal(children.length, childrenBefore.length, 'check if pe is the same');
        utils.closepe(assert);
        done();
    });
});

QUnit.test('browser to pe: folder + remove', function (assert) {
    utils.openpe(assert);
    var done = assert.async();

    utils.addDirTope(assert, function (children) {
        var songRemove = $(utils.pe).find('.pe-song-remove')[0];
        $(songRemove).click();

        var childrenRem = $(utils.pe).children('.gen');
        assert.ok(childrenRem.length < children.length, 'check if removed a song');

        utils.closepe(assert);
        done();
    });
});

QUnit.test('browser to pe: folder + clear', function (assert) {
    utils.openpe(assert);
    var done = assert.async();

    utils.addDirTope(assert, function (children) {
        utils.clearpe(assert);
        utils.closepe(assert);
        done();
    });
});

QUnit.test('browser to pe: file + remove', function (assert) {
    utils.openpe(assert);
    var done = assert.async();

    utils.addSongTope(assert, function (children) {
        var songRemove = $(utils.pe).find('.pe-song-remove')[0];
        $(songRemove).click();

        var childrenRem = $(utils.pe).children('.gen');
        assert.ok(childrenRem.length < children.length, 'check if removed a song');

        utils.closepe(assert);
        done();
    });
});

QUnit.test('browser to pe: add all', function (assert) {
    utils.openpe(assert);
    var done = assert.async();

    utils.openFolder(assert, function (finish, childrenFb) {
        // execute
        mpcp.browser.addAll(function() {
            var childrenpe = $(utils.pe).children('.gen');
            assert.equal(childrenpe.length, childrenFb.length, 'check if fb is same as pe');
            finish();
        });
    },
    function () {
        // callback
        utils.closepe(assert);
        done();
    });
});

QUnit.test('browser to pe: folder + save + open + delete', function (assert) {
    utils.openpe(assert);
    var done = assert.async();

    utils.addDirTope(assert, function (childrenBefore) {
        // save the playlist
        mpcp.stored.externalSave(function () {
            $('#playlist-save-input').val(utils.plSave);

            mpcp.playlist.saveFromStored(function () {
                utils.clearpe(assert);

                // open the playlists
                mpcp.stored.updatePlaylists(utils.plOpenModal, mpcp.pe.open, function () {
                    var ele = utils.plOpenModal + ' tr:contains("' + utils.plSave + '")';
                    var num = parseInt($(ele + ' td:nth-child(2)').html());
                    assert.ok($(ele).length, 'check if pl is visible');
                    assert.ok(num, childrenBefore.length, 'check saved playlist has same number of songs');
                    $(ele).click();

                    // open the playlist
                    mpcp.playlist.openFromStored(function () {
                        children = $(utils.pe).children('.gen');
                        assert.equal(children.length, childrenBefore.length, 'check if same playlist');
                        utils.closepe(assert);

                        // open the playlists
                        mpcp.stored.updatePlaylists(utils.plOpenModal, null, function () {
                            var ele = utils.plOpenModal + ' tr:contains("' + utils.plSave + '")';
                            assert.ok($(ele).length, 'check if pl is visible');
                            var file = $(ele).data().fileid;

                            // delete the playlist
                            mpcp.stored.removePlaylist(file, ele, function () {
                                assert.notOk($(ele).length, 'check if pl is not visible');
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});

// this test seems to no longer work..?
//QUnit.test('browser to pe: folder + save odd title + open + delete', function (assert) {
//    utils.openpe(assert);
//    var done = assert.async();
//
//    utils.addDirTope(assert, function (childrenBefore) {
//        // save the playlist
//        mpcp.stored.externalSave(function () {
//            $('#playlist-save-input').val(utils.plSaveOdd);
//
//            mpcp.playlist.saveFromStored(function () {
//                utils.clearpe(assert);
//
//                // open the playlist
//                mpcp.playlist.openFromStored(function () {
//                    var ele = utils.plOpenModal + ' tr:contains("' + utils.plSaveOddFix + '")';
//                    var num = parseInt($(ele + ' td:nth-child(2)').html());
//                    assert.ok($(ele).length, 'check if pl is visible');
//                    assert.ok(num, childrenBefore.length, 'check saved playlist has same number of songs');
//                    $(ele).click();
//
//                    // open the playlist
//                    mpcp.playlist.openFromStored(function () {
//                        children = $(utils.pe).children('.gen');
//                        assert.equal(children.length, childrenBefore.length, 'check if same playlist');
//                        utils.closepe(assert);
//
//                        // open the playlists
//                        mpcp.stored.updatePlaylists(utils.plOpenModal, null, function () {
//                            console.log($(utils.plOpenModal + ' tbody').children());
//                            var ele = utils.plOpenModal + ' tr:contains("' + utils.plSaveOddFix + '")';
//                            assert.ok($(ele).is(':visible'), 'check if pl is visible');
//                            var file = $(ele).data().fileid;
//
//                            // delete the playlist
//                            mpcp.stored.removePlaylist(file, ele, function () {
//                                assert.notOk($(ele).length, 'check if pl is not visible');
//                                done();
//                            });
//                        });
//                    });
//                });
//            });
//        });
//    });
//});

QUnit.test('pe scramble check', function (assert) {
    var done = assert.async();
    utils.openpe(assert);
    utils.addSong(5, true, function () {
        var children = $(utils.pe).children('.gen');
        assert.equal($(children).length, 5, 'check if 5 songs added');

        mpcp.pe.scramble(function () {
            var childrenNow = $(utils.pe).children('.gen');
            assert.ok($(children[0]).text() != $(childrenNow[0]).text() || $(children[1]).text() != $(childrenNow[1]).text() || $(children[2]).text() != $(childrenNow[2]).text(), 'check if scramble works');

            utils.closepe(assert);
            done();
        });
    });
});

QUnit.test('pe duplicate check', function (assert) {
    var done = assert.async();
    utils.openpe(assert);
    utils.addSong(2, true, function() {
        utils.addSong(5, false, function () {
            var children = $(utils.pe).children('.gen');
            assert.equal($(children).length, 7, 'check if 8 songs added');

            mpcp.pe.removeDuplicates(function () {
                var childrenNow = $(utils.pe).children('.gen');
                assert.equal($(childrenNow).length, 2, 'check if 2 songs left');

                utils.closepe(assert);
                done();
            });
        });
    });
});

QUnit.test('pe search check with clear', function (assert) {
    var done = assert.async();
    utils.openpe(assert);
    utils.addSong(5, true, function () {
        var children = $(utils.pe).children('.gen');
        assert.equal($(children).length, 5, 'check if 5 songs added');
        assert.ok(!$('#search-pe').is(':visible'), 'check if search is not visible');
        $('#pe-search-toggle').click();
        assert.ok($('#search-pe').is(':visible'), 'check if search is visible');
        $('#search-pe').val(keyword);

        setTimeout(function () {
            var childrenNow = $(utils.pe).children('.gen:visible');
            assert.notEqual($(childrenNow).length, $(children).length, 'check if less songs');
            $('#search-pe-clear').click();
            childrenNow = $(utils.pe).children('.gen:visible');
            assert.equal($(childrenNow).length, $(children).length, 'check if same songs');
            $('#pe-search-toggle').click();
            assert.ok(!$('#search-pe').is(':visible'), 'check if search is not visible');
            utils.closepe(assert);
            done();
        }, 2000);
    });
});

QUnit.test('pe search check with cancel', function (assert) {
    var done = assert.async();
    utils.openpe(assert);
    utils.addSong(5, true, function () {
        var children = $(utils.pe).children('.gen');
        assert.equal($(children).length, 5, 'check if 5 songs added');
        assert.ok(!$('#search-pe').is(':visible'), 'check if search is not visible');
        $('#pe-search-toggle').click();
        assert.ok($('#search-pe').is(':visible'), 'check if search is visible');
        $('#search-pe').val(keyword);

        setTimeout(function () {
            var childrenNow = $(utils.pe).children('.gen:visible');
            console.log($(childrenNow).length);
            assert.notEqual($(childrenNow).length, $(children).length, 'check if less songs');
            $('#pe-search-toggle').click();
            assert.ok(!$('#search-pe').is(':visible'), 'check if search is not visible');
            childrenNow = $(utils.pe).children('.gen:visible');
            assert.equal($(childrenNow).length, $(children).length, 'check if same songs');
            utils.closepe(assert);
            done();
        }, 2000);
    });
});

};
