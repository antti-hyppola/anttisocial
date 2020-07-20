const { admin, db } = require('./admin');

module.exports = (req, res, next) => {
  //Initialize token id
  let idToken;
  if (
    //Check if token Id is provided in the header
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    //Set token id value
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('No token found');
    return res.status(403).json({ error: 'Unauthorized' });
  }
  admin
    //Verify token
    .auth()
    .verifyIdToken(idToken)
    .then(decodedToken => {
      //Retrieve current user from DB with token id
      req.user = decodedToken;
      return db
        .collection('user')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
      //Save user handle to req.user.handle
      req.user.handle = data.docs[0].data().handle;
      return next();
    })
    .catch(err => {
      console.error('Error while verifying token', err);
      return res.status(403).json(err);
    });
};
