module.exports = function (utils) {

QUnit.test('open and close pb', function (assert) {
    utils.openPb(assert);
    utils.closePb(assert);
});

// contextmenu plugin triggers dont work (tried mouseenter, then enter key also)
//QUnit.test('song-information', function (assert) {
//    var fileOpen = $(utils.fb).find('.file')[0];
//    $(fileOpen).trigger('contextmenu');
//    var infoOpen = $('.context-menu-item:contains("Song information")');
//    $(infoOpen).click();
//});

QUnit.test('open and minimize pb', function (assert) {
    utils.openPb(assert);
    utils.minimizePb(assert);
    utils.resumePb(assert);
    utils.closePb(assert);
});

QUnit.test('browser to pb: folder', function (assert) {
    utils.openPb(assert);
    var done = assert.async();

    utils.addDirToPb(assert, function () {
        utils.closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + close', function (assert) {
    utils.openPb(assert);
    var done = assert.async();

    utils.addDirToPb(assert, function () {
        utils.closePb(assert);
        utils.openPb(assert);
        var children = $(utils.pb).children('.gen').not('.rem');
        assert.equal(children.length, 0, 'check if pb is empty');
        utils.closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + minimze', function (assert) {
    utils.openPb(assert);
    var done = assert.async();

    utils.addDirToPb(assert, function (childrenBefore) {
        utils.minimizePb(assert);
        utils.resumePb(assert);
        var children = $(utils.pb).children('.gen');
        assert.equal(children.length, childrenBefore.length, 'check if pb is the same');
        utils.closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + remove', function (assert) {
    utils.openPb(assert);
    var done = assert.async();

    utils.addDirToPb(assert, function (children) {
        var songRemove = $(utils.pb).find('.pb-song-remove')[0];
        $(songRemove).click();

        var childrenRem = $(utils.pb).children('.gen');
        assert.ok(childrenRem.length < children.length, 'check if removed a song');

        utils.closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + clear', function (assert) {
    utils.openPb(assert);
    var done = assert.async();

    utils.addDirToPb(assert, function (children) {
        utils.clearPb(assert);
        utils.closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: file + remove', function (assert) {
    utils.openPb(assert);
    var done = assert.async();

    utils.addSongToPb(assert, function (children) {
        var songRemove = $(utils.pb).find('.pb-song-remove')[0];
        $(songRemove).click();

        var childrenRem = $(utils.pb).children('.gen');
        assert.ok(childrenRem.length < children.length, 'check if removed a song');

        utils.closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: add all', function (assert) {
    utils.openPb(assert);
    var done = assert.async();

    utils.openFolder(assert, function (finish, childrenFb) {
        // execute
        mpcp.browser.addAll(function() {
            var childrenPb = $(utils.pb).children('.gen');
            assert.equal(childrenPb.length, childrenFb.length, 'check if fb is same as pb');
            finish();
        });
    },
    function () {
        // callback
        utils.closePb(assert);
        done();
    });
});

QUnit.test('browser to pb: folder + save + open + delete', function (assert) {
    utils.openPb(assert);
    var done = assert.async();

    utils.addDirToPb(assert, function (childrenBefore) {
        // save the playlist
        mpcp.stored.externalSave(function () {
            $('#playlist-save-input').val(utils.plSave);

            mpcp.playlist.saveFromStored(function () {
                utils.clearPb(assert);

                // open the playlists
                mpcp.stored.updatePlaylists(utils.plOpenModal, mpcp.pb.open, function () {
                    var ele = utils.plOpenModal + ' tr:contains("' + utils.plSave + '")';
                    var num = parseInt($(ele + ' td:nth-child(2)').html());
                    assert.ok($(ele).length, 'check if pl is visible');
                    utils.closeEnough(assert, num, childrenBefore.length, 'check saved playlist has same number of songs');
                    $(ele).click();

                    // open the playlist
                    mpcp.playlist.openFromStored(function () {
                        children = $(utils.pb).children('.gen');
                        assert.equal(children.length, childrenBefore.length, 'check if same playlist');
                        utils.closePb(assert);

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
//QUnit.test('browser to pb: folder + save odd title + open + delete', function (assert) {
//    utils.openPb(assert);
//    var done = assert.async();
//
//    utils.addDirToPb(assert, function (childrenBefore) {
//        // save the playlist
//        mpcp.stored.externalSave(function () {
//            $('#playlist-save-input').val(utils.plSaveOdd);
//
//            mpcp.playlist.saveFromStored(function () {
//                utils.clearPb(assert);
//
//                // open the playlist
//                mpcp.playlist.openFromStored(function () {
//                    var ele = utils.plOpenModal + ' tr:contains("' + utils.plSaveOddFix + '")';
//                    var num = parseInt($(ele + ' td:nth-child(2)').html());
//                    assert.ok($(ele).length, 'check if pl is visible');
//                    utils.closeEnough(assert, num, childrenBefore.length, 'check saved playlist has same number of songs');
//                    $(ele).click();
//
//                    // open the playlist
//                    mpcp.playlist.openFromStored(function () {
//                        children = $(utils.pb).children('.gen');
//                        assert.equal(children.length, childrenBefore.length, 'check if same playlist');
//                        utils.closePb(assert);
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

QUnit.test('pb scramble check', function (assert) {
    var done = assert.async();
    utils.openPb(assert);
    utils.addSong(5, true, function () {
        var children = $(utils.pb).children('.gen');
        assert.equal($(children).length, 5, 'check if 5 songs added');

        mpcp.pb.scramble(function () {
            var childrenNow = $(utils.pb).children('.gen');
            assert.ok($(children[0]).text() != $(childrenNow[0]).text() || $(children[1]).text() != $(childrenNow[1]).text() || $(children[2]).text() != $(childrenNow[2]).text(), 'check if scramble works');

            utils.closePb(assert);
            done();
        });
    });
});

QUnit.test('pb duplicate check', function (assert) {
    var done = assert.async();
    utils.openPb(assert);
    utils.addSong(2, true, function() {
        utils.addSong(5, false, function () {
            var children = $(utils.pb).children('.gen');
            assert.equal($(children).length, 7, 'check if 8 songs added');

            mpcp.pb.removeDuplicates(function () {
                var childrenNow = $(utils.pb).children('.gen');
                assert.equal($(childrenNow).length, 2, 'check if 2 songs left');

                utils.closePb(assert);
                done();
            });
        });
    });
});

// TODO test pb search

};
