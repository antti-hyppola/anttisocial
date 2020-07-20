//Firebase admin rights
const admin = require('firebase-admin');
admin.initializeApp();
//Database
const db = admin.firestore();
module.exports = { admin, db };
