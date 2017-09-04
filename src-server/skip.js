module.exports = function (io, mpc) {

'use strict';

// song skipping
return {
    votePercent: 0.75,
    voting: true,
    // user count
    total: 1,
    // user count for skip ammout
    next: 0,
    previous: 0,
    // logs the addresses that have skipped
    addressNext: [],
    addressPrevious: [],
    addressNextCancel: [],
    addressPreviousCancel: [],

    reset: function () {
        // reset arrays and vote ammounts?
        this.next     = 0;
        this.previous = 0;
        // logs the addresses that have skipped
        this.addressNext           = [];
        this.addressPrevious       = [];
        this.addressNextCancel     = [];
        this.addressPreviousCancel = [];
        // I would run sendUpdate(), but im not sure how
        // to do with my current set up.
        io.emit('request-vote-update-from-server');
    },

    nextSuccess: function () {
        mpc.playback.next().then(() => {
            io.emit('skipped', {'info': this.addressNext});
            console.log('Song vote skip successful from ' + this.addressNext);
            this.next = 0;
            this.addressNext = [];
        }).catch(console.log);
    },

    previousSuccess: function () {
        mpc.playback.previous().then(() => {
            io.emit('skipped', {'info': this.addressPrevious});
            console.log('Song vote skip successful from ' +
                this.addressPrevious);
            this.previous = 0;
            this.addressPrevious = [];
        }).catch(console.log);
    }
};

};
