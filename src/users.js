module.exports = function (mpcp) {

// may utilize in the future for logging users who has voted and for
// sharing pe's with other users
return {
    //ip:hostname
    hostnames: {},
    // total number of users
    total: 1,

    // populate user list
    populate: function (hostnames) {
        this.hostnames = hostnames;
        var html = '';
        $('#user-list .gen').remove();

        for (var ip in hostnames) {
            html += '<li class="gen"><a class="no-hover">' + hostnames[ip] +
                '</a></li>';
        }

        document.getElementById('user-list').innerHTML = html;
    },

    // returns the hostname (or ip)
    get: function (ip) {
        if (this.hostnames[ip] === undefined) return ip;

        return this.hostnames[ip];
    }
};

};
