var express = require('express');
var path = require('path')
var app = express();
var morgan = require('morgan')
const fileUpload = require('express-fileupload');

app.use(fileUpload());
app.use(express.static(path.resolve(__dirname, '../public')));
app.use(morgan('dev'))

app.get('/', function(req, res) {
  res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

app.post('/', (req, res, next) => {
    console.log(req.files);
    for(let file of req.files.file_upload) {
        file.mv('./files/' + file.name, (err) => {
            if(err) {
                res.send(err);
            }
        })
    }
    res.sendFile(path.resolve(__dirname, '../public/index.html'));
})



let PORT = process.env.PORT || 3000;

app.listen(PORT, (res, error) =>  {
    console.log("[x] API RUNNING")
    console.log("[x] Go to http://localhost:3000 to start uploading your files")
});