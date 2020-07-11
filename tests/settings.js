module.exports = function (utils) {
  QUnit.test('settings use pl pagination', function (assert) {
    var done = assert.async()

    utils.addSong(210, false, function () {
      var children = $(utils.pl).children('.gen')

      mpcp.settings.savePagination('playlist', false)
      assert.ok(!$('#playlist-pages').is(':visible'), 'check if pl pages is not visible')
      var childrenNow = $(utils.pl).children('.gen')
      assert.ok(children.length !== childrenNow.length, 'check if pl children is not the same')

      mpcp.settings.savePagination('playlist', true)
      assert.ok($('#playlist-pages').is(':visible'), 'check if pl pages is visible')

      utils.clearPlaylist(assert, function () {
        done()
      })
    })
  })

  QUnit.test('settings set max pl pagination', function (assert) {
    var done = assert.async()

    utils.addSong(210, false, function () {
      var children = $(utils.pl).children('.gen')

      mpcp.settings.saveItemsMax('playlist', 10)
      var childrenNow = $(utils.pl).children('.gen')
      assert.ok(children.length !== childrenNow.length, 'check if pl children is not the same')

      mpcp.settings.saveItemsMax('playlist', 200)

      utils.clearPlaylist(assert, function () {
        done()
      })
    })
  })

  QUnit.test('settings use browser pagination', function (assert) {
    var children = $(utils.fb).children('.gen')

    // set it to 10, just in case
    mpcp.settings.saveItemsMax('browser', 10)

    mpcp.settings.savePagination('browser', true)
    assert.ok($('#browser-pages').is(':visible'), 'check if fb pages is visible')
    var childrenNow = $(utils.fb).children('.gen')
    assert.ok(children.length !== childrenNow.length, 'check if fb children is not the same')

    mpcp.settings.savePagination('browser', false)
    assert.ok(!$('#browser-pages').is(':visible'), 'check if fb pages is not visible')

    mpcp.settings.saveItemsMax('browser', 200)
  })

  QUnit.test('settings use browser pagination', function (assert) {
  // set it to 10, just in case
    mpcp.settings.saveItemsMax('browser', 10)

    mpcp.settings.savePagination('browser', true)
    assert.ok($('#browser-pages').is(':visible'), 'check if fb pages is visible')

    var children = $(utils.fb).children('.gen')

    mpcp.settings.saveItemsMax('browser', 5)
    var childrenNow = $(utils.fb).children('.gen')

    assert.ok(children.length !== childrenNow.length, 'check if fb children is not the same')

    mpcp.settings.savePagination('browser', false)
    assert.ok(!$('#browser-pages').is(':visible'), 'check if fb pages is not visible')

    mpcp.settings.saveItemsMax('browser', 200)
  })

  // TODO check unknown
  // TODO check skip to remove
  // TODO check consume
}
