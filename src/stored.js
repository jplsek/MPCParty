module.exports = function (mpcp) {

// the stored playlists
return {
  // used for saving external playlists
  fileArr: [],
  // used for returning values for opening playlists
  call: null,
  // current is used to tell what the save operation is (native being mpd)
  current: 'native',
  // whether to update the list
  doUpdate: true,
  // total number of places that update(id) is used (for doUpdate)
  // may be changed in the future to be more dynamic
  totalIds: 2,
  currentId: 0,
  // currently opened modal (open or save)
  active: '',
  // get row selected
  rowSelect: null,

  // used show all playlists
  // fileArr is used when saving the playlist externally after clicking save
  updatePlaylists: function (id, type, callback) {
    if (type) {
      if (typeof type == 'function') {
        this.call = type;
        this.current = 'native';
      } else if (Array.isArray(type)) {
        this.fileArr = type;
        this.current = 'fileids';
      }
    } else if (!this.doUpdate) {
      if (++this.currentId >= this.totalIds) {
        this.doUpdate = true;
        this.currentId = 0;

        if ($('.playlists .append').children('.gen') < 1) {
          var html = '<tr class="gen"><td colspan="2"><em class="text-muted">No playlists found</em></td></tr>';
          $(id +' .playlists tbody')[0].innerHTML = html;
          console.log('no playlists found (dont update)');
        }
      }

      if (callback) callback();
      return console.log('no update');
    } else {
      this.current = 'native';
    }

    console.log('update stored playlists table');

    komponist.listplaylists(function (err, playlists) {
      //console.log(id + ':');
      //console.log(playlists);
      if (err) {
        if (err.message == 'No such file or directory [52@0] {listplaylists}') {
          mpcp.lazyToast.error('Is there a playlist directory and correct write permissions?', 'Cannot read playlist directory!');
        }

        html = '<em class="text-muted">No saved playlists</em>';
        $(id +' .modal-body .gen')[0].innerHTML = html;
        console.log(err);
        if (callback) callback();
        return;
      }

      if (id == '#playlist-open-modal')
        mpcp.stored.active = 'open';
      else if (id == '#playlist-save-modal')
        mpcp.stored.active = 'save';

      $(id +' .modal-body .gen')[0].innerHTML = '';

      var html = '';

      playlists = mpcp.utils.toArray(playlists);

      if (!playlists.length) {
        html = '<em class="text-muted">No saved playlists</em>';
        $(id +' .modal-body .gen')[0].innerHTML = html;
        return console.log('No playlists');
      }

      var i = 0;

      $(playlists).each(function (item, value) {
        komponist.listplaylist(value.playlist, function (err, songs) {
          if (err && err.message ==
              'No such playlist [50@0] {listplaylist}') {
            console.log('no playlist found: "' +
              value.playlist + '"');
          } else if (err) {
            console.log(err);
          }

          if (!Array.isArray(songs))
            songs = [songs];

          value.playlist = value.playlist.replace(/ /g, '\u00a0');
          html += '<tr class="gen playlists-row" data-fileid="' + value.playlist + '"><td>' + value.playlist + '</td><td>' + songs.length + '</td><td class="text-right"><span class="faded playlist-remove text-danger glyphicon glyphicon-remove" data-fileid="' + value.playlist + '" title="Remove the playlist"></span></td>';
          if (++i == playlists.length) {
            $(id +' .playlists tbody')[0].innerHTML = html;
            if (callback) callback();
          }
        });
      });
    });
  },

  // save the playlist. Wrapper for komponist.save()
  save: function (file, callback) {
    // When titles are "", it updates the current playlist, kind of.
    // It works via playlist editor, but not the playlist.
    // So I'd rather disable the feature in case people get confused.
    if (!file || file === "") {
      mpcp.lazyToast.warning('You must provide a title!', 'Playlist');
      $('#playlist-save-modal').modal('hide');

      if (callback) callback();
      return console.log('invalid title');
    }

    file = file.trim().replace(/\u00a0/g, " ");
    console.log(file);

    if (this.current == 'fileids') {
      if (!this.fileArr.length) {
        mpcp.lazyToast.warning('Playlist empty!', 'Playlist');
        $('#playlist-save-modal').modal('hide');

        if (callback) callback();
        return console.log('empty playlist');
      }

      // overwrite any existing playlist
      komponist.rm(file, function (err, val) {
        if (err) {
          if (err.message == 'No such playlist [50@0] {rm}')
            console.log('No playlist to overwrite, continue...');
          else
            console.log(err);
        }

        //console.log(mpcp.stored.fileArr);

        // continue saving...
        var saved = true,
          updatedCurrentPlaylist = false,
          invalid = false,
          noFile = false,
          notFound = false,
          unknown = false,
          err2,
          // since everything is async, we have to use a deferred object.
          // i is counting the elements being added, which resolves the
          // deferred.
          i = 0,
          def = $.Deferred();

        function addSongToPlaylist(file, song) {
          komponist.playlistadd(file, song, function (err2, val) {
            // I would like to break from the each loop when an
            // error occurs, but getting that set up is hackish.
            // For now, it will run the each loop every time an
            // error is caught
            ++i;

            if (err2) {
              if (err2.message == 'playlist name is invalid: playlist names may not contain slashes, newlines or carriage returns [2@0] {playlistadd}') {
                invalid = true;
              } else if (err2.message == 'No such file or directory [52@0] {playlistadd}') {
                noFile = true;
              } else if (err2.message ==  'Not found [50@0] {playlistadd}') {
                // read MESSAGE1
                err2 = song;
                notFound = true;
              } else {
                unknown = true;
              }

              saved = false;
              // resolves earlier because output would be the
              // same anyways
              console.log(err2);
              def.resolve();
              return;
            }

            if (i == mpcp.stored.fileArr.length) {
              if (mpcp.playlist.current == file)
                updatedCurrentPlaylist = true;
              def.resolve();
            }
          });
        }

        for (var j = 0; j < mpcp.stored.fileArr.length; ++j) {
          // this if statement doesn't actually work, async makes
          // this loop happen too quickly
          if (!saved) return false;
          addSongToPlaylist(file, mpcp.stored.fileArr[j]);
        }

        def.done(function () {
          // in deferred because the loop can execute the
          // playlistadd multiple times
          if (invalid) {
            mpcp.lazyToast.warning('Playlist may not contain slashes, newlines, or carriage returns.', 'Invalid Characters', 10000);
          } else if (noFile) {
            mpcp.lazyToast.error('Is there a playlist directory and correct write permissions?', 'Cannot read playlist directory!');
          } else if (notFound) {
            // read MESSAGE1
            if (err2 == undefined) {
              mpcp.lazyToast.warning('Hmmm a known bug was triggered. (A song was undefined when it should be defined.) Double check that your playlist was saved before closing!');
            } else {
              mpcp.lazyToast.error('File not found: ' + err2, 'Playlist');
            }
          } else if (unknown) {
            mpcp.lazyToast.error(err2, 'Unhandled Error');
          }

          if (saved) {
            file = file.replace(/ /g, '\u00a0');
            mpcp.lazyToast.info(
                file + ' playlist saved!', 'Playlist update');

            if (updatedCurrentPlaylist) {
              var msg = 'You must open the updated playlist for it to update the current playlist.';
              mpcp.history.add(msg, 'info');
              toastr.info(msg + '<button title="Reloads the playlist" class="playlist-reload btn btn-default pull-right"><span class="glyphicon glyphicon-repeat"></span></button>', 'Playlist update', {
                'closeButton': true,
                'positionClass': 'toast-bottom-left',
                'preventDuplicates': false,
                'timeOut': '-1',
                'extendedTimeOut': '-1'
              });
            }

            // clear fileArr after saving
            mpcp.stored.fileArr = [];
          }

          if (callback) callback();
        });
      });
    } else {
      var trs = $(mpcp.playlist.tbody).children('.gen').not('.rem');

      // horrible check, whats the better way to check for
      // 'Empty playlist'?
      if (trs.length < 1 || (
          trs[0].childNodes[0].childNodes[0].childNodes[0] &&
          $(trs[0].childNodes[0].childNodes[0].childNodes[0].data).
          selector == 'Empty playlist')) {
        mpcp.lazyToast.warning('Playlist empty!', 'Playlist');
        $('#playlist-save-modal').modal('hide');

        if (callback) callback();
        return console.log('playlist empty');
      }

      komponist.rm(file, function (err, val) {
        if (err) {
          if (err.message == 'No such playlist [50@0] {rm}')
            console.log('No playlist to overwrite, continue...');
          else
            console.log(err);
        }

        // continue saving...
        komponist.save(file, function (err, val) {
          file = file.replace(/ /g, '\u00a0');

          if (err) {
            console.log(err.message);

            if (err.message == 'No such file or directory [52@0] {save}') {
              mpcp.lazyToast.error('Is there a playlist directory and correct write permissions?', 'Cannot read playlist directory!');
            } else if (err.message == 'playlist name is invalid: playlist names may not contain slashes, newlines or carriage returns [2@0] {save}') {
              mpcp.lazyToast.warning('Playlist may not contain slashes, newlines, or carriage returns.', 'Invalid Characters', 10000);
            }

            if (callback) callback();
            return console.log(err);
          }

          mpcp.lazyToast.info(
              file + ' playlist saved!', 'Playlist update');

          // set title locally before sending to clients
          $('#playlist-title strong')[0].innerHTML = file;
          $('#playlist-title strong').attr('title', file);

          socket.send(JSON.stringify({
            'type': 'playlist-title', 'info': file
          }), function (err) {
            if (err) console.log(err);
          });

          if (callback) callback();
        });
      });
    }

    $('#playlist-save-modal').modal('hide');
  },

  externalSave: function (callback) {
    var trs = $(mpcp.pe.tbody).children('.gen').not('.rem'),
      fileIds = [];

    for (var i = 0; i < trs.length; ++i)
      fileIds[i] = $(trs[i]).data().fileid;

    mpcp.stored.updatePlaylists('#playlist-save-modal', fileIds, callback);
  },

  removePlaylist: function (file, tr, callback) {
    file = String(file).replace(/\u00a0/g, " ");
    // client side deletion, less jaring (stops flashing the list)
    mpcp.stored.doUpdate = false;
    console.log('delete playlist ' + file);

    komponist.rm(file, function (err) {
      if (err) {
        mpcp.lazyToast.error(err, 'Error removing playlist!');
        console.log(err);
      } else {
        $(tr)[0].remove();
      }

      if (callback) callback();
    });
  },

  // open a playlist. Wrapper for komponist.open()
  open: function (file, callback) {
    file = file.toString().replace(/\u00a0/g, " ");

    if (this.call !== null) {
      console.log('calling fn..');
      this.call(file, callback);
      this.call = null;
    } else {
      console.log('confirm open playlist');
      console.log(file);
      // stops duplicate updating because of socket sending
      mpcp.playlist.doUpdate = false;

      komponist.clear(function (err) {
        if (err) console.log(err);

        komponist.load(file, function (err) {
          if (err) {
            mpcp.lazyToast.error('Error loading the playlist! ' +
                err.message);
            console.log(err);
            if (callback) callback();
            return;
          }

          // set title locally before sending to clients
          $('#playlist-title strong')[0].innerHTML = file;
          $('#playlist-title strong').attr('title', file);

          socket.send(JSON.stringify({
            'type': 'playlist-title', 'info': file
          }), function (err) {
            if (err) console.log(err);
          });

          mpcp.playlist.addCallbackUpdate(callback);
        });
      });
    }
    $('#playlist-open-modal').modal('hide');
  },

  initEvents: function () {
    var rowSelect = mpcp.utils.rowSelect('.playlists-row', 'bg-primary');

    rowSelect.on('down', function (ele) {
      var file = $(ele).data().fileid;
      document.getElementById('playlist-save-input').value = file;
    });

    rowSelect.on('up', function (ele) {
      var file = $(ele).data().fileid;
      document.getElementById('playlist-save-input').value = file;
    });

    rowSelect.on('click', function (ele) {
      var file = $(ele).data().fileid;
      document.getElementById('playlist-save-input').value = file;
    });

    rowSelect.on('enter', function (ele) {
      if (mpcp.stored.active == 'open')
        mpcp.playlist.openFromStored();
      else if (mpcp.stored.active == 'save')
        mpcp.playlist.saveFromStored();
    });

    rowSelect.on('delete', function (ele) {
      var file = $(ele).data().fileid;
      mpcp.stored.removePlaylist(file, ele);
    });

    $(document).on('click', '.playlist-remove', function () {
      var file = $(this).data().fileid,
        tr   = $(this).parent().parent();

      mpcp.stored.removePlaylist(file, tr);
    });

    $(document).on('dblclick', '#playlist-open-modal .gen', function () {
      mpcp.playlist.openFromStored();
    });

    $(document).on('dblclick', '#playlist-save-modal .gen', function () {
      mpcp.playlist.saveFromStored();
    });

    // reset vars
    $('#playlist-open-modal').on('hidden.bs.modal', function () {
      mpcp.stored.call = null;
      mpcp.stored.active = '';
    });

    $('#playlist-save-modal').on('hidden.bs.modal', function () {
      mpcp.stored.fileArr = [];
      mpcp.stored.active = '';
    });

    $('#playlist-save-clear').click(function () {
      document.getElementById('playlist-save-input').value = '';
      $('#playlist-save-input').focus();
      rowSelect.deselect();
    });

    $('#playlist-save-input').focus(function () {
      $(document).keydown(function (e) {
        if (e.keyCode == 13) mpcp.playlist.saveFromStored();
      });
    });

    // separate for open and save because of duplication issues
    mpcp.utils.tableSort('#playlist-open-modal table',
      '#playlist-open-modal .col-playlists-title', 1, 'string');
    mpcp.utils.tableSort('#playlist-open-modal table',
      '#playlist-open-modal .col-playlists-songs', 2, 'number');
    mpcp.utils.tableSort('#playlist-save-modal table',
      '#playlist-save-modal .col-playlists-title', 1, 'string');
    mpcp.utils.tableSort('#playlist-save-modal table',
      '#playlist-save-modal .col-playlists-songs', 2, 'number');
  }
};

};
