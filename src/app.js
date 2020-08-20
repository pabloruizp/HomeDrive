var express = require('express');
var path = require('path')
var app = express();
var morgan = require('morgan')
const fileUpload = require('express-fileupload');
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
var emoji = require('node-emoji')
var colors = require('colors');


var connectionError = false;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

function loopUpload() {
    // Load client secrets from a local file.
    fs.readFile(path.resolve(__dirname, '../credentials.json'), (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Drive API.
        authorize(JSON.parse(content), uploadFiles);
    });
}

async function uploadFiles(auth) {
    const drive = google.drive({version: 'v3', auth});

    var err, files = fs.readdirSync(path.resolve(__dirname, '../files')); 

    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 

    if(files.length == 0) {
        //console.log("[x] No files to upload".red)
    }


    for(let i = 0; i < files.length; i++) {
      console.log(i);
      var fileMetadata = {
        'name': files[i],
        parents: ['1SIzqKYymoCZ98K5OxQ1PNProo50FTzFe']
      };

      var media = {
        body: fs.createReadStream(path.resolve(__dirname, '../files/' + files[i]))
      };

      try {

      await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'name'
        });
      } catch (error) {
        // Handle error
        if(!connectionError) {
          console.log("[x] Error uploading the files to Google Drive".bold.red) 
        }
        connectionError = true;
        break;
      }         
          
      connectionError = false;

      if (i == 0) {
        console.log("[ ] Uploading files to Google Drive".bold.brightGreen)
      } 

      console.log("    > ".green + files[i].bold.green + " uploaded".green)

      if (i == (files.length - 1)) {
        console.log("[x] All files have been uploaded to Google Drive".bold.brightGreen)
      }

      try {
        err = fs.unlinkSync(path.resolve(__dirname, '../files/' + files[i]));
      } catch (error) {
        undefined
      }

    }  
    
    setTimeout(loopUpload, 30000)
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


app.use(fileUpload());
app.use(express.static(path.resolve(__dirname, '../public')));
//app.use(morgan('dev'))

app.get('/', function(req, res) {
  res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

app.post('/', (req, res) => {
    try {
        i = 1;
        req.files.file_upload.forEach(function (file) {
            file.mv('./files/' + file.name, (err) => {
                if(err) {
                    res.send(err);
                } 
                
                if(i == req.files.file_upload.length) {
                    console.log("[x] Files locally uploaded".brightYellow)
                    loopUpload();
                }

                i++;
            })
        });  

    } catch {
        req.files.file_upload.mv('./files/' + req.files.file_upload.name, (err) => {
            if(err) {
                res.send(err);
            } else {
                console.log("[x] Files locally uploaded".brightYellow)
                loopUpload();
            }
        })  
    }

    res.redirect('/')
})


let PORT = process.env.PORT || 3000;

app.listen(PORT, (res, error) =>  {
    console.log("[x] Web service running (".bold.magenta + "http://localhost:3000".underline.bold.magenta + ")".bold.magenta)
    loopUpload();
});