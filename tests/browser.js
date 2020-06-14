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
  var keyword = 'love';

  mpcp.browser.search(keyword, null, function () {
    var childrenSearch = $(utils.fb).children('.gen');
    assert.ok(childrenSearch.length > 1, 'check if anything is in the file browser');
    assert.ok(children.length != childrenSearch.length, 'check if different than root');
    assert.equal(document.location.pathname, '/search/' + encodeURIComponent(keyword), 'check if url is encoded the same as the search name');

    mpcp.browser.resetSearch(function () {
      var childrenNow = $(utils.fb).children('.gen');
      utils.offWorkaround(assert, children, childrenNow);
      done();
    });
  });
});

QUnit.test('search from browser nothing', function (assert) {
  var done = assert.async();
  var children = $(utils.fb).children('.gen');
  $('#search-browser').focus();
  var keyword = 'thisshouldnotbeasongnamelikesrsly';
  $('#search-browser').val(keyword);

  // can't get enter to work, so waiting several seconds for auto search to kick in
  mpcp.browser.search(keyword, null, function () {
    var childrenSearch = $(utils.fb).children('.gen');
    assert.equal(childrenSearch.length, 1, 'check if one item is in the file browser');
    assert.notOk(~document.location.pathname.indexOf(encodeURIComponent(keyword)), 'check if url is not the search name');

    mpcp.browser.resetSearch(function () {
      var childrenNow = $(utils.fb).children('.gen');
      utils.offWorkaround(assert, children, childrenNow);
      done();
    });
  });
});

QUnit.test('browser folder open + back', function (assert) {
  var done = assert.async();

  utils.openFolder(assert, null, function () {
    done();
  });
});

QUnit.test('browser song info', function (assert) {
  var done = assert.async();
  var file = $($(utils.fb).find('.file')[0]).data().fileid;

  mpcp.browser.getSongInfo(file, function () {
    var children = $('#song-info tbody').children('.gen');
    assert.ok($(children).length > 1, 'check if at least 2 items are in song info');
    $('#song-info-modal').modal('hide');
    done();
  });
});

};

