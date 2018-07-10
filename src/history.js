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

    var html = '<tr class="' + type + '"><td>' + mpcp.utils.getTime() + '</td><td>' + title + '</td><td><span class="history-remove faded text-danger glyphicon glyphicon-remove" title="Remove item from history"></span></td></tr>';
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
