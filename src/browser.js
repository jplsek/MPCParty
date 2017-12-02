module.exports = function (mpcp) {

// the file browser
return {
    tableid: 'file-browser-song-list',
    table: '#file-browser-song-list',
    tbody: '#file-browser-song-list .append',
    tbodyid: 'file-browser-song-list-tbody',
    // current directory the user is in
    current: '/',
    previous: '/',
    searching: false,
    searchTerm: '',
    // local copy of html items
    localFolders: [],
    localFiles: [],
    // selected items from multiselect
    selected: [],
    // whether to update the browser on the next update or not
    doUpdate: true,
    // toggle between library and browser
    hidden: false,
    // used for dragging while selected
    clone: null,

    // check which dir the user is in.
    // only update that dir
    update: function (dir, poppedState, callback) {
        if (mpcp.browser.hidden && !mpcp.library.hidden) {
            // update library here. Just use mpcp.browser.update as a general
            // library/browser update. May change later to reduce coupling.
            mpcp.libraryArtists.update(mpcp.library.artist);
            mpcp.libraryAlbums.update(mpcp.library.artist, mpcp.library.album);
            if (callback) callback();
            return;
        }

        // db update (ignore back / forward buttons)
        if (!dir && !poppedState && !mpcp.browser.doUpdate) {
            console.log('do not update this...');
            // doUpdate gets set to true in the onMessage update-browser
            //mpcp.browser.doUpdate = true;
            if (callback) callback();
            return;
        }

        if (dir) mpcp.browser.current = dir;

        //console.log('previous directory: ' + mpcp.browser.previous);
        console.log('reloading directory: ' + mpcp.browser.current);

        if ((!poppedState && mpcp.browser.previous != mpcp.browser.current) ||
                (!poppedState && mpcp.browser.searching)) {
            mpcp.browser.searching = false;
            mpcp.browser.addToHistory();
            $('#slwrap').scrollTop($(mpcp.browser.table));
        }

        mpcp.browser.updateBrowser(mpcp.browser.current, callback);

        if (dir) mpcp.browser.previous = dir;
    },

    addToHistory: function () {
        if (this.current == '/' || this.current === '') {
            console.log('adding /browser/ to history');
            window.history.pushState('', 'MPCParty', '/browser/');
        } else {
            console.log('adding /browser/' + this.current +
                ' to history');
            window.history.pushState('', this.current + ' - MPCParty',
                '/browser/' + this.current);
        }
    },

    // shows directories. use '/' for root
    updateBrowser: function (directory, callback) {
        // location bar:
        // split directory based on /'s
        // create a list item for each dir split
        $('#location .loc-dir').remove();
        // toString incase of number only directories
        var dirs  = directory.toString().split('/'),
            path = dirs[0],
            html  = '',
            i;

        if (this.current != '/')
            for (i = 0; i < dirs.length; ++i) {
                html += '<li class="breadcrumb-item loc-dir" data-path="' + path + '">' +
                    dirs[i] + '</li>';
                path += '/' + dirs[i+1];
            }

        $('#location ol')[0].innerHTML += html;

        mpcp.socket.emit('mpc', 'database.listInfo', directory, files => {
            //console.log(files);
            document.getElementById(mpcp.browser.tbodyid).innerHTML = '';
            mpcp.browser.localFolders = [];
            mpcp.browser.localFiles = [];

            if (!files.length) {
                html = '<tr class="directory gen"><td colspan="6">' +
                    '<em class="text-muted">Empty directory</em></td></tr>';
                document.getElementById(mpcp.browser.tableid).innerHTML = html;
                mpcp.pages.update('browser');
                console.log('Empty directory');
                if (callback) callback();
                return;
            }

            var html = '';

            // initialize html for browser
            for (i = 0; i < files.length; ++i) {
                html = mpcp.browser.getHtmlFolders(files[i]);

                if (html !== '')
                    mpcp.browser.localFolders.push(html);
                else {
                    html = mpcp.browser.getHtmlFiles(files[i]);
                    if (html !== '') mpcp.browser.localFiles.push(html);
                }
            }

            mpcp.browser.updateLocal(callback);
        });
    },

    // replaces the browser with search results
    // searches for all files based on file name and tag
    search: function (name, poppedState, callback) {
        console.log('mpcp.browser.search: ' + name);

        if (mpcp.browser.hidden) {
            mpcp.browser.show();
            mpcp.library.hide();
            mpcp.library.bringBack = true;
        }

        // search for tag
        mpcp.socket.emit('mpc', 'database.search', [['any', name]], anyFiles => {

            // search for file name
            mpcp.socket.emit('mpc', 'database.search', [['file', name]],
                    files => {

                var all = anyFiles.concat(files);
                console.log(all);

                // remove duplicate objects (because of the tag and file search)
                var temp = [];
                var unique = all.filter(item => {
                    if (!~temp.indexOf(item.path)) {
                        temp.push(item.path);
                        return true;
                    }
                    return false;
                });

                //console.log(unique);
                callbackSearch(unique);
            });
        });

        function callbackSearch(files) {
            if (mpcp.browser.searchTerm == name) {
                // just don't add repeated search to history
                poppedState = true;
            }

            // do this after (in case of error)
            document.getElementById(mpcp.browser.tbodyid).innerHTML = '';
            mpcp.browser.searching = true;
            mpcp.browser.searchTerm = name;
            mpcp.browser.localFolders = [];
            mpcp.browser.localFiles = [];
            var html;

            if (!files.length) {
                // note: when the search is nothing, it does not save to
                // history
                html = '<tr class="directory gen"><td colspan="6">' +
                    '<em class="text-muted">No songs found</em></td></tr>';
                document.getElementById(mpcp.browser.tbodyid).innerHTML = html;
                mpcp.pages.update('browser');
                console.log('No songs found');
                window.dispatchEvent(new CustomEvent("MPCperowserChanged"));
                if (callback) callback(0);
                return;
            }

            html = '';

            for (var i = 0; i < files.length; ++i) {
                html = mpcp.browser.getHtmlFiles(files[i]);

                if (html !== '')
                    mpcp.browser.localFiles.push(html);
            }

            if (!poppedState) {
                console.log('pushing history search');
                window.history.pushState('', name + ' - MPCParty',
                    '/search/' + encodeURIComponent(name));
            }

            mpcp.browser.updateLocal(callback);
        }
    },

    // used for unit tests atm
    resetSearch: function (callback) {
        mpcp.browser.update(null, null, callback);
    },

    getHtmlFolders: function (value) {
        var tableStart  = '<table class="fixed-table"><tr><td>',
            tableEnd    = '</td></tr></table>',
            strippedDir = '',
            html        = '';

        if (value.entryType == 'directory') {
            //console.log('dir');

            strippedDir = mpcp.utils.stripSlash(value.path);

            html = '<tr class="context-menu directory gen" data-path="' + value.path + '"><td class="song-list-icons"><i class="text-warning fa fa-folder-open"></i> <i class="folder-open faded fa fa-share" title="Open directory. Note: You can double click the directory to open"></i></a></td><td colspan="3" class="width100" title="' + strippedDir + '">' + tableStart + strippedDir + tableEnd + '</td><td colspan="2" class="song-list-icons text-right"><i class="dir-add faded text-success fa fa-plus" title="Add whole directory of songs to the bottom of the playlist"></i></td></tr>';
        }

        return html;
    },

    getHtmlFiles: function (value) {
        var tableStart = '<table class="fixed-table"><tr><td>',
            tableEnd   = '</td></tr></table>',
            stripFile  = '',
            html       = '';

        if (value.entryType == 'song') {
            //console.log('file');

            value.album  = (!value.album ? mpcp.settings.unknown :
                    value.album);
            value.artist = (!value.artist ? mpcp.settings.unknown :
                    value.artist);
            stripFile    = mpcp.utils.stripSlash(value.path);
            value.title  = (!value.title ? stripFile : value.title);

            html = '<tr class="context-menu file gen" data-path="' + value.path + '"><td class="song-list-icons pos"><i class="text-primary fa fa-file"></i></td><td title="' + value.title + '">' + tableStart + value.title + tableEnd + '</td><td title="' + value.artist + '">' + tableStart + value.artist + tableEnd + '</td><td title="' + value.album + '">' + tableStart + value.album + tableEnd + '</td><td class="nowrap">' + mpcp.utils.toMMSS(value.duration) + '</td><td class="song-list-icons text-right"><i class="song-add faded text-success fa fa-plus" title="Add song to the bottom of the playlist"></i></td></tr>';
        }

        return html;
    },

    // update the song positions, instead of reloading the whole browser
    updatePosition: function (callback) {
        console.log('updatePosition');
        var tr = $('.song-list tbody').children('.file');

        mpcp.socket.emit('mpc', 'status.currentSong', song => {
            if ($.isEmptyObject(song))
                mpcp.player.setCurrent(null);
            else
                mpcp.player.setCurrent(song);

            if (mpcp.player.current) {
                document.getElementById('title-pos').innerHTML =
                    (mpcp.player.current.position + 1) + '. ';
            }
        });

        var element, id, icon, index;

        for (var i = 0; i < tr.length; ++i) {
            element = tr[i];

            id = $(element).data().path;
            icon = '';
            index = mpcp.playlist.list.paths.indexOf(id);

            if (index != -1) {
                icon = (parseInt(mpcp.playlist.list.positions[index]) + 1) +
                    '.';
                element.firstChild.innerHTML = icon;
            } else {
                icon = '<i class="text-primary fa fa-file"></i>';
                element.firstChild.innerHTML = icon;
            }
        }

        window.dispatchEvent(new CustomEvent("MPCperowserChanged"));

        if (callback) callback();
    },

    updateLocal: function (callback) {
        console.log('update local browser');

        // this.local* always has a length of 1, but may have an empty
        // object. This fixes removeal of "Empty directory"
        if (this.localFolders.length <= 1 &&
                this.localFiles.length <= 1) {
            if ((this.localFolders[0] && Object.getOwnPropertyNames(
                    this.localFolders[0]).length <= 0) &&
                        (this.localFiles[0] && Object.getOwnPropertyNames(
                            this.localFiles[0]).length <= 0)) {
                if (callback) callback();
                return;
            } else if (this.localFolders.length <= 0 &&
                    this.localFiles.length <= 0) {
                if (callback) callback();
                return;
            }
        }

        document.getElementById(this.tbodyid).innerHTML = '';

        var start = 0,
            end   = this.localFolders.length + this.localFiles.length,
            html  = '';

        if (mpcp.pages.enabledBrowser) {
            start = (mpcp.pages.currentBrowser - 1) * mpcp.pages.maxBrowser;
            end = (((mpcp.pages.currentBrowser - 1) * mpcp.pages.maxBrowser) +
                    mpcp.pages.maxBrowser) - 1;
        }

        var current = start,
            i;
        //console.log(start);
        //console.log(end);

        for (i = current; i < this.localFolders.length; ++i) {
            if (current > end || current > mpcp.browser.localFolders.length)
                break;

            html += mpcp.browser.localFolders[i];
            current++;
        }

        i = current - this.localFolders.length;
        //console.log(current);
        //console.log(i);

        for (; i < this.localFiles.length; ++i) {
            if (current > end || current - mpcp.browser.localFolders.length >
                    mpcp.browser.localFiles.length)
                break;

            html += mpcp.browser.localFiles[i];
            current++;
        }

        document.getElementById(this.tbodyid).innerHTML = html;
        //console.log(current);
        mpcp.pages.update('browser');
        this.updatePosition(callback);
    },

    // show song information to the user
    getSongInfo: function (file, callback) {
        mpcp.socket.emit('mpc', 'database.find', [['file', file]], value => {
            mpcp.utils.parseSongInfo(value[0], callback);
        });
    },

    // add all songs in this.current to playlist
    addAll: function (callback) {
        console.log('add all songs from ' + this.current);

        if (this.searching) {
            if (mpcp.pe.current !== null) {
                mpcp.socket.emit('mpc', 'database.search',
                    ['any', this.searchterm], files => {
                    if ($.isEmptyObject(files[0])) {
                        console.log('No songs found');
                        if (callback) callback();
                        return;
                    }

                    mpcp.pe.addSong(files, null, callback);
                });
            } else {
                mpcp.socket.emit('mpc', 'database.searchAdd',
                    [['any', this.searchTerm]], files => {
                    if (callback) callback();
                });
            }
        } else {
            if (mpcp.pe.current) {
                mpcp.socket.emit('mpc', 'database.listAllInfo',
                        this.current, files => {
                    var songs = files.filter(item => item.entryType == 'song');
                    mpcp.pe.addSong(songs, null, callback);
                });
            } else {
                mpcp.playlist.addCallbackUpdate(callback);
                mpcp.socket.emit('mpc', 'currentPlaylist.add', '/');
            }
        }
    },

    // used when the user manually opens the browser
    open: function (callback) {
        mpcp.settings.saveBrowser('browser');
        this.addToHistory();
        this.update(null, false, callback);
    },

    show: function () {
        if (!this.hidden) return;
        this.hidden = false;
        mpcp.utils.buttonSelect("#open-file-browser", "#browser-selection");
        document.getElementById('browser').style.display = 'flex';
    },

    hide: function () {
        document.getElementById('browser').style.display = 'none';
        this.hidden = true;
        mpcp.utils.clearSelected(mpcp.browser);
    },

    addMulti: function (to, callback, dragging) {
        console.log('browser add multi');
        mpcp.utils.toArraySelected(mpcp.browser);
        var i, tr, dir, file, j = 0;

        function addFile(file) {
            mpcp.playlist.addSong(file, to, dontScroll, function () {
                if (++j == mpcp.browser.selected.length && callback)
                    callback();
            });
        }

        function addDir(dir) {
            mpcp.playlist.addDir(dir, to, dontScroll, function () {
                if (++j == mpcp.browser.selected.length && callback)
                    callback();
            });
        }

        // used for the context menu
        if (mpcp.pe.current && !dragging) {
            var arr = [];

            for (i = 0; i < this.selected.length; ++i) {
                tr = this.selected[i];
                if (tr.classList.contains('file')) {
                    file = tr.dataset.path;
                    //console.log('adding ----- ' + file);
                    arr.push(['id', file]);
                } else if (tr.classList.contains('directory')) {
                    dir = tr.dataset.path;
                    arr.push(['dir', dir]);
                }
            }

            mpcp.pe.addArr(arr, to, callback);
        } else {
            var dontScroll = false;
            // dont scroll if drag and drop ("to" would not be null)
            if (to && mpcp.player.current && to != mpcp.player.current.position + 1)
                dontScroll = true;

            // reverse because not incrementing to variable because
            // scrolling to center will be overridden in addSong
            this.selected.reverse();
            for (i = 0; i < this.selected.length; ++i) {
                tr = this.selected[i];
                if (tr.classList.contains('file')) {
                    addFile(tr.dataset.path);
                } else if (tr.classList.contains('directory')) {
                    addDir(tr.dataset.path);
                } else {
                    if (++j == this.selected.length && callback)
                        callback();
                }
            }
        }

        mpcp.utils.clearSelected(mpcp.browser);
    },

    addExternal: function (file, to, callback) {
        if (this.selected.length)
            this.addMulti(to, callback);
        else if (mpcp.pe.current)
            mpcp.pe.addid(file, to, callback);
        else
            mpcp.playlist.addSong(file, to, false, callback);
    },

    addExternalDir: function (dir, to, callback) {
        if (this.selected.length)
            this.addMulti(to, callback);
        else if (mpcp.pe.current)
            mpcp.pe.add(dir, null, callback);
        else
            mpcp.playlist.add(dir, to, callback);
    },

    initEvents: function () {
        $('#update').click(function () {
            console.log('update database');
            // set to false until broadcast updates everyone
            // for now, the other clients will still receive multiple updates
            mpcp.browser.doUpdate = false;

            $('#update .fa').addClass('fa-spin');

            mpcp.socket.emit('mpc', 'database.update', () => {
                // check if this is satus.updating_db is undefined
                // if so, it is done updating (hopefully)

                var updateInterval = setInterval(function () {
                    console.log('checking if update db is done...');

                    mpcp.socket.emit('mpc', 'status.status', status => {
                        // incase job id is 0/1, just check if undefined
                        if (!status.updating) {
                            // stop interval and send update-browser
                            // to everyone
                            clearInterval(updateInterval);
                            $('#update .fa')[0].classList.remove('fa-spin');
                            mpcp.lazyToast.info(
                                    'Music library updated!', 'Library');

                            mpcp.socket.emit('update-browser');
                        }
                    });
                }, 500);
            });
        });

        $(document).on('click', '#home', function () {
            console.log('home');
            mpcp.browser.update('/');
        });

        $(document).on('click', '.song-add', function () {
            var file = $(this).parent().parent().data().path;
            mpcp.browser.addExternal(file);
        });

        $(document).on('dblclick', 'tr.file', function () {
            var file = $(this).data().path;
            mpcp.browser.addExternal(file);
        });

        $(document).on('dblclick', '.song-list tr.directory', function () {
            var dir = $(this).data().path;
            mpcp.browser.update(dir);
        });

        $(document).on('click', '.song-list .folder-open', function () {
            var dir = $(this).parent().parent().data().path;
            mpcp.browser.update(dir);
        });

        $(document).on('click', '.dir-add', function () {
            var dir = $(this).parent().parent().data().path;
            mpcp.browser.addExternalDir(dir);
        });

        $(document).on('click', '.loc-dir', function () {
            var file = $(this).data().path;
            //console.log(file);
            mpcp.browser.update(file);
        });

        // add all songs from mpcp.browser.current
        $('#add-all').click(function () {
            mpcp.browser.addAll();
        });

        $('#open-file-browser').click(function () {
            mpcp.browser.open();
        });

        mpcp.tableHeader(this.tableid, 'MPCperowserChanged');

        // this cannot be part of .song-list because of a bug with sortColumn
        // (overwrites contens from one tabe to other tables).
        mpcp.utils.tableSort(this.table, this.table + '-col-number',
            1, 'number');
        mpcp.utils.tableSort(this.table, this.table + '-col-title',
            2, 'string');
        mpcp.utils.tableSort(this.table, this.table + '-col-artist',
            3, 'string');
        mpcp.utils.tableSort(this.table, this.table + '-col-album',
            4, 'string');
        mpcp.utils.tableSort(this.table, this.table + '-col-time',
            5, '00:00');

        mpcp.utils.multiSelect(mpcp.browser, ['song-add', 'dir-add']);
    }
};

};
