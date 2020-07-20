const { db } = require('../util/admin');

//Retrieve all screams from DB
exports.getAllScreams = (req, res) => {
  //Firestore query
  db.collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
      let screams = [];
      data.forEach(doc => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(screams);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Save a single scream into DB
exports.postOneScream = (req, res) => {
  //Check the input is not empty
  if (req.body.body.trim() === '') {
    return res.status(400).json({ body: 'Body must not be empty' });
  }
  //Firestore query
  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
  };
  db.collection('screams')
    .add(newScream)
    .then(doc => {
      res.json({ message: `document ${doc.id} created succesfully` });
    })
    .catch(err => {
      res.status(500).json({ error: `something went wrong` });
      console.error(err);
    });
};
