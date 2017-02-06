module.exports = function (mpcp) {

// drag and drop operations
var drake = dragula([
    document.getElementById(mpcp.browser.tbodyid),
    document.getElementById(mpcp.playlist.tbodyid),
    document.getElementById(mpcp.pb.tbodyid),
    document.getElementById(mpcp.libraryAlbums.tbodyid),
    document.getElementById(mpcp.libraryArtists.tbodyid),
    document.getElementById(mpcp.librarySongs.tbodyid),
], {
    copy: function (el, source) {
        // clone everything but the playlist and playlist buffer
        return (
            source.parentElement.id != mpcp.playlist.tableid &&
            source.parentElement.id != mpcp.pb.tableid
        );
    },
    accepts: function (el, target, source, sibling) {
        var tp = target.parentElement.id,
            sp = source.parentElement.id;

        // only accept the playlist and playlist buffer but
        // make sure pl and pb don't accept eachother
        return (
            (
                (tp != mpcp.pb.tableid || sp != mpcp.playlist.tableid) &&
                (tp != mpcp.playlist.tableid || sp != mpcp.pb.tableid)
            ) &&
            (
                tp == mpcp.playlist.tableid ||
                tp == mpcp.pb.tableid
            )
        );
    }
});

function getIndex(el, target) {
    // added at the end of the target
    if (!el) return target.children.length - 1;
    return Array.prototype.indexOf.call(target.children, el) - 1;
}

drake.on("drag", function (el, source) {
    switch (source.parentElement.id) {
        case mpcp.browser.tableid:
            mpcp.utils.checkSelected(el, mpcp.browser);
            break;
        case mpcp.libraryArtists.tableid:
            mpcp.utils.checkSelected(el, mpcp.libraryArtists);
            break;
        case mpcp.libraryAlbums.tableid:
            mpcp.utils.checkSelected(el, mpcp.libraryAlbums);
            break;
        case mpcp.librarySongs.tableid:
            mpcp.utils.checkSelected(el, mpcp.librarySongs);
            break;
        case mpcp.playlist.tableid:
            mpcp.utils.checkSelected(el, mpcp.playlist);
            break;
        case mpcp.pb.tableid:
            mpcp.utils.checkSelected(el, mpcp.pb);
    }
});

drake.on("drop", function (el, target, source, sibling) {
    if (!source || !target) return console.log("null dnd");

    var tp = target.parentElement.id,
        sp = source.parentElement.id,
        index = getIndex(sibling, target),
        pageIndex = 0;

    // TODO figure out how to make the pb and pl scroll?

    if (
        sp == mpcp.browser.tableid && tp == mpcp.playlist.tableid ||
        sp == mpcp.libraryArtists.tableid && tp == mpcp.playlist.tableid ||
        sp == mpcp.libraryAlbums.tableid && tp == mpcp.playlist.tableid ||
        sp == mpcp.librarySongs.tableid && tp == mpcp.playlist.tableid
    ) {
        // browser -> playlist
        // library artists -> playlist
        // library albums -> playlist
        // library songs -> playlist
        pageIndex = (mpcp.pages.currentPlaylist - 1) * mpcp.pages.maxPlaylist;
        mpcp.playlist.fromSortableSender(el, index + pageIndex);
    } else if (sp == mpcp.playlist.tableid && tp == mpcp.playlist.tableid) {
        // playlist -> playlist
        pageIndex = (mpcp.pages.currentPlaylist - 1) * mpcp.pages.maxPlaylist;
        mpcp.playlist.fromSortableSelf(el, index + pageIndex);
    } else if (
        sp == mpcp.browser.tableid && tp == mpcp.pb.tableid ||
        sp == mpcp.libraryArtists.tableid && tp == mpcp.pb.tableid ||
        sp == mpcp.libraryAlbums.tableid && tp == mpcp.pb.tableid ||
        sp == mpcp.librarySongs.tableid && tp == mpcp.pb.tableid
    ) {
        // browser -> playlist buffer
        // library artists -> playlist buffer
        // library albums -> playlist buffer
        // library songs -> playlist buffer
        mpcp.pb.fromSortableSender(el, index);
    } else if (sp == mpcp.pb.tableid && tp == mpcp.pb.tableid) {
        // playlist buffer -> playlist buffer
        mpcp.pb.fromSortableSelf(el);
    }
});

};
