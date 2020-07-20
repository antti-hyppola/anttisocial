const functions = require('firebase-functions');
const app = require('express')();

//Middleware
const FBAuth = require('./util/fbAuth');
//Import route logic
const { getAllScreams, postOneScream } = require('./handlers/screams');
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
} = require('./handlers/users');

//All scream routes
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);

//All user routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.region('europe-west2').https.onRequest(app);
