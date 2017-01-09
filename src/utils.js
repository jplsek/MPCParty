module.exports = function (mpcp) {

// copied from http://stackoverflow.com/a/1533945
$.fn.randomize = function (childElem) {
    return this.each(function () {
        var $this = $(this),
        elems = $this.children(childElem);

        elems.sort(function () { return (Math.round(Math.random()) - 0.5); });

        $this.detach(childElem);

        for (var i = 0; i < elems.length; ++i) $this.append(elems[i]);
    });
};

return {
    // convert int to mm:ss
    toMMSS: function (str) {
        str = (!str ? '0' : str);

        var secNum  = parseInt(str, 10),
            minutes = Math.floor(secNum / 60),
            seconds = secNum - (minutes * 60);

        if (minutes < 10) minutes = '0' + minutes;
        if (seconds < 10) seconds = '0' + seconds;

        var time = minutes + ':' + seconds;
        return time;
    },

    // convert int to dd days, hh hours, mm minutes
    toFriendlyDDHHMM: function (str) {
        str = (!str ? '0' : str);

        var secNum  = parseInt(str, 10),
            days    = Math.floor(secNum / 86400),
            hours   = Math.floor(secNum / 3600) - (days * 24),
            minutes = Math.floor(secNum / 60) - (days * 24 + hours) * 60;

        var time = days + ' days, ' + hours + ' hours, ' + minutes + ' minutes';
        return time;
    },

    // copied from http://stackoverflow.com/a/12745196
    nthOccurrence: function (string, char, nth) {
        var firstIndex = string.indexOf(char);
        var lengthUpToFirstIndex = firstIndex + 1;

        if (nth == 1) {
            return firstIndex;
        } else {
            var stringAfterFirstOccurrence =
                    string.slice(lengthUpToFirstIndex),
                nextOccurrence =
                    mpcp.utils.nthOccurrence(
                    stringAfterFirstOccurrence, char, nth - 1);

            if (nextOccurrence === -1) {
                return -1;
            } else {
                return lengthUpToFirstIndex + nextOccurrence;
            }
        }
    },

    // return hours:minutes:seconds
    getTime: function () {
        var date    = new Date(),
            hours   = date.getHours(),
            minutes = date.getMinutes(),
            seconds = date.getSeconds();

        if (hours.  toString().length == 1) hours   = '0' + hours;
        if (minutes.toString().length == 1) minutes = '0' + minutes;
        if (seconds.toString().length == 1) seconds = '0' + seconds;

        return hours + ':' + minutes + ':' + seconds;
    },

    // generate a title for playlist and player
    getSimpleTitle: function (title, artist, file, playlistVal) {
        artist = (!artist ? 'unknown' : artist);
        var song = artist + ' - ' + title,
            fileStripped = mpcp.utils.stripSlash(file);

        // if the title doesn't exist, just return the file name
        if (!playlistVal) {
            return (!title ? fileStripped : song);
        } else {
            playlistVal = parseInt(playlistVal) + 1;
            var songPlaylist = playlistVal + '. ' + song;
            var fileStrippedPlaylist = playlistVal + '. ' + fileStripped;

            return (!title ? fileStrippedPlaylist : songPlaylist);
        }
    },

    // strip to the last slash
    stripSlash: function (str) {
        if (!str) return;

        var index = str.lastIndexOf('/');
        return str.substring(index+1);
    },

    // http://stackoverflow.com/a/9645447
    ignoreCase: function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    },

    // http://stackoverflow.com/a/9716488
    isNumber: function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },

    // create the popup window for song information
    parseSongInfo: function (err, values, callback) {
        if (err || !values || Object.keys(values).length < 1) {
            mpcp.lazyToast.warning('This is most likely a bug with MPCParty or the song is not in the live database.', 'Error getting song information.', 10000);
            if (callback) callback();
            return console.log(err);
        }

        //console.log(values);
        $('#song-info .gen').remove();
        $('#song-info-modal h4')[0].innerHTML = '';
        $('#song-info-modal').modal('show');

        var title = mpcp.utils.getSimpleTitle(values.Title, values.Artist, values.file);
        $('#song-info-modal h4')[0].innerHTML = title;

        if (values.Time) values.Time = mpcp.utils.toMMSS(values.Time);

        // http://stackoverflow.com/a/31102605
        var html = '';
        Object.keys(values).sort(mpcp.utils.ignoreCase).forEach(function (key) {
            html += '<tr class="gen"><td>' + key + '</td><td>' + values[key] + '</td></tr>';
        });

        $('#song-info tbody')[0].innerHTML = html;

        if (callback) callback();
    },

    // replace listAllInfo because of issues with it
    // loop through each directory, add each file to array, return array
    getAllInfo: function (dir, callback) {
        var arr = [];

        // MESSAGE1: so there is a bug with lsinfo.
        // sometimes the json is is oddly placed. http://i.imgur.com/Iankhha.png,
        // notice the second json object, where part of the file is a key, and
        // the key is undefined. So... A way to work around this bug is to check
        // for an undefined value (because there should not be any), then run a
        // find('file') because that works.
        komponist.lsinfo(dir, function (err, files) {
            if (err) {
                console.log(err);
                callback(arr);
            }

            // make object to array (single items usually ... hopefully)
            if (!Array.isArray(files))
                files = [files];

            if (!files.length) callback(arr);

            var j = 0;

            function recurse(dir) {
                mpcp.utils.getAllInfo(dir, function (newArr) {
                    arr = arr.concat(newArr);

                    if (++j == files.length) {
                        callback(arr);
                    }
                });
            }

            // and this is the function to work around said bug...
            function findFile(file, key) {
                //console.log(files[i]);
                // append a space
                var file1 = file.file + ' ' + key;
                // do not append a space
                var file2 = file.file + key;
                //console.log(file.file);
                //console.log(file1);
                //console.log(file2);

                // 1. find file as it normally would
                komponist.find('file', file.file, function (findErr, value) {
                    //console.log(value);

                    if (findErr || $.isEmptyObject(value[0])) {
                        // 2. find file with file1
                        komponist.find('file', file1, function (findErr, value) {
                            //console.log(value);

                            if (findErr || $.isEmptyObject(value[0])) {
                                // 3. find file with file2
                                komponist.find('file', file2,
                                        function (findErr, value) {
                                    //console.log(value);

                                    if (findErr || $.isEmptyObject(value[0])) {
                                        console.log(
                                            'no matches found, falling back');
                                        arr.push(file);

                                        if (++j == files.length) {
                                            callback(arr);
                                        }
                                    } else {
                                        console.log('found match 2!');
                                        //console.log(value[0]);
                                        arr.push(value[0]);

                                        if (++j == files.length) {
                                            callback(arr);
                                        }
                                    }
                                });
                            } else {
                                console.log('found match 1!');
                                //console.log(value[0]);
                                arr.push(value[0]);

                                if (++j == files.length) {
                                    callback(arr);
                                }
                            }
                        });
                    } else {
                        console.log('found match 0!');
                        arr.push(file);

                        if (++j == files.length) {
                            callback(arr);
                        }
                    }
                });
            }

            //console.log(files);
            for (var i = 0; i < files.length; ++i) {
                if (files[i].directory && files[i].file) {
                    // ignore?
                    if (++j == files.length) {
                        callback(arr);
                    }
                } else if (files[i].directory) {
                    recurse(files[i].directory);
                } else if (files[i].file) {
                    // check if the file contains an undefined value
                    var add = true;
                    for (var key in files[i]) {
                        if (!files[i].hasOwnProperty(key)) {
                            continue;
                        }

                        if (files[i][key] === undefined) {
                            add = false;
                            findFile(files[i], key);
                        }
                    }

                    // add file
                    if (add) {
                        arr.push(files[i]);

                        if (++j == files.length) {
                            callback(arr);
                        }
                    }
                } else {
                    // fallback (such as empty directories)
                    if (++j == files.length) {
                        callback(arr);
                    }
                }
            }
        });
    },

    // update database statistics to the client
    updateStats: function () {
        komponist.stats(function (err, stats) {
            if (err) return console.log(err);

            //console.log(stats);
            var html = '<small>' + stats.artists + ' artists, ' + stats.albums + ' albums, ' + stats.songs + ' songs (' + mpcp.utils.toFriendlyDDHHMM(stats.db_playtime) + '). Last database update: ' + new Date(stats.db_update * 1000).toLocaleString() + '</small>';
            //console.log(html);
            document.getElementById('stats').innerHTML = html;
        });
    },

    // sometimes when komponist returns a length 0 or 1 item, it returns an object
    // instead of any array. This is used to fix that. (less need for jquery.each)
    // also used to avoid issues when converting an array which is already an
    // array)
    toArray: function (obj) {
        if (!Array.isArray(obj)) {
            obj = [obj];

            if (obj.length == 1 && $.isEmptyObject(obj[0]))
                return [];

            return obj;
        } else {
            if (obj.length == 1 && $.isEmptyObject(obj[0]))
                return [];

            return obj;
        }
    },

    // select a table row and apply a custom style
    // ele: the table to click the rows with
    // scrollEle: element to scroll if out of view
    rowSelect: (function (ele, style, scrollEle) {
        var selected,
            downCallback,
            upCallback,
            enterCallback,
            clickCallback,
            deleteCallback;

        function deselect() {
            if (selected) {
                $(selected).children().removeClass(style);
                $(selected)[0].classList.remove('selected');
            }
        }

        function select(obj) {
            // fix hover issues
            $(obj).children().addClass(style);
            $(obj)[0].classList.add('selected');
            selected = obj;
        }

        function checkScroll(top) {
            if (!scrollEle) return;

            var middle = $(selected)[0].offsetTop - ($(scrollEle).height() / 2);
            $(scrollEle)[0].scrollTo(0, middle);
        }

        $(document).on('click', ele, function () {
            deselect();
            select(this);

            if (clickCallback) clickCallback(selected);
        });

        $(document).on('keydown', selected, function (e) {
            // we don't want to fire an event if it's not visible (these are
            // so far only in modals)
            // pretty sure there is a better way, but idk
            if (!$(ele).is(':visible')) return;

            switch (e.keyCode) {
                // enter key
                case 13:
                    if (enterCallback) enterCallback(selected);
                    break;

                // up arrow
                case 38:
                    if (!$(selected).prev().length) break;

                    deselect();
                    select($(selected).prev());
                    checkScroll(true);

                    if (upCallback) upCallback(selected);

                    break;

                // down arrow
                case 40:
                    if (!$(selected).next().length) break;

                    deselect();
                    select($(selected).next());
                    checkScroll(false);

                    if (downCallback) downCallback(selected);

                    break;

                // delete
                case 46:
                    if (deleteCallback) deleteCallback(selected);

                    break;
            }
        });

        return {
            getSelected: function () {
                return selected;
            },

            deselect: function () {
                deselect();
                selected = null;
            },

            on: function (event, callback) {
                switch(event) {
                    case 'down':
                        downCallback = callback;
                        break;
                    case 'up':
                        upCallback = callback;
                        break;
                    case 'enter':
                        enterCallback = callback;
                        break;
                    case 'click':
                        clickCallback = callback;
                        break;
                    case 'delete':
                        deleteCallback = callback;
                        break;
                }
            }
        };
    }),

    buttonSelect: function (ele, par) {
        $(par).children().removeClass('active');
        $(ele)[0].classList.add('active');
    },

    // creates a search input setup (input, search callback [returns searchVal],
    // reset callback, input clear button, time it takes to search
    createSearch: function (input, callSearch, callReset, inputClear, time) {
        if (!time) time = 3000;

        function getSearchVal() { return $(input)[0].value.toLowerCase(); }

        // searching the database, instant searching is "slowed"
        // for better client and server performance
        var searchInterval;
        var lastVal = '';
        $(input).focus(function () {
            // makes the instant search not as instant (instead of
            // relying on every keyUp)
            searchInterval = setInterval(function () {
                var searchVal = getSearchVal();
                //console.log('attempting searching for ' + searchVal);
                if (searchVal && searchVal != lastVal) {
                    callSearch(searchVal);
                    lastVal = searchVal;
                } else if (searchVal === '' && lastVal !== '') {
                    callReset();
                }
            }, time);
        });

        $(input).focusout(function () {
            clearInterval(searchInterval);
            var searchVal = getSearchVal();
            if (searchVal === '' && lastVal !== '') {
                lastVal = '';
                callReset();
            }
        });

        $(inputClear).click(function () {
            //console.log('clearing search');
            $(input)[0].value = '';
            $(input).focus();
            lastVal = '';
            callReset();

            // not the best way of doing things...
            if (mpcp.library.bringBack) {
                mpcp.browser.hide();
                mpcp.library.show();
                mpcp.library.bringBack = false;
            }
        });

        // detect enter key
        $(input).keyup(function (e) {
            if (e.keyCode == 13) {
                var searchVal = getSearchVal();
                //console.log('attempting searching for ' + searchVal);
                if (searchVal === '') {
                    callReset();
                } else {
                    callSearch(searchVal);
                    lastVal = searchVal;
                }
            }
        });
    },

    // hides table rows as the user searches (input text box, table, data-*,
    // clear input button)
    lazySearch: function (input, table, data, inputClear, time) {
        if (!time) time = 1000;

        mpcp.utils.createSearch(
            input,
            function (search) {
                var tr = $(table + ' .gen');

                for (var i = 0; i < tr.length; ++i) {
                    var str = String($(tr[i]).data()[data]).toLowerCase();

                    if (~str.indexOf(search)) {
                        $(tr[i])[0].style.display = 'block';
                    } else {
                        $(tr[i])[0].style.display = 'none';
                    }
                }
            },
            function () {
                $(table + ' .gen').show();
            },
            inputClear,
            time
        );
    },

    // a specialized function to convert the multiselect object to an array
    toArraySelected: function (obj) {
        var arr = [];
        for(var i = 0; i < obj.selected.length; ++i) {
            arr.push(obj.selected[i]);
        }
        obj.selected = arr;
    },

    // table sorting
    tableSort: function (table, thead, index, format) {
        var sortOrder = 'asc';
        $(document).on('click', thead, function () {
            if (sortOrder == 'asc') {
                $(table).sortColumn({
                    index: index, order: 'desc', format: format
                });
                sortOrder = 'desc';
            } else {
                $(table).sortColumn({
                    index: index, order: 'asc', format: format
                });
                sortOrder = 'asc';
            }
        });
    },

    // thead floating
    floatTable: function (table, par) {
        $(table).floatThead({
            position: 'fixed',
            scrollContainer: function ($table) {
                return $table.closest(par);
            },
            autoReflow: true
        });
    },

    // MultiSelect. Multiselections handled by respective object.
    // Events handled in callback and contextMenu.
    // table for multislection, obj used for multiselection (must contain selected
    // variable. Because it needs to pass by reference to selected.
    multiSelect: function (obj, cancel, exclude, deselect) {
        var disable = ['tbody'];

        if (exclude) disable = disable.concat(exclude);

        if (deselect === undefined) deselect = true;

        $(obj.table).multiSelect({
            actcls: 'info',
            selector: 'tr.gen',
            except: disable,
            deselect: deselect,
            cancel: cancel,
            callback: function (items, e) {
                if (!items.length) return;
                obj.selected = items;
            }
        });
    },

    // save the list temporarily
    saveSelected: function (obj) {
        //console.log('saving list temp: ' + this.selected.length);
        obj.saved = obj.selected;
    },

    // restore the list
    restoreSelected: function (obj) {
        //console.log('restore list temp: ' + this.saved.length);
        obj.selected = obj.saved;
        obj.saved = [];
    },

    clearSelected: function (obj) {
        console.log('clearing selected: ' + obj.table);

        for (var i = 0; i < obj.selected.length; ++i) {
            //console.log(obj.selected[i]);
            $(obj.selected[i])[0].classList.remove('info');
        }

        obj.selected = [];
    },

    setCurrentAlbumArt: function (url) {
        //console.log(url);

        if (!url) {
            $('#album-art').hide().attr('src', '');
        } else {
            $('#album-art').show().attr('src', url);
        }
    },
};

};
