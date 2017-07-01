module.exports = function (mpcp) {

// vote to skip (most of it is server side)
return {
    // gets from socket connection
    received: false,
    enabled: false,
    needed: 1,

    // send a message to the client (using setTitle as the message)
    message: function (current, id) {
        mpcp.lazyToast.info(vote.setTitles(current, id), 'Song Skip');
    },

    // create a title for the next and previous buttons
    setTitles: function (current, id) {
        var msg = 'Skip to ' + id + ' song: ' + current + ' / ' + mpcp.vote.needed +
            ' from ' + mpcp.users.total + ' clients.';
        $('#' + id).attr('title', msg);
        return msg;
    }
};

};
