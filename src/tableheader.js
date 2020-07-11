module.exports = function (mpcp) {
  // custom floating (fixed) table header
  // ARGS: id of table to used to update the thead, event to update the widths.
  // This assumes that a table called id-header exists!
  // The reason for two headers is for speed. The js doesn't need to do any
  // cloning of headers or keep track of the position of the header
  // I don't care that much for portability of this functionality, especially since
  // so many plugins like this exist already.
  return function (tableid, event) {
    var table = document.getElementById(tableid)
    var thead = document.getElementById(tableid + '-header').tHead

    updateWidth()

    if (event) {
      window.addEventListener(event, function () {
        updateWidth()
      })
    }

    window.addEventListener('MPCPReflow', function () {
      updateWidth()
    })

    window.addEventListener('resize', function () {
      updateWidth()
    })

    function updateWidth () {
      // update cell width
      var row = table.tBodies[0].rows[0]
      var i = 0
      var width = 0
      var tHeadCell

      if (!row) {
        // console.log('test ' + tableid)
        width = thead.clientWidth

        for (i = 0; i < thead.rows[0].cells.length; ++i) {
          tHeadCell = thead.rows[0].cells[i]
          tHeadCell.style.width = width + 'px'
        }

        return
      }

      var cells = row.cells
      // check for colSpan
      var column = 0

      for (i = 0; i < cells.length; ++i) {
        width = cells[i].clientWidth
        var colSpan = cells[i].colSpan

        if (colSpan !== 1) { width = width / colSpan }

        for (var j = 0; j < colSpan; ++j) {
          tHeadCell = thead.rows[0].cells[column]
          tHeadCell.style.width = width + 'px'
          ++column
        }
      }
    }

    return {
      update: function () {
        updateWidth()
      }
    }
  }
}
