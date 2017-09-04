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
                this.current = 'names';
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

        mpcp.socket.emit('mpc', 'storedPlaylists.listPlaylists', playlists => {
            //console.log(id + ':');
            //console.log(playlists);

            if (id == '#playlist-open-modal')
                mpcp.stored.active = 'open';
            else if (id == '#playlist-save-modal')
                mpcp.stored.active = 'save';

            $(id +' .modal-body .gen').remove();

            var html = '';

            if (!Array.isArray(playlists))
                playlists = [playlists];

            if (!playlists.length) {
                html = '<em class="gen text-muted">No saved playlists</em>';
                $(id +' .modal-body')[0].innerHTML = html;
                return console.log('No playlists');
            }

            var i = 0;

            playlists.forEach(item => {
                mpcp.socket.emit('mpc', 'storedPlaylists.listPlaylist',
                        item.name, songs => {

                    item.name = item.name.replace(/ /g, '\u00a0');
                    html += '<tr class="gen playlists-row" data-name="' + item.name + '"><td>' + item.name + '</td><td>' + songs.length + '</td><td class="text-right"><i class="faded playlist-remove text-danger fa fa-remove" data-name="' + item.name + '" title="Remove the playlist"></i></td>';
                    if (++i == playlists.length) {
                        $(id +' .playlists tbody')[0].innerHTML = html;
                        if (callback) callback();
                    }
                });
            });
        });
    },

    // save the playlist. Wrapper for mpc.save()
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

        if (this.current == 'names') {
            if (!this.fileArr.length) {
                mpcp.lazyToast.warning('Playlist empty!', 'Playlist');
                $('#playlist-save-modal').modal('hide');

                if (callback) callback();
                return console.log('empty playlist');
            }


            // overwrite any existing playlist
            mpcp.stored.removePlaylist(file, () => {
                // continue saving...
                var updatedCurrentPlaylist = false;

                var songAddedPromise = new Promise((resolve, reject) => {
                    // since everything is async, we have to use a promise.
                    // i is counting the elements being added, which resolves the
                    // promise.
                    var i = 0;

                    function addSongToPlaylist(file, song) {
                        mpcp.socket.emit('mpc', 'storedPlaylists.playlistAdd',
                                file, song, () => {
                            if (++i == mpcp.stored.fileArr.length) {
                                if (mpcp.playlist.current == file)
                                    updatedCurrentPlaylist = true;
                                resolve();
                            }
                        });
                    }

                    for (var j = 0; j < mpcp.stored.fileArr.length; ++j) {
                        addSongToPlaylist(file, mpcp.stored.fileArr[j]);
                    }
                });

                songAddedPromise.then(() => {
                    file = file.replace(/ /g, '\u00a0');
                    mpcp.lazyToast.info(
                            file + ' playlist saved!', 'Playlist update');

                    if (updatedCurrentPlaylist) {
                        var msg = 'You must open the updated playlist for it to update the current playlist.';
                        mpcp.history.add(msg, 'bg-info');
                        toastr.info(msg + '<button title="Reloads the playlist" class="playlist-reload btn btn-default pull-right"><span class="fa fa-repeat"></span></button>', 'Playlist update', {
                            'closeButton': true,
                            'positionClass': 'toast-bottom-left',
                            'preventDuplicates': false,
                            'timeOut': '-1',
                            'extendedTimeOut': '-1'
                        });
                    }

                    // clear fileArr after saving
                    mpcp.stored.fileArr = [];

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

            mpcp.stored.removePlaylist(file, () => {

                // continue saving...
                mpcp.socket.emit('mpc', 'storedPlaylists.save', file, () => {
                    file = file.replace(/ /g, '\u00a0');

                    mpcp.lazyToast.info(
                            file + ' playlist saved!', 'Playlist update');

                    // set title locally before sending to clients
                    $('#playlist-title strong')[0].innerHTML = file;
                    $('#playlist-title strong').attr('title', file);

                    mpcp.socket.emit('playlist-title', {'info': file});

                    if (callback) callback();
                });
            });
        }

        $('#playlist-save-modal').modal('hide');
    },

    externalSave: function (callback) {
        var trs = $(mpcp.pe.tbody).children('.gen').not('.rem'),
            paths = [];

        for (var i = 0; i < trs.length; ++i)
            paths[i] = $(trs[i]).data().path;

        mpcp.stored.updatePlaylists('#playlist-save-modal', paths, callback);
    },

    removePlaylist: function (file, tr, callback) {
        if (typeof(tr) == 'function') {
            callback = tr;
        } else {
            // else, client side remove
            file = String(file).replace(/\u00a0/g, " ");
            // client side deletion, less jaring (stops flashing the list)
            mpcp.stored.doUpdate = false;
        }

        function done() {
            if (typeof(tr) != 'function') {
                $(tr)[0].remove();
            }

            if (callback) callback();
        }

        mpcp.socket.emit('mpc', 'storedPlaylists.listPlaylists', playlists => {
            if (playlists.some(item => item.name == file)) {
                console.log('deleting playlist ' + file);
                mpcp.socket.emit('mpc', 'storedPlaylists.remove', file, done);
            } else {
                done();
            }
        });
    },

    // open a playlist. Wrapper for mpc.open()
    open: function (file, callback) {
        console.log(file);
        file = file.replace(/\u00a0/g, " ");

        if (this.call !== null) {
            console.log('calling fn..');
            this.call(file, callback);
            this.call = null;
        } else {
            console.log('confirm open playlist');
            console.log(file);
            // stops duplicate updating because of socket sending
            mpcp.playlist.doUpdate = false;

            mpcp.socket.emit('mpc', 'currentPlaylist.clear', () => {

                mpcp.socket.emit('mpc', 'storedPlaylists.load', file, () => {
                    // set title locally before sending to clients
                    $('#playlist-title strong')[0].innerHTML = file;
                    $('#playlist-title strong').attr('title', file);

                    mpcp.socket.emit('playlist-title', {'info': file});

                    mpcp.playlist.addCallbackUpdate(callback);
                });
            });
        }
        $('#playlist-open-modal').modal('hide');
    },

    initEvents: function () {
        var rowSelect = mpcp.utils.rowSelect('.playlists-row', 'bg-primary text-light');

        rowSelect.on('down', function (ele) {
            var file = $(ele).data().name;
            document.getElementById('playlist-save-input').value = file;
        });

        rowSelect.on('up', function (ele) {
            var file = $(ele).data().name;
            document.getElementById('playlist-save-input').value = file;
        });

        rowSelect.on('click', function (ele) {
            var file = $(ele).data().name;
            document.getElementById('playlist-save-input').value = file;
        });

        rowSelect.on('enter', function (ele) {
            if (mpcp.stored.active == 'open')
                mpcp.playlist.openFromStored();
            else if (mpcp.stored.active == 'save')
                mpcp.playlist.saveFromStored();
        });

        rowSelect.on('delete', function (ele) {
            var file = $(ele).data().name;
            mpcp.stored.removePlaylist(file, ele);
        });

        $(document).on('click', '.playlist-remove', function () {
            var file = $(this).data().name,
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
