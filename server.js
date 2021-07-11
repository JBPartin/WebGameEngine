const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.use(express.static('public'));
app.use('/scripts', express.static(__dirname + 'public/scripts'));
app.use('/styles', express.static(__dirname + 'public/styles'));

app.get('/', function(req, res) {
    res.render('Index', {
        supplies: [0, 1, 2],
    });
});

app.listen(5500);