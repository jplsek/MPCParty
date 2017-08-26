module.exports = function (io, mpc) {

// song skipping
return {
    self: this,
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
        io.broadcast.emit('request-vote-update-from-server');
    },

    nextSuccess: function () {
        mpc.playbackCommands.next(() => {
            if (err) return console.log(err);

            io.broadcast.emit('skipped', {'info': self.addressNext});
            console.log('Song vote skip successful from ' + self.addressNext);
            self.next = 0;
            self.addressNext = [];
        });
    },

    previousSuccess: function () {
        mpc.playbackCommands.previous(() => {
            if (err) return console.log(err);

            io.broadcast.emit('skipped', {'info': self.addressPrevious});
            console.log('Song vote skip successful from ' +
                self.addressPrevious);
            self.previous = 0;
            self.addressPrevious = [];
        });
    }
};

};
