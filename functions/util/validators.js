//Check if entered email is valid using a regular expression
const isEmail = email => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};

//Check if entered fields are empty
const isEmpty = str => {
  if (str.trim() === '') return true;
  else return false;
};

exports.validateSignupData = data => {
  let errors = {};
  //Check if email is inputed correctly
  if (isEmpty(data.email)) {
    errors.email = 'Must not be empty';
  } else if (!isEmail(data.email)) {
    errors.email = 'Must be a valid email address';
  }
  //Check that password fields are correct and matching
  if (isEmpty(data.password)) errors.password = 'Must not be empty';
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = 'Passwords must be the same';
  //Check that the handle field is not empty
  if (isEmpty(data.handle)) errors.handle = 'Must not be empty';
  //Export any possible errors
  return {
    errors,
    valid: Object.entries(errors).length === 0 ? true : false,
  };
};

exports.validateLoginData = data => {
  let errors = {};
  if (isEmpty(data.email)) errors.email = 'Must not be empty';
  if (isEmpty(data.password)) errors.password = 'Must not be empty';
  return {
    errors,
    valid: Object.entries(errors).length === 0 ? true : false,
  };
};
