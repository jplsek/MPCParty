module.exports = function (mpcp) {

// notification history
return {
  // max items in history
  max: 20,
  // type: bootstrap color type
  add: function (title, type) {
    if (!type)
      type = '';
    else
      type = 'bg-' + type;

    var html = '<tr class="' + type + '">' +
      '<td>' + mpcp.utils.getTime() + '</td><td>' + title + '</td>' +
      '<td><i class="history-remove fas fa-times faded text-danger" title="Remove item from history"></i></td></tr>';
    $('#history').prepend(html);

    if ($('#history').children().length > this.max)
      $('#history tr:last-child').remove();
  },

  initEvents: function () {
    $(document).on('click', '.history-remove', function () {
      $(this)[0].parentNode.parentNode.remove();
    });
  }
};

};
