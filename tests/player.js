module.exports = function (utils) {

QUnit.test('player progressbar and stop', function (assert) {
    var done = assert.async();

    // play and stop check the progress bar and time
    utils.addSong(1, true, function () {
        utils.play(assert, function () {
            utils.stop(assert, function () {
                utils.clearPlaylist(assert, function () {
                    done();
                });
            });
        });
    });
});

function initVolume(assert, callback) {
    assert.equal($('#volume').height(), 0, 'volume is 0');
    assert.ok($('#volume-speaker').hasClass('fa-volume-off'), 'speaker is mute icon');
    mpcp.player.setvol(50, function () {
        assert.ok($('#volume').height() > 0, 'volume is not 0');
        assert.ok($('#volume-speaker').hasClass('fa-volume-up'), 'speaker is not mute icon');

        // (1)
        // this happens too fast. As it does another volume action, it gets
        // added to the callback queue BEFORE
        // the previous callback queue is cleared. So we add a timeout.
        setTimeout(function () {
            callback();
        }, 500);
    });
}

QUnit.test('player volume', function (assert) {
    var done = assert.async();

    initVolume(assert, function () {
        utils.mute(assert, function () {
            done();
        });
    });
});

QUnit.test('player mute button', function (assert) {
    var done = assert.async();

    initVolume(assert, function () {
        mpcp.player.toggleMute(function () {
            assert.equal($('#volume').height(), 0, 'volume is 0');
            assert.ok($('#volume-speaker').hasClass('fa-volume-off'), 'speaker is mute icon');

            // read (1)
            setTimeout(function () {
                mpcp.player.toggleMute(function () {
                    assert.ok($('#volume').height() > 0, 'volume is not 0');
                    assert.ok($('#volume-speaker').hasClass('fa-volume-up'), 'speaker is not mute icon');

                    // read (1)
                    setTimeout(function () {
                        utils.mute(assert, function () {
                            done();
                        });
                    }, 500);
                });
            }, 500);
        });
    });
});

};
