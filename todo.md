TODO
====

# mpcparty.js

## Partially implemented
* Put title for playlist.
    * How do I find out the current playlist title?! I can only get it after manually opening/saving a playlist. I currently send a socket request to all the users about finding the title, and save the title for future connections.

## To implement
* More error handling notifications
* Playlist buffer:
    * Save pb on refresh (needs error handling)
    * Sharing with other users? (use users object)
    * Page support
* Browser:
    * Drag and drop from browser to playlist:
        * Making tr smaller while dragging >>> jquery sortable dragged item was not under cursor when changing the width (using .ui-sortable-helper to change the width)
        * Fix jquery sortable bug when starting to drag from the right most part of the tr and not registering in the sortable playlist?
        * Drag into empty tables properly (only works in playlist if dragging over "empty playlist", but in pb, it will detect the playlist table instead of the pb table)
    * Loading icon between changing locations?
* Playlist:
    * Drag and drop through pages
    * Remove songs visually to the single user. (Do not update the playlist via mpd for the user editing it.) It will allow faster deletion for large playlists.
    * Give a warning if the playlist was not saved when the user trys to clear it
* Download Player:
    * List available files to play from download directory? (What if user has it set to their music library? Have a config option?)
    * Make it into a video streamer (muted by default on the client)?
    * Search playlist
* Option to disable notifications?
* Navigator? (tag grouping)
* MPD password support?
* Keyboard shortcuts?
* Album covers? (May use MusicBrainz)
* Switch to Bootstrap 4 when released?
* Playlist queueing (so it doesnt stop the song playing when opening a playlist)
* Some simple visualizer?
* Afeer accessing a folder, check if there is only one folder and no songs, if so, automatically enter that folder (not when clicking location bar, however)
* Undo actions (like removing a song from the playlist)?
* Add a max updates per second setting
* Skip to remove mode (client)

## Bugs
* It seems crashing is due to refreshing too many times
* Loading a theme will add another "theme load" every time.
* Update music library: wait until database is finished before refreshing the browser
* Webkit: resizing pb makes the values "inverted". http://codepen.io/anon/pen/VeWwLa
* This mostly affects pb: Certain situations make it so songs are not added to the playlist (such as objects not containing all metadata), but "fixing" them also adds duplicate songs to the playlist.
    * This also adds a bug where positions are not correctly aligned
---

# server.js

## Partially implemented

## To implement

## Bugs
* Client side visual errors when having multiple browsers open
    * Vote buttons do not accurately represent their vote
* Restart server -> skip 8 times -> memory leak WARNING (I don't think it's an actual memory leak, but I'd like to know how to fix it. I could also try socket.io instead)

---

# Making Releases:
* Set to felse: app.locals.pretty in server.js
* Minify public/js/komponist.js and make sure index.jade uses the minified version
