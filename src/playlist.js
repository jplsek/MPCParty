module.exports = function (mpcp) {

// the playlist
return {
  table: '#playlist-song-list',
  tableid: 'playlist-song-list',
  tbody: '#playlist-song-list .append',
  tbodyid: 'playlist-song-list-tbody',
  // current playlist title
  current: '',
  // set to false when we don't want an update to happen
  doUpdate: true,
  // list used for other functions
  list: {files: [], positions: []},
  // local copy of mpd json response
  local: {},
  // selected items from multiSelect
  selected: [],
  // add pulse effect on next update
  toPulse: [],
  // check if searching as to keep search while updating
  isSearching: false,
  // current search term
  searchTerm: '',
  // scroll to position after playlist update
  goAfterUpdate: false,
  // remove after skipping songs
  skipToRemove: false,
  // callback after dom updates
  callbackUpdates: [],

  // used to update the current playlist
  updateAll: function () {
    // do not use 'this'. Can be used in a callback.
    if (!mpcp.playlist.doUpdate) {
      mpcp.playlist.doUpdate = true;
      return;
    }

    console.log('updating playlist');

    // reset list
    mpcp.playlist.list = {files: [], positions: []};

    if (mpcp.playlist.isSearching) {
      mpcp.playlist.search();
    } else {
      // we update the player first to update the current song positison
      // which is used for 'movetocurrent', the 'remove last song' bug
      // and other operations
      mpcp.player.updateAll(function () {
        komponist.playlistinfo(function (err, playlistLoad) {
          $('#playlist-title strong')[0].innerHTML =
            mpcp.playlist.current;
          $('#playlist-title strong').attr('title',
            mpcp.playlist.current);

          if (err) {
            console.log(err);
            mpcp.playlist.callbackUpdate();
            return;
          }

          document.getElementById(mpcp.playlist.tbodyid).innerHTML = '';
          mpcp.playlist.local = playlistLoad;

          if ($.isEmptyObject(playlistLoad[0])) {
            var html = '<tr class="rem gen"><td><em class="text-muted">The playlist is empty! Songs can be added from the browser or by opening a playlist.</em></td></tr>';
            document.getElementById(mpcp.playlist.tbodyid).innerHTML = html;
            // fix for removing the last song that's
            // playling from the playlist
            mpcp.playlist.doUpdate = true;
            mpcp.player.updateAll();
            mpcp.pages.update('playlist');
            mpcp.browser.updatePosition();
            console.log('Empty playlist');
            mpcp.playlist.callbackUpdate();
            return;
          }

          // TODO figure out a way to use mpcp.playlist.local
          // efficiently with mpcp.browser.updatePlaylist instead of
          // utilizing mpcp.playlist.list
          for (var i = 0; i < mpcp.playlist.local.length; ++i) {
            mpcp.playlist.list.files.push(
              mpcp.playlist.local[i].file);
            mpcp.playlist.list.positions.push(
              mpcp.playlist.local[i].Pos);
          }

          // since goToCurrent runs updateLocal, skip the regular
          // updateLocal
          if (mpcp.playlist.goAfterUpdate) {
            mpcp.playlist.goAfterUpdate = false;
            mpcp.playlist.goToCurrent();
            mpcp.playlist.callbackUpdate();
          } else {
            mpcp.playlist.updateLocal();
          }
        });
      });
    }
  },

  updateLocal: function (callback) {
    if (!this.doUpdate) {
      this.doUpdate = true;
      return;
    }

    console.log('update playlist locally');

    // length is always 1 for this.local, this fixes the empty
    // object
    if (this.local.length <= 1) {
      // remove album-art if playlist was cleared
      mpcp.utils.setCurrentAlbumArt();

      if ((this.local[0] && Object.getOwnPropertyNames(
              this.local[0]).length <= 0) ||
          this.local.length <= 0) {
        this.callbackUpdate();
        return;
      }
    }

    $(this.table + ' .gen').remove();

    var html  = '',
      // item start and end from current page
      start =  (mpcp.pages.currentPlaylist - 1) *
        mpcp.pages.maxPlaylist,
      end   = ((mpcp.pages.currentPlaylist - 1) *
        mpcp.pages.maxPlaylist) + mpcp.pages.maxPlaylist,
      i;

    //console.log(end);
    // make all toPulse to ints
    for (i = 0; i < this.toPulse.length; ++i) {
      this.toPulse[i] = parseInt(this.toPulse[i]);
    }

    // get width of first column
    var positionWidth = 5;  // PL1._
    for (i = 0; i < this.local.length; ++i) {
      // show calculate necessary files
      if (mpcp.pages.enabledPlaylist) {
        if (i < start)
          continue;
        else if (i >= end)
          break;
      }

      var value = this.local[i];
      var length = 4;  // PL{}._
      if (value.Prio) {
        length += value.Prio.toString().length + 2;  // []
      }
      length += (Number(value.Pos) + 1).toString().length
      if (length > positionWidth) {
        positionWidth = length;
      }
    }

    // create table rows
    for (i = 0; i < this.local.length; ++i) {
      var value = this.local[i];

      value.Pos = parseInt(value.Pos);
      value.Id  = parseInt(value.Id);
      //console.log(value.file);

      // show only necessary files
      if (mpcp.pages.enabledPlaylist) {
        if (i < start)
          continue;
        else if (i >= end)
          break;
      }

      var title   = mpcp.utils.getSimpleTitle(
          value.Title, value.Artist, value.file),
        current = 'gen';

      // highlight current song on first load
      if (mpcp.player.current && value.Id == mpcp.player.current.Id)
        current += ' bg-success text-light';

      if (mpcp.settings.pulse &&
          ~this.toPulse.indexOf(value.Id)) {
        // pulses twice because of lag
        current += ' pulse2';
      }

      //console.log(i + ': start');

      let prio = '';

      if (value.Prio) {
        prio = ` [${value.Prio}]`;
      }

      html += `<tr class="drag context-menu ${current}" title="${title}" data-fileid="${value.Id }" data-file="${value.file}" data-pos="${value.Pos}" data-prio="${value.Prio}">` +
        `<td class="playlist-song-list-icons" style="width: ${positionWidth}ch"><i class="song-play fas fa-play faded text-success" title="Play song"></i>${value.Pos + 1}.${prio}</td>` +
        `<td class="ellipsis">${title}</td>` +
        `<td class="playlist-song-list-icons text-right" style="width: 3ch"><i class="song-remove fas fa-times faded text-danger" title="Remove song from playlist"></i></td></tr>`;
    }

    this.toPulse = [];

    document.getElementById(this.tbodyid).innerHTML = html;

    mpcp.browser.updatePosition();
    mpcp.pages.update('playlist');
    this.callbackUpdate();
    if (callback) callback();
  },

  // drag and drop came from a different table
  fromSortableSender: function (el, newIndex) {
    console.log('from sortable sender (playlist)');

    // check if "playlist is empty" is showing
    if (newIndex == 1 && document.getElementById(this.tbodyid).children[0].classList.contains('rem'))
      newIndex = 0;

    if (mpcp.browser.selected.length) {
      mpcp.browser.addMulti(newIndex, null, true);
      return;
    } else if (mpcp.librarySongs.selected.length) {
      mpcp.librarySongs.addMulti(newIndex, true);
      return;
    } else if (el.classList.contains('artist') &&
        mpcp.libraryArtists.selected.length) {
      mpcp.library.addMulti(mpcp.libraryArtists, newIndex, true, true);
      return;
    } else if (el.classList.contains('album') &&
        mpcp.libraryAlbums.selected.length) {
      mpcp.library.addMulti(mpcp.libraryAlbums, newIndex, true, true);
      return;
    }

    var artist, album, i;

    // file
    // note: multiselect is checked in addDir and addSong!
    if (el.classList.contains('file')) {
      var file = el.dataset.fileid;
      // check if nothing in playlist
      if (this.local.length <= 1) {
        this.addid(file, undefined, true);
      } else {
        this.addSong(file, newIndex, true);
      }
    } else if (el.classList.contains('directory')) {
      // directory
      var dir = el.dataset.dirid;
      console.log('add dir ' + dir);

      if (this.local.length <= 1) {
        this.addDir(dir, undefined, true);
      } else {
        this.addDir(dir, newIndex, true);
      }
    } else if (el.classList.contains('album')) {
      artist = el.dataset.artist;
      album  = el.dataset.album;

      mpcp.library.getSongsFromAlbum(artist, album, function (files) {
        for (i = 0; i < files.length; ++i) {
          mpcp.playlist.addSong(files[i].file, newIndex, true);
        }
      });
    } else if (el.classList.contains('artist')) {
      artist = el.dataset.artist;

      mpcp.library.getSongsFromAlbum(
          artist, undefined, function (files) {
            for (i = 0; i < files.length; ++i) {
              mpcp.playlist.addSong(files[i].file, newIndex, true);
            }
          });
    } else {
      console.log('not supported drag for: ' + el.classList);
      mpcp.sortHelper.removeItem(e);
    }
  },

  // drag and drop came from the same table
  fromSortableSelf: function (el, newIndex) {
    console.log('from sortable self (playlist)');

    var file;

    if (this.selected.length) {
      $(this.selected).each(function (item, tr) {
        file = $(tr).data().fileid;

        mpcp.playlist.toPulse.push(file);

        var pos = $(tr).data().pos,
          index;

        // if original location is below the "move to"
        // location
        if (pos > newIndex) {
          index = newIndex + item;
          //console.log('dragged playlist: ' + file + ' to ' +
          //index);
          komponist.moveid(file, index, function (err) {
            if (err) console.log(err);
          });
        } else {
          // else if original location is about the
          // "move to" location
          index = newIndex;
          //console.log('dragged playlist: ' + file + ' to ' +
          //index);
          komponist.moveid(file, index, function (err) {
            if (err) console.log(err);
          });
        }
      });

      mpcp.utils.clearSelected(this);
    } else {
      file = el.dataset.fileid;
      this.toPulse.push(file);
      //console.log('dragged playlist: ' + file + ' to ' + newIndex);

      komponist.moveid(file, newIndex, function (err) {
        if (err) console.log(err);
      });
    }
  },

  // wrapper for komponist.addid
  addid: function (file, to, callback) {

    if (mpcp.utils.isNumber(to))
      komponist.addid(file, to, function (err, val) {
        if (err)
          console.log(err);
        else
          mpcp.playlist.toPulse.push(val.Id);

        mpcp.playlist.addCallbackUpdate(callback);
      });
    else
      komponist.addid(file, function (err, val) {
        if (err)
          console.log(err);
        else
          mpcp.playlist.toPulse.push(val.Id);

        mpcp.playlist.addCallbackUpdate(callback);
      });
  },

  // wrapper for komponist.add
  add: function (dir, to, callback) {
    if (mpcp.utils.isNumber(to)) {
      mpcp.utils.getAllInfo(dir, function (files) {
        if (!files.length) {
          console.log('Nothing in db');
          if (callback) callback();
          return;
        }

        //console.log(files);
        var j = 0;

        $(files).each(function (item, value) {
          //console.log(value);
          if (value.file) {
            mpcp.playlist.addid(value.file, to++, function () {
              if (++j == Object.keys(files).length)
                mpcp.playlist.addCallbackUpdate(callback);
            });
          } else {
            if (++j == Object.keys(files).length)
              mpcp.playlist.addCallbackUpdate(callback);
          }
        });
      });
    } else {
      komponist.add(dir, function (err, val) {
        //val returns an empty object (I was hoping for an Id list)
        //console.log(val);
        if (err)
          console.log(err);
        //else
        //mpcp.playlist.toPulse.push(val.Id);

        mpcp.playlist.addCallbackUpdate(callback);
      });
    }
  },

  // addSong
  addSong: function (file, to, dontScroll, callback) {
    console.log('adding song to playlist');

    if (!dontScroll) {
      if (to === undefined || isNaN(to)) {
        this.addCallbackUpdate(function () {
          mpcp.pages.go('playlist', mpcp.pages.totalPlaylist, true);
        });
      } else if (mpcp.player.current &&
          to == mpcp.player.current.Pos + 1) {
        this.addCallbackUpdate(function () {
          mpcp.playlist.goToCurrent();
        });
      } else {
        this.addCallbackUpdate(function () {
          mpcp.playlist.goToPos(to);
        });
      }
    }

    this.addid(file, to, callback);
  },

  // addDir
  addDir: function (dir, to, dontScroll, callback) {
    console.log('adding dir to playlist');

    if (!dontScroll) {
      if (to === undefined || isNaN(to)) {
        this.addCallbackUpdate(function () {
          mpcp.pages.go('playlist', mpcp.pages.totalPlaylist, true);
        });
      } else {
        this.addCallbackUpdate(function () {
          mpcp.playlist.goToPos(to);
        });
      }
    }

    this.add(dir, to, callback);
  },

  // wrapper for komponist.findadd
  findAdd: function (artist, album) {
    if (!album) {
      komponist.findadd('artist', artist, function (err, files) {
        setSongs(err, files);
      });
    } else {
      komponist.findadd(
          'artist', artist, 'album', album, function (err, files) {
        setSongs(err, files);
      });
    }

    function setSongs (err, files) {
      if (err) console.log(err);
      // no files in response

      mpcp.playlist.addCallbackUpdate(function () {
        mpcp.pages.go('playlist', mpcp.pages.totalPlaylist, true);
      });
    }
  },

  // plays the song in the playlist
  playSong: function (file) {
    console.log('play song from playlist: ' + file);
    komponist.playid(file, function (err, val) {
      // false positive error
      if (err && err.message !=
          'Integer expected: undefined [2@0] {playid}') {
        console.log('Error: No song found to play');
        console.log(err);
      }
    });
  },

  // wrapper for playSong, given an element
  play: function (ele) {
    var file = $(ele).data().fileid;
    this.playSong(file);
  },

  // update the current playlist title
  updateTitle: function (title) {
    console.log('got pl title from another user: ' + title);

    mpcp.history.add('Loaded playlist: ' + title);
    this.current = title.replace(/ /g, '\u00a0');

    // fixes a bug where the playlist doesn't get updated
    // after a new one is loadded
    this.updateAll();
  },

  // remove duplicate files from the playlist
  removeDuplicates: function (callback) {
    console.log('remove duplicates');
    var duplicate = {},
      j = 0;

    $(this.local).each(function (item, file) {
      if (duplicate[file.file] && (mpcp.player.current === null ||
            file.Pos != mpcp.player.current.Pos)) {
        komponist.deleteid(file.Id, function (err, val) {
          if (err) {
            console.log('Error: Cannot remove duplicate file, this might be a bug');
            console.log(err);
          }

          if (++j == Object.keys(mpcp.playlist.local).length &&
              callback)
            mpcp.playlist.addCallbackUpdate(callback);
        });
      } else {
        duplicate[file.file] = true;

        if (++j == Object.keys(mpcp.playlist.local).length && callback)
          mpcp.playlist.addCallbackUpdate(callback);
      }
    });
  },

  // TODO Goal: remove song from playlist without mpd updating the playlist
  // locally. Have to update this.local .Pos to work, or somehow
  // use numbered table rows instead of using Pos.
  // remove song from the playlist. The element must be removed
  // manually before or after calling!
  removeSong: function (fileid) {
    komponist.deleteid(fileid, function (err, val) {
      if (err) console.log('No song with id ' + fileid + ' to delete!');
    });

    // playlist doesn't get updated when the same song being removed is
    // playling (future me: this happens with not only pause, but other
    // times as well, so dont check for a pause flag!)
    if (mpcp.player.current && fileid == mpcp.player.current.Id)
      socket.send(JSON.stringify(
          {'type': 'update-playlist'}), function (err) {
        if (err) console.log(err);
      });
  },

  // wrapper for removeSong, given an element
  remove: function (ele) {
    //console.log(this.selected);
    var file;

    // multiselect check (any left clicks)
    if (this.selected.length) {
      $(this.selected).each(function (item, tr) {
        //console.log(tr);
        file = $(tr).data().fileid;
        mpcp.playlist.removeSong(file);
      });

      // clear this.selected just in case.
      mpcp.utils.clearSelected(this);
    } else {
      // single file (fallback)
      file = $(ele).data().fileid;
      this.removeSong(file);
    }
  },

  // adds the song after the currently playing song
  addToCurrent: function (file, type) {
    var newPos = mpcp.player.current.Pos + 1;
    this.goAfterUpdate = true;

    if (mpcp.browser.selected.length) {
      mpcp.browser.addMulti(newPos);
      return;
    }

    if (type == 'file') {
      this.addSong(file, newPos, true);
    } else if (type == 'dir') {
      this.addDir(file, newPos, true);
    }
  },

  // move song to the top of the playlist
  moveToTop: function (file, type) {
    //console.log(file);
    // goes to page first because of pulse being cleared
    $('#pslwrap').scrollTop($(mpcp.playlist.table));
    mpcp.pages.go('playlist', 1);

    // multiselect check
    if (mpcp.playlist.selected.length) {
      $(mpcp.playlist.selected).each(function (item, tr) {
        //console.log(tr);
        file = $(tr).data().fileid;
        mpcp.playlist.toPulse.push(file);

        komponist.moveid(file, item, function (err) {
          if (err) console.log(err);
        });
      });

      // clear selected just in case.
      mpcp.utils.clearSelected(mpcp.playlist);
    } else {
      mpcp.playlist.toPulse.push(file);
      console.log(file);

      komponist.moveid(file, 0, function (err) {
        if (err) console.log(err);
      });
    }
  },

  // move song to the currently playing song in the playlist
  moveToCurrent: function (file) {
    //console.log(mpcp.player.current.Pos);
    //console.log(file);
    var newPos = mpcp.player.current.Pos + 1;

    // multiselect check
    if (mpcp.playlist.selected.length) {
      // only do this if the the moved songs are above the current song
      var lastPos = $(mpcp.playlist.selected[
          mpcp.playlist.selected.length-1]).
        data().pos;

      mpcp.playlist.goAfterUpdate = true;

      $(mpcp.playlist.selected).each(function (item, tr) {
        var fileid = $(tr).data().fileid,
          pos  = $(file).data().pos;

        mpcp.playlist.toPulse.push(fileid);

        // currently playing song is above file to be moved
        if (mpcp.player.current && mpcp.player.current.Pos < pos)
          newPos = mpcp.player.current.Pos + 1 + item;
        // currently playing song is below file to be moved
        else if ((mpcp.player.current &&
              mpcp.player.current.Pos > pos) ||
            mpcp.player.current)
          newPos = mpcp.player.current.Pos;
        // currently playing song is the same file to be moved
        else
          newPos = 0 + item;

        //console.log(newPos);
        komponist.moveid(fileid, newPos, function (err) {
          if (err) console.log(err);
        });
      });

      // clear selected just in case.
      mpcp.utils.clearSelected(mpcp.playlist);
    } else {
      mpcp.playlist.goAfterUpdate = true;
      var fileid = $(file).data().fileid,
        pos  = $(file).data().pos;

      mpcp.playlist.toPulse.push(fileid);

      // currently playing song is above file to be moved
      if (mpcp.player.current && mpcp.player.current.Pos < pos)
        newPos = mpcp.player.current.Pos + 1;
      // currently playing song is below file to be moved
      else if ((mpcp.player.current && mpcp.player.current.Pos > pos) ||
          mpcp.player.current)
        newPos = mpcp.player.current.Pos;
      // currently playing song is the same file to be moved
      else
        newPos = 0;

      //console.log(newPos);
      komponist.moveid(fileid, newPos, function (err) {
        if (err) console.log(err);
      });
    }
  },

  // move song to the bottom of the playlist
  moveToBottom: function (file) {
    var index = mpcp.playlist.local.length;
    //console.log(index);

    // goes to page first because of pulse being cleared
    mpcp.pages.go('playlist', mpcp.pages.totalPlaylist);
    $('#pslwrap').scrollTop($(mpcp.playlist.table)[0].scrollHeight);

    // multiselect check
    if (mpcp.playlist.selected.length) {
      $(mpcp.playlist.selected).each(function (item, tr) {
        file = $(tr).data().fileid;
        mpcp.playlist.toPulse.push(file);

        komponist.moveid(file, (index - 1), function (err) {
          if (err) console.log(err);
        });
      });

      // clear selected just in case.
      mpcp.utils.clearSelected(mpcp.playlist);
    } else {
      //console.log(file);
      mpcp.playlist.toPulse.push(file);

      komponist.moveid(file, (index - 1), function (err) {
        if (err) console.log(err);
      });
    }
  },

  // go to the page that the position of the song is located in
  goToPos: function (pos) {
    mpcp.pages.go('playlist', pos / mpcp.pages.maxPlaylist + 1);
  },

  // goes to the current song in the playlist.
  goToCurrent: function (callback) {
    console.log('go to current');

    if (!mpcp.player.current) {
      console.log('no song selected');
      if (callback) callback();
      return;
    }

    // scroll to top to avoid scrolling bugs
    $('#pslwrap').scrollTop($(this.table));

    // go to the page the song is playing on
    this.goToPos(mpcp.player.current.Pos);
    // try to go above the element, so the item is semi-centered
    var to = (mpcp.player.current.Pos % mpcp.pages.maxPlaylist) - 5;

    if (to < 1) to = 1;

    console.log('scroll to ' + to);

    var toOffset = $(this.tbody + ' .gen:nth-child(' + to + ')');

    if (toOffset.length) {
      var offset = toOffset.offset().top;
      $('#pslwrap').scrollTop(offset);
    }

    if (callback) callback();
  },

  // show song information to the user
  getSongInfo: function (file, callback) {
    komponist.playlistfind('file', file, function (err, value) {
      mpcp.utils.parseSongInfo(err, value[0], callback);
    });
  },

  search: function (val, callback) {
    if (!val)
      val = mpcp.playlist.searchTerm;
    else
      mpcp.playlist.searchTerm = val;

    // set to true (in case of after clicking clear)
    mpcp.playlist.isSearching = true;

    // search for tags
    komponist.playlistsearch('any', val, function(err, anyFiles) {

      // search for file names
      komponist.playlistsearch('file', val, function(err, files) {
        if (err) {
          if (callback) callback();
          return console.log(err);
        }

        //console.log(files);

        anyFiles = mpcp.utils.toArray(anyFiles);
        files = mpcp.utils.toArray(files);

        var unique = mpcp.utils.concatDedupe(anyFiles, files);

        //console.log(unique);

        $(mpcp.playlist.table + ' .gen').remove();
        mpcp.playlist.local = unique;

        if ($.isEmptyObject(unique[0])) {
          var html = '<tr class="gen"><td><em class="text-muted">No songs found</em></td></tr>';
          document.getElementById(mpcp.playlist.tbodyid).innerHTML = html;
          // fix for removing the last song that's
          // playling from the playlist
          mpcp.playlist.doUpdate = true;
          mpcp.player.updateAll();
          mpcp.pages.update('playlist');
          mpcp.browser.updatePosition();
          if (callback) callback();
          return console.log('No songs found in playlist search');
        }

        // TODO figure out a way to use this.local
        // efficiently with mpcp.browser.updatePlaylist instead of
        // utilizing this.list
        $(mpcp.playlist.local).each(function (item, value) {
          mpcp.playlist.list.files.push(value.file);
          mpcp.playlist.list.positions.push(value.Pos);
        });

        mpcp.playlist.updateLocal(function () {
          // fixes issues such as the last song not updating the player;
          mpcp.player.updateAll(callback);
        });
      });
    });
  },

  resetSearch: function (callback) {
    mpcp.playlist.addCallbackUpdate(callback);
    mpcp.playlist.isSearching = false;
    mpcp.playlist.updateAll();
  },

  // open playlist from stored element
  openFromStored: function (callback) {
    if ($('#playlist-open-modal .selected').length) {
      var file = $('#playlist-open-modal .selected').data().fileid;
      mpcp.stored.open(file, callback);
    } else {
      mpcp.lazyToast.warning('No playlist was selected', 'Playlist');

      if (callback) callback();
    }
  },

  // save playlist from stored element
  saveFromStored: function (callback) {
    console.log('confirm save playlist');
    var file = document.getElementById('playlist-save-input').value;
    mpcp.stored.save(file, callback);
  },

  // create a queue because the server responds once for a dom update
  addCallbackUpdate: function (callback) {
    if (typeof callback === 'function') {
      this.callbackUpdates.push(callback);
    } else if (callback) {
      console.log('!!! This is not a function, fix it:');
      console.log(callback);
    }
  },

  callbackUpdate: function () {
    // remove callback from array instead of just resetting the array
    // afterward to fix an issue where callbackUpdates was not reset
    // because a callback was executing a NEW callback stack.
    while (this.callbackUpdates.length) {
      var callback = this.callbackUpdates[0];
      this.callbackUpdates.splice(0, 1);

      if (!this.callbackUpdates.length)
        return callback();
      else
        callback();
    }
  },

  clear: function (callback) {
    console.log('clear playlist');
    this.addCallbackUpdate(callback);

    // this is done server-side to fix a bug:
    // refresh -> add -> play -> clear does not work
    socket.send(JSON.stringify({'type': 'clear-playlist'}),
        function (err) {
      if (err) console.log(err);
    });
  },

  scramble: function (callback) {
    console.log('scramble playlist');
    komponist.shuffle(function (err) {
      if (err) console.log(err);
      mpcp.playlist.addCallbackUpdate(callback);
    });
  },

  setPriority: (priority, fileid) => {
    komponist.prioid(priority, fileid, (err) => {
      if (err) console.error(err);
    });
  },

  setPriorityFromForm: () => {
    if (!document.getElementById('priority-form').checkValidity()) {
      document.getElementById('priority-submit').click();
    } else {
      $('#set-priority-modal').modal('hide');
      let priority = document.getElementById('priority').value;
      let fileid = document.getElementById('priority-form').dataset.fileid;
      mpcp.playlist.setPriority(priority, fileid);
    }
  },

  initEvents: function () {
    $('#new-playlist').click(function () { mpcp.pe.newLocal(); });

    $('#scramble').click(function () {
      mpcp.playlist.scramble();
    });

    $('#remove-duplicates').click(function () {
      mpcp.playlist.removeDuplicates();
    });

    $('#open-playlist').click(function () {
      console.log('open playlists');
      mpcp.stored.updatePlaylists('#playlist-open-modal');
    });

    $('#save-playlist').click(function () {
      console.log('save playlist');
      mpcp.stored.updatePlaylists('#playlist-save-modal');
    });

    $('#playlist-save-confirm').click(function () {
      mpcp.playlist.saveFromStored();
    });

    $('#playlist-open-confirm').click(function () {
      mpcp.playlist.openFromStored();
    });

    $('#clear-playlist').click(function () {
      mpcp.playlist.clear();
    });

    $('#playlist-search-toggle').click(function () {
      if (document.getElementById('playlist-search-toggle').classList.contains('active')) {
        document.getElementById('playlist-search-toggle').classList.remove('active');
        document.getElementById('playlist-search').style.display = 'none';
        mpcp.playlist.isSearching = false;
        document.getElementById('search-playlist').value = '';
        mpcp.playlist.searchTerm = '';
        mpcp.playlist.updateAll();
      } else {
        document.getElementById('playlist-search-toggle').classList.add('active');
        document.getElementById('playlist-search').style.display = 'block';
        $('#search-playlist').focus();
        mpcp.playlist.isSearching = true;
      }
    });

    mpcp.utils.createSearch('#search-playlist', this.search, this.resetSearch);

    $(document).on('click', '.song-remove', function () {
      var ele = $(this).parent().parent();
      //console.log(ele);
      mpcp.playlist.remove(ele);
    });

    $(document).on('dblclick', this.tbody + ' tr', function () {
      var file = $(this).data().fileid;
      mpcp.playlist.playSong(file);
    });

    $(document).on('click', '.song-play', function () {
      var file = $(this).parent().parent().data().fileid;
      mpcp.playlist.playSong(file);
    });

    $('#set-priority-confirm').click(() => {
      mpcp.playlist.setPriorityFromForm();
    });

    document.getElementById('priority-form').addEventListener('submit', () => {
      mpcp.playlist.setPriorityFromForm();
    });

    mpcp.utils.multiSelect(this, ['song-remove']);
  }
};

};
