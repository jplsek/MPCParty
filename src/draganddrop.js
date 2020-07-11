module.exports = function (mpcp) {
  // drag and drop operations
  var drake = dragula([
    document.getElementById(mpcp.browser.tbodyid),
    document.getElementById(mpcp.playlist.tbodyid),
    document.getElementById(mpcp.pe.tbodyid),
    document.getElementById(mpcp.libraryAlbums.tbodyid),
    document.getElementById(mpcp.libraryArtists.tbodyid),
    document.getElementById(mpcp.librarySongs.tbodyid)
  ], {
    copy: function (el, source) {
      // clone everything but the playlist and playlist editor
      return (
        source.parentElement.id !== mpcp.playlist.tableid &&
      source.parentElement.id !== mpcp.pe.tableid
      )
    },
    accepts: function (el, target, source, sibling) {
      var tp = target.parentElement.id
      var sp = source.parentElement.id

      // only accept the playlist and playlist editor but
      // make sure pl and pe don't accept eachother
      return (
        (
          (tp !== mpcp.pe.tableid || sp !== mpcp.playlist.tableid) &&
        (tp !== mpcp.playlist.tableid || sp !== mpcp.pe.tableid)
        ) &&
      (
        tp === mpcp.playlist.tableid ||
        tp === mpcp.pe.tableid
      )
      )
    }
  })

  function getIndex (el, target) {
    // added at the end of the target
    if (!el) return target.children.length - 1
    return Array.prototype.indexOf.call(target.children, el) - 1
  }

  drake.on('drag', function (el, source) {
    switch (source.parentElement.id) {
      case mpcp.browser.tableid:
        mpcp.utils.checkSelected(el, mpcp.browser)
        break
      case mpcp.libraryArtists.tableid:
        mpcp.utils.checkSelected(el, mpcp.libraryArtists)
        break
      case mpcp.libraryAlbums.tableid:
        mpcp.utils.checkSelected(el, mpcp.libraryAlbums)
        break
      case mpcp.librarySongs.tableid:
        mpcp.utils.checkSelected(el, mpcp.librarySongs)
        break
      case mpcp.playlist.tableid:
        mpcp.utils.checkSelected(el, mpcp.playlist)
        break
      case mpcp.pe.tableid:
        mpcp.utils.checkSelected(el, mpcp.pe)
    }
  })

  drake.on('drop', function (el, target, source, sibling) {
    if (!source || !target) return console.log('null dnd')

    var tp = target.parentElement.id
    var sp = source.parentElement.id
    var index = getIndex(sibling, target)
    var pageIndex = 0

    // TODO figure out how to make the pe and pl scroll?

    if ((sp === mpcp.browser.tableid && tp === mpcp.playlist.tableid) ||
        (sp === mpcp.libraryArtists.tableid && tp === mpcp.playlist.tableid) ||
        (sp === mpcp.libraryAlbums.tableid && tp === mpcp.playlist.tableid) ||
        (sp === mpcp.librarySongs.tableid && tp === mpcp.playlist.tableid)) {
      // browser -> playlist
      // library artists -> playlist
      // library albums -> playlist
      // library songs -> playlist
      pageIndex = (mpcp.pages.currentPlaylist - 1) * mpcp.pages.maxPlaylist
      mpcp.playlist.fromSortableSender(el, index + pageIndex)
    } else if (sp === mpcp.playlist.tableid && tp === mpcp.playlist.tableid) {
      // playlist -> playlist
      pageIndex = (mpcp.pages.currentPlaylist - 1) * mpcp.pages.maxPlaylist
      mpcp.playlist.fromSortableSelf(el, index + pageIndex)
    } else if ((sp === mpcp.browser.tableid && tp === mpcp.pe.tableid) ||
        (sp === mpcp.libraryArtists.tableid && tp === mpcp.pe.tableid) ||
        (sp === mpcp.libraryAlbums.tableid && tp === mpcp.pe.tableid) ||
        (sp === mpcp.librarySongs.tableid && tp === mpcp.pe.tableid)) {
      // browser -> playlist editor
      // library artists -> playlist editor
      // library albums -> playlist editor
      // library songs -> playlist editor
      mpcp.pe.fromSortableSender(el, index)
    } else if (sp === mpcp.pe.tableid && tp === mpcp.pe.tableid) {
      // playlist editor -> playlist editor
      mpcp.pe.fromSortableSelf(el)
    }
  })
}
