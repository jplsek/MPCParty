module.exports = function (utils) {
  QUnit.test('library', function (assert) {
    var done = assert.async()
    utils.openLibrary(assert, function () {
      utils.closeLibrary(assert, function () {
        done()
      })
    })
  })

  QUnit.test('library albums + all', function (assert) {
    var done = assert.async()
    utils.openLibrary(assert, function () {
      var childrenArtists = $(utils.libArt).children()
      $(childrenArtists[0]).click()
      var artist = $(childrenArtists[0]).data().artist

      mpcp.libraryAlbums.update(artist, null, false, function () {
        assert.ok(~document.location.pathname.indexOf('/library/' + encodeURIComponent(artist)), 'check if url contains /library/artist')
        var children = $(utils.libAlb).children()
        assert.ok(children.length > 1, 'more than All is shown')
        assert.ok($(children[0]).hasClass('library-artist-all'), 'check if All is shown as an album')
        var childrenSongs = $(utils.libAlb).children()
        assert.ok(childrenSongs.length > 1, 'check if all songs shown')

        utils.closeLibrary(assert, function () {
          done()
        })
      })
    })
  })

  QUnit.test('library artist search', function (assert) {
    var done = assert.async()
    utils.openLibrary(assert, function (children) {
      $('#search-artists').focus()
      var keyword = 'the'
      $('#search-artists').val(keyword)

      setTimeout(function () {
        var childrenSearch = $(utils.libArt).children('.gen:visible')
        assert.ok(childrenSearch.length > 1, 'check if anything is in the artists list')
        assert.ok(children.length !== childrenSearch.length, 'check if different than root')

        $('#search-artists-clear').click()
        assert.ok($('#search-artists').val() !== 'the', 'check if clear works')

        var childrenNow = $(utils.libArt).children('.gen:visible')
        assert.equal(childrenNow.length, children.length, 'check if same as original')

        utils.closeLibrary(assert, function () {
          done()
        })
      }, 3000)
    })
  })

  // TODO test albums search
  // TODO test songs search
}
