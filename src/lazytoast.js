module.exports = function (mpcp) {

return {
    info: function (msg, title, timeout, addHistory) {
        if (!title) title = 'Info';
        if (!timeout) timeout = 5000;

        if (addHistory) mpcp.history.add(msg, 'info');

        toastr.info(msg, title, {
            'closeButton': true,
            'positionClass': 'toast-bottom-left',
            'preventDuplicates': true,
            'timeOut': timeout
        });
    },

    error: function (msg, title, timeout, addHistory) {
        if (!title) title = 'Error';
        if (!timeout) timeout = -1;

        if (addHistory) mpcp.history.add(msg, 'danger');

        toastr.error(msg, title, {
            'closeButton': true,
            'positionClass': 'toast-bottom-left',
            'preventDuplicates': true,
            'timeOut': timeout,
        });
    },

    warning: function (msg, title, timeout, addHistory) {
        if (!title) title = 'Warning';
        if (!timeout) timeout = 5000;

        if (addHistory) mpcp.history.add(msg, 'warning');

        toastr.warning(msg, title, {
            'closeButton': true,
            'positionClass': 'toast-bottom-left',
            'preventDuplicates': false,
            'timeOut': timeout
        });
    }
};

};
