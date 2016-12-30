module.exports = function (mpcp) {

// progress bar simulation for the player
return {
    progress: 0,
    musicprogress: 0,

    progressfn: function () {
        // avoid 'this' as it's in a new scope of setInterval
        ++mpcp.progressbar.progress;
        $('#music-time').val(mpcp.progressbar.progress);
        $('#time-current').html(mpcp.utils.toMMSS(mpcp.progressbar.progress));
    },

    stopProgress: function () {
        //console.log('stop progressbar');
        clearInterval(this.musicprogress);
    },

    startProgress: function () {
        this.stopProgress(); // stops in case of duplicates;
        //console.log('start progressbar');
        this.musicprogress = setInterval(this.progressfn, 1000);
    },

    initEvents: function () {
        $('#music-time').on('change', function () {
            // DO NOT USE seekcur, it introduces the SKIPPING BUG
            // on SOME systems.
            komponist.seek(mpcp.player.current.Pos, this.value,
                    function (err) {
                console.log('Seeking...');
                if (err) console.log('no song playing to seek');
            });
        });
    }
};

};
