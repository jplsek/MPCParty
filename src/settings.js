module.exports = function (mpcp) {

// saved user settings
// since all storage is text, the if statements check if their undefined.
return {
    // default theme to use
    theme: 'default-thin',
    // show pulsing effect
    pulse: true,
    // 'unknown' text
    unknown: 'unknown',
    // which browser to use (library or browser)
    browser: 'browser',
    // used for unknown pop states
    lastBrowser: 'browser',
    // show consume warning
    consumeWarning: true,

    // initially load all the settings
    loadAll: function () {
        this.loadTheme();
        this.loadHistoryMax();
        this.loadItemsMax();
        this.loadPagination();
        this.loadShowAllErrors();
        this.loadPulse();
        this.loadUnknown();
        this.loadSkipToRemove();
        this.loadBrowser();
        this.loadConsumeWarning();
    },

    loadTheme: function () {
        var theme = localStorage.getItem('mpcp-theme');

        if (theme) this.theme = theme;

        document.getElementById('themes').value = this.theme;

        var url = '/css/themes/' + this.theme + '/main.css';

        $.get(url, function () {
            $('#theme').attr('href', url);
            // I'm hoping it will only take Xms to load all the css...
            setTimeout(function () {
                window.dispatchEvent(new CustomEvent("MPCPReflow"));
            }, 500);
        });
    },

    saveTheme: function (theme) {
        console.log('changed theme');
        localStorage.setItem('mpcp-theme', theme);
        this.loadTheme();
    },

    loadHistoryMax: function () {
        var max = localStorage.getItem('mpcp-history-max');

        if (max) mpcp.history.max = max;

        document.getElementById('history-max').value = mpcp.history.max;
    },

    saveHistoryMax: function (max) {
        console.log('changed max history items');
        localStorage.setItem('mpcp-history-max', max);
        this.loadHistoryMax();
    },

    loadItemsMax: function (type, force) {
        var max;

        if (type == 'playlist' || type === undefined) {
            max = localStorage.getItem('mpcp-items-max-playlist');

            if (max) mpcp.pages.maxPlaylist = parseInt(max);

            document.getElementById('items-max-playlist').value =
                mpcp.pages.maxPlaylist;
        }

        if (type == 'browser' || type === undefined) {
            max = localStorage.getItem('mpcp-items-max-browser');

            if (max) mpcp.pages.maxBrowser = parseInt(max);

            document.getElementById('items-max-browser').value =
                mpcp.pages.maxBrowser;
        }

        if (type !== undefined) mpcp.pages.update(type);

        if (force && type == 'playlist') mpcp.playlist.updateLocal();
        if (force && type == 'browser') mpcp.browser.updateLocal();
    },

    saveItemsMax: function (type, max) {
        console.log('changed max items for ' + type);

        if (type == 'playlist')
            localStorage.setItem('mpcp-items-max-playlist', max);
        else if (type == 'browser')
            localStorage.setItem('mpcp-items-max-browser', max);

        this.loadItemsMax(type, true);
    },

    loadPagination: function (type, force) {
        var use;

        if (type == 'playlist' || type === undefined) {
            use = localStorage.getItem('mpcp-use-pages-playlist');

            if (use) mpcp.pages.enabledPlaylist = (use === 'true');

            $('#use-pages-playlist').prop(
                    'checked', mpcp.pages.enabledPlaylist);

            if (mpcp.pages.enabledPlaylist)
                mpcp.pages.show('playlist');
            else
                mpcp.pages.hide('playlist');
        }

        if (type == 'browser' || type === undefined) {
            use = localStorage.getItem('mpcp-use-pages-browser');

            if (use) mpcp.pages.enabledBrowser = (use === 'true');

            $('#use-pages-browser').prop('checked', mpcp.pages.enabledBrowser);

            if (mpcp.pages.enabledBrowser)
                mpcp.pages.show('browser');
            else
                mpcp.pages.hide('browser');
        }

        if (force && type == 'playlist') mpcp.playlist.updateLocal();
        if (force && type == 'browser') mpcp.browser.updateLocal();
    },

    savePagination: function (type, use) {
        console.log('changed use pagination for ' + type);

        if (type == 'playlist')
            localStorage.setItem('mpcp-use-pages-playlist', use);
        else if (type == 'browser')
            localStorage.setItem('mpcp-use-pages-browser', use);

        this.loadPagination(type, true);
    },

    loadShowAllErrors: function () {
        var use = localStorage.getItem('mpcp-show-all-errors'),
        show = false;

        if (use && use === 'true') show = true;

        $('#show-all-errors').prop('checked', show);
    },

    saveShowAllErrors: function (use) {
        console.log('changed show all errors');
        localStorage.setItem('mpcp-show-all-errors', use);
    },

    loadPulse: function () {
        var use = localStorage.getItem('mpcp-use-pulse');

        if (use && use === 'false') this.pulse = false;

        $('#use-pulse').prop('checked', this.pulse);
    },

    savePulse: function (use) {
        console.log('changed pulse');
        this.pulse = use;

        if (mpcp.pb.current) {
            if (use)
                $(mpcp.pb.tbody).children().addClass('pulse');
            else
                $(mpcp.pb.tbody).children().removeClass('pulse');
        }

        localStorage.setItem('mpcp-use-pulse', use);
    },

    loadUnknown: function () {
        var use = localStorage.getItem('mpcp-use-unknown');

        if (use !== undefined && use === '') {
            this.unknown = '';
            $('#use-unknown').prop('checked', false);
        } else {
            this.unknown = 'unknown';
            $('#use-unknown').prop('checked', true);
        }
    },

    saveUnknown: function (use) {
        console.log('changed unknown');

        if (use) {
            localStorage.setItem('mpcp-use-unknown', 'unknown');
            this.loadUnknown();
        } else {
            localStorage.setItem('mpcp-use-unknown', '');
            this.loadUnknown();
        }

        mpcp.browser.update();
    },

    loadSkipToRemove: function () {
        var use = localStorage.getItem('mpcp-use-skip-to-remove');

        if (use && use == 'true') {
            mpcp.playlist.skipToRemove = true;
        } else {
            mpcp.playlist.skipToRemove = false;
        }

        $('#use-skip-to-remove').prop('checked', mpcp.playlist.skipToRemove);
    },

    saveSkipToRemove: function (use) {
        console.log('changed skip-to-remove');
        localStorage.setItem('mpcp-use-skip-to-remove', use);
        this.loadSkipToRemove();
    },

    loadBrowser: function (activate) {
        var use = localStorage.getItem('mpcp-browser');

        if (use) this.browser = use;

        if (activate) {
            if (use && use == 'library') {
                mpcp.library.show();
                mpcp.browser.hide();
            } else {
                mpcp.library.hide();
                mpcp.browser.show();
            }
        } else {
            this.lastBrowser = this.browser;
            mpcp.library.hide();
            mpcp.browser.hide();
        }
    },

    saveBrowser: function (use) {
        console.log('changed browser');
        this.lastBrowser = this.browser;
        localStorage.setItem('mpcp-browser', use);
        this.loadBrowser(true);
    },

    loadConsumeWarning: function () {
        var use = localStorage.getItem('mpcp-use-consume-warning');

        if (use && use === 'false') this.consumeWarning = false;

        $('#use-consume-warning').prop(
                'checked', this.consumeWarning);
    },

    saveConsumeWarning: function (use) {
        console.log('changed consume warning');
        this.consumeWarning = use;

        if (use && $('#consume').is(':checked'))
            document.getElementById('warning-consume').style.display = 'block';
        else
            document.getElementById('warning-consume').style.display = 'none';

        localStorage.setItem('mpcp-use-consume-warning', use);
    },

    initEvents: function () {
        // settings event handling
        // client config
        $('#themes').change(function () {
            mpcp.settings.saveTheme(this.value);
        });

        $('#history-max').change(function () {
            mpcp.settings.saveHistoryMax(this.value);
        });

        $('#items-max-playlist').change(function () {
            mpcp.settings.saveItemsMax('playlist', this.value);
        });

        $('#items-max-browser').change(function () {
            mpcp.settings.saveItemsMax('browser', this.value);
        });

        $('#use-pages-playlist').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.savePagination('playlist', use);
        });

        $('#use-pages-browser').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.savePagination('browser', use);
        });

        $('#use-pulse').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.savePulse(use);
        });

        $('#use-unknown').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.saveUnknown(use);
        });

        $('#use-skip-to-remove').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.saveSkipToRemove(use);
        });

        $('#show-all-errors').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.saveShowAllErrors(use);
        });

        // server config
        $('#crossfade').on('input change', function () {
            komponist.crossfade(this.value, function (err) {
                if (err) console.log(err);
            });
        });

        $('#consume').change(function () {
            var use = $(this).prop('checked');
            use = use ? 1 : 0;

            komponist.consume(use, function (err) {
                if (err) console.log(err);
            });
        });

        $('#use-consume-warning').change(function () {
            var use = $(this).prop('checked');
            mpcp.settings.saveConsumeWarning(use);
        });
    }
};

};
