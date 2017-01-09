module.exports = function (mpcp) {

// custom floating (fixed) table header
return {
    // table to update the thead. Event to update the widths.
    init: (function (table, event) {
        table = document.getElementById(table);
        var thead = table.tHead;

        // apply specific styles
        thead.style.position = 'fixed';
        thead.style.zIndex = '1';

        updateSize();

        if (event) {
            window.addEventListener(event, function () {
                updateSize();
            });
        }

        window.addEventListener('MPCPReflow', function () {
            updateSize();
            updateOffset();
        });

        window.addEventListener('resize', function () {
            updateWidth();
            updateOffset();
        });

        window.addEventListener('scroll', function () {
            updateOffset();
        });

        // anything that has to do with "top" is due to scrolling in the window.
        // in my case, this happens in mobile. Otherwise, I wouldn't need to
        // use "top" anywhere.
        // another way of addressing this is to create a table based on the thead
        // (like other plugins) and just put that on top of the main table.
        // That way, there is no fixed possitons. Hmmm... might try that. TODO
        function updateOffset() {
            if (window.pageYOffset !== 0) {
                var offset = table.getBoundingClientRect().top;
                thead.style.top = offset + 'px';
            } else {
                // let browser handle it, because it handles it like I would
                // expect it to.
                thead.style.top = '';
            }
        }

        function updateSize() {
            updateHeight();
            updateWidth();
        }

        function updateHeight() {
            var height = thead.clientHeight;
            table.style.marginTop = height + 'px';
            thead.style.marginTop = -height + 'px';
        }

        function updateWidth() {
            // update thead width
            var width = table.clientWidth;
            thead.style.width = width + 'px';

            // update cell width
            var row = table.tBodies[0].rows[0];

            if (!row) return;

            var cells = row.cells;
            // check for colSpan
            var column = 0;

            for (var i = 0; i < cells.length; ++i) {
                width = cells[i].clientWidth;
                var colSpan = cells[i].colSpan;

                if (colSpan != 1)
                     width = width / colSpan;

                 for (var j = 0; j < colSpan; ++j) {
                    var tHeadCell = table.tHead.rows[0].cells[column];
                    tHeadCell.style.width = width + 'px';
                    ++column;
                 }
            }
        }
    })
};

};
