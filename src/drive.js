var path = require('path')
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
var emoji = require('node-emoji')
var colors = require('colors');

// Variable to check if the error msg has been shown
var connectionError = false;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

function dump2drive() {
  // Load client secrets from a local file.
  fs.readFile(path.resolve(__dirname, '../credentials.json'), (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      // Authorize a client with credentials, then call the Google Drive API.
      authorize(JSON.parse(content), uploadFiles);
  });
}

/**
 * Function to search over the directory tree of your drive to find the path of the code.
 * @param {Object} auth The authorization of the API
 * @param {String} fileName The name of the file
 * @returns {String} The id of the folder to store the file 
 */
async function searchDir(auth, fileName) {

  const drive = google.drive({version: 'v3', auth});
  // Getting the code of the file
  let codeInit = fileName.indexOf("[")
  let codeEnd = fileName.indexOf("]")
  let fileCode = fileName.substring(codeInit + 1, codeEnd);

  if(fileCode == '' || codeInit == -1 || codeEnd == -1) {
    console.log("       - code bad formed. Example of code: [CODE] namefile.ext".red)
    return null;
  }

  // Parent used as an example (CHANGE)
  var previousParent = '1SIzqKYymoCZ98K5OxQ1PNProo50FTzFe'

  do {
    try {
      // Listing all the directories inside the parent folder
      var res = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and '" + previousParent + "'  in parents",
        fields: ' files(id, name)',
      });
      
      // Searching part of the file code into the folder's names
      for (let i = 0; i < res.data.files.length; i++) {
        let file = res.data.files[i];

        // Getting the folder's code
        var mySubString = file.name.substring(
          file.name.indexOf("[") + 1, 
          file.name.indexOf("]")
        );

        if(fileCode.indexOf(mySubString) == 0) {
          var newParent = file.id;
          fileCode = fileCode.substring(            
            fileCode.indexOf(mySubString) + mySubString.length
          );
          break;
        }
      }

      if(newParent == undefined || previousParent == newParent) {
        console.log("       - path not found".red)
        return null;
      }
      
      previousParent = newParent

    } catch(error) {
      console.log("Error", error)
    }  
  } while(fileCode != '');

  console.log("       - path found".yellow)
  return previousParent;
}

/**
 * Function to upload all the files stored locally into GoogleDrive.
 * @param {Object} auth The authorization of the API
 */
async function uploadFiles(auth) {
    const drive = google.drive({version: 'v3', auth});
    var err, files = fs.readdirSync(path.resolve(__dirname, '../files')); 

    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 

    for(let i = 0; i < files.length; i++) {
      if (i == 0) {
        console.log("[ ] Uploading files to Google Drive".bold.brightGreen)
      } 

      console.log("    > Uploading ".green + files[i].bold.green)
      // Getting the folder's id
      var parenID = await searchDir(auth, files[i]);

      if (parenID == null) { continue; }
      // Info of the file to upload
      let filePath = path.resolve(__dirname, '../files/' + files[i]);
      var fileMetadata = {
        'name': files[i],
        parents: [parenID]
      };
      var media = {
        body: fs.createReadStream(filePath)
      };
      // Uploads the file to Drive
      try {
        await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'name'
        });
      } catch (error) {
        if(!connectionError) {
          console.log("[x] Error uploading the files to Google Drive".bold.red) 
        }
        connectionError = true;
        break;
      }         
          
      connectionError = false;
      console.log("       - file uploaded".bold.yellow)

      if (i == (files.length - 1)) {
        console.log("[x] All files have been uploaded to Google Drive".bold.brightGreen)
      }

      // Deletes the file that has been uploaded to Drive
      try {
        err = fs.unlinkSync(filePath);
      } catch (error) {
        undefined
      }
    }  
    setTimeout(dump2drive, 30000)
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


module.exports = dump2drive;