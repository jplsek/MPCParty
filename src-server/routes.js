const fs         = require('fs'),
      sass       = require('node-sass-middleware');
      browserify = require('browserify-middleware'),

module.exports = function (express, app, downloader, config) {

// sass config
app.use(sass({src: __dirname + '/../public'}));
// compile js client side code
app.get('/mpcparty.js', browserify(__dirname + '/../src/main.js'));
app.get('/testing.js', browserify(__dirname + '/../tests/main.js'));
// serve static files here
app.use(express.static(__dirname + '/../public'));
// use pug with express
app.set('views', __dirname + '/../views');
app.set('view engine', 'pug');

fs.readFile(__dirname + '/../package.json', function (err, data) {
    if (err) return console.log(err);
    pack = JSON.parse(data);
});

// main pages
app.get('/', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            'showUsers': config.users.enabled,
            'downloader': downloader.enabled,
            'testing': config.testing.enabled
        }
    });
});

app.get('/browser/*', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            'showUsers': config.users.enabled,
            'downloader': downloader.enabled,
            'testing': config.testing.enabled
        }
    });
});

app.get('/library/*', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            'showUsers': config.users.enabled,
            'downloader': downloader.enabled,
            'testing': config.testing.enabled
        }
    });
});

app.get('/search/*', function (req, res) {
    res.render('index', {
        pack: pack,
        config: {
            'showUsers': config.users.enabled,
            'downloader': downloader.enabled,
            'testing': config.testing.enabled
        }
    });
});

app.get('/test/', function (req, res) {
    res.render('test');
});

// client side modules
app.use('/bootstrap', express.static(
    __dirname + '/../bower_components/bootstrap/dist/'));
app.use('/jquery', express.static(
    __dirname + '/../bower_components/jquery/dist/'));
app.use('/floatthead', express.static(
    __dirname + '/../bower_components/jquery.floatThead/dist/'));
app.use('/toastr', express.static(
    __dirname + '/../bower_components/toastr/'));
app.use('/jquery-contextmenu', express.static(
    __dirname + '/../bower_components/jQuery-contextMenu/dist/'));
app.use('/dragula', express.static(
    __dirname + '/../bower_components/dragula.js/dist/'));
app.use('/popper', express.static(
    __dirname + '/../node_modules/popper.js/dist/'));
app.use('/font-awesome', express.static(
    __dirname + '/../node_modules/font-awesome/css/'));
app.use('/fonts', express.static(
    __dirname + '/../node_modules/font-awesome/fonts/'));

// 404 requests
// currently disabled until we can get dynamic urls to not 404 with this
// enabled
/*app.use(function (req, res, next) {
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        res.render('404', { url: req.url });
        console.log('Page 404 by ' + req.connection.remoteAddress +
            ' on ' + req.originalUrl);
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.send({ error: 'Not found' });
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
});*/

};
