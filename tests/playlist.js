module.exports = function (utils) {
  // player / playlist
  QUnit.test('pl + player: add dir + play + go to current + clear', function (assert) {
    var done = assert.async()

    utils.addDirToPl(assert, function () {
      utils.play(assert, function () {
        currentPos = parseInt($('#title-pos').text())

        // we go to current in case it's on a different page
        mpcp.playlist.goToCurrent(function () {
          var songPos = parseInt($(utils.pl + ' .bg-success').text())
          assert.equal(songPos, currentPos, 'go to current check')

          utils.clearPlaylist(assert, function () {
            done()
          })
        })
      })
    })
  })

  QUnit.test('pl + player: add songs + play + pause + pause + pause + clear ', function (assert) {
    var done = assert.async()

    utils.addSong(2, true, function () {
      var children = $(utils.pl).children('.gen')
      assert.equal($(children).length, 2, 'check if 2 songs added')

      utils.play(assert, function () {
        utils.pause(assert, function () {
          utils.pause(assert, function () {
            utils.pause(assert, function () {
              var childrenNow = $(utils.pl).children('.gen')
              assert.equal($(childrenNow).length, 2, 'check if 2 songs left')

              utils.clearPlaylist(assert, function () {
                done()
              })
            })
          })
        })
      })
    })
  })

  QUnit.test('pl + player: add songs + play + next + previous + clear ', function (assert) {
    var done = assert.async()
    utils.addSong(2, true, function () {
      var children = $(utils.pl).children('.gen')
      assert.equal($(children).length, 2, 'check if 2 songs added')

      utils.play(assert, function () {
        utils.next(assert, function () {
          // .status is getting called during this timeout which calls the previous()'s callback to early
          setTimeout(function () {
            utils.previous(assert, function () {
              var childrenNow = $(utils.pl).children('.gen')
              assert.equal($(childrenNow).length, 2, 'check if 2 songs left')

              utils.clearPlaylist(assert, function () {
                done()
              })
            })
          }, 500)
        })
      })
    })
  })

  // playlist
  QUnit.test('add dir to playlist + clear', function (assert) {
    var done = assert.async()

    utils.addDirToPl(assert, function () {
      utils.clearPlaylist(assert, function () {
        done()
      })
    })
  })

  QUnit.test('pl scramble check', function (assert) {
    var done = assert.async()
    utils.addSong(5, true, function () {
      var children = $(utils.pl).children('.gen')
      assert.equal($(children).length, 5, 'check if 5 songs added')

      console.log('pl test before scramble')
      mpcp.playlist.scramble(function () {
        console.log('pl test after scramble')
        var childrenNow = $(utils.pl).children('.gen')
        assert.ok($(children[0]).text() !== $(childrenNow[0]).text() || $(children[1]).text() !== $(childrenNow[1]).text() || $(children[2]).text() !== $(childrenNow[2]).text(), 'check if scramble works')

        console.log('pl test before clear')
        utils.clearPlaylist(assert, function () {
          console.log('pl test after clear')
          done()
        })
      })
    })
  })

  QUnit.test('pl duplicate check', function (assert) {
    var done = assert.async()
    utils.addSong(2, true, function () {
      utils.addSong(5, false, function () {
        var children = $(utils.pl).children('.gen')
        assert.equal($(children).length, 7, 'check if 8 songs added')

        mpcp.playlist.removeDuplicates(function () {
          var childrenNow = $(utils.pl).children('.gen')
          assert.equal($(childrenNow).length, 2, 'check if 2 songs left')

          utils.clearPlaylist(assert, function () {
            done()
          })
        })
      })
    })
  })

  QUnit.test('browser to playlist: folder + save + clear + open + delete + clear', function (assert) {
    var done = assert.async()

    utils.addDirToPl(assert, function (childrenBefore) {
      // save the playlist
      mpcp.stored.updatePlaylists(utils.plSaveModal, null, function () {
        $('#playlist-save-input').val(utils.plSave)

        mpcp.playlist.saveFromStored(function () {
          assert.equal($('#playlist-title').text(), utils.plSave, 'check if title is utils.plSave')

          // clear the playlist
          utils.clearPlaylist(assert, function () {
            // open the playlist
            mpcp.stored.updatePlaylists(utils.plOpenModal, null, function () {
              var ele = utils.plOpenModal + ' tr:contains("' + utils.plSave + '")'
              assert.ok($(ele).length, 'check if pl is visible')
              $(ele).click()

              mpcp.playlist.openFromStored(function () {
                children = $(utils.pl).children('.gen')
                assert.equal(children.length, childrenBefore.length, 'check if same playlist')

                // open the playlist
                mpcp.stored.updatePlaylists(utils.plOpenModal, null, function () {
                  var ele = utils.plOpenModal + ' tr:contains("' + utils.plSave + '")'
                  assert.ok($(ele).length, 'check if pl is visible')
                  var file = $(ele).data().fileid

                  // delete the playlist
                  mpcp.stored.removePlaylist(file, ele, function () {
                    assert.notOk($(ele).is(':visible'), 'check if pl is not visible')

                    // clear the playlist
                    utils.clearPlaylist(assert, function () {
                      done()
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  QUnit.test('add all + search', function (assert) {
    var done = assert.async()

    mpcp.browser.addAll(function () {
      var pages = $('#playlist-pages .total-pages').text()

      mpcp.playlist.search('love', function () {
        var pagesNow = $('#playlist-pages .total-pages').text()
        assert.ok(pages !== pagesNow, 'check if pages are different')
        var childrenNow = $(utils.pl).children('.gen')
        assert.ok($(childrenNow).length > 1, 'check if at least 2 songs are in pl')

        mpcp.playlist.resetSearch(function () {
          var pagesNow = $('#playlist-pages .total-pages').text()
          assert.ok(pages === pagesNow, 'check if pages are the same again')

          utils.clearPlaylist(assert, function () {
            done()
          })
        })
      })
    })
  })

  QUnit.test('pl song info', function (assert) {
    var done = assert.async()

    utils.addDirToPl(assert, function () {
      var file = $($(utils.pl).find('.gen')[0]).data().file

      mpcp.playlist.getSongInfo(file, function () {
        var children = $('#song-info tbody').children('.gen')
        assert.ok($(children).length > 1, 'check if at least 2 items are in song info')
        $('#song-info-modal').modal('hide')

        utils.clearPlaylist(assert, function () {
          done()
        })
      })
    })
  })
}
