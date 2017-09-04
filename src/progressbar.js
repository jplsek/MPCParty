module.exports = function (mpcp) {

// progress bar simulation for the player
return {
    // current time in seconds
    progress: 0,
    // interval
    musicprogress: null,
    // the song time. Set to 1 to avoid 0/0
    max: 1,

    progressfn: function () {
        // avoid 'this' as it's in a new scope of setInterval
        ++mpcp.progressbar.progress;

        if (mpcp.player.current === null)
            mpcp.progressbar.stop();

        if (mpcp.progressbar.progress > mpcp.player.current.Time) {
            mpcp.progressbar.stop();
            return;
        }

        mpcp.progressbar.update();
    },

    stop: function () {
        //console.log('stop progressbar');
        clearInterval(this.musicprogress);
    },

    start: function () {
        // stops in case of duplicates;
        this.stop();
        //console.log('start progressbar');
        this.disableProgressbar = false;
        this.musicprogress = setInterval(this.progressfn, 1000);
    },

    update: function () {
        document.getElementById('music-time').style.width =
            mpcp.progressbar.progress / mpcp.progressbar.max * 100 + "%";

        if (mpcp.progressbar.progress == 0 && mpcp.progressbar.max == 1 &&
                !mpcp.player.current)
            document.getElementById('time-current').innerHTML = '';
        else
            document.getElementById('time-current').innerHTML =
                mpcp.utils.toMMSS(mpcp.progressbar.progress);
    },

    reset: function () {
        mpcp.progressbar.stop();
        mpcp.progressbar.progress = 0;
        mpcp.progressbar.max = 1;
        mpcp.progressbar.update();
    },

    initEvents: function () {
        // only send update to mpd AFTER dragging is done.
        // it is quite funny when constantly seeking (but annoying to others)
        // The stlying of dragging itelf is similar to other players, where
        // the timestamp also updates while dragging the bar
        mpcp.utils.customSlider('music-time-container', 'music-time', false,
              function (percent) {
            var value = parseInt(mpcp.progressbar.max * percent);
            mpcp.progressbar.progress = value;
            mpcp.progressbar.update();
        }, function () {
            mpcp.progressbar.stop();
        }, function (percent) {
            if (!mpcp.player.current) {
                mpcp.progressbar.reset();
                return;
            }

            var value = Math.round(mpcp.progressbar.max * percent);

            console.log('Seeking...');
            // DO NOT USE seekcur, it introduces the SKIPPING BUG
            // on SOME systems.
            mpcp.socket.emit('mpc', 'playback.seek', mpcp.player.current.position, value);
        });
    }
};

};
