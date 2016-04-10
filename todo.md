TODO
====

# mpcparty.js

## Partially implemented
* Put title for playlist.
    * How do I find out the current playlist title?! I can only get it after manually opening/saving a playlist. I currently send a socket request to all the users about finding the title, and save the title for future connections.

## To implement
* More error handling notifications
* Playlist buffer:
    * Save pb on refresh with storage api?
    * Sharing with other users? (utilize users object?)
    * Page support
    * Searching
* Browser:
    * Drag and drop from browser to playlist:
        * Making tr smaller while dragging >>> jquery sortable dragged item was not under cursor when changing the width (using .ui-sortable-helper to change the width)
        * Fix jquery sortable bug when starting to drag from the right most part of the tr and not registering in the sortable playlist?
        * Drag into empty tables properly (only works in playlist if dragging over "empty playlist", but in pb, it will detect the playlist table instead of the pb table)
    * Loading icon between changing locations?
    * Custom column picker
    * Add a 'file' search mode in case the file doesn't have tag
* Library:
    * Search bar (songs)
    * Context menus (artists, albums)
    * Drag and drop (aritsts, albums)
    * URL's
    * Popstates
    * Global search brings browser back, closing global search brings library back
* Playlist:
    * Drag and drop through pages
    * Remove songs visually to the single user. (Do not update the playlist via mpd for the user editing it.) It will allow faster deletion for large playlists.
    * Give a warning if the playlist was not saved when the user tries to clear it
* Download Player:
    * List available files to play from download directory? (What if user has it set to their music library? Have a config option?)
    * Make it into a video streamer (muted by default on the client)?
* Option to disable notifications?
* Navigator? (tag grouping)
* MPD password support?
* Keyboard shortcuts?
* Album covers? (May use MusicBrainz)
* Switch to Bootstrap 4 when released?
* Playlist queueing (so it doesn't stop the song playing when opening a playlist)
* Some simple visualizer?
* After accessing a folder, check if there is only one folder and no songs, if so, automatically enter that folder (not when clicking location bar, however)
* Undo actions (like removing a song from the playlist)?
* Add a max updates per second setting
* Found out that the way I'm using floathead makes the app comparatively slower than not using it. So I might one day create a "lightweight" version from scratch.

## Bugs
* It seems crashing is due to refreshing too many times?
* Loading a theme will add another "theme load" every time.
* Webkit: resizing pb makes the values "inverted". http://codepen.io/anon/pen/VeWwLa
* Drag and drop inside multiselection is still buggy

---

# server.js

## Partially implemented
* Video Player:
    * General video controls are not very responsive
    * Give more specific error messages to the client

## To implement

## Bugs
* Client side visual errors when having multiple browsers open
    * Vote buttons do not accurately represent their vote
* Restart server -> skip 8 times -> memory leak WARNING (I don't think it's an actual memory leak, but I'd like to know how to fix it. I could also try socket.io instead)

---

# Making Releases:
* Set to false: app.locals.pretty in server.js
* Minify public/js/komponist.js and make sure index.jade uses the minified version
