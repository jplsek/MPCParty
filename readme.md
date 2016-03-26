MPCParty
========

This is yet another MPD web client. It was inspired to be used in multi-user environments, such as LAN parties. Previously I've used Client175, however as more users connect (~5) to Client175, it becomes slow, and eventually "freezes", requiring a restart of the server. I still recommend Client175 because of general stability, but if there are a lot of users connecting, MPCParty may be a better choice.

The interface is similar to Client175, while using Nodejs as a backend for better synchronization and performance between the server and the clients (hopefully).

![Screenshot](https://github.com/jplsek/MPCParty/raw/master/screenshot.png)

## Features
* No need to have a separate web server running!
* Play, pause, repeat, random, skip, seek, previous buttons and volume controls
* Playlist browser
    * Create new, save, overwrite, and load mpd playlists
    * Reorder songs by drag / drop
    * Remove songs by pressing "X"
    * Play song my pressing &#9654; or by double clicking
    * Remove duplicate songs from the playlist
    * Scramble the playlist
    * Right click to: play, remove, and move songs to the top, bottom, or after the currently playing song of the playlist
    * Multiselection (ctrl, shift: remove, weird drag and drop; right click: add to top, bottom, current)
    * Skip to remove songs (when user voting is disabled)
* File browser
    * Double click folders to browse them
    * Add songs to the playlist by pressing "+" or double clicking
    * Add folders to the playlist by pressing "+"
    * Add songs and folders to the playlist or playlist buffer by dragging
    * Sort by title, artist, album or time
    * Location bar
    * Add all songs based on current page to the playlist
    * Update music database
        * Note: you may need to refresh the page for the browser to become updated
    * Searching
    * Playlist position indication
    * Folder url linking
    * Search url linking
    * Right click to add a song (or folder) to the top, bottom, or after the currently playing song of the playlist (or playlist buffer)
    * Multiselection (ctrl, shift: add, weird drag and drop; right click: add to top, bottom, current)
* Playlist buffer
    * Create and edit playlists without interrupting the current playlist
    * Multiselection (ctrl, shift: remove, weird drag and drop; right click: add to top, bottom)
    * Right click to remove or move songs to the top or bottom of the playlist
    * Scramble and remove duplicates
* Download Player
    * Download videos, such as from youtube, and play the audio on the server.
* Basic mobile support
* Basic theming support

### Multi-user features
* Vote to skip songs (This can be easily bypassed. Might create a strict mode in the future)
* Synchronization between all users (such as playlist modification and player updates)
* Playlist buffer: Create and edit playlists without interrupting the current playlist
* User lists (optional)

## Configuration
* Edit config.cfg
    * Web port (default is 8081)
    * MPD url (default is localhost)
    * MPD port (default is 6600)
    * Enable vote skipping (default is true)
    * Vote skipping percentage (default is 75%, aka 75% of the users need to vote before taking effect)
    * Show user lists (default is false)
    * Enable the Download Player (default is true)
    * Set Download Player download location (default is ./downloads, but I recommend setting it to your Music folder)
    * Set the default volume of the Download Player (default is 50%)
    * Set whether or not to keep the downloaded videos after conversion (default is true)

## Installation
### 1) Dependencies
* Install [MPD](http://www.musicpd.org/download.html) (`sudo apt-get update && sudo apt-get install mpd`), and get a running instance working (a sample mpd conf file is stored in utils/ to be ran as a local user (run it with `mpd ~/.config/mpd/mpd.conf`))
* Install [nodejs](https://nodejs.org/download/) (`sudo apt-get install nodejs`)

> MPCParty has only been tested on GNU/Linux. Thus I only have binaries for GNU/Linux. OSX and BSD should work via the development version. I have yet to get Windows to compile with the Download Player enabled (so Windows works, just without the Player).

#### Optional dependencies for the Download Player (Youtube player)
* Install [ffmpeg](http://ffmpeg.org/download.html) or [libav](https://libav.org/download/) (`sudo apt-get install libav-tools`), it is used for video conversion with youtube-dl

### 2) Release version
* Download the latest release from the GitHub [releases](https://github.com/jplsek/MPCParty/releases) page.

### 2) Development version (should be stable)
* Install `npm`, `bower`, `build-essential`, `libav-tools`, `libasound2`, and `libasound2-dev` depending on your distribution.
* Clone this repository (`git clone https://github.com/jplsek/MPCParty`)
* Run `npm install` from the project's directory (to install all the libraries)
* If there are errors, you may need to install `nodejs-legacy`, and reinstall the libraries with `npm install`

> If you are not using the Download Player, you can ignore compile errors when running `npm install`, and disable it via the config file.

### 3) Running
* Run with `./run.sh` from this directory (or `npm start`)
* Done

### 4) Auto restarts (recommended!)
* Users: install [forever](https://github.com/foreverjs/forever#installation) then start `./run.sh` again.
* Sever admins: copy the reference systemd service file in utils/ and set it up to your needs

## Custom Theme Development
* Copy public/css/themes/default-thin.less and rename it to anything.
* Edit the variables as you see fit. You can look at the bootstrap/less folder to see what modules you want to overwrite.
* Edit view/index.jade in the configuration section, add your theme file name as the value and a name. (This might be changed to auto-populate the select list, but for now, you have to add them manually.)

## Issues
* Something, somewhere, crashes, at what seems to be random times. I've seen this happen with other web clients, so I'm not sure what the cause of this is. It could be MPCParty's code, the komponist library, or MPD itself. Restarting the MPCParty server fixes these issues. You *should* get a popup when it stops responding.
* Not all errors from MPD are handled properly. When this happens, MPCParty will stop working. Refresh the page to fix it. If possible, check the console and report what the error was and what you were doing to cause the error.
* If something is not working, and there is no notification, please report the issue as to what you were doing and what you were expecting. Check the console as to what the error was.

## Contribution
* Read todo.md or the issue tracker for suggestions of things to add or fix.
* I recommend using [jshint](http://jshint.com/install/) before sending something.

## License
* GNU Lesser General Public License v3 (LGPL-3.0)
