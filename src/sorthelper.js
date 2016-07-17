module.exports = function (mpcp) {

// since there is not a clean way to handle multiple connected tables,
// we will use these helpers to detect which tables are which and
// provide other functions to mitigate the issue.
// Basically, every drag operation is cloned. And the dragee will
// check where the drag came from. The dragee will tell the sortHelper
// what to do with the duplicated objects.
return {
    // clone everything we copy, so we can remove the dud if the
    // user drags to the wrong table
    cloned: null,
    clone: function (e, obj) {
        mpcp.sortHelper.cloned = $(e.detail.item).clone();
        obj.clone = $(mpcp.sortHelper.cloned).insertAfter(e.detail.item);
        mpcp.sortHelper.reloadSortable(obj);
    },

    removeClone: function (e, obj) {
        $(mpcp.sortHelper.cloned).remove();
    },

    // remove the dud (since the clone replaced it)
    removeItem: function (e) {
        $(e.detail.item).remove();
    },

    // return true if not correct obj (not itself)
    check: function (e, obj) {
        var trTable = '#' + $(e.detail.item).parent().parent().attr('id') +
                ' .append',
            table = obj.tbody;

        if (~trTable.indexOf('undefined')) return true;

        if (e.isTrusted) return true;

        //console.log(trTable);
        //console.log(table);
        //console.log(e);
        //console.log(obj);

        // this took me way too long to get this combination correct...
        if (trTable != table) {
            //console.log('NOT TABLE: ' + table + ' vs ' + trTable);
            return true;
        }

        return false;
    },

    reloadSortable: function (obj) {
        console.log('reloading: ' + obj.tbody);
        sortable(obj.tbody);
    }
};

};
