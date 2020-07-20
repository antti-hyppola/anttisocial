const { db } = require('../util/admin');
const { validateSignupData, validateLoginData } = require('../util/validators');
const config = require('../util/config');
const firebase = require('firebase');
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
        return res.status(500).json({ error: err.code });
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
      if (err.code === 'auth/wrong-password') {
        return res
          .status(403)
          .json({ general: 'Wrong credentials, please try again!' });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
};
