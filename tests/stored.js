module.exports = function (utils) {
  QUnit.test('stored: no songs test', function (assert) {
    var done = assert.async()

    // save the playlist
    mpcp.stored.updatePlaylists(utils.plSaveModal, null, function () {
      $('#playlist-save-input').val(utils.plSave)

      mpcp.playlist.saveFromStored(function () {
        assert.ok(~$('.toast-message').text().indexOf('empty'), 'check if empty toast')
        toastr.clear()

        // clear the playlist
        utils.clearPlaylist(assert, function () {
          done()
        })
      })
    })
  })

  QUnit.test('stored: no title test', function (assert) {
    var done = assert.async()
    utils.addSong(2, false, function () {
      var children = $(utils.pl).children('.gen')
      assert.equal($(children).length, 2, 'check if 2 songs added')

      // save the playlist
      mpcp.stored.updatePlaylists(utils.plSaveModal, null, function () {
        $('#playlist-save-input').val('')

        mpcp.playlist.saveFromStored(function () {
          assert.ok(~$('.toast-message').text().indexOf('title'), 'check if no title toast')
          toastr.clear()

          // clear the playlist
          utils.clearPlaylist(assert, function () {
            done()
          })
        })
      })
    })
  })
}
