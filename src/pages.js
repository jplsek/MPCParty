module.exports = function (mpcp) {

// page support for browser, playlist, etc
return {
    // enable page support
    enabledPlaylist: true,
    enabledBrowser: false,
    // maximum items per page (playlist or browser)
    maxPlaylist: 200,
    maxBrowser: 200,
    // total pages
    totalPlaylist: 1,
    totalBrowser: 1,
    // current page
    currentPlaylist: 1,
    currentBrowser: 1,

    // updates the max pages
    update: function (type) {
        console.log('pages update for ' + type);

        if (type == 'playlist') {
            this.totalPlaylist =
                Math.ceil(mpcp.playlist.local.length / this.maxPlaylist);

            // just in case
            if (this.totalPlaylist <= 0) this.totalPlaylist = 1;

            $('#playlist-pages .total-pages').html(this.totalPlaylist);
            $('#playlist-pages input').prop('max', this.totalPlaylist);

            // checks while user updating maximum item values
            if($('#playlist-pages input').val() > this.totalPlaylist) {
                console.log('changing to max page');
                $('#playlist-pages input').val(this.totalPlaylist);
                this.go('playlist', this.totalPlaylist);
            }
        } else if (type == 'browser') {
            this.totalBrowser = Math.ceil((mpcp.browser.localFolders.length +
                        mpcp.browser.localFiles.length) / this.maxBrowser);

            // just in case
            if (this.totalBrowser <= 0) this.totalBrowser = 1;

            $('#browser-pages .total-pages').html(this.totalBrowser);
            $('#browser-pages input').prop('max', this.totalBrowser);

            // checks while user updating maximum item values
            if($('#browser-pages input').val() > this.totalBrowser) {
                console.log('changing to max page');
                $('#browser-pages input').val(this.totalBrowser);
                this.go('browser', this.totalBrowser);
            }
        }
    },

    // type: browser or playlist, page: the page to go
    go: function (type, page) {
        page = Math.floor(page);
        console.log('go to page ' + page + ' on ' + type);

        if (type == 'playlist' && this.enabledPlaylist) {
            if (page < 1 || page > this.totalPlaylist) return;

            this.currentPlaylist = parseInt(page);
            $('#playlist-pages input').val(this.currentPlaylist);
            mpcp.playlist.updateLocal();
            $('#pslwrap').scrollTop($(mpcp.playlist.table));
        } else if (type == 'browser' && this.enabledBrowser) {
            if (page < 1 || page > this.totalBrowser) return;

            this.currentBrowser = parseInt(page);
            $('#browser-pages input').val(this.currentBrowser);
            mpcp.browser.updateLocal();
            $('#slwrap').scrollTop($(mpcp.browser.table));
        }
    },

    // show page footer
    show: function (type) {
        console.log('show pages: ' + type);

        if (type == 'playlist')
            $('#playlist-pages').show();
        else if (type == 'browser')
            $('#browser-pages').show();
        else
            $('.pages').show();
    },

    // hide page footer
    hide: function (type) {
        console.log('hide pages: ' + type);

        if (type == 'playlist')
            $('#playlist-pages').hide();
        else if (type == 'browser')
            $('#browser-pages').hide();
        else
            $('.pages').hide();
    },

    initEvents: function () {
        // playlist pages event handling
        $('#playlist-pages input').change(function () {
            mpcp.pages.go('playlist', this.value);
        });

        $('#playlist-pages .first').click(function () {
            mpcp.pages.go('playlist', 1);
        });

        $('#playlist-pages .previous').click(function () {
            mpcp.pages.go('playlist', mpcp.pages.currentPlaylist - 1);
        });

        $('#playlist-pages .next').click(function () {
            mpcp.pages.go('playlist', mpcp.pages.currentPlaylist + 1);
        });

        $('#playlist-pages .last').click(function () {
            mpcp.pages.go('playlist', mpcp.pages.totalPlaylist);
        });

        // browser pages event handling
        $('#browser-pages input').change(function () {
            mpcp.pages.go('browser', this.value);
        });

        $('#browser-pages .first').click(function () {
            mpcp.pages.go('browser', 1);
        });

        $('#browser-pages .previous').click(function () {
            mpcp.pages.go('browser', mpcp.pages.currentBrowser - 1);
        });

        $('#browser-pages .next').click(function () {
            mpcp.pages.go('browser', mpcp.pages.currentBrowser + 1);
        });

        $('#browser-pages .last').click(function () {
            mpcp.pages.go('browser', mpcp.pages.totalBrowser);
        });
    }
};

};
