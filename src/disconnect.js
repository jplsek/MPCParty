module.exports = function (mpcp) {

var host = window.document.location.host;

// server disconnect handling
return {
    secInterval: null,
    retryTimeout: null,

    callSocketClose: function () {
        clearInterval(this.secInterval);
        clearTimeout(this.retryTimeout);

        console.log('WebSocket disconnected');
        // timeout to not show if refreshing the page
        setTimeout(function () {
            var msg = 'The page will refresh when it comes back online.';
            mpcp.lazyToast.error(msg + '<br>Retrying in <span id="count">1</span> second(s)... <button title="Force a retry" class="retry-server btn btn-warning pull-right"><span class="glyphicon glyphicon-repeat"></span></button>', 'Server Disconnected!', 5000, false);
        }, 200);
        this.retryWebSocket(1);
    },

    retryWebSocket: function (attempts) {
        mpcp.socket = new WebSocket('ws://' + host);

        mpcp.socket.onclose = function () {
            var seconds = attempts;
            $('#count').html(seconds--);

            mpcp.disconnect.secInterval = setInterval(function () {
                $('#count').html(seconds--);
            }, 1000);

            mpcp.disconnect.retryTimeout = setTimeout(function () {
                clearInterval(mpcp.disconnect.secInterval);
                console.log('WebSocket closed, retrying... ' + attempts);
                // Connection has closed so try to reconnect every few seconds
                // max is 5 seconds
                if (attempts < 5) ++attempts;
                mpcp.disconnect.retryWebSocket(attempts);
            }, attempts * 1000);
        };

        mpcp.socket.onopen = function (event) {
            // refresh browser on restart, maybe there is a better way
            // (komponist needs to reconnect to its socket as well)
            console.log('WebSocket connected');
            window.location.reload();
        };
    },

    initEvents: function () {
        $(document).on('click', '.retry-server', function () {
            mpcp.disconnect.callSocketClose();
        });
    }
};

};
