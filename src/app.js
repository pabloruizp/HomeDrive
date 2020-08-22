var express = require('express');
var path = require('path')
var app = express();
const fileUpload = require('express-fileupload');
var colors = require('colors');
var dump2drive = require('./drive.js')


app.use(fileUpload());
app.use(express.static(path.resolve(__dirname, '../public')));

app.get('/', function(req, res) {
  res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

app.post('/', async (req, res) => {
    if(!Array.isArray(req.files.file_upload)) {
      req.files.file_upload = [req.files.file_upload];
    }

    for(let i = 0; i < req.files.file_upload.length; i++) {
      let file = req.files.file_upload[i]
      await file.mv('./files/' + file.name)
      if(i == req.files.file_upload.length - 1) {
        console.log("[x] Files locally uploaded".brightYellow)
        dump2drive();
      }
    }

    res.redirect('/')
})

let PORT = 3000;

app.listen(PORT, (res, error) =>  {
    console.log("[x] Web service running (".bold.magenta + "http://localhost:3000".underline.bold.magenta + ")".bold.magenta)
    dump2drive();
});