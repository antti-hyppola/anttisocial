const { admin, db } = require('../util/admin');
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require('../util/validators');
const config = require('../util/config');
const firebase = require('firebase');
const { user } = require('firebase-functions/lib/providers/auth');
const { functions } = require('firebase');
firebase.initializeApp(config);

//==============
//Signup logic
//==============
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  //Check all fields are filled correctly
  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return res.status(400).json(errors);

  const noImg = 'bert.jpg';

  //Firebase logic
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      //Check if handle exists
      if (doc.exists) {
        return res.status(400).json({ handle: 'this handle is already taken' });
      }
      //Create new user
      return firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password);
    })
    .then(data => {
      //Add user ID
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then(idToken => {
      //Firebase query to save new user to DB
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        password: newUser.password,
        imgUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId,
      };
      return db.doc(`/user/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        return res.status(400).json({ email: 'Email is already in use' });
      } else {
        return res
          .status(500)
          .json({ general: 'Something went wrong, please try again.' });
      }
    });
};

//==============
//Login logic
//==============
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  //Check all fields are filled correctly
  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);

  //Firebase logic
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      //Get token ID for logged in user
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({ token });
    })
    .catch(err => {
      console.error(err);
      return res
        .status(403)
        .json({ general: 'Wrong credentials, please try again!' });
    });
};

//==================
//Add User details logic
//==================
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/user/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: 'Details added succesfully' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//==================
//Get any user details
//==================
exports.getUserDetails = (req, res) => {
  let userData = {};

  db.doc(`/user/${req.params.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection('screams')
          .where('userHandle', '==', req.params.handle)
          .orderBy('createdAt', 'desc')
          .get();
      } else {
        return res.status(404).json({ error: 'User not found!' });
      }
    })
    .then(data => {
      userData.screams = [];
      data.forEach(doc => {
        userData.screams.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImg: doc.data().userImg,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          screamId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//==================
//Get current user details
//==================
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};

  db.doc(`/user/${req.user.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection('likes')
          .where('userHandle', '==', req.user.handle)
          .get()
          .then(data => {
            userData.likes = [];
            data.forEach(doc => {
              userData.likes.push(doc.data());
            });
            return db
              .collection('notifications')
              .where('recipient', '==', req.user.handle)
              .orderBy('createdAt', 'desc')
              .limit(10)
              .get();
          })
          .then(data => {
            userData.notifications = [];
            data.forEach(doc => {
              userData.notifications.push({
                recipient: doc.data().recipient,
                sender: doc.data().sender,
                createdAt: doc.data().createdAt,
                screamId: doc.data().screamId,
                type: doc.data().type,
                read: doc.data().read,
                notificationId: doc.id,
              });
            });
            return res.json(userData);
          })
          .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
          });
      }
    });
};

//==================
//Upload image logic
//==================
exports.uploadImage = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers });

  let imgFileName;
  let imgToUpload = {};

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res.status(400).json({ error: 'Wrong file type submitted' });
    }
    const imgExtension = filename.split('.')[filename.split('.').length - 1];
    imgFileName = `${Math.round(Math.random() * 10000)}.${imgExtension}`;
    const filepath = path.join(os.tmpdir(), imgFileName);
    imgToUpload = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(imgToUpload.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imgToUpload.mimetype,
          },
        },
      })
      .then(() => {
        const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imgFileName}?alt=media`;
        return db
          .doc(`/user/${req.user.handle}`)
          .update({ imgUrl })
          .then(() => {
            return res.json({ message: 'Image uploaded succesfully' });
          })
          .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
          });
      });
  });
  busboy.end(req.rawBody);
};

exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();

  req.body.forEach(notificationId => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: 'Notifications marked read' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
