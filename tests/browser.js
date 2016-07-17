module.exports = function (utils) {

QUnit.test('browser', function (assert) {
    var children = $(utils.fb).children('.gen');
    assert.ok(children.length > 1, 'check if anything is in the file browser');
    // use contains because of my history additions where clicking back and forth between library and browser will bring you back to the original hit
    assert.ok(~document.location.pathname.indexOf('/browser/'), 'check if url contains /browser/');
});

QUnit.test('search from browser', function (assert) {
    var done = assert.async();
    var children = $(utils.fb).children('.gen');
    $('#search-browser').focus();
    // 'love' is apparently one of the most common words in a song title
    var keyword = 'love';
    $('#search-browser').val(keyword);

    // can't get enter to work, so waiting several seconds for auto search to kick in
    setTimeout(function () {
        var childrenSearch = $(utils.fb).children('.gen');
        assert.ok(childrenSearch.length > 1, 'check if anything is in the file browser');
        assert.ok(children.length != childrenSearch.length, 'check if different than root');
        assert.equal(document.location.pathname, '/search/' + encodeURIComponent(keyword), 'check if url is encoded the same as the search name');
        $('#search-clear').click();
        assert.ok($('#search-browser').val() != keyword, 'check if clear works');

        setTimeout(function () {
            var childrenNow = $(utils.fb).children('.gen');
            utils.offWorkaround(assert, children, childrenNow);
            done();
        }, 500);
    }, 4500);
});

QUnit.test('search from browser nothing', function (assert) {
    var done = assert.async();
    var children = $(utils.fb).children('.gen');
    $('#search-browser').focus();
    var keyword = 'thisshouldnotbeasongnamelikesrsly';
    $('#search-browser').val(keyword);

    // can't get enter to work, so waiting several seconds for auto search to kick in
    setTimeout(function () {
        var childrenSearch = $(utils.fb).children('.gen');
        assert.equal(childrenSearch.length, 1, 'check if one item is in the file browser');
        assert.notOk(~document.location.pathname.indexOf(encodeURIComponent(keyword)), 'check if url is not the search name');
        $('#search-clear').click();
        assert.ok($('#search-browser').val() != keyword, 'check if clear works');

        setTimeout(function () {
            var childrenNow = $(utils.fb).children('.gen');
            utils.offWorkaround(assert, children, childrenNow);
            done();
        }, 500);
    }, 4500);
});

QUnit.test('browser folder open + back', function (assert) {
    var done = assert.async();

    utils.openFolder(assert, null, function () {
        done();
    });
});

};

