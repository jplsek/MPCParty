module.exports = function (mpcp) {

// the downloader
return {
    init: function (location) {
        // set the location to the last saved location, else set the server's
        // default
        var curLocation = localStorage.getItem('mpcp-downloader-location');

        if (curLocation) location = curLocation;

        $('#downloader-location').val(location);
    },

    // download the video
    download: function (url, location) {
        if (url !== '') {
            mpcp.socket.send(JSON.stringify({
                    'type': 'downloader-download',
                    'url': url,
                    'location': location
                    }), function (err) {
                if (err) console.log(err);
            });
        }
    },

    // grab url from downloader element
    downloadFromDownloader: function () {
        var url = $('#downloader-url').val();
        var location = $('#downloader-location').val();
        this.download(url, location);
    },

    setStatus: function (str) {
        $('#downloader-status').html(str);
    },

    initEvents: function () {
        $('#downloader-download').click(function () {
            mpcp.downloader.downloadFromDownloader();
        });

        // detect enter key
        $('#downloader-url').keyup(function (e) {
            if (e.keyCode == 13)
                mpcp.downloader.downloadFromDownloader();
        });

        // save location
        $('#downloader-location').change(function () {
            var location = $('#downloader-location').val();
            localStorage.setItem('mpcp-downloader-location', location);
        });
    }
};

};
