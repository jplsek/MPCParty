module.exports = function (mpcp) {

// context menu
function contextResponse(key, table, tr) {
    console.log(key);

    switch(key) {
        // playlist
        case 'mttPlaylist':
            mpcp.playlist.moveToTop(tr.data().fileid);
            break;
        case 'mtbPlaylist':
            mpcp.playlist.moveToBottom(tr.data().fileid);
            break;
        case 'mtc':
            mpcp.playlist.moveToCurrent(tr);
            break;
        case 'remPlaylist':
            mpcp.playlist.remove(tr);
            break;
        case 'play':
            mpcp.playlist.play(tr);
            break;
            // pb
        case 'mttPb':
            mpcp.pb.moveToTop(tr);
            break;
        case 'mtbPb':
            mpcp.pb.moveToBottom(tr);
            break;
        case 'remPb':
            mpcp.pb.removeSong(tr);
            break;
        case 'infoBrowser':
            mpcp.browser.getSongInfo(tr.data().fileid);
            break;
        case 'infoPlaylist':
            mpcp.playlist.getSongInfo(tr.data().file);
            break;
    }

    // browser
    // directory
    if ($(tr)[0].classList.contains('directory')) {
        var dirid = tr.data().dirid;

        switch(key) {
            case 'attPlaylist':
                if (mpcp.browser.selected.length) {
                    mpcp.browser.addMulti(0);
                } else {
                    mpcp.playlist.addDir(dirid, 0);
                }
                break;
            case 'attPb':
                if (mpcp.browser.selected.length) {
                    mpcp.browser.addMulti(0);
                } else {
                    mpcp.pb.add(dirid, 0);
                }
                break;
            case 'atbPlaylist':
                if (mpcp.browser.selected.length) {
                    mpcp.browser.addMulti();
                } else {
                    mpcp.playlist.addDir(dirid);
                }
                break;
            case 'atbPb':
                if (mpcp.browser.selected.length) {
                    mpcp.browser.addMulti();
                } else {
                    mpcp.pb.add(dirid);
                }
                break;
            case 'atc':
                mpcp.playlist.addToCurrent(dirid, 'dir');
                break;
        }
    }

    // file
    if ($(tr)[0].classList.contains('file')) {
        var fileid = tr.data().fileid;

        switch(key) {
            case 'attPlaylist':
            case 'attPb':
                mpcp.browser.addExternal(fileid, 0);
                break;
            case 'atbPlaylist':
            case 'atbPb':
                mpcp.browser.addExternal(fileid);
                break;
            case 'atc':
                mpcp.browser.addExternal(fileid, mpcp.player.current.Pos + 1);
                break;
        }
    }

    // library
    if ($(tr)[0].classList.contains('artist') || $(tr)[0].classList.contains('album')) {
        var artist = $(tr).data().artist,
            album  = $(tr).data().album;

        switch(key) {
            case 'attPlaylist':
            case 'attPb':
                if ($(tr)[0].classList.contains('artist'))
                    mpcp.library.addExternal(
                            mpcp.libraryArtists, artist, album, 0, false);
                else if ($(tr)[0].classList.contains('album'))
                    mpcp.library.addExternal(
                            mpcp.libraryAlbums, artist, album, 0, false);
                break;
            case 'atbPlaylist':
            case 'atbPb':
                if ($(tr)[0].classList.contains('artist'))
                    mpcp.library.addExternal(
                        mpcp.libraryArtists, artist, album, undefined, false);
                else if ($(tr)[0].classList.contains('album'))
                    mpcp.library.addExternal(
                        mpcp.libraryAlbums, artist, album, undefined, false);
                break;
            case 'atc':
                if ($(tr)[0].classList.contains('artist') &&
                        mpcp.libraryArtists.selected.length) {
                    mpcp.library.addExternal(mpcp.libraryArtists, artist,
                        album, mpcp.player.current.Pos + 1, false);
                } else if ($(tr)[0].classList.contains('album') &&
                        mpcp.libraryAlbums.selected.length) {
                    mpcp.library.addExternal(mpcp.libraryAlbums, artist, album,
                        mpcp.player.current.Pos + 1, false);
                } else {
                    mpcp.library.getSongsFromAlbum(artist, album,
                            function (files) {
                        for (var i = 0; i < files.length; ++i) {
                            mpcp.playlist.addToCurrent(files[i].file, 'file');
                        }
                    });
                }
                break;
        }
    }
}

// enable the custom context menu
$.contextMenu({
    selector: '.context-menu',
    // above pb
    zIndex: 1003,
    build: function ($trigger, e) {
        var table = $trigger.parent().parent(),
            items = {},
            // can't get the title of contextmenu to work, so I'm using a menu
            // item as a title.
            title = $trigger.attr('title');

        switch(table.attr('id')) {
            case mpcp.playlist.tableid:
                mpcp.utils.checkSelected(e.currentTarget, mpcp.playlist);
                break;
            case mpcp.browser.tableid:
                mpcp.utils.checkSelected(e.currentTarget, mpcp.browser);
                break;
            case mpcp.pb.tableid:
                mpcp.utils.checkSelected(e.currentTarget, mpcp.pb);
                break;
            case mpcp.libraryArtists.tableid:
                mpcp.utils.checkSelected(e.currentTarget, mpcp.libraryArtists);
                break;
            case mpcp.libraryAlbums.tableid:
                mpcp.utils.checkSelected(e.currentTarget, mpcp.libraryAlbums);
                break;
            case mpcp.librarySongs.tableid:
                mpcp.utils.checkSelected(e.currentTarget, mpcp.librarySongs);
                break;
        }

        if (table[0].classList.contains('song-list'))
            title = $trigger.children('td:nth-child(2)').attr('title');

        //console.log($trigger);
        //console.log(title);

        // only apply when playlist buffer is active and not right clicking
        // the playlist
        if (mpcp.pb.current && table.attr('id') != 'playlist-song-list') {
            // browser
            if (table[0].classList.contains('song-list')) {
                items = {
                    'title': {name: title},
                    'attPb': {name: 'Add to top of playlist buffer'},
                    'atbPb': {name: 'Add to bottom of playlist buffer'}
                };

                if (!$($trigger)[0].classList.contains('directory'))
                    items.infoBrowser = {name: 'Song information'};
                // only on pb
            } else if (table.attr('id') == 'pb-song-list') {
                items = {
                    'title':       {name: title},
                    'mttPb':       {name: 'Move to top of playlist buffer'},
                    'mtbPb':       {name: 'Move to bottom of playlist buffer'},
                    'remPb':       {name: 'Remove'},
                    'infoBrowser': {name: 'Song information'}
                };
            } else if (table[0].classList.contains('library-list-context')) {
                items = {
                    'title': {name: title},
                    'attPb': {name: 'Add to top of playlist buffer'},
                    'atbPb': {name: 'Add to bottom of playlist buffer'}
                };
            } else {
                items = {
                    'temp': {name: 'Context menu not implemented yet for pb'}
                };
            }
        }
        // only on playlist
        else if (table.attr('id') == 'playlist-song-list') {
            // song is playing
            if (mpcp.player.current)
                items = {
                    'title':        {name: title},
                    'play':         {name: 'Play song'},
                    'mttPlaylist':  {name: 'Move to top of playlist'},
                    'mtc':          {name: 'Move after current playing song'},
                    'mtbPlaylist':  {name: 'Move to bottom of playlist'},
                    'remPlaylist':  {name: 'Remove'},
                    'infoPlaylist': {name: 'Song information'}
                };
            // song is not playing
            else if (!mpcp.player.current)
                items = {
                    'title':        {name: title},
                    'play':         {name: 'Play song'},
                    'mttPlaylist':  {name: 'Move to top of playlist'},
                    'mtbPlaylist':  {name: 'Move to bottom of playlist'},
                    'remPlaylist':  {name: 'Remove'},
                    'infoPlaylist': {name: 'Song information'}
                };
        }
        // only on browser
        else if (table[0].classList.contains('song-list')) {
            // song is playing
            if (mpcp.player.current)
                items = {
                    'title':       {name: title},
                    'attPlaylist': {name: 'Add to top of playlist'},
                    'atc':         {name: 'Add after current playing song'},
                    'atbPlaylist': {name: 'Add to bottom of playlist'}
                };
            // song is not playing
            else if (!mpcp.player.current)
                items = {
                    'title':       {name: title},
                    'attPlaylist': {name: 'Add to top of playlist'},
                    'atbPlaylist': {name: 'Add to bottom of playlist'}
                };

            if (!$($trigger)[0].classList.contains('directory'))
                items.infoBrowser = {name: 'Song information'};
            // only on browser
        } else if (table[0].classList.contains('library-list-context')) {
            // song is playing
            if (mpcp.player.current)
                items = {
                    'title':       {name: title},
                    'attPlaylist': {name: 'Add to top of playlist'},
                    'atc':         {name: 'Add after current playing song'},
                    'atbPlaylist': {name: 'Add to bottom of playlist'}
                };
            // song is not playing
            else if (!mpcp.player.current)
                items = {
                    'title':       {name: title},
                    'attPlaylist': {name: 'Add to top of playlist'},
                    'atbPlaylist': {name: 'Add to bottom of playlist'}
                };

            if (!($($trigger)[0].classList.contains('directory') ||
                    $($trigger)[0].classList.contains('artist') ||
                    $($trigger)[0].classList.contains('album')))
                items.infoBrowser = {name: 'Song information'};
        } else {
            items = {
                'temp': {name: 'Context menu not implemented yet'}
            };
        }

        return {
            callback: function (key, options) {
                //console.log("clicked: " + key);
                //console.log(options);
                var table = $(options.$trigger).parent().parent();
                contextResponse(key, table, options.$trigger);
            },
            items: items
        };
    }
});

};
