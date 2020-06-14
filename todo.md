TODO
====

# mpcparty.js

## Partially implemented
* Put title for playlist.
    * How do I find out the current playlist title?! I can only get it after manually opening/saving a playlist. I currently send a socket request to all the users about finding the title, and save the title for future connections.

## To implement
* More error handling notifications
* Playlist editor:
    * Save pe on refresh with storage api?
    * Sharing with other users? (utilize users object?)
    * Page support
* Browser:
    * Loading icon between changing locations?
    * Custom column picker
* Playlist:
    * Drag and drop through pages
    * Remove songs visually to the single user. (Do not update the playlist via mpd for the user editing it.) It will allow faster deletion for large playlists.
    * Give a warning if the playlist was not saved when the user tries to clear it
* Playlists:
    * Tell the user when the playlists cannot be loaded due to permission errors
* http stream support
* Option to disable notifications?
* Navigator? (tag grouping)
* MPD password support?
* Playlist queueing (so it doesn't stop the song playing when opening a playlist)
* Some simple visualizer?
* After accessing a folder, check if there is only one folder and no songs, if so, automatically enter that folder (not when clicking location bar, however)
* Undo actions (like removing a song from the playlist)?
* Add a max updates per second setting
* Keyboard shortcuts for erything (delete songs from playlists, delete playlist, pausing, etc)

* Unit testing
* One day restructure everything to reduce coupling and maybe follow some patterns...

## Bugs
* It seems crashing is due to refreshing too many times?
* Playlists:
    * The playlist scrolls down / goes to the next page before the server updates the playlist

---

# server.js

## Partially implemented

## To implement

## Bugs
* Client side visual errors when having multiple browsers open
    * Vote buttons do not accurately represent their vote

---

# Making Releases:
* Set "release" to true in server.js
