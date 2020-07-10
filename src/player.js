module.exports = function (mpcp) {

// the header with music controls
return {
  // current song to highlight the playlist
  current: null,
  // current song title
  title: '',
  // current state of the player
  state: '',
  // callback after dom updates
  callbackUpdates: [],

  updateAll: function (callback) {
    // set song title
    komponist.currentsong(function (err, song) {
      if (err) {
        console.log(err);
        mpcp.player.updateControls(callback);
        return;
      }

      //console.log(song);

      if ($.isEmptyObject(song)) {
        document.getElementById('title-text').innerHTML =
          '<em class="text-muted" title="No song selected">No song selected</em>';
        document.title = 'MPCParty';
        document.getElementById('title-pos').innerHTML = '';
        document.getElementById('time-total').innerHTML = '';
        mpcp.player.setCurrent(null);
        console.log('No song selected');
        mpcp.player.updateControls(callback);
        return;
      }

      mpcp.player.title = mpcp.utils.getSimpleTitle(
          song.Title, song.Artist, song.file);

      if (mpcp.player.current &&
          mpcp.player.current.file != song.file) {
        mpcp.history.add('Playing: ' + mpcp.player.title);
      }

      mpcp.player.setCurrent(song);
      document.getElementById('title-text').innerHTML = mpcp.player.title;
      $('#title-text').attr('title', mpcp.player.title);
      document.title =  mpcp.player.title + ' - MPCParty';
      document.getElementById('title-pos').innerHTML =
        (parseInt(song.Pos) + 1) + '. ';
      $('#music-time').attr('max', song.Time);
      document.getElementById('time-total').innerHTML = mpcp.utils.toMMSS(song.Time);

      // highlight song in playlist with song.Id and data-fileid
      // this happens with only a player update
      $(mpcp.playlist.table + ' .gen').each(function () {
        var id = $(this).data().fileid;
        if (parseInt(id) == mpcp.player.current.Id) {
          $(this)[0].classList.add('bg-success', 'text-light');
        } else {
          $(this)[0].classList.remove('bg-success', 'text-light');
        }
      });

      mpcp.player.updateControls(callback);
    });
  },

  // set player properties
  updateControls: function (callback) {
    komponist.status(function (err, status) {
      //console.log(status);
      if (err) {
        console.log(err);
        mpcp.player.callbackUpdate();
        if (callback) callback();
        return;
      }

      document.getElementById('music-time').value = status.elapsed;
      if (mpcp.player.current !== null && status.state == 'stop') {
        document.getElementById('time-current').innerHTML = '00:00';
      } else if (!status.elapsed) {
        document.getElementById('time-current').innerHTML = '';
      } else {
        document.getElementById('time-current').innerHTML = mpcp.utils.toMMSS(status.elapsed);
      }

      mpcp.progressbar.progress = parseInt(status.elapsed);

      console.log('state: ' + status.state);
      mpcp.player.state = status.state;

      switch (status.state) {
        case 'stop':
          document.getElementById('stop').style.display = 'none';
          document.getElementById('pause').style.display = 'none';
          document.getElementById('play').style.display = 'block';
          mpcp.progressbar.stopProgress();
          break;

        case 'play':
          document.getElementById('stop').style.display = 'block';
          document.getElementById('pause').style.display = 'block';
          document.getElementById('play').style.display = 'none';
          mpcp.progressbar.startProgress();
          break;

        case 'pause':
          document.getElementById('play').style.display = 'block';
          document.getElementById('pause').style.display = 'none';
          mpcp.progressbar.stopProgress();
          break;
      }

      // random
      if (parseInt(status.random) === 0) {
        document.getElementById('random').classList.remove('active');
      } else if (parseInt(status.random) == 1) {
        document.getElementById('random').classList.add('active');
      }

      // repeat
      if (parseInt(status.repeat) === 0) {
        document.getElementById('repeat').classList.remove('active');
      } else if (parseInt(status.repeat) == 1) {
        document.getElementById('repeat').classList.add('active');
      }

      // consume
      if (parseInt(status.consume) === 0) {
        $('#consume').prop('checked', false);
        document.getElementById('warning-consume').style.display = 'none';
      } else if (parseInt(status.consume) == 1) {
        $('#consume').prop('checked', true);
        if (mpcp.settings.consumeWarning)
          document.getElementById('warning-consume').style.display =
            'block';
      }

      if (!status.xfade) status.xfade = 0;
      document.getElementById('crossfade').value = status.xfade;

      mpcp.player.callbackUpdate();
      if (callback) callback();
    });
  },

  // set interface properties
  updateMixer: function () {
    komponist.status(function (err, status) {
      //console.log(status);
      if (err) return console.log(err);

      document.getElementById('volume').value = status.volume;

      if (status.error) {
        mpcp.lazyToast.error(status.error);
      }
    });
  },

  // set int's so there is less parsing when accessing mpcp.player.current
  setCurrent: function (song) {
    if (song) {
      song.Id  = parseInt(song.Id);
      song.Pos = parseInt(song.Pos);
    }

    this.current = song;
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
      var callback = mpcp.player.callbackUpdates[0];
      mpcp.player.callbackUpdates.splice(0, 1);

      if (!mpcp.player.callbackUpdates.length)
        return callback();
      else
        callback();
    }
  },

  // wrapper for komponist.play
  play: function (callback) {
    console.log('play');
    komponist.play(function (err) {
      if (err) console.log(err);
      mpcp.player.addCallbackUpdate(callback);
    });
  },

  // wrapper for komponist.toggle (there is no pause method)
  toggle: function (callback) {
    console.log('toggle');
    komponist.toggle(function (err) {
      if (err) console.log(err);
      mpcp.player.addCallbackUpdate(callback);
    });
  },

  // wrapper for komponist.stop
  stop: function () {
    console.log('stop');
    komponist.stop(function (err) {
      if (err) console.log(err);
    });
  },

  // wrapper for komponist.next
  next: function (callback) {
    if (mpcp.vote.enabled) {
      mpcp.player.addCallbackUpdate(callback);

      if (!document.getElementById('next').classList.contains('active')) {
        document.getElementById('next').classList.add('active');

        socket.send(JSON.stringify({
          'type': 'song-vote-next', 'info': 'yes'
        }), function (err) {
          if (err) console.log(err);
        });

      } else {
        document.getElementById('next').classList.remove('active');

        socket.send(JSON.stringify({
          'type': 'song-vote-next', 'info': 'no'
        }), function (err) {
          if (err) console.log(err);
        });
      }
    } else {
      console.log('next');
      socket.send(JSON.stringify({
        'type': 'song-next'
      }), function (err) {
        if (err) console.log(err);
      });

      // if skipping too fast, race conditions happen
      var current = mpcp.player.current;
      komponist.next(function (err) {
        if (err) console.log(err);

        if (mpcp.playlist.skipToRemove) {
          mpcp.playlist.removeSong(current.Id);
        }

        mpcp.player.addCallbackUpdate(callback);
      });
    }
  },

  // wrapper for komponist.previous
  previous: function (callback) {
    if (mpcp.vote.enabled) {
      mpcp.player.addCallbackUpdate(callback);

      if (!document.getElementById('previous').classList.contains('active')) {
        socket.send(JSON.stringify({
          'type': 'song-vote-previous', 'info': 'yes'
        }), function (err) {
          if (err) console.log(err);
        });
        document.getElementById('previous').classList.add('active');
      } else {
        document.getElementById('previous').classList.remove('active');
        socket.send(JSON.stringify({
          'type': 'song-vote-previous', 'info': 'no'
        }), function (err) {
          if (err) console.log(err);
        });
      }
    } else {
      console.log('previous');
      socket.send(JSON.stringify({
        'type': 'song-previous'
      }), function (err) {
        if (err) console.log(err);
      });

      // if skipping too fast, race conditions happen
      var current = mpcp.player.current;
      komponist.previous(function (err) {
        if (err) console.log(err);

        if (mpcp.playlist.skipToRemove) {
          mpcp.playlist.removeSong(current.Id);
        }

        mpcp.player.addCallbackUpdate(callback);
      });
    }
  },

  initEvents: function () {
    document.getElementById('pause').addEventListener('click', () => {
      mpcp.player.toggle();
    });

    document.getElementById('play').addEventListener('click', () => {
      mpcp.player.play();
    });

    document.getElementById('stop').addEventListener('click', () => {
      mpcp.player.stop();
    });

    document.getElementById('next').addEventListener('click', () => {
      mpcp.player.next();
    });

    document.getElementById('previous').addEventListener('click', () => {
      mpcp.player.previous();
    });

    document.getElementById('go-current').addEventListener('click', () => {
      mpcp.playlist.goToCurrent();
    });

    // 'input change' allows arrow keys to work
    $('#volume').on('input change', function () {
      komponist.setvol(this.value, function (err) {
        if (err) console.log(err);
      });
    });

    document.getElementById('random').addEventListener('click', () => {
      console.log('random');
      if (document.getElementById('random').classList.contains('active')) {
        // read 1.
        document.getElementById('random').classList.toggle('active');
        komponist.random(0, function (err) {
          if (err) console.log(err);
        });
      } else {
        // read 1.
        document.getElementById('random').classList.toggle('active');
        komponist.random(1, function (err) {
          if (err) console.log(err);
        });
      }
    });

    document.getElementById('repeat').addEventListener('click', () => {
      console.log('repeat');
      if (document.getElementById('repeat').classList.contains('active')) {
        // read 1.
        document.getElementById('repeat').classList.toggle('active');
        komponist.repeat(0, function (err) {
          if (err) console.log(err);
        });
      } else {
        // read 1.
        document.getElementById('repeat').classList.toggle('active');
        komponist.repeat(1, function (err) {
          if (err) console.log(err);
        });
      }
    });

    mpcp.utils.createSearch(
      '#search-browser', mpcp.browser.search,
      mpcp.browser.resetSearch);
  }
};

};
