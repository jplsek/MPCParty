module.exports = function (mpcp) {

// the downloader
return {
  table: '#downloader-folder-list',
  tbody: '#downloader-folder-list .append',
  current: '/',
  previous: '/',
  localFolders: [],
  rowSelect: null,

  init: function (location) {
    // set the location to the last saved location, else set the server's
    // default
    var curLocation = localStorage.getItem('mpcp-downloader-location');

    if (curLocation) location = curLocation;

    document.getElementById('downloader-location').value = location;
  },

  // download the video
  download: function (url, location) {
    if (url !== '') {
      mpcp.socket.send(JSON.stringify({
          'type': 'downloader-download',
          'url': url,
          'location': location
          }), function (err) {
        if (err) console.log(err);
      });
    }
  },

  // check which dir the user is in.
  // only update that dir
  update: function (dir, callback) {
    if (dir) mpcp.downloader.current = dir;

    //console.log('previous directory: ' + mpcp.browser.previous);
    console.log('reloading directory: ' + mpcp.downloader.current);

    mpcp.downloader.updateBrowser(mpcp.downloader.current, callback);

    if (dir) mpcp.downloader.previous = dir;
  },

  // grab url from downloader element
  downloadFromDownloader: function () {
    var url = document.getElementById('downloader-url').value;
    var location = document.getElementById('downloader-location').value;
    this.download(url, location);
  },

  setStatus: function (str) {
    document.getElementById('downloader-status').innerHTML = str;
  },

  updateLocal: function (callback) {
    console.log('update downloader browser');

    // this.local* always has a length of 1, but may have an empty
    // object. This fixes removeal of "Empty directory"
    if (this.localFolders.length <= 1) {
      if (this.localFolders[0] && Object.getOwnPropertyNames(
          this.localFolders[0]).length <= 0) {
        if (callback) callback();
        return;
      }
    }

    document.querySelectorAll(this.table + ' .gen')
      .forEach(e => e.parentNode.removeChild(e));

    var start = 0,
      end   = this.localFolders.length,
      html  = '';

    var current = start,
      i;
    //console.log(start);
    //console.log(end);

    for (i = current; i < this.localFolders.length; ++i) {
      if (current > end || current > mpcp.downloader.localFolders.length)
        break;

      html += mpcp.downloader.localFolders[i];
      ++current;
    }

    $(this.tbody)[0].innerHTML = html;

    //console.log(current);

    if (callback) callback();
  },

  // shows directories. use '/' for root
  updateBrowser: function (directory, callback) {
    // location bar:
    // split directory based on /'s
    // create a list item for each dir split
    document.querySelectorAll('#downloader-location-crumb .downloader-loc-dir')
      .forEach(e => e.parentNode.removeChild(e));
    // toString incase of number only directories
    var dirs = directory.toString().split('/'),
      dirId = dirs[0],
      html = '',
      i;

    if (this.current != '/')
      for (i = 0; i < dirs.length; ++i) {
        html += '<li class="downloader-loc-dir" data-dirid="' + dirId + '">' +
          dirs[i] + '</li>';
        dirId += '/' + dirs[i+1];
      }

    document.querySelector('#downloader-location-crumb ol')
      .insertAdjacentHTML('beforeend', html);

    komponist.lsinfo(directory, function (err, files) {
      //console.log(files);
      if (err) return console.log(err);

      document.querySelectorAll(mpcp.downloader.table + ' .gen')
        .forEach(e => e.parentNode.removeChild(e));
      mpcp.downloader.localFolders = [];
      files = mpcp.utils.toArray(files);

      if (!files.length) {
        html = '<tr class="directory gen"><td colspan="6">' +
          '<em class="text-muted">Empty directory</em></td></tr>';
        $(mpcp.downloader.tbody)[0].innerHTML = html;
        console.log('Empty directory');
        if (callback) callback();
        return;
      }

      var html = '';

      // initialize html for browser
      for (i = 0; i < files.length; ++i) {
        html = mpcp.downloader.getHtmlFolders(files[i]);

        if (html !== '') mpcp.downloader.localFolders.push(html);
      }

      mpcp.downloader.updateLocal(callback);
    });
  },

  getHtmlFolders: function (value) {
    var tableStart = '<table class="fixed-table"><tr><td>',
      tableEnd = '</td></tr></table>',
      strippedDir = '',
      html = '';

    if (value.directory) {
      //console.log('dir');

      strippedDir = mpcp.utils.stripSlash(value.directory);

      html = '<tr class="downloader-directory gen" data-dirid="' + value.directory + '"><td class="song-list-icons"><span class="text-warning glyphicon glyphicon-folder-open"></span> <span class="folder-open faded glyphicon glyphicon-share-alt" title="Open directory. Note: You can double click the directory to open"></span></a></td><td title="' + strippedDir + '">' + tableStart + strippedDir + tableEnd + '</td></tr>';
    }

    return html;
  },

  doneSelection: function () {
    // "root" folder
    var dir = '';

    if (mpcp.downloader.rowSelect.getSelected()) {
      dir = $(mpcp.downloader.rowSelect.getSelected()).data().dirid;
      mpcp.downloader.rowSelect.deselect();
    }

    document.getElementById('downloader-location').value = dir;
    mpcp.downloader.saveLocation();
  },

  saveLocation: function () {
    var location = document.getElementById('downloader-location').value;
    localStorage.setItem('mpcp-downloader-location', location);
  },

  initEvents: function () {
    $('#downloader-download').click(function () {
      mpcp.downloader.downloadFromDownloader();
    });

    // detect enter key
    $('#downloader-url').keyup(function (e) {
      if (e.keyCode == 13)
        mpcp.downloader.downloadFromDownloader();
    });

    // save location
    $('#downloader-location').change(function () {
      mpcp.downloader.setStatus('');
      mpcp.downloader.saveLocation();
    });

    $('#downloader-url').change(function () {
      mpcp.downloader.setStatus('');
    });

    $(document).on('dblclick', mpcp.downloader.table + ' tr.downloader-directory', function () {
      var dir = $(this).data().dirid;
      mpcp.downloader.update(dir);
    });

    $(document).on('click', mpcp.downloader.table + ' .folder-open', function () {
      var dir = $(this).parent().parent().data().dirid;
      mpcp.downloader.update(dir);
    });

    $(document).on('click', '#downloader-browse', function () {
      mpcp.downloader.setStatus('');
      document.getElementById('downloader-btn').parentElement.classList.add('keep-open');
      mpcp.downloader.update('/');
    });

    $('#downloader-home').click(function () {
      console.log('home');
      mpcp.downloader.update('/');
    });

    $(document).on('click', '.downloader-loc-dir', function () {
      var dir = $(this).data().dirid;
      //console.log(dir);
      mpcp.downloader.update(dir);
    });

    $(document).on('click', '#downloader-location-confirm', function () {
      mpcp.downloader.doneSelection();
    });

    mpcp.downloader.rowSelect =
      mpcp.utils.rowSelect('.downloader-directory', 'bg-primary', '#downloader-wrap');

    mpcp.downloader.rowSelect.on('enter', function (ele) {
      var dir = $(ele).data().dirid;
      mpcp.downloader.update(dir);
    });

    $('#downloader-location-modal').on('hidden.bs.modal', function (e) {
      document.getElementById('downloader-btn').parentElement.classList.remove('keep-open');
    });
  }
};

};
