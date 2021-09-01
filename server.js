const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())
app.use(express.static('public'));
app.use('/scripts', express.static(__dirname + 'public/scripts'));
app.use('/styles', express.static(__dirname + 'public/styles'));

let files = fs.readdirSync('./public/data/files');
function getJsonObjects() {
    let objects = [];
    for (path of files) {
        objects.push(require(`./public/data/files/${path}`));
    }
    return objects;
}

app.get('/api/getFiles', (req, res) => {
    res.json(getJsonObjects());
});

app.get('/', (req, res) => {
    let objects = [];
    for (path of files) {
        objects.push({ FileName: path, Object: require(`./public/data/files/${path}`) });
    }
    res.render('Index', {
        files: objects,
    });
});

app.listen(5500);