// With these tests, I don't check actual content inside of folders yet.
// assumptions before running tests:
// file browser root contains folders and files
// 1st folder contains more that 1 item
// 1st artist in library contains atleast 1 album
// 1st artist in library contains more than 1 song
// The browser must be focused the whole time, cannot be clicked around.
// I recommend a webkit browser for testing, (like chrom*) because the js and dom rendering engine is faster than gecko based browsers (like ff)

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

        if ($('#use-pages-browser').is(':checked')) {
            $('#use-pages-browser').click();
        }

        if ($('#random').hasClass('active')) {
            $('#random').click();
        }

        setTimeout(function () {
            QUnit.start();
        }, 1000);
    });
});

var utils = {};
utils = require('./utils.js')(utils);
require('./browser.js')(utils);
require('./library.js')(utils);
require('./playlist.js')(utils);
require('./playlistbuffer.js')(utils);
require('./stored.js')(utils);

// TODO test settings
// TODO check unknown
// TODO check skip to remove
// TODO check consume
// TODO check rows for browser
// TODO check rows for playlist

// TODO test pages
// TODO test song information
// TODO check update music database
